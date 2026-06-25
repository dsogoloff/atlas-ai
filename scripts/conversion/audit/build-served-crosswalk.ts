// Atlas Assessment — SHORT-TEST served-order → external_id crosswalk (audit).
//
// Replays the REAL adaptive engine offline against supabase/seed.sql, per QA-seed
// child, so every founder QA note ("L2-Q1…") pins to an exact row. The short test
// is response-adaptive (next item depends on prior correctness), so a single
// deterministic sequence does not exist — but the QA bank is thin, so every test
// BANK-EXHAUSTS and the served SET == the full eligible-in-band inventory; only the
// order varies. We emit (a) the full eligible set per child and (b) a canonical
// served order for the all-correct AND all-incorrect answer paths (these bracket
// any real play-through). Selection reuses the real engine + picker comparator, so
// the order is faithful, not re-derived.
//
// Output: scripts/conversion/audit/served-crosswalk.md (+ .json).
// Run: pnpm tsx scripts/conversion/audit/build-served-crosswalk.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createEngineState,
  applyResponse,
} from "../../../src/lib/engine/engine";
import {
  SHORT_TEST_CONFIG,
  shortTestNextQuestionRequest,
  shortTestShouldTerminate,
} from "../../../src/lib/engine/shortTest";
import { anchorBookletForChild, shortTestLevelBand } from "../../../src/lib/questionPicker/levelBand";

// Inlined verbatim from src/lib/questionPicker/picker.ts compareCandidates (that
// module imports `server-only` and can't load under tsx). Nearest-difficulty,
// then external_id asc (null last), then id — a total order.
function compareCandidates(target: number) {
  return (a: { difficulty: number; external_id: string | null; id: string }, b: { difficulty: number; external_id: string | null; id: string }): number => {
    const da = Math.abs(a.difficulty - target);
    const db = Math.abs(b.difficulty - target);
    if (da !== db) return da - db;
    if (a.external_id === null && b.external_id !== null) return 1;
    if (a.external_id !== null && b.external_id === null) return -1;
    if (a.external_id !== null && b.external_id !== null && a.external_id !== b.external_id) {
      return a.external_id < b.external_id ? -1 : 1;
    }
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return 0;
  };
}
import type { Strand, HalfGradeLevel, QuestionFormat } from "../../../src/lib/engine/types";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const SEED = path.join(REPO_ROOT, "supabase", "seed.sql");

// ── QA-seed children (supabase/seed.sql LOCAL-DEV QA SEED block) ──────────────
const CHILDREN = [
  { name: "QA Zero-A", grade_level: "Pre-K (age 5)", birth_year: 2021 },
  { name: "QA Zero-C", grade_level: "Pre-K", birth_year: 2020 },
  { name: "QA Level 1", grade_level: "Grade 1", birth_year: 2019 },
  { name: "QA Level 2", grade_level: "Grade 2", birth_year: 2018 },
  { name: "QA Level 3", grade_level: "Grade 3", birth_year: 2017 },
  { name: "QA Level 4", grade_level: "Grade 4", birth_year: 2016 },
];

// Prior crosswalk eligible counts under the OLD short-test band (PREVIOUS booklet
// ONLY), captured from the committed served-crosswalk.md before the band change
// (PR #139 / commit 263fa53). The band now samples {previous, current} booklet
// (levelBand.shortTestLevelBand), so every non-floor cohort widens — this is the
// delta to expect, NOT a regression. Shown per child as "prev-band → now".
const PRIOR_BAND_ELIGIBLE: Record<string, number> = {
  "QA Zero-A": 17, "QA Zero-C": 13, "QA Level 1": 8,
  "QA Level 2": 27, "QA Level 3": 25, "QA Level 4": 13,
};

interface Row {
  external_id: string;
  strand: string;
  level: string;
  difficulty: number;
  format: string;
  is_active: boolean;
  short_test_eligible: boolean;
  stem: string;
  /** Effective questions.content_id code (tax_content.code), or null. First-wins
   *  on INSERT (content_key alias), then last-writer on the content_id UPDATEs +
   *  the SAM-L2 backfill. Resolved to an AXIS-B sub-strand via tax_content. */
  content_code: string | null;
}

