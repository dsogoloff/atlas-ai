// Atlas Assessment — PROD schema VERIFIER (FULL attribute comparison).
//
// Reads PROD via DIRECT Postgres (PROD_DATABASE_URL — real pg_catalog/information_schema,
// NOT PostgREST) and LOCAL (127.0.0.1:54322, canonical expected). For EVERY public table
// present in local it compares, column-by-column:
//   * data_type — incl. numeric precision/scale and varchar length (format_type)
//   * is_nullable
//   * column_default
//   * for enum-typed columns, the full enum value set (via end-to-end enum comparison)
// and compares enum TYPES end to end.
//
// Reports table-by-table / column-by-column: MATCH / DRIFT(detail) / MISSING.
//
// Also checks two things a column/table diff cannot see: every public-schema FUNCTION
// and every user-defined TRIGGER that exists in local (the post-reset, every-migration-
// applied canonical schema) is checked for existence in prod. These are frequently the
// entire enforcement mechanism for an invariant (atomic writes, MFA recovery, rate
// limits, admin tenant scoping) — a silently-missing function/trigger is the same shape
// of bug as a silently-missing column, just one layer down. Existence-only (no body/
// definition comparison) — a function present under the same name but with stale logic
// is not caught here.
//
// EXITS NONZERO on any DRIFT, MISSING column/table/enum-value, or missing function/
// trigger. Prod-only tables/columns/enum-values/functions/triggers are INFO (additive
// philosophy — prod is allowed to hold extra). This replaces presence-only.
//
// Run:  tsx scripts/conversion/prod-bringup/07-verify-prod-schema.ts
// CI:   .github/workflows/prod-migration-drift.yml runs this on every PR (needs a fresh
//       `supabase start` for a non-stale local baseline, plus the PROD_DATABASE_URL secret).

import { introspectLocal, introspectProdSql, localConnString, prodConnString } from "./introspect";
import { fullCompare, isAcceptedDrift, type ColVerdict, type DriftDim } from "./compare";

/** Split a column drift into its dimensions, each labelled with whether it is a
 *  founder-accepted-for-beta drift. A column "fails" only if ≥1 dimension is unaccepted. */
function driftDims(table: string, column: string, v: Extract<ColVerdict, { kind: "DRIFT" }>): Array<{ text: string; accepted: boolean }> {
  const d = v.drift;
  const out: Array<{ dim: DriftDim; text: string }> = [];
  if (d.type) out.push({ dim: "type", text: `type: ${d.type.prod} -> ${d.type.local}` });
  if (d.nullable) out.push({ dim: "nullable", text: `nullable: prod ${d.nullable.prod ? "NULL" : "NOT NULL"} -> local ${d.nullable.local ? "NULL" : "NOT NULL"}` });
  if (d.default) out.push({ dim: "default", text: `default: prod ${d.default.prod ?? "∅"} -> local ${d.default.local ?? "∅"}` });
  return out.map((o) => ({ text: o.text, accepted: isAcceptedDrift(table, column, o.dim) }));
}

