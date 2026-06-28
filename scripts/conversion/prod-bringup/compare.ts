// Atlas Assessment — full attribute comparison + drift classification (shared by 07/09).
//
// Compares PROD (direct Postgres, real pg_catalog) against the canonical LOCAL expected
// schema at FULL fidelity: every column's data_type (incl. numeric precision/scale and
// varchar length, via format_type), is_nullable, column_default, plus enum types end to
// end. The classifier decides whether a drift is AUTO-SAFE to remediate (prod -> local
// without risk of failing on existing rows or losing data) or REVIEW (lossy / needs
// backfill / semantic change).

import type { Schema, Column } from "./introspect";

// --------------------------------------------------------------------- diff model

export interface ColDrift {
  type?: { local: string; prod: string };
  nullable?: { local: boolean; prod: boolean };
  default?: { local: string | null; prod: string | null };
}
export type ColVerdict =
  | { kind: "MATCH" }
  | { kind: "MISSING" }
  | { kind: "DRIFT"; drift: ColDrift };

export interface ColResult { table: string; column: string; verdict: ColVerdict }
export interface TableResult {
  table: string;
  present: boolean;
  columns: ColResult[];
  prodOnlyColumns: string[];
}
export interface EnumResult {
  name: string;
  status: "MATCH" | "MISSING" | "DRIFT";
  missingInProd: string[];
  extraInProd: string[];
  localValues: string[];
  prodValues: string[];
}
export interface FullDiff {
  tables: TableResult[];
  prodOnlyTables: string[];
  enums: EnumResult[];
  prodOnlyEnums: string[];
}

/** Normalise a column default for comparison. Both sides come from pg_get_expr so they are
 *  already canonical; we only trim and treat null/empty alike. */
function normDefault(d: string | null): string | null {
  if (d === null) return null;
  const t = d.trim();
  return t === "" ? null : t;
}

export function compareColumn(local: Column, prod: Column): ColVerdict {
  const drift: ColDrift = {};
  if (local.type !== prod.type) drift.type = { local: local.type, prod: prod.type };
  if (local.nullable !== prod.nullable) drift.nullable = { local: local.nullable, prod: prod.nullable };
  const ld = normDefault(local.default);
  const pd = normDefault(prod.default);
  if (ld !== pd) drift.default = { local: ld, prod: pd };
  return Object.keys(drift).length ? { kind: "DRIFT", drift } : { kind: "MATCH" };
}

export function fullCompare(local: Schema, prod: Schema): FullDiff {
  const tables: TableResult[] = [];
  for (const [t, lcols] of [...local.tables].sort((a, b) => a[0].localeCompare(b[0]))) {
    const pcols = prod.tables.get(t);
    if (!pcols) {
      tables.push({
        table: t, present: false,
        columns: [...lcols.values()].sort((a, b) => a.ordinal - b.ordinal)
          .map((c) => ({ table: t, column: c.name, verdict: { kind: "MISSING" } as ColVerdict })),
        prodOnlyColumns: [],
      });
      continue;
    }
    const columns: ColResult[] = [];
    for (const lc of [...lcols.values()].sort((a, b) => a.ordinal - b.ordinal)) {
      const pc = pcols.get(lc.name);
      columns.push({
        table: t, column: lc.name,
        verdict: pc ? compareColumn(lc, pc) : { kind: "MISSING" },
      });
    }
    const prodOnlyColumns = [...pcols.keys()].filter((c) => !lcols.has(c)).sort();
    tables.push({ table: t, present: true, columns, prodOnlyColumns });
  }

  const prodOnlyTables = [...prod.tables.keys()].filter((t) => !local.tables.has(t)).sort();

  const enums: EnumResult[] = [];
  for (const [name, lvals] of [...local.enums].sort((a, b) => a[0].localeCompare(b[0]))) {
    const pvals = prod.enums.get(name);
    if (!pvals) {
      enums.push({ name, status: "MISSING", missingInProd: lvals, extraInProd: [], localValues: lvals, prodValues: [] });
      continue;
    }
    const pset = new Set(pvals);
    const lset = new Set(lvals);
    const missingInProd = lvals.filter((v) => !pset.has(v));
    const extraInProd = pvals.filter((v) => !lset.has(v));
    enums.push({
      name,
      status: missingInProd.length ? "DRIFT" : "MATCH",
      missingInProd, extraInProd, localValues: lvals, prodValues: pvals,
    });
  }
  const prodOnlyEnums = [...prod.enums.keys()].filter((n) => !local.enums.has(n)).sort();

  return { tables, prodOnlyTables, enums, prodOnlyEnums };
}