// ── tiny SQL helpers ─────────────────────────────────────────────────────────
/** Split a parenthesised tuple body on top-level commas, respecting '…' strings (with '' escapes). */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, inStr = false, cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "'") {
        if (s[i + 1] === "'") { cur += "''"; i++; continue; }
        inStr = false; cur += c; continue;
      }
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

/** Match the outermost (...) tuples in a VALUES list starting at index `from`. */
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
  if (t.startsWith("'")) {
    const end = t.lastIndexOf("'");
    return t.slice(1, end).replace(/''/g, "'");
  }
  return t;
}
function stripCast(v: string): string {
  return v.trim().replace(/::[a-zA-Z_\[\]" ]+$/, "").trim();
}
function stemOf(contentLiteral: string): string {
  const raw = unquote(stripCast(contentLiteral));
  const m = raw.match(/"stem"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\n/g, " ").replace(/\\"/g, '"').trim() : "";
}

/** Split SQL into top-level statements, respecting '…' strings (with '' escapes),
 *  so a `;` inside data (e.g. "9; yes") never truncates a statement. */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let inStr = false, cur = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (inStr) {
      if (c === "'") { if (sql[i + 1] === "'") { cur += "''"; i++; continue; } inStr = false; }
      cur += c; continue;
    }
    // skip `-- line comments` (their apostrophes must not start a string)
    if (c === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      cur += "\n";
      continue;
    }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === ";") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// ── parse seed into effective rows (INSERT first-wins + UPDATE last-writer) ───
function parseRows(sql: string): Map<string, Row> {
  const rows = new Map<string, Row>();
  const stmts = splitStatements(sql);

  // INSERT statements: `insert into questions (targetCols) select t.id, <proj…>
  // from t, (values …) as v(<aliasCols>) …`. The first aliasCols projections are
  // per-tuple (v.col); any trailing projections are block-wide literals (e.g.
  // `…representation_kind, true` → is_active=true for every row in the block).
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
    const proj = projM ? splitTopLevel(projM[1]).map((p) => p.trim()).slice(1) : []; // drop t.id
    // block-wide literal defaults for columns beyond the alias (is_active/ste/…)
    const blockDefaults: Record<string, string> = {};
    for (let j = cols.length; j < targetCols.length; j++) {
      if (proj[j] !== undefined) blockDefaults[targetCols[j]] = proj[j];
    }
    for (const tup of tuplesIn(valuesM[1])) {
      const vals = splitTopLevel(tup);
      if (vals.length !== cols.length) continue;
      const rec: Record<string, string> = { ...blockDefaults };
      cols.forEach((c, i) => (rec[c] = vals[i]));
      const ext = unquote(rec["external_id"] ?? "");
      if (!/^SAM-/.test(ext)) continue;
      if (rows.has(ext)) continue; // on conflict do nothing → first insert wins
      // content_id (AXIS-B) seed: the `content_key` alias column carries the
      // tax_content code literal (or `null`) per tuple. Blocks without that alias
      // leave content_code null until an UPDATE assigns it. First-wins with the row.
      let contentCode: string | null = null;
      if (cols.includes("content_key")) {
        const raw = (rec["content_key"] ?? "").trim();
        contentCode = raw === "" || /^null$/i.test(raw) ? null : unquote(raw);
      }
      rows.set(ext, {
        external_id: ext,
        strand: unquote(rec["strand"] ?? ""),
        level: unquote(rec["level"] ?? ""),
        difficulty: parseFloat(stripCast(rec["difficulty"] ?? "0")),
        format: unquote(rec["format"] ?? ""),
        is_active: /true/i.test(rec["is_active"] ?? "false"),
        short_test_eligible: /true/i.test(rec["short_test_eligible"] ?? "false"),
        stem: stemOf(rec["content"] ?? "''"),
        content_code: contentCode,
      });
    }
  }

  // UPDATE statements in file order (last writer wins). Apply guards we can evaluate.
  for (const stmt of stmts) {
    const m = stmt.match(/update\s+questions\s+q?\s*set\b([\s\S]*?)\bwhere\b([\s\S]*)$/i);
    if (!m) continue;
    const setClause = m[1];
    const whereClause = m[2];
    // target ids
    const ids = new Set<string>();
    const eqM = whereClause.match(/external_id\s*=\s*'([^']+)'/);
    if (eqM) ids.add(eqM[1]);
    const inM = whereClause.match(/external_id\s+in\s*\(([\s\S]*?)\)/i);
    if (inM) for (const x of inM[1].matchAll(/'([^']+)'/g)) ids.add(x[1]);
    // UPDATE … from (values (…)) as v(…) where external_id = v.external_id —
    // the target ids are the SAM-* literals in the values list (in setClause).
    if (ids.size === 0 && /v\.external_id/i.test(whereClause)) {
      for (const x of setClause.matchAll(/'(SAM-L\d+[A-Z]?-Q\d+[A-Z]?)'/g)) ids.add(x[1]);
    }
    // SAM-L2 per-question content_id backfill: `set content_id = tc.id from … ,
    // (values ('SAM-…','code'),…) as m(external_id, content_code) where …
    // q.external_id = m.external_id and q.content_id is null and tc.code =
    // m.content_code`. Maps external_id → content_code directly; honor the
    // `content_id is null` guard (apply only where content_code is still null).
    if (/as\s+m\s*\(\s*external_id\s*,\s*content_code\s*\)/i.test(stmt)) {
      const mvalsM = stmt.match(/\bvalues\b([\s\S]*?)\)\s*as\s+m\s*\(/i);
      const guardNull = /content_id\s+is\s+null/i.test(whereClause);
      if (mvalsM) {
        for (const tup of tuplesIn(mvalsM[1])) {
          const vals = splitTopLevel(tup);
          if (vals.length < 2) continue;
          const ext = unquote(vals[0]);
          const code = unquote(vals[1]);
          const r = rows.get(ext);
          if (!r) continue;
          if (guardNull && r.content_code !== null) continue;
          r.content_code = code;
        }
      }
      continue;
    }
    if (ids.size === 0) continue;
    // guard: `and q.is_active = false/true`
    const guardM = whereClause.match(/is_active\s*=\s*(true|false)/i);
    const guardActive = guardM ? /true/i.test(guardM[1]) : null;

    const setActive = setClause.match(/\bis_active\s*=\s*(true|false)/i);
    const setSte = setClause.match(/\bshort_test_eligible\s*=\s*(true|false)/i);
    const setLevel = setClause.match(/\blevel\s*=\s*'([^']+)'/i);
    const setFormat = setClause.match(/\bformat\s*=\s*'([^']+)'/i);
    const setStrand = setClause.match(/\bstrand\s*=\s*'([^']+)'/i);
    const setContent = setClause.match(/\bcontent\s*=\s*('(?:[^']|'')*'(?:::jsonb)?)/i);
    // content_id (AXIS-B): either `content_id = null` (clears) or
    // `content_id = (select tc.id … tc.code = 'CODE')` (sets CODE). Last-writer.
    // Match against the FULL statement, not setClause: the set/where split stops
    // at the FIRST `where`, which is the content_id SUBQUERY's own `where` — so
    // the `tc.code = 'CODE'` literal lives past the split. The only `tc.code =
    // 'literal'` in any questions UPDATE is this content_id subquery, so a
    // whole-statement match is unambiguous (the join backfill uses `tc.code =
    // case…`/`ss.code`, never a `tc.code = 'literal'`).
    const setContentIdNull = /\bcontent_id\s*=\s*null\b/i.test(setClause);
    const setContentIdCode = stmt.match(
      /\bcontent_id\s*=\s*\(\s*select[\s\S]*?tc\.code\s*=\s*'([^']+)'/i,
    );

    for (const id of ids) {
      const r = rows.get(id);
      if (!r) continue;
      if (guardActive !== null && r.is_active !== guardActive) continue; // guard fails → no-op
      if (setActive) r.is_active = /true/i.test(setActive[1]);
      if (setSte) r.short_test_eligible = /true/i.test(setSte[1]);
      if (setLevel) r.level = setLevel[1];
      if (setFormat) r.format = setFormat[1];
      if (setStrand) r.strand = setStrand[1];
      if (setContent) { const s = stemOf(setContent[1]); if (s) r.stem = s; }
      if (setContentIdNull) r.content_code = null;
      else if (setContentIdCode) r.content_code = setContentIdCode[1];
    }
  }
  return rows;
}