async function main(): Promise<void> {
  const localDsn = localConnString();
  const prodDsn = prodConnString();
  process.stdout.write(`[verify] local: ${localDsn.replace(/:[^:@/]*@/, ":****@")}\n`);
  process.stdout.write(`[verify] prod : ${prodDsn.replace(/:[^:@/]*@/, ":****@")} (DIRECT Postgres, read-only)\n\n`);

  const local = await introspectLocal(localDsn);
  const prod = await introspectProdSql(prodDsn);
  const diff = fullCompare(local, prod);

  const w = process.stdout;
  let matchCount = 0, driftCount = 0, acceptedCount = 0, missingCount = 0;

  w.write("=== TABLE-BY-TABLE / COLUMN-BY-COLUMN (prod vs local expected) ===\n");
  for (const t of diff.tables) {
    w.write(`\n■ ${t.table}${t.present ? "" : "  [MISSING TABLE]"}\n`);
    for (const c of t.columns) {
      if (c.verdict.kind === "MATCH") { matchCount++; w.write(`    MATCH    ${c.column}\n`); continue; }
      if (c.verdict.kind === "MISSING") { missingCount++; w.write(`    MISSING  ${c.column}\n`); continue; }
      const dims = driftDims(t.table, c.column, c.verdict);
      const unaccepted = dims.filter((d) => !d.accepted);
      const detail = dims.map((d) => `${d.text}${d.accepted ? " [accepted-beta]" : ""}`).join("; ");
      if (unaccepted.length === 0) { acceptedCount++; w.write(`    ACCEPTED ${c.column} — ${detail}\n`); }
      else { driftCount++; w.write(`    DRIFT    ${c.column} — ${detail}\n`); }
    }
    if (t.prodOnlyColumns.length) w.write(`    INFO     prod-only columns (kept): ${t.prodOnlyColumns.join(", ")}\n`);
  }

  w.write("\n=== ENUM TYPES (end to end) ===\n");
  let enumDrift = 0;
  for (const e of diff.enums) {
    if (e.status === "MATCH") {
      w.write(`  MATCH   ${e.name} (${e.localValues.length})${e.extraInProd.length ? `  INFO prod-only values: ${e.extraInProd.join(", ")}` : ""}\n`);
    } else if (e.status === "MISSING") {
      enumDrift++; w.write(`  MISSING ${e.name} — type absent in prod (local values: ${e.localValues.join(", ")})\n`);
    } else {
      enumDrift++; w.write(`  DRIFT   ${e.name} — prod missing values: ${e.missingInProd.join(", ")}${e.extraInProd.length ? `; prod-only: ${e.extraInProd.join(", ")}` : ""}\n`);
    }
  }

  // Functions and triggers aren't covered by the table/column/enum compare above, and
  // aren't covered by pg_catalog's REST surface at all when introspectProd (OpenAPI) is
  // the prod channel — but introspectProdSql (direct Postgres, the path this script
  // uses) reads them the same way it reads everything else. A silently-missing function
  // is the SAME shape of bug as a silently-missing column: something a migration added
  // that never reached prod, just one layer down from the columns table lives in — these
  // are frequently the entire enforcement mechanism for an invariant (atomic writes,
  // rate limits, admin scoping), not incidental plumbing.
  w.write("\n=== FUNCTIONS ===\n");
  if (diff.missingFunctions.length === 0) {
    w.write("  OK — every local function exists in prod.\n");
  } else {
    for (const f of diff.missingFunctions) w.write(`  MISSING  ${f}\n`);
  }

  w.write("\n=== TRIGGERS ===\n");
  if (diff.missingTriggers.length === 0) {
    w.write("  OK — every local trigger exists in prod.\n");
  } else {
    for (const t of diff.missingTriggers) w.write(`  MISSING  ${t}\n`);
  }

  if (diff.prodOnlyTables.length || diff.prodOnlyEnums.length || diff.prodOnlyFunctions.length || diff.prodOnlyTriggers.length) {
    w.write("\n=== PROD-ONLY (INFO — not failures) ===\n");
    if (diff.prodOnlyTables.length) w.write(`  tables: ${diff.prodOnlyTables.join(", ")}\n`);
    if (diff.prodOnlyEnums.length) w.write(`  enum types: ${diff.prodOnlyEnums.join(", ")}\n`);
    if (diff.prodOnlyFunctions.length) w.write(`  functions: ${diff.prodOnlyFunctions.join(", ")}\n`);
    if (diff.prodOnlyTriggers.length) w.write(`  triggers: ${diff.prodOnlyTriggers.join(", ")}\n`);
  }

  w.write("\n=== RESULT ===\n");
  w.write(`  columns: ${matchCount} MATCH, ${acceptedCount} ACCEPTED(beta), ${driftCount} DRIFT, ${missingCount} MISSING; enum issues: ${enumDrift}; ` +
    `functions: ${diff.missingFunctions.length} MISSING; triggers: ${diff.missingTriggers.length} MISSING\n`);
  const failures = driftCount + missingCount + enumDrift + diff.missingFunctions.length + diff.missingTriggers.length;
  if (failures === 0) {
    w.write(`  PASS — no unexpected drift. ${acceptedCount} founder-accepted-for-beta drift(s) tolerated; prod otherwise matches local at full attribute fidelity.\n`);
  } else {
    w.write(`  FAIL — ${failures} UNEXPECTED attribute drift/missing item(s) (accepted-for-beta drifts excluded). Run 09, review, apply in Studio, re-verify.\n`);
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[verify] FAILED: ${String(err instanceof Error ? err.stack ?? err.message : err)}\n`);
  process.exitCode = 1;
});
