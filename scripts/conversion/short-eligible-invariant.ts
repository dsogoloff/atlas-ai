// Atlas Assessment — SEED short-test eligibility invariant guard.
//
// WHY: the hard bank rule is `is_active=false ⟹ short_test_eligible=false` — a
// non-servable item must never be short-test eligible. seed.sql sets
// `short_test_eligible` two ways: per-row "held" UPDATE blocks and key-driven
// "Short=Y" IN-list backfills. Either can mark an inactive row short-eligible
// (the bank flag-level parity check, 10-verify-prod-bank.ts, found 8 such rows).
// The DB CHECK constraint (questions_inactive_not_short_eligible) enforces this at
// reset time, but CI's `pnpm test` has no DB — this is the fast build-time guard
// that fails RED in the PR the moment a statement could set short=true on an
// inactive row, before it ever reaches a reset.
//
// WHAT this checks, statement-by-statement over seed.sql, for every questions
// INSERT/UPDATE that sets short_test_eligible = true:
//   A. HELD violation     — the same statement also sets is_active = false.
//   B. UNGUARDED backfill — the statement neither sets is_active = true nor
//                           references is_active at all (so an inactive row in its
//                           target set would be marked short-eligible). The fix is
//                           an `and q.is_active` guard in the WHERE.
//
// Wired into the verify bar via src/lib/conversion/short-eligible-invariant.test.ts.
// CLI: `pnpm tsx scripts/conversion/short-eligible-invariant.ts [--seed <path>]`.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "..", "..");
const SEED_DEFAULT = path.join(REPO_ROOT, "supabase", "seed.sql");

const EXTERNAL_ID = /'(SAM-L\d+[A-Z]?-Q\d+[A-Z]?)'/;

// One VALUES tuple inside a questions INSERT, captured from its leading external_id to the
// trailing `…, <is_active>, <short_test_eligible>, <content_key>)`. The two bare booleans
// immediately before the content_key (null or a quoted code) are, positionally,
// (is_active, short_test_eligible) — the column order the l0-overlay generator emits. JSON
// content can't false-match: its booleans look like `"held":true` / `:false}` (no `, b, b,`
// run followed by a SQL null/'code'), and it contains no lone `'` for the content_key group.
const VALUES_TUPLE =
  /\(\s*'(SAM-L\d+[A-Z]?-Q\d+[A-Z]?)'[\s\S]*?,\s*(true|false)\s*,\s*(true|false)\s*,\s*(?:null|'[^']*')\s*\)/gi;

/** Split into statements and strip `-- line comments` so comments never match. */
function statements(sql: string): string[] {
  const stripped = sql
    .split("\n")
    .map((l) => {
      const i = l.indexOf("--");
      return i === -1 ? l : l.slice(0, i);
    })
    .join("\n");
  return stripped.split(";");
}

export type ViolationKind = "held" | "unguarded";
export interface InvariantViolation {
  kind: ViolationKind;
  firstId: string; // an external_id in the offending statement, for locating it
  statement: string; // trimmed offending statement, for the failure message
}

export interface InvariantResult {
  statementsScanned: number;
  shortSetters: number;
  violations: InvariantViolation[];
  ok: boolean;
}

/** Scan seed SQL text for statements that could set short=true on an inactive row. */
export function checkShortEligibleInvariant(seedSql: string): InvariantResult {
  const stmts = statements(seedSql);
  const violations: InvariantViolation[] = [];
  let shortSetters = 0;

  for (const st of stmts) {
    const isQuestions = /update\s+questions/i.test(st) || /insert\s+into\s+questions/i.test(st);
    if (!isQuestions) continue;

    // Form A: literal assignment `short_test_eligible = true` (UPDATE SET, or an INSERT that
    // names the column = true). is_active is read from the same statement's literal assignments.
    if (/short_test_eligible\s*=\s*true/i.test(st)) {
      shortSetters += 1;
      const setsActiveFalse = /is_active\s*=\s*false/i.test(st);
      const setsActiveTrue = /is_active\s*=\s*true/i.test(st);
      const mentionsActive = /\bis_active\b/i.test(st);
      const firstId = (st.match(EXTERNAL_ID) ?? [])[1] ?? "(no external_id)";

      if (setsActiveFalse && !setsActiveTrue) {
        violations.push({ kind: "held", firstId, statement: st.trim() });
      } else if (!setsActiveTrue && !mentionsActive) {
        violations.push({ kind: "unguarded", firstId, statement: st.trim() });
      }
    }

    // Form B: positional VALUES tuples — `insert into questions (… is_active,
    // short_test_eligible, …) select … v.is_active, v.short_test_eligible … from (values
    // (…, <active>, <short>, <key>) …)`. The boolean is a bare tuple value, NOT a `= true`
    // assignment, so Form A cannot see it. This is the GENERATED l0-overlay form; 12 held
    // rows (is_active=false + short=true) once slipped past this guard and only failed at
    // `db reset`. Scan each tuple by its trailing (is_active, short_test_eligible) booleans.
    if (
      /insert\s+into\s+questions/i.test(st) &&
      /is_active\s*,\s*short_test_eligible/i.test(st) &&
      /\bvalues\b/i.test(st)
    ) {
      for (const m of st.matchAll(VALUES_TUPLE)) {
        const id = m[1];
        const tupleActive = m[2].toLowerCase() === "true";
        const tupleShort = m[3].toLowerCase() === "true";
        if (tupleShort) shortSetters += 1;
        if (!tupleActive && tupleShort) {
          violations.push({
            kind: "held",
            firstId: id,
            statement: `insert into questions (values …) — tuple ${id}: is_active=false, short_test_eligible=true`,
          });
        }
      }
    }
  }

  return {
    statementsScanned: stmts.length,
    shortSetters,
    violations,
    ok: violations.length === 0,
  };
}

export function readSeed(seedPath: string = SEED_DEFAULT): string {
  return readFileSync(seedPath, "utf8");
}

export function formatViolations(violations: InvariantViolation[]): string {
  return violations
    .map((v) => {
      const reason =
        v.kind === "held"
          ? "sets is_active=false AND short_test_eligible=true (held rows must not be short-eligible)"
          : "sets short_test_eligible=true without setting or guarding on is_active (add `and q.is_active`)";
      const head = v.statement.replace(/\s+/g, " ").slice(0, 160);
      return `  • [${v.kind}] ${v.firstId} — ${reason}\n      ${head}…`;
    })
    .join("\n");
}

// CLI
const INVOKED_DIRECTLY = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) {
  const seedArgIdx = process.argv.indexOf("--seed");
  const seedPath = seedArgIdx !== -1 ? process.argv[seedArgIdx + 1] : SEED_DEFAULT;
  const res = checkShortEligibleInvariant(readSeed(seedPath));
  process.stdout.write(
    `[short-eligible-invariant] scanned ${res.statementsScanned} statements, ` +
      `${res.shortSetters} set short_test_eligible=true.\n`,
  );
  if (res.ok) {
    process.stdout.write("  PASS — no statement can set short_test_eligible=true on an inactive row.\n");
  } else {
    process.stdout.write(`  FAIL — ${res.violations.length} violation(s):\n${formatViolations(res.violations)}\n`);
    process.exitCode = 1;
  }
}