// ── AXIS-B sub-strand resolver (offline mirror of subStrandCoverage.ts) ───────
// content_id → sub-strand, resolved entirely from seed.sql:
//   (1) tax_content blocks give code → sub_strand_code (alias field0 → field1);
//   (2) the per-question content_code assignments (captured into Row.content_code
//       by parseRows) give external_id → code.
// Fallback for the single-bucket AXIS-A strands (geometry / measurement /
// data_statistics) mirrors the general join backfill (seed.sql:830) — each maps
// to exactly ONE sub-strand, so this can never change #161 within-strand pick
// order; it only marks the sub-strand covered for the served set. An explicit
// per-question content_code (when present) always wins over this fallback.
function buildContentCodeToSub(sql: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const block of splitStatements(sql)) {
    if (!/insert\s+into\s+tax_content\b/i.test(block)) continue;
    const aliasM = block.match(/as\s+v\s*\(([^)]*)\)/i);
    if (!aliasM) continue;
    const cols = aliasM[1].split(",").map((c) => c.trim());
    const codeIdx = cols.indexOf("code");
    const subIdx = cols.indexOf("sub_strand_code");
    if (codeIdx < 0 || subIdx < 0) continue;
    const valuesM = block.match(/\bvalues\b([\s\S]*?)\)\s*as\s+v\s*\(/i);
    if (!valuesM) continue;
    for (const tup of tuplesIn(valuesM[1])) {
      const vals = splitTopLevel(tup);
      if (vals.length !== cols.length) continue;
      const code = unquote(vals[codeIdx]);
      const sub = unquote(vals[subIdx]);
      if (!map.has(code)) map.set(code, sub); // on conflict do nothing
    }
  }
  return map;
}

