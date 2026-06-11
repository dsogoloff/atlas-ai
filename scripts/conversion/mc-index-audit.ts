// Atlas Assessment — QA Bucket 1: MULTIPLE_CHOICE correct_index
// re-derivation audit.
//
// Motivated by the proven SAM-L3-Q11 off-by-one: the Level 3 answer key
// prints bare 1-BASED option numbers ("1" = first option), but Stage 3's
// structured output emitted that "1" as if it were a 0-based index
// (correct_index=1 → second option). Its own review_flags even said
// "correct_index corrected to 0" while the JSON field stayed 1. This
// script re-derives the correct 0-based index for EVERY multiple-choice
// question in the loaded bank straight from the parsed answer-key marker
// (Stage 2 `correct_answer.raw_answer`) and compares it against the
// stored `correct_index`, to establish whether the off-by-one is
// systemic or isolated.
//
// Marker interpretation (pure, conservative — see rederiveMcIndex):
//   * "(N)" explicit option marker (S.A.M. prints option numbers in
//     parentheses) → definitive 1-based ordinal → index N-1.
//   * bare small integer N within 1..len(options) → 1-based ordinal
//     reading → index N-1.
//   * key text equal to an option's normalized text → text-match reading.
//   * When BOTH readings exist and disagree, the row is AMBIGUOUS — both
//     readings are recorded, nothing is guessed.
//   * A key value that an option merely EVALUATES to (key "27", option
//     "9 x 3") is recorded as secondary evidence, never as a primary
//     reading.
//
// Verdicts: MATCH / MISMATCH / AMBIGUOUS / NO-KEY (no stage2 lineage, or
// a key marker that is not mechanically interpretable — the note says
// which). ANALYSIS ONLY: this script modifies no data and no SQL. Outputs
// are docs/mc-index-rederivation-<date>.md plus one summary line appended
// to scripts/conversion/conversion.log.
//
// Run: pnpm convert:mc-index [--artifacts <dir>]
//   --artifacts <dir>  Stage 2/3 artifact root (default:
//                      scripts/conversion/output). The artifacts are
//                      gitignored; on a checkout without them pass the
//                      flag, e.g.
//                      pnpm convert:mc-index --artifacts \
//                        C:/Users/Acer/PROJECTS/atlas-stage4/scripts/conversion/output
//
// NOTE: the SQL/artifact parsing helpers below (evalArithmetic,
// normalizeAnswerText, parseSqlValuesTuples, parseQuestionInserts,
// parsePlaceholderRow, loadArtifacts, ...) are vendored from
// scripts/conversion/stage5-audit.ts on lane/p2p4-audit (PR #26), which
// is not on this branch. When both lanes are merged, dedupe into a shared
// module (tracked in the PR description).

import { appendFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MIGRATION_MARKER,
  SEED_BEGIN_MARKER,
  SEED_END_MARKER,
  type Stage3Output,
  type Stage3Question,
} from "./stage4-load";

// ---------------------------------------------------------------------------
// Arithmetic evaluator (pure) — vendored from stage5-audit.ts.
// ---------------------------------------------------------------------------

/** Evaluate a plain arithmetic expression ("9 × 3", "600+40+8", "6 ÷ 3",
 *  "4/9"). Returns null when the text is not safely evaluable (units,
 *  words, currency, space-grouped digits like "62 009", variables). */
