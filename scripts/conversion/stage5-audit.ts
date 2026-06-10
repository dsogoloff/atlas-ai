// Atlas Assessment — conversion pipeline Stage 5.
//
// Answer-key correctness AUDIT (read-only). Motivated by the SAM-L3-Q11
// mis-key ("Which of the following is equal to 18?" stored with
// correct_index=1 → "9 × 3" = 27): Stage 3's prose reasoning computed the
// right answer (index 0, "9 × 2") but the structured JSON it emitted
// treated the answer key's 1-based "1" as a 0-based index, and Stage 4
// loaded the field verbatim without an arithmetic cross-check.
//
// This script audits EVERY question in the loaded bank — the hand-seeded
// SAM-L2 block in supabase/seed.sql, the Stage 4 generated block (parsed
// from the *_load_sam_questions.sql migration and parity-checked against
// the seed.sql mirror), and the dev placeholder row — for internal
// consistency and agreement with the parsed answer key (Stage 2/3
// artifacts under scripts/conversion/output/, when present):
//
//   * MULTIPLE_CHOICE — correct_index in range; the keyed option, when
//     arithmetic-evaluable and the stem states a computable target
//     ("equal to N", "A and ___ make N", "<expr> = ___"), must satisfy
//     it; the stored index must be compatible with the parsed answer key.
//   * NUMERIC_ENTRY — correct_answer present; plain-numeric (the judge in
//     src/lib/responseSubmit/correctness.ts only numeric-coerces
//     /^-?\d+(\.\d+)?$/ — anything else requires an exact string match
//     from a child on a decimal keypad, which is flagged); must agree
//     with the parsed answer key after normalization (including the P1
//     judge normalizer). A key entry that is a printed 1-based OPTION
//     NUMBER is resolved against the source task's options when those are
//     recorded; a key entry that is a worked solution has its FINAL
//     answer extracted before comparing. Where neither resolution is
//     mechanically certain the check is a skip (UNVERIFIABLE), never a
//     guessed MISMATCH.
//   * DRAG_DROP — items / correct_order same multiset, >= 2 entries;
//     correct_order must agree with the parsed key sequence.
//   * misconception codes must be among the seeded vocabulary
//     (KNOWN_MISCONCEPTION_CODES — should already hold; asserted anyway).
//   * generated rows must match their stage3-tagged.json record
//     (SQL <-> stage3 drift) and is_active must equal !image_required.
//
// Where a check is not mechanically decidable the question is marked
// UNVERIFIABLE — never guessed. NOTHING IS FIXED OR MODIFIED: the outputs
// are a markdown report (docs/question-bank-audit-<date>.md) listing
// every suspect for human review, plus one `audit` line per question
// group appended to scripts/conversion/conversion.log.
//
// Run via: pnpm convert:audit [--artifacts <dir>]
//   --artifacts <dir>  Stage 2/3 artifact root (default:
//                      scripts/conversion/output). The conversion
//                      artifacts are gitignored, so on a checkout without
//                      them the audit still runs the SQL-internal checks
//                      and marks key cross-checks unverifiable.

import { appendFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  KNOWN_MISCONCEPTION_CODES,
  MIGRATION_MARKER,
  SEED_BEGIN_MARKER,
  SEED_END_MARKER,
  parseDragDropContent,
  type Stage3Output,
  type Stage3Question,
} from "./stage4-load";

// ---------------------------------------------------------------------------
// Arithmetic evaluator (pure).
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
// Stem target extraction (pure).
// ---------------------------------------------------------------------------

export interface ExpectedAnswer {
  value: number;
  rule: string;
}

const ARITH_RUN = "[0-9][0-9\\s.+\\-×x*÷/()]*";

/** When the stem states a mechanically computable target, return the
 *  numeric value the CORRECT answer must equal. Patterns (conservative —
 *  anything else returns null so the question is marked UNVERIFIABLE
 *  rather than guessed):
 *    * "... equal to N ..."            → N
 *    * "A and ___ make(s) N"           → N - A   (missing addend)
 *    * "... makes N?" (stem end)       → N
 *    * "<expr> = ___" (stem end)       → eval(expr)
 *    * "What is A more/less than B?"   → B ± A
 *    * "What is <expr>?"               → eval(expr)
 */
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
// Answer-key text normalization (pure).
// ---------------------------------------------------------------------------

/** NFKC (folds the key PDFs' mathematical-bold digits), joins stacked
 *  fractions ("4\n9" → "4/9"), unifies dashes, collapses whitespace,
 *  lowercases. The fraction join is a HEURISTIC ("...8\n2..." in a
 *  multi-line equation key would join too) — callers comparing keys
 *  should also try `joinStackedFractions = false`. */