const FIXED_STRAND_SUBSTRAND: Readonly<Record<string, string>> = {
  geometry: "geometry",
  measurement: "measurement",
  data_statistics: "data_representation",
};

/** A Row's AXIS-B sub-strand code, or null. Explicit per-question content_code
 *  wins; else the single-bucket strand fallback; else unresolved (null). */
function subStrandOf(r: Row, codeToSub: ReadonlyMap<string, string>): string | null {
  if (r.content_code) {
    const sub = codeToSub.get(r.content_code);
    if (sub) return sub;
  }
  return FIXED_STRAND_SUBSTRAND[r.strand] ?? null;
}

// ── replay one child ─────────────────────────────────────────────────────────
// Mirrors the LIVE short-test handler (responseSubmit): the short-test coverage
// router (shortTestNextQuestionRequest) + the coverage+count stop
// (shortTestShouldTerminate — soft floor 10, HARD cap 15). The engine's generic
// nextQuestionRequest / shouldTerminate (MAX_QUESTIONS=25) are NOT used here —
// that was the old model and overstated served length once the eligible pool
// widened past 15 (PR #139/#140). availableByStrand mirrors the picker's
// discoverShortEligibleCounts (count of eligible items per strand in band).
function replay(
  child: typeof CHILDREN[number],
  all: Row[],
  isCorrect: boolean,
  // When true, model PR #161: within a router-chosen AXIS-A strand, prefer a
  // candidate whose AXIS-B sub-strand isn't yet served this session (breadth-
  // first), nearest-difficulty as the within-group tiebreak. When false: the
  // pre-#161 nearest-difficulty-only selection.
  modelCoverage: boolean,
  codeToSub: ReadonlyMap<string, string>,
) {
  const band = new Set(shortTestLevelBand(anchorBookletForChild(child.grade_level, child.birth_year)));
  const eligible = all.filter((r) => r.is_active && r.short_test_eligible && band.has(r.level));
  const availableByStrand = new Map<Strand, number>();
  for (const r of eligible) {
    const s = r.strand as Strand;
    availableByStrand.set(s, (availableByStrand.get(s) ?? 0) + 1);
  }
  let state = createEngineState({ grade: child.grade_level as never });
  const excluded = new Set<Strand>();
  const strandCounts: Partial<Record<Strand, number>> = {};
  const served: Row[] = [];
  const servedIds = new Set<string>();
  // AXIS-B sub-strands served this session (the #161 breadth-first exclusion
  // set). Checked BEFORE each step's serve, updated AFTER it.
  const servedSubs = new Set<string>();
  // synthetic uuid per external_id for the engine's id field (stable, deterministic)
  const idOf = (r: Row) => r.external_id;
  for (let guard = 0; guard < 100; guard++) {
    const req = shortTestNextQuestionRequest({
      state,
      strandCounts,
      availableByStrand,
      excludedStrands: excluded,
    });
    if (req === null) break;
    const cands = eligible
      .filter((r) => r.strand === req.strand && !servedIds.has(r.external_id))
      .map((r) => ({ id: idOf(r), external_id: r.external_id, difficulty: r.difficulty, row: r }));
    if (cands.length === 0) { excluded.add(req.strand); continue; }
    const nearest = compareCandidates(req.targetDifficulty);
    if (modelCoverage) {
      // PRIMARY: extendsCoverage (0 = sub-strand not yet served → preferred).
      // A row with a NULL/unresolvable sub-strand is treated as already-covered
      // (value 1), exactly like shortTestPicker.coveragePredicate. SECONDARY:
      // nearest-difficulty. Graceful fallback: when every candidate shares one
      // coverage value the order is byte-identical to nearest-difficulty alone.
      cands.sort((a, b) => {
        const sa = subStrandOf(a.row, codeToSub);
        const sb = subStrandOf(b.row, codeToSub);
        const ea = sa !== null && !servedSubs.has(sa) ? 0 : 1;
        const eb = sb !== null && !servedSubs.has(sb) ? 0 : 1;
        if (ea !== eb) return ea - eb;
        return nearest(a, b);
      });
    } else {
      cands.sort(nearest);
    }
    const pick = cands[0];
    served.push(pick.row);
    servedIds.add(pick.row.external_id);
    if (modelCoverage) {
      const sub = subStrandOf(pick.row, codeToSub);
      if (sub !== null) servedSubs.add(sub); // mark covered AFTER serving
    }
    strandCounts[req.strand] = (strandCounts[req.strand] ?? 0) + 1;
    state = applyResponse(
      state,
      {
        id: pick.id,
        strand: req.strand,
        // level/format are unused by applyResponse (it reads strand + difficulty
        // only) but EngineQuestion requires them; carry the row's values, cast
        // from the parser's plain strings to the enum types.
        level: pick.row.level as HalfGradeLevel,
        difficulty: pick.difficulty,
        format: pick.row.format as QuestionFormat,
      },
      { questionId: pick.id, strand: req.strand, isCorrect, takenSeconds: 10 },
    );
    // Post-state stop check, exactly as the handler does it.
    if (shortTestShouldTerminate({ state, strandCounts, availableByStrand }).done) break;
  }
  return { band: [...band], eligible, served };
}