export function evalArithmetic(raw: string): number | null {
  const s = raw
    .normalize("NFKC")
    .replace(/[×✕]/g, "*")
    .replace(/(?<=\d)\s*[xX]\s*(?=\d)/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .trim();
  if (s.length === 0) return null;
  if (!/^[\d\s.+\-*/()]+$/.test(s)) return null;
  // "62 009" — digit-grouping spaces are ambiguous; refuse to guess.
  if (/\d\s+\d/.test(s)) return null;

  const tokens = s.match(/\d+(?:\.\d+)?|[+\-*/()]/g);
  if (!tokens) return null;
  if (tokens.join("") !== s.replace(/\s+/g, "")) return null;

  let pos = 0;
  function parseFactor(): number | null {
    const t = tokens?.[pos];
    if (t === undefined) return null;
    if (t === "(") {
      pos += 1;
      const v = parseExpr();
      if (v === null || tokens?.[pos] !== ")") return null;
      pos += 1;
      return v;
    }
    if (t === "-") {
      pos += 1;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    if (/^\d/.test(t)) {
      pos += 1;
      return Number(t);
    }
    return null;
  }
  function parseTerm(): number | null {
    let v = parseFactor();
    if (v === null) return null;
    while (tokens?.[pos] === "*" || tokens?.[pos] === "/") {
      const op = tokens[pos];
      pos += 1;
      const r = parseFactor();
      if (r === null) return null;
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function parseExpr(): number | null {
    let v = parseTerm();
    if (v === null) return null;
    while (tokens?.[pos] === "+" || tokens?.[pos] === "-") {
      const op = tokens[pos];
      pos += 1;
      const r = parseTerm();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const result = parseExpr();
  if (result === null || pos !== tokens.length || !Number.isFinite(result)) {
    return null;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Stem target extraction (pure) — vendored from stage5-audit.ts. Used only
// as CROSS-EVIDENCE (does the stored vs re-derived option satisfy a stem-
// stated arithmetic target), never to decide a verdict.
// ---------------------------------------------------------------------------

export interface ExpectedAnswer {
  value: number;
  rule: string;
}

const ARITH_RUN = "[0-9][0-9\\s.+\\-×x*÷/()]*";

/** When the stem states a mechanically computable target, return the
 *  numeric value the CORRECT answer must equal; otherwise null. */
export function extractExpectedAnswer(stem: string): ExpectedAnswer | null {
  const s = stem.replace(/\s+/g, " ").trim();

  let m = /(\d+(?:\.\d+)?)\s+and\s+_+\s+makes?\s+(\d+(?:\.\d+)?)/i.exec(s);
  if (m) {
    return {
      value: Number(m[2]) - Number(m[1]),
      rule: `missing addend: ${m[2]} - ${m[1]} = ${String(Number(m[2]) - Number(m[1]))}`,
    };
  }

  m = /equal to (\d+(?:\.\d+)?)/i.exec(s);
  if (m) return { value: Number(m[1]), rule: `stem states target "equal to ${m[1]}"` };

  m = /makes?\s+(\d+(?:\.\d+)?)\s*[?.!]?$/i.exec(s);
  if (m) return { value: Number(m[1]), rule: `stem states target "makes ${m[1]}"` };

  m = new RegExp(`(${ARITH_RUN}?)\\s*=\\s*(?:_+|\\?)\\s*[?.!]?$`).exec(s);
  if (m) {
    const v = evalArithmetic(m[1]);
    if (v !== null) return { value: v, rule: `stem LHS "${m[1].trim()}" = ${String(v)}` };
  }

  m = /what is (\d+(?:\.\d+)?) (more|less) than (\d+(?:\.\d+)?)/i.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[3]);
    const v = m[2].toLowerCase() === "more" ? b + a : b - a;
    return { value: v, rule: `"${m[1]} ${m[2]} than ${m[3]}" = ${String(v)}` };
  }

  m = new RegExp(`what is (${ARITH_RUN})\\?`, "i").exec(s);
  if (m) {
    const v = evalArithmetic(m[1]);
    if (v !== null) return { value: v, rule: `stem asks "${m[1].trim()}" = ${String(v)}` };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Answer-key text normalization (pure) — vendored from stage5-audit.ts.
// ---------------------------------------------------------------------------

/** NFKC (folds the key PDFs' mathematical-bold digits), joins stacked
 *  fractions ("4\n9" → "4/9"), unifies dashes, collapses whitespace,
 *  lowercases. */
export function normalizeAnswerText(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/(\d)\s*\r?\n\s*(\d)/g, "$1/$2")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** "32 001" → "32001" (S.A.M. answer keys space-group thousands). */
export function stripDigitGroupSpaces(s: string): string {
  return s.replace(/(\d)\s+(?=\d)/g, "$1");
}

// ---------------------------------------------------------------------------
// THE pure function under audit: re-derive the 0-based correct index from
// the parsed answer-key marker.
// ---------------------------------------------------------------------------

export type McKeyBasis = "explicit-marker" | "ordinal" | "text-match" | "value-match";

export interface McKeyReading {
  /** 0-based option index this reading points at. */
  index: number;
  basis: McKeyBasis;
  detail: string;
}

export type RederivationKind = "UNIQUE" | "AMBIGUOUS" | "NONE";

export interface McRederivation {
  kind: RederivationKind;
  /** Primary readings (explicit-marker / ordinal / text-match). UNIQUE
   *  when every reading agrees on one index; AMBIGUOUS when readings
   *  disagree; NONE when the marker is not mechanically interpretable. */
  readings: McKeyReading[];
  /** Secondary evidence only: options whose evaluated arithmetic value
   *  equals a numeric key (key "27" vs option "9 x 3"). Indices already
   *  covered by a primary reading are omitted. Never decides a verdict. */
  valueEvidence: McKeyReading[];
}

const PLAIN_NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

/** Interpret a parsed answer-key marker against the loaded options.
 *
 *  Precedence: an explicit "(N)" option marker is definitive (S.A.M.
 *  prints option numbers in parentheses) and returns immediately —
 *  in range as the unique 1-based reading, out of range as NONE.
 *  Otherwise BOTH the text-match reading (key text equals an option's
 *  normalized text) and the 1-based ordinal reading (bare integer N in
 *  1..len(options), as the Level 3 key prints) are collected; when they
 *  point at different indices the result is AMBIGUOUS — both readings are
 *  returned and nothing is guessed. */
export function rederiveMcIndex(rawKey: string, options: string[]): McRederivation {
  const readings: McKeyReading[] = [];
  const valueEvidence: McKeyReading[] = [];
  const done = (): McRederivation => {
    const distinct = new Set(readings.map((r) => r.index));
    const kind: RederivationKind =
      distinct.size === 0 ? "NONE" : distinct.size === 1 ? "UNIQUE" : "AMBIGUOUS";
    return { kind, readings, valueEvidence };
  };

  const norm = normalizeAnswerText(rawKey);
  if (norm.length === 0 || options.length === 0) return done();

  // Explicit "(N)" option marker — definitive, 1-based.
  const paren = /^\((\d+)\)/.exec(norm);
  if (paren) {
    const ordinal = Number(paren[1]);
    if (ordinal >= 1 && ordinal <= options.length) {
      readings.push({
        index: ordinal - 1,
        basis: "explicit-marker",
        detail: `explicit option marker "(${paren[1]})" read 1-based -> index ${String(ordinal - 1)}`,
      });
    }
    return done(); // out-of-range marker -> NONE; never fall through.
  }

  // Text-match reading: key text equals an option's normalized text.
  const normCompact = stripDigitGroupSpaces(norm);
  options.forEach((option, i) => {
    const optionNorm = normalizeAnswerText(option);
    if (optionNorm === norm || stripDigitGroupSpaces(optionNorm) === normCompact) {
      readings.push({
        index: i,
        basis: "text-match",
        detail: `key text "${norm}" equals option ${String(i)} text "${option}"`,
      });
    }
  });

  // Ordinal reading: bare integer N in 1..len read as 1-based option number.
  if (PLAIN_NUMERIC_RE.test(normCompact)) {
    const value = Number(normCompact);
    if (Number.isInteger(value) && value >= 1 && value <= options.length) {
      const idx = value - 1;
      if (!readings.some((r) => r.index === idx && r.basis === "ordinal")) {
        readings.push({
          index: idx,
          basis: "ordinal",
          detail: `bare key "${normCompact}" read as 1-based option ordinal -> index ${String(idx)}`,
        });
      }
    }
    // Secondary evidence: options that arithmetically evaluate to the key value.
    options.forEach((option, i) => {
      if (readings.some((r) => r.index === i)) return;
      const v = evalArithmetic(option);
      if (v !== null && Math.abs(v - value) < 1e-9) {
        valueEvidence.push({
          index: i,
          basis: "value-match",
          detail: `option ${String(i)} "${option}" evaluates to ${String(v)} = key value`,
        });
      }
    });
  }

  return done();
}

export type McVerdict = "MATCH" | "MISMATCH" | "AMBIGUOUS" | "NO-KEY";

/** Compare the stored correct_index against the re-derivation. A missing
 *  or uninterpretable key is NO-KEY (the caller's note says which). */
export function mcVerdict(storedIndex: number | null, red: McRederivation | null): McVerdict {
  if (red === null || red.kind === "NONE") return "NO-KEY";
  if (red.kind === "AMBIGUOUS") return "AMBIGUOUS";
  return storedIndex !== null && storedIndex === red.readings[0].index ? "MATCH" : "MISMATCH";
}

// ---------------------------------------------------------------------------
// SQL VALUES parsing (pure) — vendored from stage5-audit.ts. Reads the
// loaded bank straight out of the committed SQL so the audit covers
// exactly what a `supabase db reset` (or the prod migration) inserts.
// ---------------------------------------------------------------------------

export type SqlValue = string | number | boolean | string[] | null;

/** Parse the tuples of a `(values ... ) as v(...)` block. Handles
 *  single-quoted strings with '' escaping, ADJACENT string literals
 *  separated by whitespace/newlines (Postgres concatenates them — the
 *  hand-seeded block splits its JSON content across lines this way),
 *  numbers, booleans, `array['a','b']` / `array[]::text[]`, and `--`
 *  comments outside strings. */
export function parseSqlValuesTuples(text: string): SqlValue[][] {
  const tuples: SqlValue[][] = [];
  let i = 0;
  const n = text.length;

  const skipWsAndComments = (): void => {
    for (;;) {
      while (i < n && /\s/.test(text[i])) i += 1;
      if (text.startsWith("--", i)) {
        while (i < n && text[i] !== "\n") i += 1;
        continue;
      }
      return;
    }
  };

  const parseString = (): string => {
    // caller guarantees text[i] === "'"
    let out = "";
    for (;;) {
      i += 1; // consume opening quote
      while (i < n) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") {
            out += "'";
            i += 2;
            continue;
          }
          i += 1; // closing quote
          break;
        }
        out += text[i];
        i += 1;
      }
      const save = i;
      skipWsAndComments();
      if (text[i] === "'") continue; // adjacent literal → concatenate
      i = save;
      return out;
    }
  };

  const parseValue = (): SqlValue => {
    skipWsAndComments();
    const c = text[i];
    if (c === "'") return parseString();
    if (text.slice(i).toLowerCase().startsWith("array[")) {
      i += "array[".length;
      const items: string[] = [];
      skipWsAndComments();
      while (i < n && text[i] !== "]") {
        if (text[i] === "'") items.push(parseString());
        else i += 1;
        skipWsAndComments();
        if (text[i] === ",") i += 1;
        skipWsAndComments();
      }
      i += 1; // ]
      const cast = /^::\w+\[\]/.exec(text.slice(i));
      if (cast) i += cast[0].length;
      return items;
    }
    const word = /^(true|false|null)/i.exec(text.slice(i));
    if (word) {
      i += word[1].length;
      const w = word[1].toLowerCase();
      return w === "null" ? null : w === "true";
    }
    const num = /^-?\d+(?:\.\d+)?/.exec(text.slice(i));
    if (num) {
      i += num[0].length;
      return Number(num[0]);
    }
    throw new Error(
      `parseSqlValuesTuples: unexpected token at offset ${String(i)}: ${text.slice(i, i + 30)}`,
    );
  };

  skipWsAndComments();
  while (i < n) {
    if (text[i] !== "(") break;
    i += 1; // open tuple
    const tuple: SqlValue[] = [];
    for (;;) {
      tuple.push(parseValue());
      skipWsAndComments();
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      if (text[i] === ")") {
        i += 1;
        break;
      }
      throw new Error(`parseSqlValuesTuples: expected , or ) at offset ${String(i)}`);
    }
    tuples.push(tuple);
    skipWsAndComments();
    if (text[i] === ",") {
      i += 1;
      skipWsAndComments();
    }
  }
  return tuples;
}

export type RowOrigin = "hand-seeded" | "generated" | "dev-placeholder";

export interface BankRow {
  external_id: string;
  format: string;
  content: Record<string, unknown>;
  is_active: boolean;
  origin: RowOrigin;
}

/** Parse every `insert into questions ... (values ...) as v(...)` block in
 *  the given SQL into BankRows (subset of columns this audit needs). */
export function parseQuestionInserts(sql: string, origin: RowOrigin): BankRow[] {
  const rows: BankRow[] = [];
  let from = 0;
  for (;;) {
    const insertIdx = sql.indexOf("insert into questions", from);
    if (insertIdx === -1) break;
    from = insertIdx + 1;
    const valuesIdx = sql.indexOf("(values", insertIdx);
    if (valuesIdx === -1) continue;
    const endIdx = sql.indexOf(") as v(", valuesIdx);
    if (endIdx === -1) continue;
    // Guard: the values block must belong to THIS insert — the dev
    // placeholder insert uses jsonb_build_object (no VALUES), so a naive
    // scan would otherwise latch onto a later tax_* insert's block.
    const anyNextInsert = sql.indexOf("insert into", insertIdx + 1);
    if (anyNextInsert !== -1 && valuesIdx > anyNextInsert) continue;

    const colsEnd = sql.indexOf(")", endIdx + ") as v(".length);
    const columns = sql
      .slice(endIdx + ") as v(".length, colsEnd)
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const tuples = parseSqlValuesTuples(sql.slice(valuesIdx + "(values".length, endIdx));

    for (const tuple of tuples) {
      if (tuple.length !== columns.length) {
        throw new Error(
          `questions insert tuple has ${String(tuple.length)} values for ${String(columns.length)} columns`,
        );
      }
      const byCol = new Map<string, SqlValue>(columns.map((c, idx) => [c, tuple[idx]]));
      const str = (col: string): string => {
        const v = byCol.get(col);
        if (typeof v !== "string") throw new Error(`column ${col} is not a string`);
        return v;
      };
      rows.push({
        external_id: str("external_id"),
        format: str("format"),
        content: JSON.parse(str("content")) as Record<string, unknown>,
        is_active: columns.includes("is_active") ? byCol.get("is_active") === true : true,
        origin,
      });
    }
  }
  return rows;
}

/** The Item #13a dev placeholder is inserted via jsonb_build_object (no
 *  VALUES block) — parse it with targeted patterns. Returns null when the
 *  row is absent. */
export function parsePlaceholderRow(sql: string): BankRow | null {
  const idIdx = sql.indexOf("'PLACEHOLDER-Q-IMG-GRID-001'");
  if (idIdx === -1) return null;
  const region = sql.slice(idIdx, idIdx + 2500);
  const stem = /'stem',\s*'((?:[^']|'')*)'/.exec(region);
  const correctIndex = /'correct_index',\s*(\d+)/.exec(region);
  const optionsBlock = /jsonb_build_array\(([\s\S]*?)\)/.exec(region);
  const options: string[] = [];
  if (optionsBlock) {
    const re = /'((?:[^']|'')*)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(optionsBlock[1])) !== null) options.push(m[1].replace(/''/g, "'"));
  }
  const isActive = !/^\s*false\s*(?:--.*)?$/m.test(region.split("from t")[0]);
  return {
    external_id: "PLACEHOLDER-Q-IMG-GRID-001",
    format: "MULTIPLE_CHOICE",
    content: {
      stem: stem ? stem[1].replace(/''/g, "'") : "",
      options,
      correct_index: correctIndex ? Number(correctIndex[1]) : null,
    },
    is_active: isActive,
    origin: "dev-placeholder",
  };
}

