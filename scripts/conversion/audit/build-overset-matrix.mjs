// Atlas Assessment — over-set / eligibility coverage matrix builder (read-only).
// Joins DB final state (bank-final-state.json) ↔ source Short key
// (source-short-keys.json), buckets by PICKER unit = (strand, booklet), and
// emits the audit matrix + Task-2/Task-3 worklists.
//
// Booklet = the picker's S.A.M. booklet level (levelBand.ts): a child is sampled
// from the previous booklet; the reserve is per (strand, booklet). DB
// half_grade_level → booklet:
import { readFileSync, writeFileSync } from "node:fs";

const HERE = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const bank = JSON.parse(readFileSync(HERE + "bank-final-state.json", "utf8"));
const keys = JSON.parse(readFileSync(HERE + "source-short-keys.json", "utf8"));

const BOOKLET = {
  "0A": "0A", "0B": "0B", "0C": "0C", KA: "0C", KB: "0C",
  "1A": "1", "1B": "1", "2A": "2", "2B": "2",
  "3A": "3", "3B": "3", "4A": "4", "4B": "4",
  "5A": "5", "5B": "5", "6A": "6", "6B": "6",
};
const BOOKLET_ORDER = ["0A", "0B", "0C", "1", "2", "3", "4", "5", "6"];
const TARGET_LO = 15, TARGET_HI = 18;

// external_id → source short (Y/N). Derived rows (Q11A-D) inherit their base task.
const shortOf = new Map();
for (const lv of Object.keys(keys)) for (const r of keys[lv]) shortOf.set(r.external_id, r.short);
function sourceShort(extId) {
  if (shortOf.has(extId)) return shortOf.get(extId) ?? "";
  const base = extId.replace(/[A-D]$/, "");
  return shortOf.get(base) ?? "";
}

// Join.
const joined = bank.map((r) => ({
  ...r,
  booklet: BOOKLET[r.level] ?? `?${r.level}`,
  short: sourceShort(r.external_id),
}));

// Cells keyed by booklet|strand.
const cells = new Map();
function cell(b, s) {
  const k = b + "|" + s;
  if (!cells.has(k)) cells.set(k, { booklet: b, strand: s, active: 0, activeSTE: 0, shortYactive: 0, shortYinactive: 0, ste_all: 0, overflag: [] , task2: [] });
  return cells.get(k);
}
for (const r of joined) {
  const c = cell(r.booklet, r.strand);
  if (r.is_active) c.active++;
  if (r.short_test_eligible) c.ste_all++;
  if (r.is_active && r.short_test_eligible) c.activeSTE++;
  if (r.short === "Y" && r.is_active) c.shortYactive++;
  if (r.short === "Y" && !r.is_active) c.shortYinactive++;
  // Task-2 candidate: source Short=Y, active, not yet STE.
  if (r.short === "Y" && r.is_active && !r.short_test_eligible) c.task2.push(r.external_id);
  // Over-flag (violates locked rule): STE=true but source Short≠Y.
  if (r.short_test_eligible && r.short !== "Y") c.overflag.push(`${r.external_id}(short=${r.short || "—"},act=${r.is_active ? 1 : 0})`);
}

// Render matrix (only booklets 0A..4, the task scope; note 5/6 separately).
const inScope = (b) => ["0A", "0B", "0C", "1", "2", "3", "4"].includes(b);
const sorted = [...cells.values()].sort((a, b) =>
  BOOKLET_ORDER.indexOf(a.booklet) - BOOKLET_ORDER.indexOf(b.booklet) || a.strand.localeCompare(b.strand));

let md = "";
md += "| Booklet | Strand | (a) active | (b) Short=Y active | Short=Y inactive | (c) active&STE | (d) b−c headroom | over-set vs 15–18 |\n";
md += "|---|---|--:|--:|--:|--:|--:|---|\n";
for (const c of sorted) {
  if (!inScope(c.booklet)) continue;
  const d = c.shortYactive - c.activeSTE;
  const ceil = c.shortYactive; // reservable ceiling = Short=Y AND active
  const verdict = ceil >= TARGET_LO ? (ceil > TARGET_HI ? `OVER (${ceil})` : `AT (${ceil})`) : `UNDER (${ceil})`;
  md += `| ${c.booklet} | ${c.strand} | ${c.active} | ${c.shortYactive} | ${c.shortYinactive} | ${c.activeSTE} | ${d} | ${verdict} |\n`;
}

// Booklet roll-ups (across strands) — the picker bands by booklet; per-strand AND per-booklet both matter.
const byBooklet = new Map();
for (const c of cells.values()) {
  if (!inScope(c.booklet)) continue;
  const b = byBooklet.get(c.booklet) ?? { active: 0, shortYactive: 0, shortYinactive: 0, activeSTE: 0 };
  b.active += c.active; b.shortYactive += c.shortYactive; b.shortYinactive += c.shortYinactive; b.activeSTE += c.activeSTE;
  byBooklet.set(c.booklet, b);
}
let roll = "| Booklet | active | Short=Y active | Short=Y inactive | active&STE | ceiling vs 15–18 |\n|---|--:|--:|--:|--:|---|\n";
for (const b of BOOKLET_ORDER) {
  if (!byBooklet.has(b)) continue;
  const x = byBooklet.get(b);
  const v = x.shortYactive >= TARGET_LO ? (x.shortYactive > TARGET_HI ? "OVER" : "AT") : "UNDER";
  roll += `| ${b} | ${x.active} | ${x.shortYactive} | ${x.shortYinactive} | ${x.activeSTE} | ${v} (${x.shortYactive}) |\n`;
}

// Task-2 worklist (active, Short=Y, ¬STE) and over-flag list.
const task2 = [...cells.values()].flatMap((c) => c.task2.map((id) => `${id} [${c.booklet}/${c.strand}]`)).sort();
const overflag = [...cells.values()].flatMap((c) => c.overflag.map((s) => `${s} [${c.booklet}/${c.strand}]`)).sort();

// Source Short=Y tasks with NO DB row (can't flag — content gap).
const dbIds = new Set(bank.map((r) => r.external_id));
const noRow = [];
for (const lv of Object.keys(keys)) for (const r of keys[lv]) if (r.short === "Y" && !dbIds.has(r.external_id)) noRow.push(`${r.external_id} (${r.topic})`);

console.log("=== PER-STRAND × BOOKLET ===\n" + md);
console.log("=== BOOKLET ROLL-UP ===\n" + roll);
console.log("=== TASK-2 candidates (active, Short=Y, not STE) ===");
console.log(task2.length ? task2.join("\n") : "(none — key-parity already closed on active rows)");
console.log("\n=== OVER-FLAGGED (STE=true but source Short≠Y) — locked-rule check ===");
console.log(overflag.length ? overflag.join("\n") : "(none)");
console.log("\n=== Source Short=Y with NO DB row (content gap) ===");
console.log(noRow.length ? noRow.join("\n") : "(none)");

writeFileSync(HERE + "_matrix.md", "## Per-strand × booklet\n\n" + md + "\n## Booklet roll-up\n\n" + roll, "utf8");
