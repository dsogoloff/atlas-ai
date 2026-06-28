// Atlas Assessment — PROD BANK flag-level parity verifier (keyed by external_id).
//
// Compares the prod question bank (direct Postgres) against the audited LOCAL bank,
// per external_id, on: is_active, short_test_eligible, level, strand, content_id (by
// tax_content.code), question_format, image_path (present/absent). Canonical = LOCAL,
// INVARIANT-NORMALIZED (is_active=false ⟹ short_test_eligible=false).
//
// Reports per id: MATCH / DRIFT(field:local→prod) / MISSING_IN_PROD / EXTRA_IN_PROD; a
// per-level (0A..6A) rollup of RAW active + short counts both sides with PASS/FAIL; and the
// hard invariant violators on BOTH sides. Asserts the held set is non-servable in prod.
//
// EXITS NONZERO on any DRIFT, MISSING_IN_PROD, or invariant violation (either side).
// PLACEHOLDER- dev row is excluded (prod strips it by prefix).
//
// Run:  tsx scripts/conversion/prod-bringup/10-verify-prod-bank.ts

import { localConnString, prodConnString } from "./introspect";
import {
  readBank, compareBank, invariantViolators, levelRollup, levelSort,
  HELD_SET, type RowVerdict,
} from "./bank";

function driftStr(v: RowVerdict): string {
  return v.drifts.map((d) => `${d.field}:${d.local}→${d.prod}`).join(", ");
}

async function main(): Promise<void> {
  const localDsn = localConnString();
  const prodDsn = prodConnString();
  process.stdout.write(`[bank-verify] local: ${localDsn.replace(/:[^:@/]*@/, ":****@")}\n`);
  process.stdout.write(`[bank-verify] prod : ${prodDsn.replace(/:[^:@/]*@/, ":****@")} (DIRECT Postgres, read-only)\n\n`);

  const local = await readBank(localDsn, false);
  const prod = await readBank(prodDsn, true);
  const w = process.stdout;

  // question_format column presence + type
  w.write("=== question_format column (prod) ===\n");
  if (prod.formatColType) w.write(`  PRESENT — public.questions.format : ${prod.formatColType}\n\n`);
  else w.write("  ABSENT — public.questions.format is MISSING in prod (remediation: ADD COLUMN + backfill)\n\n");

  const verdicts = compareBank(local.rows, prod.rows);
  const drift = verdicts.filter((v) => v.status === "DRIFT");
  const missing = verdicts.filter((v) => v.status === "MISSING_IN_PROD");
  const extra = verdicts.filter((v) => v.status === "EXTRA_IN_PROD");
  const matchN = verdicts.filter((v) => v.status === "MATCH").length;

  w.write("=== PER-EXTERNAL_ID PARITY ===\n");
  w.write(`  MATCH: ${matchN} (not listed)\n`);
  for (const v of missing) w.write(`  MISSING_IN_PROD  ${v.externalId}\n`);
  for (const v of extra) w.write(`  EXTRA_IN_PROD    ${v.externalId}\n`);
  for (const v of drift) w.write(`  DRIFT            ${v.externalId} — ${driftStr(v)}\n`);
  if (!missing.length && !extra.length && !drift.length) w.write("  (all present ids match the invariant-normalized canonical)\n");

  // Per-level rollup (RAW counts both sides)
  w.write("\n=== PER-LEVEL ROLLUP (raw active / short, both sides) ===\n");
  const lr = levelRollup(local.rows), pr = levelRollup(prod.rows);
  const levels = [...new Set([...lr.keys(), ...pr.keys()])].sort(levelSort);
  w.write(`  ${"level".padEnd(6)}${"L.act".padStart(7)}${"P.act".padStart(7)}${"act".padStart(6)}${"L.short".padStart(9)}${"P.short".padStart(9)}${"short".padStart(7)}\n`);
  let rollFail = 0;
  for (const lv of levels) {
    const l = lr.get(lv) ?? { active: 0, short: 0 }, p = pr.get(lv) ?? { active: 0, short: 0 };
    const actOk = l.active === p.active, shOk = l.short === p.short;
    if (!actOk || !shOk) rollFail++;
    w.write(`  ${lv.padEnd(6)}${String(l.active).padStart(7)}${String(p.active).padStart(7)}${(actOk ? "PASS" : "FAIL").padStart(6)}${String(l.short).padStart(9)}${String(p.short).padStart(9)}${(shOk ? "PASS" : "FAIL").padStart(7)}\n`);
  }
  w.write("  (NOTE: raw L.short counts include local key-driven short=true on inactive/held rows;\n");
  w.write("   short FAIL at a level = local is half-flagged there while prod is invariant-correct.)\n");

  // Hard invariant — both sides
  const lViol = invariantViolators(local.rows);
  const pViol = invariantViolators(prod.rows);
  w.write("\n=== HARD INVARIANT (is_active=false ⟹ short_test_eligible=false) ===\n");
  w.write(`  LOCAL violators (${lViol.length}): ${lViol.join(", ") || "(none)"}\n`);
  w.write(`  PROD  violators (${pViol.length}): ${pViol.join(", ") || "(none)"}\n`);
  if (lViol.length) w.write("  → LOCAL (canonical) is half-flagged on these (key-driven short=true on held/inactive);\n    canonical is invariant-normalized to false. The local seed should also be corrected.\n");

  // Held set assertion
  w.write("\n=== HELD SET — must be non-servable in prod (both flags false) ===\n");
  let heldFail = 0;
  for (const id of HELD_SET) {
    const p = prod.rows.get(id);
    const inLocal = local.rows.has(id);
    if (!p) {
      if (!inLocal) w.write(`  NOTE     ${id} — absent in BOTH local and prod (not a bank item; trivially non-servable)\n`);
      else { heldFail++; w.write(`  FAIL     ${id} — present in local but MISSING_IN_PROD\n`); }
      continue;
    }
    if (!p.isActive && !p.shortEligible) w.write(`  OK       ${id} — non-servable in prod (is_active=false, short_test_eligible=false)\n`);
    else { heldFail++; w.write(`  FAIL     ${id} — SERVABLE/half-flagged in prod (is_active=${p.isActive}, short=${p.shortEligible})\n`); }
  }

  // Result
  w.write("\n=== RESULT ===\n");
  w.write(`  ids: ${matchN} MATCH, ${drift.length} DRIFT, ${missing.length} MISSING_IN_PROD, ${extra.length} EXTRA_IN_PROD\n`);
  w.write(`  invariant violators: local ${lViol.length}, prod ${pViol.length}; held-set failures: ${heldFail}; rollup level-fails: ${rollFail}\n`);
  const fail = drift.length + missing.length + lViol.length + pViol.length + heldFail + (prod.formatColType ? 0 : 1);
  if (fail === 0) {
    w.write("  PASS — prod bank flags match the invariant-normalized audited canonical.\n");
  } else {
    w.write("  FAIL — flag-level drift / missing / invariant violations present. Run 11, review, apply in Studio, re-verify.\n");
    if (extra.length) w.write("  (EXTRA_IN_PROD rows reported as INFO — never auto-deleted; see 11 review.)\n");
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[bank-verify] FAILED: ${String(err instanceof Error ? err.stack ?? err.message : err)}\n`);
  process.exitCode = 1;
});