// ---------------------------------------------------------------------------
// Bank assembly (what the SQL actually inserts) — per stage5-audit.ts.
// ---------------------------------------------------------------------------

export interface BankAssembly {
  handRows: BankRow[];
  /** Generated rows that actually land (external_id not shadowed by a hand row). */
  effectiveGenerated: BankRow[];
  /** Generated rows shadowed by hand-seeded rows (on conflict do nothing). */
  shadowedDuplicates: BankRow[];
  placeholderRow: BankRow | null;
  /** Exactly what the SQL inserts: hand rows + effective generated + placeholder. */
  bank: BankRow[];
}

export function assembleBank(seedSql: string, migrationSql: string): BankAssembly {
  const seedBegin = seedSql.indexOf(SEED_BEGIN_MARKER);
  const seedEnd = seedSql.indexOf(SEED_END_MARKER);
  if (seedBegin === -1 || seedEnd === -1) {
    throw new Error("seed.sql has no stage4 generated block markers");
  }
  // Drop the mirrored generated block so only the hand-seeded inserts parse.
  const seedWithoutGenerated = seedSql.slice(0, seedBegin) + seedSql.slice(seedEnd);

  const handRows = parseQuestionInserts(seedWithoutGenerated, "hand-seeded").filter((r) =>
    r.external_id.startsWith("SAM-"),
  );
  const generatedRows = parseQuestionInserts(migrationSql, "generated");
  const placeholderRow = parsePlaceholderRow(seedSql);

  // on conflict (tenant_id, external_id) do nothing: the hand-seeded block
  // runs first on both paths, so a generated row whose external_id collides
  // with a hand-seeded row never lands.
  const handIds = new Set(handRows.map((r) => r.external_id));
  const effectiveGenerated = generatedRows.filter((r) => !handIds.has(r.external_id));
  const shadowedDuplicates = generatedRows.filter((r) => handIds.has(r.external_id));

  const bank: BankRow[] = [...handRows, ...effectiveGenerated];
  if (placeholderRow) bank.push(placeholderRow);

  return { handRows, effectiveGenerated, shadowedDuplicates, placeholderRow, bank };
}