// ── main ─────────────────────────────────────────────────────────────────────
// Question rows all live before the LOCAL-DEV QA SEED block (a `do $$…$$` block
// whose dollar-quoted body would confuse the '-string splitter). Cut it off.
const sql = readFileSync(SEED, "utf8").split("DO NOT SHIP")[0];
const rows = parseRows(sql);
const all = [...rows.values()];
const codeToSub = buildContentCodeToSub(sql);

// Canonical replay models PR #161 (coverage-aware). modelCoverage=false is the
// pre-#161 nearest-difficulty-only baseline, kept for the isolation diff below.
const MODEL_COVERAGE = true;

const lines: string[] = [];
const json: Record<string, unknown> = {};
lines.push("# Short-test served-order → external_id crosswalk (QA seed)");
lines.push("");
lines.push("Generated by `scripts/conversion/audit/build-served-crosswalk.ts` (replays the real");
lines.push("SHORT-TEST stop + router against `supabase/seed.sql`: coverage router");
lines.push(`(shortTestNextQuestionRequest) + coverage/count stop (soft floor ${String(SHORT_TEST_CONFIG.softFloor)}, HARD cap`);
lines.push(`${String(SHORT_TEST_CONFIG.hardCap)}). The test is RESPONSE-ADAPTIVE, so order depends on answers. Now that the`);
lines.push("eligible pool is wider than the cap, a test STOPS at the 10–15 range instead of");
lines.push("bank-exhausting — so the served set is a ≤15 SAMPLE of the eligible-in-band set, NOT the");
lines.push("whole set (items never reached within the cap show position '—'). Two canonical orders are");
lines.push("shown (all-correct / all-incorrect) which bracket any real play-through. Match founder QA");
lines.push("notes by CONTENT.");
lines.push("");
lines.push("This replay models PR #161: within a router-chosen AXIS-A strand the picker is");
lines.push("sub-strand-coverage-governed — it serves an item whose AXIS-B sub-strand has NOT yet");
lines.push("been covered this session BEFORE deepening an already-covered sub-strand (breadth-first");
lines.push("across sub-strands), with the prior nearest-difficulty order as the within-group tiebreak.");
lines.push("Sub-strands are resolved entirely offline from `seed.sql`: each question's content_id");
lines.push("assignment (content_key INSERTs + the SAM-L2 backfill + the content_id UPDATEs) →");
lines.push("`tax_content.code` → `sub_strand_code`. Rows with a NULL/unresolvable content_id don't");
lines.push("extend coverage (they sort after breadth-extending items), so order can only ever match");
lines.push("or refine the pre-#161 nearest-difficulty selection, never regress it.");
lines.push("");

