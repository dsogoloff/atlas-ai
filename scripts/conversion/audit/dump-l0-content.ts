// Atlas Assessment — effective L0 content dump + cross-level duplicate detector.
//
// Replays supabase/seed.sql (INSERT first-wins + UPDATE last-writer, evaluating the
// is_active=false/true guard we can see) to compute the EFFECTIVE row state for every
// SAM-L0A / SAM-L0B / SAM-L0C question, then prints (external_id, level, is_active,
// format, stem, image keys) and flags any ACTIVE rows whose content is byte-identical
// across DIFFERENT external_ids (the L0A↔L0B identity bug).
//
// Run: pnpm tsx scripts/conversion/audit/dump-l0-content.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const SEED = path.join(REPO_ROOT, "supabase", "seed.sql");

function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let inStr = false, cur = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (inStr) {
      if (c === "'") { if (sql[i + 1] === "'") { cur += "''"; i++; continue; } inStr = false; }
      cur += c; continue;
    }
    if (c === "-" && sql[i + 1] === "-") { while (i < sql.length && sql[i] !== "\n") i++; cur += "\n"; continue; }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === ";") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, inStr = false, cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "'") { if (s[i + 1] === "'") { cur += "''"; i++; continue; } inStr = false; cur += c; continue; }
      cur += c; continue;
    }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    if (c === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function tuplesIn(text: string): string[] {
  const out: string[] = [];
  let depth = 0, inStr = false, start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (c === "'") { if (text[i + 1] === "'") { i++; continue; } inStr = false; } continue; }
    if (c === "'") { inStr = true; continue; }
    if (c === "(") { if (depth === 0) start = i + 1; depth++; }
    else if (c === ")") { depth--; if (depth === 0 && start >= 0) { out.push(text.slice(start, i)); start = -1; } }
  }
  return out;
}
function unquote(v: string): string {
  const t = v.trim();
  if (t.startsWith("'")) { const end = t.lastIndexOf("'"); return t.slice(1, end).replace(/''/g, "'"); }
  return t;
}
function stripCast(v: string): string { return v.trim().replace(/::[a-zA-Z_\[\]" ]+$/, "").trim(); }
function stemOf(content: string): string {
  const m = content.match(/"stem"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\n/g, " ").trim() : "";
}
function imagesOf(content: string): string[] {
  return [...content.matchAll(/"image_path"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
}

interface Row { external_id: string; level: string; format: string; is_active: boolean; content: string; }

const sql = readFileSync(SEED, "utf8").split("DO NOT SHIP")[0];
const stmts = splitStatements(sql);
const rows = new Map<string, Row>();

// INSERTs (first-wins)
for (const block of stmts) {
  if (!/insert\s+into\s+questions\b/i.test(block)) continue;
  const aliasM = block.match(/as\s+v\s*\(([^)]*)\)/i);
  if (!aliasM) continue;
  const cols = aliasM[1].split(",").map((c) => c.trim());
  const valuesM = block.match(/\bvalues\b([\s\S]*?)\)\s*as\s+v\s*\(/i);
  if (!valuesM) continue;
  const insM = block.match(/insert\s+into\s+questions\s*\(([^)]*)\)/i);
  const targetCols = insM ? insM[1].split(",").map((c) => c.trim()).filter((c) => c !== "tenant_id") : [];
  const projM = block.match(/\bselect\b([\s\S]*?)\bfrom\s+t\b/i);
  const proj = projM ? splitTopLevel(projM[1]).map((p) => p.trim()).slice(1) : [];
  const blockDefaults: Record<string, string> = {};
  for (let j = cols.length; j < targetCols.length; j++) if (proj[j] !== undefined) blockDefaults[targetCols[j]] = proj[j];
  for (const tup of tuplesIn(valuesM[1])) {
    const vals = splitTopLevel(tup);
    if (vals.length !== cols.length) continue;
    const rec: Record<string, string> = { ...blockDefaults };
    cols.forEach((c, i) => (rec[c] = vals[i]));
    const ext = unquote(rec["external_id"] ?? "");
    if (!/^SAM-L0/.test(ext)) continue;
    if (rows.has(ext)) continue;
    rows.set(ext, {
      external_id: ext,
      level: unquote(rec["level"] ?? ""),
      format: unquote(rec["format"] ?? ""),
      is_active: /true/i.test(rec["is_active"] ?? "false"),
      content: unquote(stripCast(rec["content"] ?? "''")),
    });
  }
}
// UPDATEs (last-writer)
for (const stmt of stmts) {
  const m = stmt.match(/update\s+questions\s+q?\s*set\b([\s\S]*?)\bwhere\b([\s\S]*)$/i);
  if (!m) continue;
  const setClause = m[1], whereClause = m[2];
  const ids = new Set<string>();
  const eqM = whereClause.match(/external_id\s*=\s*'([^']+)'/);
  if (eqM) ids.add(eqM[1]);
  const inM = whereClause.match(/external_id\s+in\s*\(([\s\S]*?)\)/i);
  if (inM) for (const x of inM[1].matchAll(/'([^']+)'/g)) ids.add(x[1]);
  if (ids.size === 0) continue;
  const guardM = whereClause.match(/is_active\s*=\s*(true|false)/i);
  const guardActive = guardM ? /true/i.test(guardM[1]) : null;
  const setActive = setClause.match(/\bis_active\s*=\s*(true|false)/i);
  const setLevel = setClause.match(/\blevel\s*=\s*'([^']+)'/i);
  const setFormat = setClause.match(/\bformat\s*=\s*'([^']+)'/i);
  const setContent = setClause.match(/\bcontent\s*=\s*('(?:[^']|'')*')/i);
  for (const id of ids) {
    const r = rows.get(id);
    if (!r) continue;
    if (guardActive !== null && r.is_active !== guardActive) continue;
    if (setActive) r.is_active = /true/i.test(setActive[1]);
    if (setLevel) r.level = setLevel[1];
    if (setFormat) r.format = setFormat[1];
    if (setContent) r.content = unquote(setContent[1]);
  }
}

const all = [...rows.values()].sort((a, b) => a.external_id.localeCompare(b.external_id));
const active = all.filter((r) => r.is_active);

console.log(`\n=== ACTIVE L0 rows (${active.length}) ===`);
console.log("external_id        | level | format               | stem");
for (const r of active) {
  console.log(`${r.external_id.padEnd(18)} | ${r.level.padEnd(5)} | ${r.format.padEnd(20)} | ${stemOf(r.content).slice(0, 70)}`);
}

// Cross-id duplicate detection (active only): identical content OR identical (stem+images).
console.log(`\n=== DUPLICATE content across DIFFERENT external_ids (active) ===`);
const byContent = new Map<string, string[]>();
const byStemImg = new Map<string, string[]>();
for (const r of active) {
  const ck = r.content.replace(/\s+/g, " ").trim();
  (byContent.get(ck) ?? byContent.set(ck, []).get(ck)!).push(r.external_id);
  const sk = JSON.stringify([stemOf(r.content), imagesOf(r.content).sort()]);
  (byStemImg.get(sk) ?? byStemImg.set(sk, []).get(sk)!).push(r.external_id);
}
let found = false;
for (const [, ids] of byContent) if (ids.length > 1) { found = true; console.log(`  IDENTICAL CONTENT: ${ids.join(", ")}`); }
for (const [k, ids] of byStemImg) if (ids.length > 1) {
  const [stem] = JSON.parse(k) as [string, string[]];
  found = true; console.log(`  SAME STEM+IMAGES: ${ids.join(", ")}  -> "${stem.slice(0, 60)}"`);
}
if (!found) console.log("  (none)");