// ---------------------------------------------------------------------------
// Stage 2/3 artifact loading — per stage5-audit.ts.
// ---------------------------------------------------------------------------

export interface KeyInfo {
  raw_answer: string;
  answer_kind: string | null;
}

interface Stage2KeyOutput {
  questions: Array<{
    task_number: number;
    correct_answer: { raw_answer: string; answer_kind: string } | null;
  }>;
}

export interface WorksheetArtifacts {
  source: string;
  byExternalId: Map<string, Stage3Question>;
  keyByTask: Map<number, KeyInfo>;
}

export async function loadArtifacts(
  artifactsDir: string,
): Promise<Map<string, WorksheetArtifacts>> {
  const bySource = new Map<string, WorksheetArtifacts>();
  let entries;
  try {
    entries = await readdir(artifactsDir, { withFileTypes: true });
  } catch {
    return bySource;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let s3: Stage3Output;
    try {
      s3 = JSON.parse(
        await readFile(path.join(artifactsDir, entry.name, "stage3-tagged.json"), "utf8"),
      ) as Stage3Output;
    } catch {
      continue;
    }
    const ws: WorksheetArtifacts = {
      source: s3.source,
      byExternalId: new Map(s3.questions.map((q) => [q.external_id, q])),
      keyByTask: new Map(),
    };
    try {
      const s2 = JSON.parse(
        await readFile(path.join(artifactsDir, entry.name, "stage2-questions.json"), "utf8"),
      ) as Stage2KeyOutput;
      for (const q of s2.questions) {
        if (q.correct_answer && typeof q.correct_answer.raw_answer === "string") {
          ws.keyByTask.set(q.task_number, {
            raw_answer: q.correct_answer.raw_answer,
            answer_kind: q.correct_answer.answer_kind,
          });
        }
      }
    } catch {
      // stage2 lineage optional — affected rows become NO-KEY.
    }
    bySource.set(s3.source, ws);
  }
  return bySource;
}