// ----------------------------------------------------------- type classification

interface ParsedType {
  base: string;
  length?: number; // varchar/char length
  precision?: number; // numeric precision
  scale?: number; // numeric scale
  unbounded?: boolean; // numeric/varchar without params
}

const INT_RANK: Record<string, number> = { smallint: 1, integer: 2, bigint: 3 };
const INT_DIGITS: Record<string, number> = { smallint: 5, integer: 10, bigint: 19 };

function parseType(t: string): ParsedType {
  const s = t.trim().toLowerCase();
  let m = s.match(/^(numeric|decimal)\s*\((\d+),\s*(\d+)\)$/);
  if (m) return { base: "numeric", precision: +m[2], scale: +m[3] };
  m = s.match(/^(numeric|decimal)\s*\((\d+)\)$/);
  if (m) return { base: "numeric", precision: +m[2], scale: 0 };
  if (/^(numeric|decimal)$/.test(s)) return { base: "numeric", unbounded: true };
  m = s.match(/^(character varying|varchar)\s*\((\d+)\)$/);
  if (m) return { base: "varchar", length: +m[2] };
  if (/^(character varying|varchar)$/.test(s)) return { base: "varchar", unbounded: true };
  m = s.match(/^(character|char)\s*\((\d+)\)$/);
  if (m) return { base: "char", length: +m[2] };
  return { base: s };
}

export type TypeChange = "SAME" | "WIDEN" | "NARROW" | "INCOMPATIBLE";

/** Classify the cast prod.type -> local.type (we bring prod UP to the canonical local). */
export function classifyTypeChange(prodType: string, localType: string): TypeChange {
  if (prodType === localType) return "SAME";
  const p = parseType(prodType);
  const l = parseType(localType);

  // numeric family (int + numeric)
  const pIsInt = p.base in INT_RANK;
  const lIsInt = l.base in INT_RANK;
  if (pIsInt && lIsInt) return INT_RANK[l.base] > INT_RANK[p.base] ? "WIDEN" : "NARROW";
  if (pIsInt && l.base === "numeric") {
    if (l.unbounded) return "WIDEN";
    const intDigits = (l.precision ?? 0) - (l.scale ?? 0);
    return intDigits >= INT_DIGITS[p.base] ? "WIDEN" : "INCOMPATIBLE"; // could overflow
  }
  if (p.base === "numeric" && lIsInt) return "NARROW"; // numeric -> int drops scale
  if (p.base === "numeric" && l.base === "numeric") {
    if (l.unbounded) return "WIDEN";
    if (p.unbounded) return "NARROW";
    const pInt = (p.precision ?? 0) - (p.scale ?? 0);
    const lInt = (l.precision ?? 0) - (l.scale ?? 0);
    if (lInt >= pInt && (l.scale ?? 0) >= (p.scale ?? 0)) return "WIDEN";
    return "NARROW";
  }

  // character family
  const pIsStr = p.base === "varchar" || p.base === "char";
  if (pIsStr && l.base === "text") return "WIDEN";
  if (p.base === "text" && (l.base === "varchar" || l.base === "char")) return "NARROW";
  if (pIsStr && (l.base === "varchar" || l.base === "char")) {
    if (l.unbounded) return "WIDEN";
    if (p.unbounded) return "NARROW";
    return (l.length ?? 0) >= (p.length ?? 0) ? "WIDEN" : "NARROW";
  }

  return "INCOMPATIBLE";
}