export function normalizeAnswerText(raw: string, joinStackedFractions = true): string {
  const pre = raw.normalize("NFKC");
  return (joinStackedFractions ? pre.replace(/(\d)\s*\r?\n\s*(\d)/g, "$1/$2") : pre)
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** "32 001" → "32001" (S.A.M. answer keys space-group thousands). */
export function stripDigitGroupSpaces(s: string): string {
  return s.replace(/(\d)\s+(?=\d)/g, "$1");
}

/** Tokenize a key value that lists several entries (ordering / matching
 *  answers): split on comma / semicolon / newline / arrow, normalize each
 *  token, drop empties. Stacked fractions are joined BEFORE splitting. */
export function tokenizeKeyList(raw: string): string[] {
  const pre = raw.normalize("NFKC").replace(/(\d)\s*\r?\n\s*(\d)/g, "$1/$2");
  return pre
    .split(/->|→|[,;\n]/)
    .map((t) =>
      t
        .replace(/[−–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase(),
    )
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// P1 judge normalizer — duplicated from PR #25 until merge — keep in sync
// with src/lib/responseSubmit/correctness.ts (normalizeAnswer +
// isSingleNumberKey + the unit-token set). Lives here (not qa-table.ts)
// so the audit's key-agreement comparison and the QA table classify with
// EXACTLY the same normalizer; qa-table.ts re-exports these.
// ---------------------------------------------------------------------------

const SINGLE_NUMBER_KEY_RE = /^-?(?:\d+|\d{1,3}(?: \d{3})+)(?:\.\d+)?$/;

/** Duplicated from PR #25 (correctness.ts) until merge — keep in sync. */
export function isSingleNumberKey(normalizedKey: string): boolean {
  return SINGLE_NUMBER_KEY_RE.test(normalizedKey);
}

export const UNIT_TOKENS = "km|cm|mm|kg|ml|min|am|pm|m|g|l|h|s";
const UNIT_SPACING_RE = new RegExp(`(\\d) ?(${UNIT_TOKENS})\\b`, "g");

/** Duplicated from PR #25 (correctness.ts) until merge — keep in sync. */
export function normalizeAnswer(raw: string): string {
  const collapsed = raw.toLowerCase().replace(/[\s,]+/g, " ").trim();
  return collapsed.replace(UNIT_SPACING_RE, "$1 $2");
}

/** Equivalence used by the key-agreement comparisons: the audit's own
 *  normalization (BOTH stacked-fraction readings), digit-group-space
 *  stripping, separator-insensitive listing, and the P1 judge normalizer
 *  (PR #25: case / whitespace / comma / unit-spacing) — so pure
 *  formatting noise can never flag a mismatch. stripDigitGroupSpaces is
 *  deliberately never applied to the separator/P1 variants ("1, 2" must
 *  never equal "12"). */
export function answersEquivalent(a: string, b: string): boolean {
  const sepNorm = (s: string): string => s.replace(/[,;]/g, " ").replace(/\s+/g, " ").trim();
  const variants = (s: string): Set<string> => {
    const out = new Set<string>();
    for (const base of [normalizeAnswerText(s), normalizeAnswerText(s, false)]) {
      out.add(base);
      out.add(stripDigitGroupSpaces(base));
      out.add(sepNorm(base));
      out.add(normalizeAnswer(base)); // P1 judge normalizer (PR #25)
    }
    return out;
  };
  const va = variants(a);
  for (const v of variants(b)) {
    if (va.has(v)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Key option-marker resolution (pure).
//
// Marker-interpretation conventions vendored (minimally) from PR #28's
// scripts/conversion/mc-index-audit.ts (rederiveMcIndex): "(N)" is an
// explicit, definitive 1-based option marker (S.A.M. prints option numbers
// in parentheses); a bare small integer is plausibly a printed 1-based
// option number (the Level 3 key prints bare option numbers). Dedupe into
// a shared module when both lanes are merged.
// ---------------------------------------------------------------------------

export interface OptionMarker {
  /** 1-based option number as printed in the key. */
  ordinal: number;
  /** true for "(N)" (definitive); false for a bare integer (a reading). */
  explicit: boolean;
}

/** Parse a key entry as an option marker, when it is one. */
export function parseOptionMarker(rawKey: string): OptionMarker | null {
  const norm = normalizeAnswerText(rawKey);
  const paren = /^\((\d+)\)/.exec(norm);
  if (paren) return { ordinal: Number(paren[1]), explicit: true };
  const compact = stripDigitGroupSpaces(norm);
  if (/^\d+$/.test(compact) && Number(compact) >= 1) {
    return { ordinal: Number(compact), explicit: false };
  }
  return null;
}

/** Largest bare integer still plausibly a printed 1-based option number
 *  when the source task's options were NOT captured (every MC question in
 *  the S.A.M. L1-4 bank prints 4 options). */
export const MAX_PLAUSIBLE_OPTION_ORDINAL = 4;

export type MarkerResolution =
  | { kind: "resolved"; value: string; basis: string }
  | { kind: "unresolvable"; basis: string }
  | { kind: "not-marker" };

/** Resolve a parsed key entry that is an option MARKER (not a value) to
 *  the option text it designates, using the source task's options from
 *  the stage2/stage3 record when available. Without options, an explicit
 *  "(N)" marker — or a bare integer small enough to be a printed option
 *  number — CANNOT be resolved and the comparison must be UNVERIFIABLE
 *  (never guessed); a larger bare integer is treated as a literal value. */
export function resolveKeyOptionMarker(
  rawKey: string,
  options: readonly string[] | null,
): MarkerResolution {
  const marker = parseOptionMarker(rawKey);
  if (!marker) return { kind: "not-marker" };
  if (options && options.length > 0) {
    if (marker.ordinal <= options.length) {
      const value = options[marker.ordinal - 1];
      return {
        kind: "resolved",
        value,
        basis:
          `key ${JSON.stringify(rawKey)} read as 1-based option number -> ` +
          `option ${String(marker.ordinal)} = ${JSON.stringify(value)}`,
      };
    }
    if (marker.explicit) {
      return {
        kind: "unresolvable",
        basis: `explicit option marker ${JSON.stringify(rawKey)} out of range for ${String(options.length)} recorded options`,
      };
    }
    return { kind: "not-marker" }; // bare integer beyond the options — a value.
  }
  if (marker.explicit) {
    return {
      kind: "unresolvable",
      basis: `explicit option marker ${JSON.stringify(rawKey)} but the source task's options were not captured`,
    };
  }
  if (marker.ordinal <= MAX_PLAUSIBLE_OPTION_ORDINAL) {
    return {
      kind: "unresolvable",
      basis:
        `bare key ${JSON.stringify(rawKey)} is plausibly a printed 1-based option number ` +
        `(S.A.M. keys print bare option numbers) but the source task's options were not captured`,
    };
  }
  return { kind: "not-marker" };
}

// ---------------------------------------------------------------------------
// Worked-solution key handling (pure).
// ---------------------------------------------------------------------------

const UNIT_TOKEN_SET: ReadonlySet<string> = new Set(UNIT_TOKENS.split("|"));

/** Trailing quantity of a sentence key ("Casey had walked 2 km 400 m." →
 *  "2 km 400 m"): one or more number(+unit) tokens anchored at the end,
 *  preceded by start-of-line or whitespace (so "9:25 am" never yields a
 *  bogus "25 am"). */
const QUANTITY_TAIL_RE = new RegExp(
  `(?<=^|\\s)(-?\\d+(?:\\.\\d+)?(?:\\s*(?:${UNIT_TOKENS})\\b)?` +
    `(?:\\s+-?\\d+(?:\\.\\d+)?(?:\\s*(?:${UNIT_TOKENS})\\b)?)*)\\s*[.!?]*\\s*$`,
  "i",
);

export type WorkedKeyExtraction =
  | {
      kind: "extracted";
      /** The final answer token(s) of the worked solution. */
      value: string;
      /** true when the last equation's LEFT side restates a quantity given
       *  in the stem — a working/conversion line (e.g. "5 km 250 m =
       *  5250 m" under a stem containing "5 km 250 m"), so the extracted
       *  right-most value is NOT the question's final answer. */
      intermediate: boolean;
      basis: string;
    }
  | { kind: "uncertain"; basis: string }
  | { kind: "not-worked" };

/** When a parsed key entry is a worked solution ("=" chains, multiple
 *  lines, sentence text), extract the FINAL answer token(s): the last
 *  line's last-equation right-most value, or a sentence's trailing
 *  quantity. Conservative — anything not mechanically extractable is
 *  "uncertain" so the caller marks UNVERIFIABLE rather than guessing. */
export function extractWorkedKeyFinalAnswer(rawKey: string, stem: string): WorkedKeyExtraction {
  const pre = rawKey.normalize("NFKC").replace(/[−–—]/g, "-");
  const lines = pre
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { kind: "not-worked" };
  // A pure word key ("smaller than") with no digits and no equation is a
  // literal answer, not a worked solution — leave it to the plain compare.
  if (lines.length === 1 && !pre.includes("=") && !/\d/.test(pre)) {
    return { kind: "not-worked" };
  }
  const words = pre.match(/[a-zA-Z]+/g) ?? [];
  const hasSentenceText = words.some((w) => w.length > 1 && !UNIT_TOKEN_SET.has(w.toLowerCase()));
  if (lines.length === 1 && !pre.includes("=") && !hasSentenceText) {
    return { kind: "not-worked" };
  }

  const last = lines[lines.length - 1];
  if (last.includes("=")) {
    const segments = last.split("=");
    const rhs = segments[segments.length - 1].trim();
    const lhs = segments.slice(0, -1).join("=").trim();
    if (!/\d/.test(rhs)) {
      return {
        kind: "uncertain",
        basis: `last equation of ${JSON.stringify(last)} has no value on its right side`,
      };
    }
    const intermediate = lhs.length > 0 && normalizeAnswerText(stem).includes(normalizeAnswerText(lhs));
    return {
      kind: "extracted",
      value: rhs,
      intermediate,
      basis: intermediate
        ? `last equation's right-most value ${JSON.stringify(rhs)}, but its left side ` +
          `${JSON.stringify(lhs)} restates a quantity given in the stem (working/conversion line)`
        : `last equation's right-most value ${JSON.stringify(rhs)}`,
    };
  }
  const tail = QUANTITY_TAIL_RE.exec(last);
  if (tail) {
    return {
      kind: "extracted",
      value: tail[1],
      intermediate: false,
      basis: `trailing quantity ${JSON.stringify(tail[1])} of the key's final line`,
    };
  }
  return {
    kind: "uncertain",
    basis: `no final value mechanically extractable from the key's last line ${JSON.stringify(last)}`,
  };
}

// ---------------------------------------------------------------------------
// MC key interpretation (pure).
// ---------------------------------------------------------------------------

export interface McKeyCandidate {
  index: number;
  basis: string;
}

const PLAIN_NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

/** Every 0-based option index the parsed answer key could plausibly mean.
 *  "(3)" is an explicit 1-based option marker (S.A.M. prints option
 *  numbers in parentheses) and is taken as definitive. Otherwise the key
 *  text is matched against option text, against evaluated option values,
 *  and — when it is a small integer — read as a 1-based option number
 *  (S.A.M. Level 3 keys print bare option numbers). The stored index is
 *  acceptable when it matches ANY candidate; an empty result means the
 *  key is not mechanically interpretable. */
export function interpretMcKey(rawAnswer: string, options: string[]): McKeyCandidate[] {
  const out: McKeyCandidate[] = [];
  const add = (index: number, basis: string): void => {
    if (index < 0 || index >= options.length) return;
    if (!out.some((c) => c.index === index)) out.push({ index, basis });
  };
  const norm = normalizeAnswerText(rawAnswer);
  if (norm.length === 0) return out;

  const paren = /^\((\d+)\)/.exec(norm);
  if (paren) {
    add(Number(paren[1]) - 1, `explicit option marker "(${paren[1]})" (1-based)`);
    return out;
  }

  options.forEach((o, i) => {
    if (normalizeAnswerText(o) === norm) add(i, "key text equals option text");
  });

  const compact = stripDigitGroupSpaces(norm);
  if (PLAIN_NUMERIC_RE.test(compact)) {
    const value = Number(compact);
    options.forEach((o, i) => {
      const v = evalArithmetic(o);
      if (v !== null && Math.abs(v - value) < 1e-9) {
        add(i, `key value ${compact} equals evaluated option`);
      }
    });
    if (Number.isInteger(value) && value >= 1 && value <= options.length) {
      add(value - 1, `key "${compact}" read as 1-based option number`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// SQL VALUES parsing (pure) — reads the loaded bank straight out of the
// committed SQL so the audit covers exactly what a `supabase db reset`
// (or the prod migration) inserts.
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
    throw new Error(`parseSqlValuesTuples: unexpected token at offset ${String(i)}: ${text.slice(i, i + 30)}`);
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
  strand: string;
  level: string;
  difficulty: number;
  format: string;
  content: Record<string, unknown>;
  misconception_tags: string[];
  word_count: number;
  operation_type: string;
  num_operations: number;
  representation: string;
  is_active: boolean;
  content_key: string | null;
  origin: RowOrigin;
}

/** Parse every `insert into questions ... (values ...) as v(...)` block in
 *  the given SQL into BankRows. Column meaning comes from the `as v(...)`
 *  column list; the hand-seeded block has no per-row is_active/content_key
 *  (its SELECT hardcodes is_active=true). */
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
      const num = (col: string): number => {
        const v = byCol.get(col);
        if (typeof v !== "number") throw new Error(`column ${col} is not a number`);
        return v;
      };
      rows.push({
        external_id: str("external_id"),
        strand: str("strand"),
        level: str("level"),
        difficulty: num("difficulty"),
        format: str("format"),
        content: JSON.parse(str("content")) as Record<string, unknown>,
        misconception_tags: (byCol.get("misconception_tags") as string[] | undefined) ?? [],
        word_count: num("word_count"),
        operation_type: str("operation_type"),
        num_operations: num("num_operations"),
        representation: str("representation"),
        is_active: columns.includes("is_active") ? byCol.get("is_active") === true : true,
        content_key: columns.includes("content_key") ? str("content_key") : null,
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
    strand: "number_sense",
    level: "2A",
    difficulty: -1.5,
    format: "MULTIPLE_CHOICE",
    content: {
      stem: stem ? stem[1].replace(/''/g, "'") : "",
      options,
      correct_index: correctIndex ? Number(correctIndex[1]) : null,
    },
    misconception_tags: [],
    word_count: 9,
    operation_type: "IDENTIFY",
    num_operations: 1,
    representation: "PICTORIAL",
    is_active: isActive,
    content_key: null,
    origin: "dev-placeholder",
  };
}

// ---------------------------------------------------------------------------
// Per-question checks (pure).
// ---------------------------------------------------------------------------

export type CheckStatus = "pass" | "fail" | "skip";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface KeyInfo {
  raw_answer: string;
  answer_kind: string | null;
}

/** Checks whose PASS counts as substantive verification of the stored
 *  answer (vs structural checks, which only prove well-formedness). */
const VERIFYING_CHECKS = new Set(["stem-arithmetic", "key-agreement"]);

export type Verdict = "CLEAN" | "SUSPECT" | "UNVERIFIABLE";

export function verdictOf(checks: CheckResult[]): Verdict {
  if (checks.some((c) => c.status === "fail")) return "SUSPECT";
  if (checks.some((c) => c.status === "pass" && VERIFYING_CHECKS.has(c.name))) {
    return "CLEAN";
  }
  return "UNVERIFIABLE";
}

export function auditMultipleChoice(
  content: Record<string, unknown>,
  key: KeyInfo | null,
): CheckResult[] {
  const checks: CheckResult[] = [];
  const stem = typeof content.stem === "string" ? content.stem : "";
  const options = Array.isArray(content.options)
    ? content.options.filter((o): o is string => typeof o === "string")
    : null;
  const ci = content.correct_index;

  if (!options || options.length < 2 || options.some((o) => o.length === 0)) {
    checks.push({
      name: "structure",
      status: "fail",
      detail: "options missing, fewer than 2, or containing empty entries",
    });
    return checks;
  }
  if (typeof ci !== "number" || !Number.isInteger(ci) || ci < 0 || ci >= options.length) {
    checks.push({
      name: "structure",
      status: "fail",
      detail: `correct_index ${JSON.stringify(ci)} out of range for ${String(options.length)} options`,
    });
    return checks;
  }
  checks.push({ name: "structure", status: "pass", detail: "options + correct_index well-formed" });

  const dm = content.distractor_misconceptions;
  if (dm && typeof dm === "object" && !Array.isArray(dm)) {
    const badKeys = Object.keys(dm).filter((k) => {
      const idx = Number(k);
      return !Number.isInteger(idx) || idx < 0 || idx >= options.length || idx === ci;
    });
    checks.push(
      badKeys.length === 0
        ? { name: "distractor-map", status: "pass", detail: "keys are valid non-correct option indices" }
        : {
            name: "distractor-map",
            status: "fail",
            detail: `distractor_misconceptions keys ${badKeys.join(", ")} invalid or pointing at the keyed correct option`,
          },
    );
  }

  const expected = extractExpectedAnswer(stem);
  if (!expected) {
    checks.push({
      name: "stem-arithmetic",
      status: "skip",
      detail: "stem states no mechanically computable target",
    });
  } else {
    const keyedValue = evalArithmetic(options[ci]);
    if (keyedValue === null) {
      checks.push({
        name: "stem-arithmetic",
        status: "skip",
        detail: `keyed option "${options[ci]}" is not arithmetic-evaluable (${expected.rule})`,
      });
    } else if (Math.abs(keyedValue - expected.value) < 1e-9) {
      checks.push({
        name: "stem-arithmetic",
        status: "pass",
        detail: `keyed option "${options[ci]}" = ${String(keyedValue)} satisfies ${expected.rule}`,
      });
    } else {
      const better = options
        .map((o, i) => ({ o, i, v: evalArithmetic(o) }))
        .filter((e) => e.i !== ci && e.v !== null && Math.abs(e.v - expected.value) < 1e-9);
      checks.push({
        name: "stem-arithmetic",
        status: "fail",
        detail:
          `keyed option "${options[ci]}" = ${String(keyedValue)} does NOT satisfy ${expected.rule}` +
          (better.length > 0
            ? `; option ${better.map((e) => `"${e.o}" (index ${String(e.i)})`).join(", ")} does`
            : ""),
      });
    }
  }

  if (!key || normalizeAnswerText(key.raw_answer).length === 0) {
    checks.push({
      name: "key-agreement",
      status: "skip",
      detail: "no parsed answer-key entry available",
    });
  } else {
    const candidates = interpretMcKey(key.raw_answer, options);
    if (candidates.length === 0) {
      checks.push({
        name: "key-agreement",
        status: "skip",
        detail: `parsed key ${JSON.stringify(key.raw_answer)} not mechanically interpretable against the options`,
      });
    } else if (candidates.some((c) => c.index === ci)) {
      const hit = candidates.find((c) => c.index === ci);
      checks.push({
        name: "key-agreement",
        status: "pass",
        detail: `stored correct_index ${String(ci)} matches key: ${hit?.basis ?? ""}`,
      });
    } else {
      checks.push({
        name: "key-agreement",
        status: "fail",
        detail:
          `stored correct_index ${String(ci)} ("${options[ci]}") contradicts parsed key ` +
          `${JSON.stringify(key.raw_answer)} → plausible index(es): ` +
          candidates.map((c) => `${String(c.index)} ("${options[c.index]}"; ${c.basis})`).join("; "),
      });
    }
  }
  return checks;
}

export function auditNumericEntry(
  content: Record<string, unknown>,
  key: KeyInfo | null,
  /** Options of the SOURCE task (stage2/stage3 record), when the worksheet
   *  printed options but the bank row was loaded as NUMERIC_ENTRY — lets a
   *  key entry that is a printed 1-based option number resolve to the
   *  option value instead of string-comparing the marker itself. */
  sourceOptions: readonly string[] | null = null,
): CheckResult[] {
  const checks: CheckResult[] = [];
  const stem = typeof content.stem === "string" ? content.stem : "";
  const stored = content.correct_answer;

  if (typeof stored !== "string" || stored.trim().length === 0) {
    checks.push({ name: "structure", status: "fail", detail: "correct_answer missing or empty" });
    return checks;
  }
  checks.push({ name: "structure", status: "pass", detail: "correct_answer present" });

  if (PLAIN_NUMERIC_RE.test(stored.trim())) {
    checks.push({ name: "answer-format", status: "pass", detail: "plain-numeric answer" });
  } else {
    checks.push({
      name: "answer-format",
      status: "fail",
      detail:
        `correct_answer ${JSON.stringify(stored)} is not plain-numeric — the judge ` +
        `(correctness.ts) falls back to EXACT string match and the child answers on a ` +
        `decimal-keypad text input, so this is likely unanswerable as stored`,
    });
  }

  const expected = extractExpectedAnswer(stem);
  if (!expected) {
    checks.push({
      name: "stem-arithmetic",
      status: "skip",
      detail: "stem states no mechanically computable target",
    });
  } else if (!PLAIN_NUMERIC_RE.test(stored.trim())) {
    checks.push({
      name: "stem-arithmetic",
      status: "skip",
      detail: `stored answer not numeric; cannot compare with ${expected.rule}`,
    });
  } else if (Math.abs(Number(stored.trim()) - expected.value) < 1e-9) {
    checks.push({
      name: "stem-arithmetic",
      status: "pass",
      detail: `stored ${stored.trim()} satisfies ${expected.rule}`,
    });
  } else {
    checks.push({
      name: "stem-arithmetic",
      status: "fail",
      detail: `stored ${stored.trim()} does NOT satisfy ${expected.rule}`,
    });
  }

  if (!key || normalizeAnswerText(key.raw_answer).length === 0) {
    checks.push({ name: "key-agreement", status: "skip", detail: "no parsed answer-key entry available" });
  } else if (answersEquivalent(stored, key.raw_answer)) {
    // answersEquivalent covers both stacked-fraction readings ("4\n9" →
    // "4/9" vs a multi-line equation key that must NOT join), digit-group
    // spaces, separator-insensitive listings, and the P1 judge normalizer.
    checks.push({
      name: "key-agreement",
      status: "pass",
      detail: "stored answer equals parsed key (after trivial normalization)",
    });
  } else {
    const normStored = normalizeAnswerText(stored);
    const keyVariants = [...new Set([
      normalizeAnswerText(key.raw_answer),
      normalizeAnswerText(key.raw_answer, false),
    ])];
    const escaped = normStored.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const contained =
      normStored.length > 0 &&
      keyVariants.some((normKey) =>
        new RegExp(`(?<![\\w])${escaped}(?![\\w])`).test(normKey),
      );
    const rawShort = JSON.stringify(key.raw_answer.slice(0, 120));
    if (contained) {
      checks.push({
        name: "key-agreement",
        status: "pass",
        detail: `stored answer found inside the key's worked solution: ${rawShort}`,
      });
    } else {
      // The raw marker/key is kept in every detail below for transparency.
      const marker = resolveKeyOptionMarker(key.raw_answer, sourceOptions);
      if (marker.kind === "resolved") {
        checks.push(
          answersEquivalent(stored, marker.value)
            ? {
                name: "key-agreement",
                status: "pass",
                detail: `stored answer equals the key-designated option: ${marker.basis}`,
              }
            : {
                name: "key-agreement",
                status: "fail",
                detail: `stored ${JSON.stringify(stored)} contradicts the key-designated option: ${marker.basis}`,
              },
        );
      } else if (marker.kind === "unresolvable") {
        checks.push({
          name: "key-agreement",
          status: "skip",
          detail: `cannot verify mechanically: ${marker.basis}`,
        });
      } else {
        const worked = extractWorkedKeyFinalAnswer(key.raw_answer, stem);
        if (worked.kind === "extracted" && answersEquivalent(stored, worked.value)) {
          checks.push({
            name: "key-agreement",
            status: "pass",
            detail: `stored answer equals the worked-solution key's final value (raw key ${rawShort}): ${worked.basis}`,
          });
        } else if (worked.kind === "extracted" && worked.intermediate) {
          checks.push({
            name: "key-agreement",
            status: "skip",
            detail:
              `cannot verify mechanically: parsed key ${rawShort} is a worked-solution ` +
              `working line — ${worked.basis} — the question's final answer was not captured by the key parse`,
          });
        } else if (worked.kind === "extracted") {
          checks.push({
            name: "key-agreement",
            status: "fail",
            detail:
              `stored ${JSON.stringify(stored)} does not match the worked-solution key's ` +
              `final value (raw key ${rawShort}): ${worked.basis}`,
          });
        } else if (worked.kind === "uncertain") {
          checks.push({
            name: "key-agreement",
            status: "skip",
            detail: `cannot verify mechanically: parsed key ${rawShort} appears to be a worked solution — ${worked.basis}`,
          });
        } else {
          checks.push({
            name: "key-agreement",
            status: "fail",
            detail: `stored ${JSON.stringify(stored)} does not match parsed key ${rawShort}`,
          });
        }
      }
    }
  }
  return checks;
}

export function auditDragDrop(
  content: Record<string, unknown>,
  key: KeyInfo | null,
): CheckResult[] {
  const checks: CheckResult[] = [];
  const items = Array.isArray(content.items)
    ? content.items.filter((o): o is string => typeof o === "string")
    : null;
  const order = Array.isArray(content.correct_order)
    ? content.correct_order.filter((o): o is string => typeof o === "string")
    : null;

  if (!items || !order || items.length < 2 || order.length < 2) {
    checks.push({
      name: "structure",
      status: "fail",
      detail: "items/correct_order missing or fewer than 2 entries",
    });
    return checks;
  }
  const multiset = (xs: string[]): string => JSON.stringify([...xs].map((x) => normalizeAnswerText(x)).sort());
  if (multiset(items) !== multiset(order)) {
    checks.push({
      name: "structure",
      status: "fail",
      detail: `items ${JSON.stringify(items)} and correct_order ${JSON.stringify(order)} are not the same multiset`,
    });
    return checks;
  }
  checks.push({
    name: "structure",
    status: "pass",
    detail: "items/correct_order same multiset, >= 2 entries",
  });

  if (!key || normalizeAnswerText(key.raw_answer).length === 0) {
    checks.push({ name: "key-agreement", status: "skip", detail: "no parsed answer-key entry available" });
    return checks;
  }
  const keyTokens = tokenizeKeyList(key.raw_answer);
  const orderNorm = order.map((o) => normalizeAnswerText(o));
  if (keyTokens.length < 2) {
    checks.push({
      name: "key-agreement",
      status: "skip",
      detail: `parsed key ${JSON.stringify(key.raw_answer.slice(0, 80))} does not tokenize to a sequence`,
    });
  } else if (
    keyTokens.length >= orderNorm.length &&
    orderNorm.every((t, idx) => keyTokens[idx] === t)
  ) {
    checks.push({
      name: "key-agreement",
      status: "pass",
      detail: "correct_order matches the parsed key sequence",
    });
  } else if (
    JSON.stringify([...keyTokens].sort()) === JSON.stringify([...orderNorm].sort())
  ) {
    checks.push({
      name: "key-agreement",
      status: "skip",
      detail:
        "correct_order and key hold the same tokens in a DIFFERENT order — key layout order " +
        "is not mechanically decidable as the intended arrangement; needs human review",
    });
  } else {
    checks.push({
      name: "key-agreement",
      status: "fail",
      detail: `correct_order ${JSON.stringify(order)} does not match key tokens ${JSON.stringify(keyTokens)}`,
    });
  }
  return checks;
}

export function auditMisconceptionCodes(row: BankRow): CheckResult {
  const known: ReadonlySet<string> = new Set(KNOWN_MISCONCEPTION_CODES);
  const bad: string[] = [];
  for (const code of row.misconception_tags) {
    if (!known.has(code) && !bad.includes(code)) bad.push(code);
  }
  const dm = row.content.distractor_misconceptions;
  if (dm && typeof dm === "object" && !Array.isArray(dm)) {
    for (const code of Object.values(dm as Record<string, unknown>)) {
      if (typeof code === "string" && !known.has(code) && !bad.includes(code)) bad.push(code);
    }
  }
  return bad.length === 0
    ? { name: "misconception-codes", status: "pass", detail: "all codes in the seeded 21-code vocabulary" }
    : { name: "misconception-codes", status: "fail", detail: `unknown codes: ${bad.join(", ")}` };
}

/** Generated rows must reproduce their stage3-tagged.json record (the SQL
 *  is generated from it — drift means a hand edit or a loader bug). */
export function auditStage3Fidelity(row: BankRow, s3: Stage3Question): CheckResult[] {
  const checks: CheckResult[] = [];
  const problems: string[] = [];

  if (row.format !== s3.format) {
    problems.push(`format SQL=${row.format} stage3=${s3.format}`);
  }
  if (row.format === "MULTIPLE_CHOICE") {
    const sqlOptions = JSON.stringify(row.content.options ?? null);
    const s3Options = JSON.stringify(s3.options ?? null);
    if (sqlOptions !== s3Options) problems.push(`options SQL=${sqlOptions} stage3=${s3Options}`);
    if (row.content.correct_index !== s3.correct_index) {
      problems.push(
        `correct_index SQL=${JSON.stringify(row.content.correct_index)} stage3=${JSON.stringify(s3.correct_index)}`,
      );
    }
  }
  if (row.format === "NUMERIC_ENTRY") {
    const sqlAns = typeof row.content.correct_answer === "string" ? row.content.correct_answer : null;
    const s3Ans = typeof s3.correct_answer === "string" ? s3.correct_answer.trim() : null;
    if (sqlAns !== s3Ans) {
      problems.push(`correct_answer SQL=${JSON.stringify(sqlAns)} stage3=${JSON.stringify(s3Ans)}`);
    }
  }
  if (row.format === "DRAG_DROP") {
    const parsed = parseDragDropContent(s3.stem, s3.correct_answer);
    if (!parsed) {
      problems.push("stage3 correct_answer no longer maps to items/correct_order");
    } else if (
      JSON.stringify(parsed.correct_order) !== JSON.stringify(row.content.correct_order) ||
      JSON.stringify(parsed.items) !== JSON.stringify(row.content.items)
    ) {
      problems.push(
        `items/correct_order SQL=${JSON.stringify(row.content.correct_order)} stage3-derived=${JSON.stringify(parsed.correct_order)}`,
      );
    }
  }
  checks.push(
    problems.length === 0
      ? { name: "stage3-fidelity", status: "pass", detail: "SQL row matches its stage3-tagged.json record" }
      : { name: "stage3-fidelity", status: "fail", detail: problems.join("; ") },
  );

  const expectedActive = !s3.image_required;
  checks.push(
    row.is_active === expectedActive
      ? {
          name: "active-flag",
          status: "pass",
          detail: `is_active=${String(row.is_active)} consistent with image_required=${String(s3.image_required)}`,
        }
      : {
          name: "active-flag",
          status: "fail",
          detail: `is_active=${String(row.is_active)} but stage3 image_required=${String(s3.image_required)}`,
        },
  );
  return checks;
}

// ---------------------------------------------------------------------------
// Audit assembly.
// ---------------------------------------------------------------------------

export interface QuestionAudit {
  row: BankRow;
  source: string;
  checks: CheckResult[];
  verdict: Verdict;
}

export function auditQuestion(
  row: BankRow,
  key: KeyInfo | null,
  s3: Stage3Question | null,
  source: string,
): QuestionAudit {
  let checks: CheckResult[];
  switch (row.format) {
    case "MULTIPLE_CHOICE":
      checks = auditMultipleChoice(row.content, key);
      break;
    case "NUMERIC_ENTRY":
      // The source task's options (stage3 record), when the worksheet
      // printed options but the row was loaded as NUMERIC_ENTRY — lets a
      // key entry that is a printed option number resolve to its value.
      checks = auditNumericEntry(row.content, key, s3?.options ?? null);
      break;
    case "DRAG_DROP":
      checks = auditDragDrop(row.content, key);
      break;
    default:
      checks = [{ name: "structure", status: "fail", detail: `unknown format '${row.format}'` }];
  }
  checks.push(auditMisconceptionCodes(row));
  if (row.origin === "generated" && s3) checks.push(...auditStage3Fidelity(row, s3));
  return { row, source, checks, verdict: verdictOf(checks) };
}

export interface GroupCounts {
  group: string;
  checked: number;
  clean: number;
  suspect: number;
  unverifiable: number;
}

export function formatAuditLogLine(counts: GroupCounts, timestamp: string): string {
  return (
    `${timestamp} | audit | ${counts.group} | ` +
    `checked=${String(counts.checked)} clean=${String(counts.clean)} ` +
    `suspect=${String(counts.suspect)} unverifiable=${String(counts.unverifiable)}`
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

interface Stage2KeyOutput {
  questions: Array<{
    task_number: number;
    correct_answer: { raw_answer: string; answer_kind: string } | null;
  }>;
}

export interface WorksheetArtifacts {
  source: string;
  answerKeySource: string | null;
  testLevelLabel: string | null;
  byExternalId: Map<string, Stage3Question>;
  keyByTask: Map<number, KeyInfo>;
}

export async function loadArtifacts(artifactsDir: string): Promise<Map<string, WorksheetArtifacts>> {
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
      answerKeySource: s3.answer_key_source ?? null,
      testLevelLabel: s3.test_level_label ?? null,
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
      // stage2 lineage optional — key cross-checks become skips.
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

function stemExcerpt(row: BankRow, max = 70): string {
  const stem = typeof row.content.stem === "string" ? row.content.stem : "";
  const flat = stem.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function storedAnswerOf(row: BankRow): string {
  if (row.format === "MULTIPLE_CHOICE") {
    const options = Array.isArray(row.content.options) ? (row.content.options as string[]) : [];
    const ci = row.content.correct_index;
    if (typeof ci === "number" && ci >= 0 && ci < options.length) {
      return `correct_index=${String(ci)} → "${options[ci]}"`;
    }
    return `correct_index=${JSON.stringify(ci)}`;
  }
  if (row.format === "NUMERIC_ENTRY") {
    return `correct_answer=${JSON.stringify(row.content.correct_answer)}`;
  }
  return `correct_order=${JSON.stringify(row.content.correct_order)}`;
}

export async function findGeneratedMigration(): Promise<{ name: string; sql: string } | null> {
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

function extractInsertStatement(sql: string): string | null {
  const start = sql.indexOf("with t as (select id from tenants");
  if (start === -1) return null;
  const end = sql.indexOf("do nothing;", start);
  if (end === -1) return null;
  return sql.slice(start, end + "do nothing;".length).replace(/\r\n/g, "\n");
}

export interface BankAssembly {
  handRows: BankRow[];
  generatedRows: BankRow[];
  /** Generated rows that actually land (external_id not shadowed by a hand row). */
  effectiveGenerated: BankRow[];
  /** Generated rows shadowed by hand-seeded rows (on conflict do nothing). */
  shadowedDuplicates: BankRow[];
  placeholderRow: BankRow | null;
  /** Exactly what the SQL inserts: hand rows + effective generated + placeholder. */
  bank: BankRow[];
  /** §11 parity: generated INSERT byte-identical in migration and seed mirror. */
  parityOk: boolean;
}

/** Assemble the effective question bank from the committed SQL — shared by
 *  the Stage 5 audit and the QA-table generator (qa-table.ts). */
export function assembleBank(seedSql: string, migrationSql: string): BankAssembly {
  const seedBegin = seedSql.indexOf(SEED_BEGIN_MARKER);
  const seedEnd = seedSql.indexOf(SEED_END_MARKER);
  if (seedBegin === -1 || seedEnd === -1) {
    throw new Error("seed.sql has no stage4 generated block markers");
  }
  const seedGeneratedBlock = seedSql.slice(seedBegin, seedEnd);
  const seedWithoutGenerated = seedSql.slice(0, seedBegin) + seedSql.slice(seedEnd);

  const handRows = parseQuestionInserts(seedWithoutGenerated, "hand-seeded").filter((r) =>
    r.external_id.startsWith("SAM-"),
  );
  const generatedRows = parseQuestionInserts(migrationSql, "generated");
  const placeholderRow = parsePlaceholderRow(seedSql);

  // §11 parity: the generated INSERT must be byte-identical (modulo EOL)
  // in the migration and the seed.sql mirror.
  const migInsert = extractInsertStatement(migrationSql);
  const seedInsert = extractInsertStatement(seedGeneratedBlock);
  const parityOk = migInsert !== null && migInsert === seedInsert;

  // on conflict (tenant_id, external_id) do nothing: the hand-seeded block
  // runs first on both paths (migration 20260511000100 predates the stage4
  // migration; in seed.sql the hand block precedes the mirror), so a
  // generated row whose external_id collides with a hand-seeded row never
  // lands. Those are the "generated duplicates" from the load summary.
  const handIds = new Set(handRows.map((r) => r.external_id));
  const effectiveGenerated = generatedRows.filter((r) => !handIds.has(r.external_id));
  const shadowedDuplicates = generatedRows.filter((r) => handIds.has(r.external_id));

  const bank: BankRow[] = [...handRows, ...effectiveGenerated];
  if (placeholderRow) bank.push(placeholderRow);

  return {
    handRows,
    generatedRows,
    effectiveGenerated,
    shadowedDuplicates,
    placeholderRow,
    bank,
    parityOk,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const artIdx = args.indexOf("--artifacts");
  const artifactsDir =
    artIdx !== -1 && args[artIdx + 1] ? path.resolve(args[artIdx + 1]) : DEFAULT_ARTIFACTS;

  const seedSql = await readFile(SEED_FILE, "utf8");
  const migration = await findGeneratedMigration();
  if (!migration) throw new Error("no *_load_sam_questions.sql migration with the stage4 marker found");

  // --- Bank assembly (exactly what the SQL inserts) -----------------------
  const { handRows, generatedRows, shadowedDuplicates, placeholderRow, bank, parityOk } =
    assembleBank(seedSql, migration.sql);

  const artifacts = await loadArtifacts(artifactsDir);
  if (artifacts.size === 0) {
    console.warn(
      `[warn] no Stage 2/3 artifacts under ${artifactsDir} — answer-key cross-checks will be UNVERIFIABLE`,
    );
  }

  // --- Audit every bank row ----------------------------------------------
  const audits: QuestionAudit[] = [];
  for (const row of bank) {
    const ws = findWorksheet(artifacts, row.external_id);
    const parsed = parseExternalId(row.external_id);
    const key = ws && parsed ? (ws.keyByTask.get(parsed.task) ?? null) : null;
    const s3 = ws ? (ws.byExternalId.get(row.external_id) ?? null) : null;
    let source: string;
    if (row.origin === "dev-placeholder") {
      source = "dev fixture (seed.sql only)";
    } else if (ws) {
      source = ws.source;
    } else if (parsed) {
      source = `Level ${String(parsed.level)} Placement Worksheet.pdf (inferred from external_id)`;
    } else {
      source = "UNKNOWN";
    }
    audits.push(auditQuestion(row, key, s3, source));
  }

  // --- Hand-seeded vs shadowed pipeline duplicates ------------------------
  const duplicateAgreement: Array<{ external_id: string; agree: boolean; detail: string }> = [];
  for (const dup of shadowedDuplicates) {
    const hand = handRows.find((r) => r.external_id === dup.external_id);
    if (!hand) continue;
    let agree: boolean;
    let detail: string;
    if (hand.format !== dup.format) {
      agree = false;
      detail = `format hand=${hand.format} pipeline=${dup.format}`;
    } else if (hand.format === "MULTIPLE_CHOICE") {
      agree =
        JSON.stringify(hand.content.options) === JSON.stringify(dup.content.options) &&
        hand.content.correct_index === dup.content.correct_index;
      detail = agree
        ? `same options + correct_index=${JSON.stringify(hand.content.correct_index)}`
        : `hand idx=${JSON.stringify(hand.content.correct_index)} options=${JSON.stringify(hand.content.options)} vs pipeline idx=${JSON.stringify(dup.content.correct_index)} options=${JSON.stringify(dup.content.options)}`;
    } else if (hand.format === "NUMERIC_ENTRY") {
      agree =
        normalizeAnswerText(String(hand.content.correct_answer ?? "")) ===
        normalizeAnswerText(String(dup.content.correct_answer ?? ""));
      detail = agree
        ? `same answer ${JSON.stringify(hand.content.correct_answer)}`
        : `hand=${JSON.stringify(hand.content.correct_answer)} vs pipeline=${JSON.stringify(dup.content.correct_answer)}`;
    } else {
      agree =
        JSON.stringify(hand.content.correct_order) === JSON.stringify(dup.content.correct_order);
      detail = agree
        ? `same correct_order ${JSON.stringify(hand.content.correct_order)}`
        : `hand=${JSON.stringify(hand.content.correct_order)} vs pipeline=${JSON.stringify(dup.content.correct_order)}`;
    }
    duplicateAgreement.push({ external_id: dup.external_id, agree, detail });
  }

  // --- Group counts + conversion.log -------------------------------------
  const groups = new Map<string, QuestionAudit[]>();
  for (const a of audits) {
    const groupName = a.row.origin === "hand-seeded" ? `hand-seeded (${a.source})` : a.source;
    const list = groups.get(groupName) ?? [];
    list.push(a);
    groups.set(groupName, list);
  }
  const now = new Date().toISOString();
  const groupCounts: GroupCounts[] = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, list]) => ({
      group,
      checked: list.length,
      clean: list.filter((x) => x.verdict === "CLEAN").length,
      suspect: list.filter((x) => x.verdict === "SUSPECT").length,
      unverifiable: list.filter((x) => x.verdict === "UNVERIFIABLE").length,
    }));
  for (const counts of groupCounts) {
    await appendFile(LOG_FILE, `${formatAuditLogLine(counts, now)}\n`, "utf8");
    console.log(formatAuditLogLine(counts, now));
  }

  // --- Markdown report -----------------------------------------------------
  const today = now.slice(0, 10);
  const reportPath = path.join(REPO_ROOT, "docs", `question-bank-audit-${today}.md`);
  const suspects = audits.filter((a) => a.verdict === "SUSPECT");
  const unverifiable = audits.filter((a) => a.verdict === "UNVERIFIABLE");

  const lines: string[] = [];
  lines.push(`# Question-bank answer-key audit — ${today}`);
  lines.push("");
  lines.push(
    "Generated by `pnpm convert:audit` (scripts/conversion/stage5-audit.ts). " +
      "READ-ONLY: this audit changes no data — every SUSPECT below needs a human decision.",
  );
  lines.push("");
  lines.push("## Scope and method");
  lines.push("");
  lines.push(
    `* Bank parsed from the committed SQL: ${String(handRows.length)} hand-seeded rows ` +
      `(supabase/seed.sql, mirrored from 20260511000100_sam_l2_content_v1.sql), ` +
      `${String(generatedRows.length)} generated rows (supabase/migrations/${migration.name}), ` +
      `${placeholderRow ? "1 dev placeholder row" : "no placeholder row"}. ` +
      `${String(shadowedDuplicates.length)} generated rows share an external_id with hand-seeded rows and never land ` +
      `(on conflict do nothing) — effective bank = ${String(bank.length)} questions.`,
  );
  lines.push(
    `* Answer-key evidence: Stage 2/3 artifacts under \`${path.relative(REPO_ROOT, artifactsDir) || artifactsDir}\`` +
      ` (${String(artifacts.size)} worksheet folder(s) found).`,
  );
  lines.push(
    "* Checks: structural shape per format; stem-stated arithmetic targets recomputed; " +
      "stored answers cross-checked against the parsed answer key; misconception codes " +
      "asserted against the seeded 21-code vocabulary; generated rows diffed against their " +
      "stage3-tagged.json records. Where a check is not mechanically decidable the question " +
      "is UNVERIFIABLE — nothing was guessed.",
  );
  lines.push(
    `* §11 parity (generated INSERT byte-identical in migration and seed.sql): ${parityOk ? "OK" : "**VIOLATED — investigate immediately**"}.`,
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| group | checked | clean | suspect | unverifiable |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const c of groupCounts) {
    lines.push(
      `| ${c.group} | ${String(c.checked)} | ${String(c.clean)} | ${String(c.suspect)} | ${String(c.unverifiable)} |`,
    );
  }
  lines.push(
    `| **total** | **${String(audits.length)}** | **${String(audits.length - suspects.length - unverifiable.length)}** | **${String(suspects.length)}** | **${String(unverifiable.length)}** |`,
  );
  lines.push("");

  lines.push(`## Suspects (${String(suspects.length)})`);
  lines.push("");
  if (suspects.length === 0) lines.push("None.");
  for (const a of suspects) {
    const fails = a.checks.filter((c) => c.status === "fail");
    lines.push(
      `### ${a.row.external_id} — ${a.row.is_active ? "ACTIVE" : "inactive"} — ${a.row.format} — ${a.source}`,
    );
    lines.push("");
    lines.push(`* Stem: "${stemExcerpt(a.row)}"`);
    lines.push(`* Stored: ${storedAnswerOf(a.row)}`);
    for (const f of fails) {
      lines.push(`* **${f.name}**: ${f.detail}`);
    }
    lines.push("");
  }

  lines.push(`## Unverifiable (${String(unverifiable.length)})`);
  lines.push("");
  lines.push(
    "No failure found, but the stored answer could not be mechanically confirmed either " +
      "(no computable stem target and no usable parsed-key entry). These need eyeball review " +
      "at lower priority than the suspects.",
  );
  lines.push("");
  lines.push("| external_id | active | format | source | stored | why unverifiable |");
  lines.push("|---|---|---|---|---|---|");
  for (const a of unverifiable) {
    const skips = a.checks
      .filter((c) => c.status === "skip")
      .map((c) => `${c.name}: ${c.detail}`)
      .join("; ");
    lines.push(
      `| ${a.row.external_id} | ${a.row.is_active ? "ACTIVE" : "inactive"} | ${a.row.format} | ${a.source} | ${storedAnswerOf(a.row).replace(/\|/g, "\\|")} | ${skips.replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("");

  lines.push("## Hand-seeded vs pipeline duplicates");
  lines.push("");
  lines.push(
    `${String(shadowedDuplicates.length)} pipeline-converted rows were shadowed by the earlier hand-transcribed rows ` +
      "(same external_id, on-conflict-do-nothing). Independent-transcription agreement:",
  );
  lines.push("");
  lines.push("| external_id | agreement | detail |");
  lines.push("|---|---|---|");
  for (const d of duplicateAgreement) {
    lines.push(
      `| ${d.external_id} | ${d.agree ? "AGREE" : "**DISAGREE**"} | ${d.detail.replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("");

  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`\nReport written: ${path.relative(process.cwd(), reportPath)}`);
  console.log(
    `Totals: checked=${String(audits.length)} suspect=${String(suspects.length)} unverifiable=${String(unverifiable.length)}`,
  );
}

// Only run when executed directly (pnpm convert:audit / tsx) — the module
// is also imported by unit tests for its pure functions.
const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error("Stage 5 audit failed:", message);
    process.exit(1);
  });
}