for (const child of CHILDREN) {
  const correct = replay(child, all, true, MODEL_COVERAGE, codeToSub);
  const incorrect = replay(child, all, false, MODEL_COVERAGE, codeToSub);
  const got = correct.eligible.length;
  const prev = PRIOR_BAND_ELIGIBLE[child.name];
  const note =
    prev === undefined ? "no prior-band count"
    : got === prev ? `unchanged from prev-band (${prev})`
    : `prev-band {previous-only} eligible ${prev} → now ${got} (band widened to {previous,current})`;
  lines.push(`## ${child.name} (${child.grade_level}) — band {${correct.band.join(",")}} — eligible ${got} (${note}) — served ${correct.served.length}/${incorrect.served.length} (cap ${SHORT_TEST_CONFIG.hardCap})`);
  lines.push("");
  lines.push("| pos(correct) | pos(incorrect) | external_id | format | strand | level | diff | stem |");
  lines.push("|---|---|---|---|---|---|---|---|");
  const posC = new Map(correct.served.map((r, i) => [r.external_id, i + 1]));
  const posI = new Map(incorrect.served.map((r, i) => [r.external_id, i + 1]));
  const ordered = [...correct.eligible].sort(
    (a, b) => (posC.get(a.external_id) ?? 999) - (posC.get(b.external_id) ?? 999),
  );
  for (const r of ordered) {
    const snip = r.stem.length > 70 ? r.stem.slice(0, 67) + "…" : r.stem;
    lines.push(`| ${posC.get(r.external_id) ?? "—"} | ${posI.get(r.external_id) ?? "—"} | ${r.external_id} | ${r.format} | ${r.strand} | ${r.level} | ${r.difficulty} | ${snip.replace(/\|/g, "\\|")} |`);
  }
  lines.push("");
  json[child.name] = {
    band: correct.band, eligible_count: got, prior_band_eligible: prev ?? null,
    hard_cap: SHORT_TEST_CONFIG.hardCap,
    served_count_correct: correct.served.length,
    served_count_incorrect: incorrect.served.length,
    served_all_correct: correct.served.map((r) => r.external_id),
    served_all_incorrect: incorrect.served.map((r) => r.external_id),
    items: correct.eligible.map((r) => ({ external_id: r.external_id, format: r.format, strand: r.strand, level: r.level, difficulty: r.difficulty, stem: r.stem })),
  };
}

