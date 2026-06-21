// Atlas Assessment — eligibility/over-set audit helper (read-only, one-off).
//
// Computes the FINAL per-question DB state the dev DB would hold after
// `supabase db reset` (which builds ENTIRELY from supabase/seed.sql): parse
// every `insert into questions ... (values...)` block (first-insert-wins, to
// mirror `on conflict (tenant_id, external_id) do nothing`), then apply every
// single-row `update questions q set ... where ... q.external_id = '...'`
// statement in file order for the columns this audit cares about
// (is_active, short_test_eligible, level, strand, content_id-code).
//
// Emits scripts/conversion/audit/bank-final-state.json. NOT wired into verify;
// run via: npx tsx scripts/conversion/audit/overset-state.mts

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseSqlValuesTuples, type SqlValue } from "../stage5-audit";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const SEED = path.join(REPO_ROOT, "supabase", "seed.sql");

interface Row {
  external_id: string;
  strand: string;
  level: string;
  is_active: boolean;
  short_test_eligible: boolean;
  content_key: string | null; // tax_content code (topic node), best-effort
}

const sql = readFileSync(SEED, "utf8");

// --- 1) INSERT blocks (first-insert-wins) -------------------------------
const bank = new Map<string, Row>();
let from = 0;
for (;;) {
  const insertIdx = sql.indexOf("insert into questions", from);
  if (insertIdx === -1) break;
  from = insertIdx + 1;
  const valuesIdx = sql.indexOf("(values", insertIdx);
  if (valuesIdx === -1) continue;
  const endIdx = sql.indexOf(") as v(", valuesIdx);
  if (endIdx === -1) continue;
  const anyNextInsert = sql.indexOf("insert into", insertIdx + 1);
  if (anyNextInsert !== -1 && valuesIdx > anyNextInsert) continue;

  const colsEnd = sql.indexOf(")", endIdx + ") as v(".length);
  const columns = sql
    .slice(endIdx + ") as v(".length, colsEnd)
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  // Strip inline `::type` casts (the overlay/young-band blocks cast inside the
  // VALUES tuples; parseSqlValuesTuples only tolerates casts in the SELECT). No
  // JSON content here contains a literal "::", so this is safe.
  const valuesText = sql
    .slice(valuesIdx + "(values".length, endIdx)
    .replace(/::[a-zA-Z_]+(\[\])?/g, "");
  const tuples = parseSqlValuesTuples(valuesText);

  for (const tuple of tuples) {
    if (tuple.length !== columns.length) {
      throw new Error(`tuple ${String(tuple.length)} vs cols ${String(columns.length)}`);
    }
    const byCol = new Map<string, SqlValue>(columns.map((c, i) => [c, tuple[i]]));
    const ext = byCol.get("external_id");
    if (typeof ext !== "string") continue;
    if (bank.has(ext)) continue; // on conflict do nothing
    bank.set(ext, {
      external_id: ext,
      strand: String(byCol.get("strand") ?? ""),
      level: String(byCol.get("level") ?? ""),
      is_active: columns.includes("is_active") ? byCol.get("is_active") === true : true,
      short_test_eligible: columns.includes("short_test_eligible")
        ? byCol.get("short_test_eligible") === true
        : false,
      content_key: columns.includes("content_key")
        ? (byCol.get("content_key") as string | null)
        : null,
    });
  }
}

// --- 2) UPDATE statements ------------------------------------------------
// Handle all three WHERE forms used in seed.sql:
//   (a) single: `where ... q.external_id = 'X'`
//   (b) list:   `where ... q.external_id in ('A','B',...)`
//   (c) join:   `from t, (values ('X','img'),...) v where ... q.external_id = v.external_id`
// The SET clause is text between `set` and the FROM clause start (`\bfrom t\b`);
// `from tax_content` subqueries are excluded by the word boundary. Targets are
// every `'SAM-...'` literal AFTER the set clause (image paths aren't SAM-prefixed,
// so the only SAM-ids in the WHERE/VALUES region are the rows being updated).
// Statement boundaries: scan quote-aware (skip `;` inside '…' strings).
function nextStatementEnd(text: string, start: number): number {
  let i = start;
  let inStr = false;
  while (i < text.length) {
    const c = text[i];
    if (inStr) {
      if (c === "'") {
        if (text[i + 1] === "'") { i += 2; continue; }
        inStr = false;
      }
    } else if (c === "'") {
      inStr = true;
    } else if (c === ";") {
      return i;
    }
    i += 1;
  }
  return text.length;
}

let applied = 0;
let uFrom = 0;
for (;;) {
  const uIdx = sql.indexOf("update questions q", uFrom);
  if (uIdx === -1) break;
  const end = nextStatementEnd(sql, uIdx);
  const stmt = sql.slice(uIdx, end);
  uFrom = end + 1;

  const setKw = /update questions q\s+set\b/.exec(stmt);
  if (!setKw) continue;
  const fromIdx = stmt.search(/\bfrom t\b/);
  const setClause = stmt.slice(setKw.index + setKw[0].length, fromIdx === -1 ? undefined : fromIdx);
  const afterSet = fromIdx === -1 ? "" : stmt.slice(fromIdx);

  const targets = [...afterSet.matchAll(/'(SAM-[A-Z0-9-]+)'/g)].map((x) => x[1]);
  if (targets.length === 0) continue;

  const act = /\bis_active\s*=\s*(true|false)\b/.exec(setClause);
  const ste = /\bshort_test_eligible\s*=\s*(true|false)\b/.exec(setClause);
  const lvl = /\blevel\s*=\s*'([^']+)'::half_grade_level/.exec(setClause);
  const strandM = /\bstrand\s*=\s*'([^']+)'::strand/.exec(setClause);
  const ckCode = /content_id\s*=\s*\(\s*select[\s\S]*?code\s*=\s*'([^']+)'/.exec(setClause);

  for (const ext of targets) {
    const row = bank.get(ext);
    if (!row) continue;
    if (act) row.is_active = act[1] === "true";
    if (ste) row.short_test_eligible = ste[1] === "true";
    if (lvl) row.level = lvl[1];
    if (strandM) row.strand = strandM[1];
    if (ckCode) row.content_key = ckCode[1];
    applied++;
  }
}

const rows = [...bank.values()].sort((a, b) => a.external_id.localeCompare(b.external_id));
writeFileSync(
  path.join(HERE, "bank-final-state.json"),
  JSON.stringify(rows, null, 2) + "\n",
);

// --- quick console summary ----------------------------------------------
const yb = rows.filter((r) => /^SAM-L0[ABC]-/.test(r.external_id));
const ybActive = yb.filter((r) => r.is_active).length;
console.log(`Parsed ${String(rows.length)} questions; applied ${String(applied)} updates.`);
console.log(
  `Young-band (SAM-L0*): ${String(yb.length)} rows = ${String(ybActive)} active / ${String(
    yb.length - ybActive,
  )} inactive.`,
);
const ybActiveSte = yb.filter((r) => r.is_active && r.short_test_eligible).length;
console.log(`Young-band active & short_test_eligible: ${String(ybActiveSte)}.`);