/** SAM-L<k>-Q<nn> → {level: k, task: nn}. */
export function parseExternalId(externalId: string): { level: number; task: number } | null {
  const m = /^SAM-L(\d+)-Q(\d+)$/.exec(externalId);
  if (!m) return null;
  return { level: Number(m[1]), task: Number(m[2]) };
}

export function findWorksheet(
  artifacts: Map<string, WorksheetArtifacts>,
  externalId: string,
): WorksheetArtifacts | null {
  const parsed = parseExternalId(externalId);
  if (!parsed) return null;
  const source = `Level ${String(parsed.level)} Placement Worksheet.pdf`;
  return artifacts.get(source) ?? null;
}

// ---------------------------------------------------------------------------
// Per-row audit record.
// ---------------------------------------------------------------------------

export interface McAuditRow {
  external_id: string;
  origin: RowOrigin;
  is_active: boolean;
  worksheetTask: string;
  stem: string;
  options: string[];
  storedIndex: number | null;
  keyRaw: string | null;
  rederivation: McRederivation | null;
  verdict: McVerdict;
  evidence: string[];
}

function describeIndex(index: number | null, options: string[]): string {
  if (index === null) return "null";
  const text = index >= 0 && index < options.length ? ` -> "${options[index]}"` : " (out of range)";
  return `${String(index)}${text}`;
}

