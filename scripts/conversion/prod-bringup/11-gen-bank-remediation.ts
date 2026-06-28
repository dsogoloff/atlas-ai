// Atlas Assessment — PROD BANK flag remediation generator (FLAG-corrective, never deletes).
//
// Re-runs the flag-level parity (prod direct Postgres vs invariant-normalized LOCAL canonical)
// and emits, into bank-remediation.generated.sql, ONLY idempotent flag corrections:
//   * held/inactive drift  -> UPDATE is_active=false, short_test_eligible=false for every
//                             external_id that LOCAL marks inactive (enforces the invariant).
//   * active-item flag drift (level/strand/content_id/short_test_eligible/question_format)
//                          -> targeted per-external_id UPDATE to the LOCAL value.
//   * question_format column absent -> ADD COLUMN IF NOT EXISTS + per-id backfill from local.
//   * SAM-L4-Q17 missing   -> guarded INSERT from local IF local has it (it does not — see review).
//
// Everything that could lose content or is ambiguous goes to bank-remediation.review.md and
// is NOT auto-emitted: prod-only (EXTRA) rows (never deleted), image_path drift (content, not
// a flag), local-active-but-prod-inactive (don't auto-activate), un-remappable content codes,
// rows missing from prod that need a full INSERT, and LOCAL's own invariant violations.
//
// Applies NOTHING. Founder applies bank-remediation.generated.sql in prod Studio.
//
// Run:  tsx scripts/conversion/prod-bringup/11-gen-bank-remediation.ts

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localConnString, prodConnString } from "./introspect";
import {
  readBank, readContentCodeMap, compareBank, invariantViolators, canonicalShort,
  TENANT_SLUG, HELD_SET, type BankRow,
} from "./bank";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQL_OUT = path.join(HERE, "bank-remediation.generated.sql");
const REVIEW_OUT = path.join(HERE, "bank-remediation.review.md");

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const TENANT_JOIN = `FROM tenants t WHERE t.slug=${lit(TENANT_SLUG)} AND q.tenant_id=t.id`;

// Column enum types (stable) for explicit casts in SET clauses.
const ENUM_CAST: Record<string, string> = { level: "half_grade_level", strand: "strand", format: "question_format" };

interface Auto { kind: string; sql: string; note: string }
interface Review { kind: string; detail: string }

function rule1ForceFalse(ids: string[]): Auto {
  const list = ids.map(lit).join(", ");
  const sql =
    `UPDATE public.questions q\n` +
    `SET is_active=false, short_test_eligible=false\n` +
    `${TENANT_JOIN}\n` +
    `  AND q.external_id IN (${list})\n` +
    `  AND (q.is_active IS TRUE OR q.short_test_eligible IS TRUE);`;
  return { kind: "held/inactive", sql, note: `force both flags false for ${ids.length} LOCAL-inactive id(s)` };
}

function activeUpdate(eid: string, sets: Array<{ col: string; expr: string }>): Auto {
  const setClause = sets.map((s) => `${s.col}=${s.expr}`).join(", ");
  const guard = sets.map((s) => `q.${s.col} IS DISTINCT FROM ${s.expr}`).join(" OR ");
  const sql =
    `UPDATE public.questions q SET ${setClause}\n` +
    `${TENANT_JOIN} AND q.external_id=${lit(eid)}\n` +
    `  AND (${guard});`;
  return { kind: "active-flag", sql, note: `${eid}: ${sets.map((s) => s.col).join(", ")} -> local` };
}

function valExpr(field: string, lr: BankRow, prodContent: Map<string, string>): { expr: string; review?: string } {
  switch (field) {
    case "short_test_eligible": return { expr: canonicalShort(lr) ? "true" : "false" };
    case "level": return { expr: `${lit(lr.level)}::${ENUM_CAST.level}` };
    case "strand": return { expr: `${lit(lr.strand)}::${ENUM_CAST.strand}` };
    case "question_format": return { expr: lr.format ? `${lit(lr.format)}::${ENUM_CAST.format}` : "NULL" };
    case "content_id": {
      if (lr.contentCode === null) return { expr: "NULL" };
      const id = prodContent.get(lr.contentCode);
      if (!id) return { expr: "", review: `\`${lr.externalId}\` content_id -> local code \`${lr.contentCode}\` has no matching tax_content row in prod; cannot remap. Load/verify taxonomy first.` };
      return { expr: `${lit(id)}::uuid` };
    }
    default: return { expr: "" };
  }
}

