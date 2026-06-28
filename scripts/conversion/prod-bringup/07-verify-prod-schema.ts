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
// EXITS NONZERO on any DRIFT or MISSING. Prod-only tables/columns/enum-values are INFO
// (additive philosophy — prod is allowed to hold extra). This replaces presence-only.
//
// Run:  tsx scripts/conversion/prod-bringup/07-verify-prod-schema.ts

import { introspectLocal, introspectProdSql, localConnString, prodConnString } from "./introspect";
import { fullCompare, type ColVerdict } from "./compare";

function driftDetail(v: Extract<ColVerdict, { kind: "DRIFT" }>): string {
  const d = v.drift;
  const parts: string[] = [];
  if (d.type) parts.push(`type: ${d.type.prod} -> ${d.type.local}`);
  if (d.nullable) parts.push(`nullable: prod ${d.nullable.prod ? "NULL" : "NOT NULL"} -> local ${d.nullable.local ? "NULL" : "NOT NULL"}`);
  if (d.default) parts.push(`default: prod ${d.default.prod ?? "∅"} -> local ${d.default.local ?? "∅"}`);
  return parts.join("; ");
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
  let matchCount = 0, driftCount = 0, missingCount = 0;

  w.write("=== TABLE-BY-TABLE / COLUMN-BY-COLUMN (prod vs local expected) ===\n");
  for (const t of diff.tables) {
    const drifts = t.columns.filter((c) => c.verdict.kind === "DRIFT").length;
    const missing = t.columns.filter((c) => c.verdict.kind === "MISSING").length;
    const hdr = !t.present
      ? "MISSING TABLE"
      : `${t.columns.length} cols — ${t.columns.length - drifts - missing} match, ${drifts} drift, ${missing} missing`;
    w.write(`\n■ ${t.table}  [${hdr}]\n`);
    for (const c of t.columns) {
      if (c.verdict.kind === "MATCH") { matchCount++; w.write(`    MATCH   ${c.column}\n`); }
      else if (c.verdict.kind === "MISSING") { missingCount++; w.write(`    MISSING ${c.column}\n`); }
      else { driftCount++; w.write(`    DRIFT   ${c.column} — ${driftDetail(c.verdict)}\n`); }
    }
    if (t.prodOnlyColumns.length) w.write(`    INFO    prod-only columns (kept): ${t.prodOnlyColumns.join(", ")}\n`);
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

  if (diff.prodOnlyTables.length || diff.prodOnlyEnums.length) {
    w.write("\n=== PROD-ONLY (INFO — not failures) ===\n");
    if (diff.prodOnlyTables.length) w.write(`  tables: ${diff.prodOnlyTables.join(", ")}\n`);
    if (diff.prodOnlyEnums.length) w.write(`  enum types: ${diff.prodOnlyEnums.join(", ")}\n`);
  }

  w.write("\n=== RESULT ===\n");
  w.write(`  columns: ${matchCount} MATCH, ${driftCount} DRIFT, ${missingCount} MISSING; enum issues: ${enumDrift}\n`);
  const failures = driftCount + missingCount + enumDrift;
  if (failures === 0) {
    w.write("  PASS — prod matches the local expected schema at full attribute fidelity.\n");
  } else {
    w.write(`  FAIL — ${failures} attribute drift/missing item(s). Run 09 to generate remediation, review, apply in Studio, re-verify.\n`);
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[verify] FAILED: ${String(err instanceof Error ? err.stack ?? err.message : err)}\n`);
  process.exitCode = 1;
});