/** Build the full audit record for one MC bank row (pure given inputs). */
export function auditMcRow(
  row: BankRow,
  key: KeyInfo | null,
  s3: Stage3Question | null,
  worksheetTask: string,
): McAuditRow {
  const stem = typeof row.content.stem === "string" ? row.content.stem : "";
  const options = Array.isArray(row.content.options)
    ? row.content.options.filter((o): o is string => typeof o === "string")
    : [];
  const ci = row.content.correct_index;
  const storedIndex = typeof ci === "number" && Number.isInteger(ci) ? ci : null;

  const evidence: string[] = [];
  let rederivation: McRederivation | null = null;

  if (!key) {
    evidence.push(
      row.origin === "dev-placeholder"
        ? "dev fixture — no worksheet/answer-key lineage by design"
        : "no stage2 answer-key entry found for this task",
    );
  } else {
    rederivation = rederiveMcIndex(key.raw_answer, options);
    for (const r of rederivation.readings) evidence.push(`reading [${r.basis}]: ${r.detail}`);
    for (const r of rederivation.valueEvidence) evidence.push(`evidence [${r.basis}]: ${r.detail}`);
    if (rederivation.kind === "NONE") {
      evidence.push(
        `key present but not mechanically interpretable against the options: ${JSON.stringify(
          key.raw_answer,
        )}`,
      );
    }
  }

  const verdict = mcVerdict(storedIndex, rederivation);

  if (verdict === "AMBIGUOUS" && rederivation) {
    const hit = rederivation.readings.find((r) => r.index === storedIndex);
    evidence.push(
      hit
        ? `stored index agrees with the [${hit.basis}] reading but not all readings — not auto-resolved`
        : "stored index matches NONE of the plausible readings",
    );
  }

  // Cross-evidence 1: stem-stated arithmetic target vs stored / re-derived option.
  const expected = extractExpectedAnswer(stem);
  if (expected && options.length > 0) {
    const judge = (label: string, index: number | null): void => {
      if (index === null || index < 0 || index >= options.length) return;
      const v = evalArithmetic(options[index]);
      if (v === null) return;
      const ok = Math.abs(v - expected.value) < 1e-9;
      evidence.push(
        `stem-arithmetic: ${label} option "${options[index]}" = ${String(v)} ${
          ok ? "SATISFIES" : "does NOT satisfy"
        } ${expected.rule}`,
      );
    };
    judge("stored", storedIndex);
    const uniqueRederived =
      rederivation && rederivation.kind === "UNIQUE" ? rederivation.readings[0].index : null;
    if (uniqueRederived !== null && uniqueRederived !== storedIndex) {
      judge("re-derived", uniqueRederived);
    }
  }

  // Cross-evidence 2: stage3 reasoning / review_flags that mention an index
  // or the answer key (the Q11 case wrote "correct_index corrected to 0").
  if (s3) {
    for (const flag of s3.review_flags) {
      if (/(correct_index|index|answer key|option number)/i.test(flag)) {
        evidence.push(`stage3 flag: ${flag}`);
      }
    }
    const m = /correct[_ ]?index[^.;]{0,90}/i.exec(s3.reasoning);
    if (m) evidence.push(`stage3 reasoning: "...${m[0].trim()}..."`);
  }

  return {
    external_id: row.external_id,
    origin: row.origin,
    is_active: row.is_active,
    worksheetTask,
    stem,
    options,
    storedIndex,
    keyRaw: key ? key.raw_answer : null,
    rederivation,
    verdict,
    evidence,
  };
}

export function formatLogLine(
  counts: { mc: number; match: number; mismatch: number; ambiguous: number; noKey: number },
  timestamp: string,
): string {
  return (
    `${timestamp} | mc-index-audit | mc=${String(counts.mc)} match=${String(counts.match)} ` +
    `mismatch=${String(counts.mismatch)} ambiguous=${String(counts.ambiguous)} ` +
    `no-key=${String(counts.noKey)}`
  );
}

// ---------------------------------------------------------------------------
// Runner (filesystem side).
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const DEFAULT_ARTIFACTS = path.join(HERE, "output");
const LOG_FILE = path.join(HERE, "conversion.log");
const SEED_FILE = path.join(REPO_ROOT, "supabase", "seed.sql");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");

async function findGeneratedMigration(): Promise<{ name: string; sql: string } | null> {
  let entries: string[] = [];
  try {
    entries = await readdir(MIGRATIONS_DIR);
  } catch {
    return null;
  }
  for (const name of entries) {
    if (!/_load_sam_questions\.sql$/.test(name)) continue;
    const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
    if (sql.includes(MIGRATION_MARKER)) return { name, sql };
  }
  return null;
}