lines.push(`---`);
lines.push(`Length: every short test stops in the ${String(SHORT_TEST_CONFIG.softFloor)}–${String(SHORT_TEST_CONFIG.hardCap)} range — soft floor ${String(SHORT_TEST_CONFIG.softFloor)}, HARD cap`);
lines.push(`${String(SHORT_TEST_CONFIG.hardCap)} — regardless of how deep the eligible pool is. (An earlier version of this`);
lines.push(`script modelled the short test with the generic engine stop, MAX_QUESTIONS=25, and so`);
lines.push(`overstated served length up to 25 once the pool widened; it now replays the real short-test`);
lines.push(`stop + router, matching responseSubmit.)`);
lines.push(``);
lines.push(`Band change (PR #139 / 263fa53): the short test samples {previous, current} booklet instead`);
lines.push(`of previous-only. Every non-floor cohort's eligible pool widened — Zero-A 17→30, Zero-C`);
lines.push(`13→21, L1 8→35, L2 27→52, L3 25→38, L4 13→18 — and the youngest cohorts no longer collapse`);
lines.push(`to an identical 0A-only pool (each now includes its OWN booklet level). Pin founder notes by`);
lines.push(`CONTENT, not served position (order is response-adaptive).`);

mkdirSync(HERE, { recursive: true });
writeFileSync(path.join(HERE, "served-crosswalk.md"), lines.join("\n") + "\n");
writeFileSync(path.join(HERE, "served-crosswalk.json"), JSON.stringify(json, null, 2) + "\n");
process.stdout.write(`[crosswalk] parsed ${String(all.length)} rows across ${String(CHILDREN.length)} children (modelCoverage=${String(MODEL_COVERAGE)})\n`);

// ── DIAGNOSTICS (stdout only; not part of the committed artifacts) ────────────

// (1) Sub-strand resolution validation — active & short_test_eligible rows,
//     resolved vs NULL, per AXIS-A engine strand.
process.stdout.write(`\n[validation] sub-strand resolution for is_active AND short_test_eligible rows:\n`);
const byStrand = new Map<string, { resolved: number; nul: number }>();
let totResolved = 0, totNull = 0;
for (const r of all) {
  if (!(r.is_active && r.short_test_eligible)) continue;
  const sub = subStrandOf(r, codeToSub);
  const bucket = byStrand.get(r.strand) ?? { resolved: 0, nul: 0 };
  if (sub === null) { bucket.nul++; totNull++; } else { bucket.resolved++; totResolved++; }
  byStrand.set(r.strand, bucket);
}
for (const [strand, b] of [...byStrand.entries()].sort()) {
  process.stdout.write(
    `  ${strand.padEnd(22)} resolved=${String(b.resolved).padStart(3)}  null=${String(b.nul).padStart(3)}\n`,
  );
}
process.stdout.write(`  ${"TOTAL".padEnd(22)} resolved=${String(totResolved).padStart(3)}  null=${String(totNull).padStart(3)}\n`);

// (2) PR #161 isolated effect: compare modelCoverage true vs false on the SAME
//     seed, per child, for both answer paths. Reports exact served-order diffs.
process.stdout.write(`\n[#161 isolation] modelCoverage=true vs =false (same seed), per child:\n`);
let anyDiff = false;
for (const child of CHILDREN) {
  for (const [path_, isCorrect] of [["all-correct", true], ["all-incorrect", false]] as const) {
    const withCov = replay(child, all, isCorrect, true, codeToSub).served.map((r) => r.external_id);
    const noCov = replay(child, all, isCorrect, false, codeToSub).served.map((r) => r.external_id);
    const same = withCov.length === noCov.length && withCov.every((x, i) => x === noCov[i]);
    if (same) {
      process.stdout.write(`  ${child.name} [${path_}]: identical (${String(withCov.length)} served)\n`);
    } else {
      anyDiff = true;
      process.stdout.write(`  ${child.name} [${path_}]: DIFFERS\n`);
      process.stdout.write(`      #161(true) : ${withCov.join(" → ")}\n`);
      process.stdout.write(`      pre (false): ${noCov.join(" → ")}\n`);
    }
  }
}
process.stdout.write(`\n[#161 isolation] any served-order change for QA children: ${anyDiff ? "YES" : "NO"}\n`);
