// Atlas Assessment — PROD schema VERIFIER (prod ⊇ local expected).
//
// Re-introspects PROD (read-only, PostgREST) and LOCAL (canonical, full SQL) and asserts
// that PROD is a SUPERSET of the local expected schema: every local table, every local
// column, and every local enum value must exist in prod. Prints table-by-table PASS/FAIL
// and EXITS NONZERO if any expected item is missing. Prod-only objects are INFO, never
// failures (prod is allowed to have extra).
//
// POLICY caveat: prod's pg_policies is NOT readable via PostgREST (no prod DB password),
// so RLS-policy superset cannot be machine-verified here — it is reported SKIPPED with the
// local policy count and must be eyeballed in Studio. This is surfaced loudly, not hidden.
//
// Run:  tsx scripts/conversion/prod-bringup/07-verify-prod-schema.ts

import {
  introspectLocal, introspectProd, localConnString, prodCreds,
  normalizeType, type Schema,
} from "./introspect";

function pad(s: string | number, n: number) { return String(s).padEnd(n); }

interface TableResult {
  table: string;
  status: "PASS" | "FAIL";
  missingCols: string[];
  typeInfo: string[];
  total: number;
}

function verify(local: Schema, prod: Schema): { results: TableResult[]; enumFails: string[]; enumPass: string[]; prodOnlyTables: string[]; prodOnlyCols: string[] } {
  const results: TableResult[] = [];
  for (const [t, lcols] of [...local.tables].sort((a, b) => a[0].localeCompare(b[0]))) {
    const pcols = prod.tables.get(t);
    if (!pcols) {
      results.push({ table: t, status: "FAIL", missingCols: ["<entire table missing>"], typeInfo: [], total: lcols.size });
      continue;
    }
    const missingCols: string[] = [];
    const typeInfo: string[] = [];
    for (const [cn, lc] of lcols) {
      const pc = pcols.get(cn);
      if (!pc) { missingCols.push(cn); continue; }
      if (normalizeType(lc.type) !== normalizeType(pc.type)) typeInfo.push(`${cn} (local ${lc.type} / prod ${pc.type})`);
    }
    results.push({ table: t, status: missingCols.length ? "FAIL" : "PASS", missingCols, typeInfo, total: lcols.size });
  }

  const enumFails: string[] = [];
  const enumPass: string[] = [];
  for (const [name, lvals] of [...local.enums].sort((a, b) => a[0].localeCompare(b[0]))) {
    const pvals = prod.enums.get(name);
    if (!pvals) { enumFails.push(`${name} — type not visible in prod (no exposed column or missing)`); continue; }
    const pset = new Set(pvals);
    const missing = lvals.filter((v) => !pset.has(v));
    if (missing.length) enumFails.push(`${name} — missing values: ${missing.join(", ")}`);
    else enumPass.push(`${name} (${lvals.length})`);
  }

  const prodOnlyTables: string[] = [];
  for (const t of prod.tables.keys()) if (!local.tables.has(t)) prodOnlyTables.push(t);
  const prodOnlyCols: string[] = [];
  for (const [t, pcols] of prod.tables) {
    const lcols = local.tables.get(t);
    if (!lcols) continue;
    for (const cn of pcols.keys()) if (!lcols.has(cn)) prodOnlyCols.push(`${t}.${cn}`);
  }

  return { results, enumFails, enumPass, prodOnlyTables, prodOnlyCols };
}

async function main(): Promise<void> {
  const dsn = localConnString();
  const { url, key } = prodCreds();
  process.stdout.write(`[verify] local: ${dsn.replace(/:[^:@/]*@/, ":****@")}\n`);
  process.stdout.write(`[verify] prod : ${url} (read-only, PostgREST)\n\n`);

  const local = await introspectLocal(dsn);
  const prod = await introspectProd(url, key);
  const v = verify(local, prod);

  const w = process.stdout;
  w.write("=== PROD ⊇ LOCAL — TABLES/COLUMNS ===\n");
  for (const r of v.results) {
    const tail = r.status === "PASS"
      ? `(${r.total} cols)${r.typeInfo.length ? `  INFO type: ${r.typeInfo.join("; ")}` : ""}`
      : `MISSING: ${r.missingCols.join(", ")}`;
    w.write(`  ${pad(r.status, 5)} ${pad(r.table, 28)} ${tail}\n`);
  }

  w.write("\n=== PROD ⊇ LOCAL — ENUM VALUES ===\n");
  for (const e of v.enumPass) w.write(`  PASS  ${e}\n`);
  for (const e of v.enumFails) w.write(`  FAIL  ${e}\n`);

  w.write("\n=== RLS POLICIES ===\n");
  w.write(`  SKIPPED — prod pg_policies not readable via PostgREST. Local defines ${local.policies.length} policies;\n`);
  w.write("           verify in prod Studio after applying catchup.generated.sql Section 5.\n");

  if (v.prodOnlyTables.length || v.prodOnlyCols.length) {
    w.write("\n=== PROD-ONLY (INFO — not failures) ===\n");
    if (v.prodOnlyTables.length) w.write(`  tables : ${v.prodOnlyTables.join(", ")}\n`);
    if (v.prodOnlyCols.length) w.write(`  columns: ${v.prodOnlyCols.join(", ")}\n`);
  }

  const tableFails = v.results.filter((r) => r.status === "FAIL");
  const missingItemCount = tableFails.reduce((n, r) => n + r.missingCols.length, 0) + v.enumFails.length;
  w.write("\n=== RESULT ===\n");
  if (missingItemCount === 0) {
    w.write("  PASS — prod is a superset of the local expected schema (tables/columns/enum-values).\n");
    w.write("  (RLS policies SKIPPED — verify in Studio.)\n");
  } else {
    w.write(`  FAIL — ${missingItemCount} expected item(s) missing in prod `);
    w.write(`(${tableFails.length} table(s)/columns, ${v.enumFails.length} enum issue(s)).\n`);
    w.write("  Apply catchup.generated.sql in prod Studio, then re-run this verifier.\n");
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[verify] FAILED: ${String(err instanceof Error ? err.stack ?? err.message : err)}\n`);
  process.exitCode = 1;
});