async function main(): Promise<void> {
  const stamp = new Date().toISOString();
  const localDsn = localConnString();
  const prodDsn = prodConnString();
  process.stdout.write(`[bank-remediation] local: ${localDsn.replace(/:[^:@/]*@/, ":****@")}\n`);
  process.stdout.write(`[bank-remediation] prod : ${prodDsn.replace(/:[^:@/]*@/, ":****@")} (DIRECT Postgres, read-only)\n`);

  const local = await readBank(localDsn, false);
  const prod = await readBank(prodDsn, true);
  const prodContent = await readContentCodeMap(prodDsn, true);
  const formatAbsent = !prod.formatColType;

  const verdicts = compareBank(local.rows, prod.rows);
  const autos: Auto[] = [];
  const reviews: Review[] = [];

  // format column absent -> ADD COLUMN + per-id backfill of every overlapping row
  if (formatAbsent) {
    autos.push({ kind: "add-format-col", sql: `ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS format ${ENUM_CAST.format};`, note: "question_format column absent in prod" });
    for (const [eid, lr] of local.rows) {
      if (!prod.rows.has(eid) || !lr.format) continue;
      autos.push(activeUpdate(eid, [{ col: "format", expr: `${lit(lr.format)}::${ENUM_CAST.format}` }]));
    }
  }

  // Rule 1 — held/inactive: every LOCAL-inactive id whose prod is not already both-false.
  const forceFalseIds: string[] = [];
  for (const v of verdicts) {
    if (v.status !== "DRIFT" || !v.localInactive) continue;
    const p = prod.rows.get(v.externalId)!;
    if (p.isActive || p.shortEligible) forceFalseIds.push(v.externalId);
    // any NON-flag drift on an inactive row is informational (item is non-servable anyway)
    const nonFlag = v.drifts.filter((d) => !["is_active", "short_test_eligible"].includes(d.field));
    for (const d of nonFlag) reviews.push({ kind: "INACTIVE-FIELD", detail: `\`${v.externalId}\` (inactive) ${d.field}: local \`${d.local}\` vs prod \`${d.prod}\` — non-servable; left as-is.` });
  }
  if (forceFalseIds.length) autos.push(rule1ForceFalse([...forceFalseIds].sort()));

  // Rule 2 — active-item flag drift (skip format here if it is handled by the absent-col backfill).
  for (const v of verdicts) {
    if (v.status !== "DRIFT" || v.localInactive) continue;
    const lr = local.rows.get(v.externalId)!;
    const sets: Array<{ col: string; expr: string }> = [];
    for (const d of v.drifts) {
      if (d.field === "is_active") { reviews.push({ kind: "AMBIGUOUS-ACTIVATE", detail: `\`${v.externalId}\`: local is_active=true but prod is_active=false — NOT auto-activated (could be an intentional prod hold). Decide manually.` }); continue; }
      if (d.field === "image_path") { reviews.push({ kind: "IMAGE-PATH", detail: `\`${v.externalId}\` image_path ${d.local} vs prod ${d.prod} — content (JSONB), not a flag; not auto-fixed.` }); continue; }
      if (d.field === "question_format" && formatAbsent) continue; // handled by backfill above
      const col = d.field === "question_format" ? "format" : d.field === "content_id" ? "content_id" : d.field;
      const { expr, review } = valExpr(d.field, lr, prodContent);
      if (review) { reviews.push({ kind: "CONTENT-REMAP", detail: review }); continue; }
      sets.push({ col, expr });
    }
    if (sets.length) autos.push(activeUpdate(v.externalId, sets));
  }

  // MISSING_IN_PROD / EXTRA_IN_PROD
  for (const v of verdicts) {
    if (v.status === "MISSING_IN_PROD") reviews.push({ kind: "MISSING", detail: `\`${v.externalId}\` present in local, absent in prod — needs a full-row INSERT (content JSONB); outside flag remediation. Use the bank loader (05).` });
    if (v.status === "EXTRA_IN_PROD") reviews.push({ kind: "EXTRA", detail: `\`${v.externalId}\` exists in prod, absent in local — NEVER auto-deleted; investigate manually.` });
  }

  // Held-set INSERT case (SAM-L4-Q17): only possible if local has it.
  for (const id of HELD_SET) {
    if (prod.rows.has(id)) continue;
    if (local.rows.has(id)) reviews.push({ kind: "HELD-MISSING", detail: `held \`${id}\` present in local, MISSING_IN_PROD — needs a guarded INSERT (tax_* + question) via the bank loader (05); flag remediation does not carry content.` });
    else reviews.push({ kind: "HELD-ABSENT-BOTH", detail: `held \`${id}\` is absent from BOTH local and prod — not a bank item, so it cannot be inserted from local. If it must exist, add it to the audited local bank first (CONVERSION lane).` });
  }

  // LOCAL invariant violations (canonical half-flagged) — seed-level fix, informational.
  const lViol = invariantViolators(local.rows);
  if (lViol.length) reviews.push({ kind: "LOCAL-INVARIANT", detail: `LOCAL (canonical) violates is_active=false⟹short=false for: ${lViol.join(", ")}. Canonical is invariant-normalized for prod remediation, but the local seed should also set short_test_eligible=false on these.` });

  // ---- write SQL ----
  const sql: string[] = [];
  sql.push("-- ============================================================================");
  sql.push("-- Atlas Assessment — PROD BANK flag remediation (GENERATED, flag-corrective, idempotent)");
  sql.push(`-- Generated: ${stamp}`);
  sql.push("-- Source (canonical, invariant-normalized): LOCAL 127.0.0.1:54322");
  sql.push("-- Target: PROD atlas-assessment / ntfaqzueppqymfkefadm");
  sql.push("--");
  sql.push("-- APPLY IN PROD STUDIO (founder, attended). NEVER `supabase db push` to prod.");
  sql.push("-- FLAG-corrective ONLY — never deletes or rewrites question content. Every statement");
  sql.push("-- is guarded (IN-list + flag predicate / IS DISTINCT FROM) so re-runs are no-ops.");
  sql.push("-- Lossy/ambiguous items are in bank-remediation.review.md (human decision).");
  sql.push("-- ============================================================================");
  sql.push("");
  const sec = (title: string, items: Auto[]) => {
    sql.push("-- ---------------------------------------------------------------------------");
    sql.push(`-- ${title}`);
    sql.push("-- ---------------------------------------------------------------------------");
    if (items.length === 0) sql.push("-- (none)");
    for (const a of items) { sql.push(`-- ${a.note}`); sql.push(a.sql); sql.push(""); }
    sql.push("");
  };
  sec("ADD question_format column + backfill (only if absent in prod)", autos.filter((a) => a.kind === "add-format-col" || (formatAbsent && a.kind === "active-flag" && a.note.includes("format -> local"))));
  sec("HELD / INACTIVE — force both flags false (invariant)", autos.filter((a) => a.kind === "held/inactive"));
  sec("ACTIVE-ITEM flag drift — targeted per-external_id UPDATE to local", autos.filter((a) => a.kind === "active-flag" && !(formatAbsent && a.note.includes("format -> local"))));
  writeFileSync(SQL_OUT, sql.join("\n"), "utf8");

  // ---- write review ----
  const rv: string[] = [];
  rv.push("# Prod bank remediation — REVIEW (human decision required)", "");
  rv.push(`_Generated: ${stamp}. Source = LOCAL (canonical, invariant-normalized). Target = PROD (direct Postgres)._`, "");
  rv.push("These are NOT in `bank-remediation.generated.sql` (lossy, ambiguous, or content-bearing).", "");
  const groups: Array<[string, string[]]> = [
    ["Missing from prod (needs full-row INSERT via loader 05)", ["MISSING", "HELD-MISSING"]],
    ["Held items absent from BOTH sides (not a bank item)", ["HELD-ABSENT-BOTH"]],
    ["Prod-only rows (EXTRA — never auto-deleted)", ["EXTRA"]],
    ["Ambiguous: local active but prod inactive (not auto-activated)", ["AMBIGUOUS-ACTIVATE"]],
    ["image_path drift (content, not a flag)", ["IMAGE-PATH"]],
    ["content_id not remappable in prod taxonomy", ["CONTENT-REMAP"]],
    ["Non-flag drift on inactive rows (left as-is)", ["INACTIVE-FIELD"]],
    ["LOCAL canonical invariant violations (fix local seed too)", ["LOCAL-INVARIANT"]],
  ];
  for (const [title, kinds] of groups) {
    const items = reviews.filter((r) => kinds.includes(r.kind));
    rv.push(`## ${title}`, "");
    if (items.length === 0) rv.push("_None._");
    else for (const it of items) rv.push(`- ${it.detail}`);
    rv.push("");
  }
  writeFileSync(REVIEW_OUT, rv.join("\n"), "utf8");

  // ---- stdout ----
  const w = process.stdout;
  w.write("\n=== BANK REMEDIATION (analysis only, nothing applied) ===\n");
  const heldCount = forceFalseIds.length;
  const activeCount = autos.filter((a) => a.kind === "active-flag").length;
  w.write(`  AUTO: held/inactive force-false ids=${heldCount}; active-flag UPDATEs=${activeCount}; add-format-col=${formatAbsent ? "YES" : "no"}\n`);
  w.write(`  REVIEW items: ${reviews.length}\n`);
  if (heldCount) w.write(`  force-false ids: ${[...forceFalseIds].sort().join(", ")}\n`);
  for (const a of autos.filter((x) => x.kind === "active-flag")) w.write(`  active-fix: ${a.note}\n`);
  if (reviews.length) { w.write("\n  REVIEW:\n"); for (const r of reviews) w.write(`    [${r.kind}] ${r.detail.replace(/`/g, "")}\n`); }
  w.write(`\n  wrote: ${path.relative(process.cwd(), SQL_OUT)}\n`);
  w.write(`  wrote: ${path.relative(process.cwd(), REVIEW_OUT)}\n`);
  w.write("\n  Analysis only — NOTHING applied. Founder applies bank-remediation.generated.sql in Studio.\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`[bank-remediation] FAILED: ${String(err instanceof Error ? err.stack ?? err.message : err)}\n`);
  process.exitCode = 1;
});