function stemExcerpt(stem: string, max = 60): string {
  const flat = stem.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function mdCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function tableRow(a: McAuditRow): string {
  const rederived =
    a.rederivation === null || a.rederivation.kind === "NONE"
      ? "—"
      : a.rederivation.kind === "AMBIGUOUS"
        ? a.rederivation.readings
            .map((r) => `${describeIndex(r.index, a.options)} [${r.basis}]`)
            .join(" OR ")
        : describeIndex(a.rederivation.readings[0].index, a.options);
  return [
    a.external_id,
    a.worksheetTask,
    `"${stemExcerpt(a.stem)}"`,
    a.options.map((o, i) => `${String(i)}: ${o}`).join(" / "),
    describeIndex(a.storedIndex, a.options),
    a.keyRaw === null ? "—" : JSON.stringify(a.keyRaw),
    rederived,
    a.verdict === "MATCH" ? "MATCH" : `**${a.verdict}**`,
    a.evidence.join("; "),
  ]
    .map(mdCell)
    .join(" | ");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const artIdx = args.indexOf("--artifacts");
  const artifactsDir =
    artIdx !== -1 && args[artIdx + 1] ? path.resolve(args[artIdx + 1]) : DEFAULT_ARTIFACTS;

  const seedSql = await readFile(SEED_FILE, "utf8");
  const migration = await findGeneratedMigration();
  if (!migration) {
    throw new Error("no *_load_sam_questions.sql migration with the stage4 marker found");
  }
  const { handRows, effectiveGenerated, shadowedDuplicates, bank } = assembleBank(
    seedSql,
    migration.sql,
  );

  const artifacts = await loadArtifacts(artifactsDir);
  if (artifacts.size === 0) {
    console.warn(
      `[warn] no Stage 2/3 artifacts under ${artifactsDir} — every row will be NO-KEY. ` +
        `Pass --artifacts <dir> pointing at the conversion output.`,
    );
  }

  const buildAudit = (row: BankRow): McAuditRow => {
    const ws = findWorksheet(artifacts, row.external_id);
    const parsed = parseExternalId(row.external_id);
    const key = ws && parsed ? (ws.keyByTask.get(parsed.task) ?? null) : null;
    const s3 = ws ? (ws.byExternalId.get(row.external_id) ?? null) : null;
    const worksheetTask = parsed
      ? `Level ${String(parsed.level)} Placement Worksheet, task ${String(parsed.task)}`
      : "(no worksheet lineage)";
    return auditMcRow(row, key, s3, worksheetTask);
  };

  const mcBank = bank.filter((r) => r.format === "MULTIPLE_CHOICE");
  const audits = mcBank.map(buildAudit);
  const shadowedAudits = shadowedDuplicates
    .filter((r) => r.format === "MULTIPLE_CHOICE")
    .map(buildAudit);

  const counts = {
    mc: audits.length,
    match: audits.filter((a) => a.verdict === "MATCH").length,
    mismatch: audits.filter((a) => a.verdict === "MISMATCH").length,
    ambiguous: audits.filter((a) => a.verdict === "AMBIGUOUS").length,
    noKey: audits.filter((a) => a.verdict === "NO-KEY").length,
  };

  // --- conversion.log ------------------------------------------------------
  const now = new Date().toISOString();
  const logLine = formatLogLine(counts, now);
  await appendFile(LOG_FILE, `${logLine}\n`, "utf8");
  console.log(logLine);

  // --- Markdown report -----------------------------------------------------
  const today = now.slice(0, 10);
  const reportPath = path.join(REPO_ROOT, "docs", `mc-index-rederivation-${today}.md`);
  const mismatches = audits.filter((a) => a.verdict === "MISMATCH");
  const ambiguous = audits.filter((a) => a.verdict === "AMBIGUOUS");
  const noKey = audits.filter((a) => a.verdict === "NO-KEY");

  const lines: string[] = [];
  lines.push(`# MC correct_index re-derivation audit — ${today}`);
  lines.push("");
  lines.push(
    "Generated by `pnpm convert:mc-index -- --artifacts <stage-artifacts-dir>` " +
      "(scripts/conversion/mc-index-audit.ts). QA Bucket 1: detect whether the proven " +
      "SAM-L3-Q11 off-by-one (answer key read 1-based, emitted as if 0-based by the " +
      "Stage 3 model) is systemic. ANALYSIS ONLY — **nothing was changed**; every " +
      "MISMATCH below awaits founder confirmation before a data fix.",
  );
  lines.push("");
  lines.push("## Method");
  lines.push("");
  lines.push(
    "* Bank parsed from the committed SQL (hand-seeded block in `supabase/seed.sql` + " +
      `generated \`supabase/migrations/${migration.name}\` + dev placeholder); ` +
      "shadowed generated duplicates (`on conflict do nothing`) audited separately in the appendix.",
  );
  lines.push(
    "* For every MULTIPLE_CHOICE row the parsed answer-key marker (stage2 " +
      "`correct_answer.raw_answer`) is re-interpreted from scratch: an explicit `(N)` " +
      "option marker is definitive 1-based; a bare integer N within 1..len(options) is " +
      "read as a 1-based ordinal (index N-1); key text equal to an option's normalized " +
      "text is a text-match reading. When readings disagree the row is AMBIGUOUS — " +
      "both readings are recorded, nothing guessed. A key value an option merely " +
      "evaluates to is secondary evidence only.",
  );
  lines.push(
    "* Cross-evidence per row: stem-stated arithmetic targets recomputed against the " +
      "stored and re-derived options; stage3 `review_flags`/`reasoning` excerpts that " +
      "mention an index or the answer key.",
  );
  lines.push(
    `* Stage 2/3 artifacts read from \`${artifactsDir}\` (${String(artifacts.size)} worksheet folder(s) found).`,
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(
    `| MC audited | MATCH | MISMATCH | AMBIGUOUS | NO-KEY |\n|---:|---:|---:|---:|---:|\n` +
      `| ${String(counts.mc)} | ${String(counts.match)} | ${String(counts.mismatch)} | ` +
      `${String(counts.ambiguous)} | ${String(counts.noKey)} |`,
  );
  lines.push("");
  lines.push(
    `Bank composition: ${String(handRows.length)} hand-seeded rows (all formats), ` +
      `${String(effectiveGenerated.length)} effective generated rows, ` +
      `${String(shadowedDuplicates.length)} shadowed generated duplicates; ` +
      `${String(mcBank.length)} MULTIPLE_CHOICE rows land in the bank.`,
  );
  lines.push("");

  lines.push(`## MISMATCHES (${String(mismatches.length)}) — need founder confirmation`);
  lines.push("");
  if (mismatches.length === 0) {
    lines.push("None.");
    lines.push("");
  }
  for (const a of mismatches) {
    lines.push(`### ${a.external_id} — ${a.is_active ? "ACTIVE" : "inactive"} — ${a.worksheetTask}`);
    lines.push("");
    lines.push(`* Stem: "${stemExcerpt(a.stem, 120)}"`);
    lines.push(`* Options: ${a.options.map((o, i) => `${String(i)}: "${o}"`).join(", ")}`);
    lines.push(`* Stored: correct_index=${describeIndex(a.storedIndex, a.options)}`);
    lines.push(`* Key marker (raw): ${JSON.stringify(a.keyRaw)}`);
    lines.push(
      `* Re-derived: ${
        a.rederivation ? describeIndex(a.rederivation.readings[0].index, a.options) : "—"
      }`,
    );
    for (const e of a.evidence) lines.push(`* ${e}`);
    lines.push("");
  }

  lines.push(`## AMBIGUOUS (${String(ambiguous.length)})`);
  lines.push("");
  if (ambiguous.length === 0) {
    lines.push("None.");
    lines.push("");
  }
  for (const a of ambiguous) {
    lines.push(`### ${a.external_id} — ${a.worksheetTask}`);
    lines.push("");
    lines.push(`* Key marker (raw): ${JSON.stringify(a.keyRaw)}`);
    for (const e of a.evidence) lines.push(`* ${e}`);
    lines.push("");
  }

  lines.push(`## NO-KEY (${String(noKey.length)})`);
  lines.push("");
  if (noKey.length === 0) {
    lines.push("None.");
  }
  for (const a of noKey) {
    lines.push(`* ${a.external_id} (${a.origin}) — ${a.evidence.join("; ")}`);
  }
  lines.push("");

  const TABLE_HEADER =
    "| external_id | worksheet+task | stem (short) | options | stored index→text | " +
    "key marker (raw) | re-derived index→text | verdict | evidence notes |";
  const TABLE_RULE = "|---|---|---|---|---|---|---|---|---|";

  lines.push("## Full table (every MC question in the bank)");
  lines.push("");
  lines.push(TABLE_HEADER);
  lines.push(TABLE_RULE);
  for (const a of audits) lines.push(`| ${tableRow(a)} |`);
  lines.push("");

  lines.push("## Appendix — shadowed generated MC duplicates (never land)");
  lines.push("");
  lines.push(
    "Pipeline rows whose external_id collides with a hand-seeded row; " +
      "`on conflict do nothing` keeps the hand-seeded version. Audited for completeness.",
  );
  lines.push("");
  lines.push(TABLE_HEADER);
  lines.push(TABLE_RULE);
  for (const a of shadowedAudits) lines.push(`| ${tableRow(a)} |`);
  lines.push("");

  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`\nReport written: ${path.relative(process.cwd(), reportPath)}`);
  console.log(
    `Totals: mc=${String(counts.mc)} match=${String(counts.match)} ` +
      `mismatch=${String(counts.mismatch)} ambiguous=${String(counts.ambiguous)} ` +
      `no-key=${String(counts.noKey)}`,
  );
  for (const a of mismatches) {
    console.log(
      `MISMATCH: ${a.external_id} stored=${describeIndex(a.storedIndex, a.options)} ` +
        `re-derived=${a.rederivation ? describeIndex(a.rederivation.readings[0].index, a.options) : "—"}`,
    );
  }
}

// Only run when executed directly (pnpm convert:mc-index / tsx) — the
// module is also imported by unit tests for its pure functions.
const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error("MC index audit failed:", message);
    process.exit(1);
  });
}
