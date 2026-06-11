// Atlas Assessment — server-side answer judging.
//
// Per compliance.md §8 the correct answer never crosses to the client,
// so the submit route reads questions.content here and judges. Each
// format stores its correct answer under a different key (see seed.sql,
// serialize.ts, and the compliance comment on ClientQuestion):
//
//   * MULTIPLE_CHOICE — content.correct_index (integer, valid index into
//     content.options). Client submits the option's display text; we
//     compare options[correct_index].trim() to answerGiven.trim(). The
//     index-keyed schema lets distractor_misconceptions co-index with
//     options without a parallel migration to text-keyed maps.
//   * NUMERIC_ENTRY   — content.correct_answer (string). Both sides pass
//     through normalizeAnswer() first (case/whitespace/separator/unit-spacing
//     tolerance — see its comment). A key shaped like ONE number (incl.
//     S.A.M. thousands grouping, "42 800") compares with all grouping
//     stripped from both sides; list-shaped keys keep separator semantics.
//     Then numeric coercion when both sides parse as numbers (handles
//     "007" === "7", "7.0" === "7"); otherwise normalized exact match.
//     An optional content.accepted_answers (string array) marks an
//     any-of key — questions like "Name one number that divides both 54
//     and 72" accept several values; the child's answer is judged against
//     each entry with the same per-key logic and any match grades correct.
//   * TEXT_ENTRY      — content.correct_answer (string). Word/phrase
//     answers ("cylinder", "smaller than", "Ninety-six", "9:25 am").
//     Both sides pass through normalizeTextAnswer() — normalizeAnswer()
//     plus dash canonicalization (the bank's en-dash "8 – 2" matches a
//     keyboard hyphen), letter-joining-hyphen → space ("ninety-six" ===
//     "ninety six"), and operator spacing ("6+2=8" === "6 + 2 = 8") —
//     then exact equality.
//   * DRAG_DROP       — content.correct_order (array). JSON.stringify
//     equality after normalizeAnswer() on each string token of both sides.
//     Works for arrays of primitives because JSON.stringify is order-stable
//     on arrays. Object answers would require canonical key ordering — out
//     of scope until a real DD seed lands with that shape. A non-JSON
//     answerGiven falls back to the raw exact compare (always false for a
//     well-formed correct_order — kept so malformed clients grade wrong
//     instead of throwing).
//
// `judgeAnswer` throws on malformed content (missing per-format key, wrong
// type, out-of-range index) — those are content-authoring bugs and the
// route surfaces them as 500s rather than silently scoring a wrong-answer.

import type { Enums, Json } from "@/lib/supabase/database.types";

export type QuestionFormat = Enums<"question_format">;

const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

// A stored key shaped like ONE number: plain digits ("1000") or S.A.M.
// thousands grouping — groups of exactly 3 after the first ("42 800",
// "1 234 567"). Applied to the normalized key, where commas have already
// become spaces. The KEY's shape selects the comparison mode, never the
// child's input: list keys like "10 17 20" (groups that are not exactly
// 3 digits) keep list semantics. Inherently ambiguous keys such as
// "10 170 200" read as one grouped number — S.A.M. notation makes that
// the right default.
const SINGLE_NUMBER_KEY_RE = /^-?(?:\d+|\d{1,3}(?: \d{3})+)(?:\.\d+)?$/;

/**
 * Mode selector for NUMERIC_ENTRY grading, exported so tests can pin the
 * partition directly. Takes the NORMALIZED stored key; returns true for
 * single-number mode (strip grouping from both sides), false for list
 * mode (separators significant, digits never join). Because judgeAnswer
 * branches if/else on this one boolean of the key alone, exactly one
 * mode ever runs for a given question — the paths cannot cross.
 */
export function isSingleNumberKey(normalizedKey: string): boolean {
  return SINGLE_NUMBER_KEY_RE.test(normalizedKey);
}

// Unit tokens that appear (or plausibly appear) after a number in bank
// answers — seed.sql today uses km / m / am ("1 km 750 m", "9:25 am");
// the rest are the S.A.M. measurement set so future questions normalize
// the same way. Longest tokens first so "km" wins over "m", "min" over "m".
const UNIT_TOKENS = "km|cm|mm|kg|ml|min|am|pm|m|g|l|h|s";
const UNIT_SPACING_RE = new RegExp(`(\\d) ?(${UNIT_TOKENS})\\b`, "g");

/**
 * Canonicalize a free-text answer before equality so trivially-equivalent
 * child input grades correct:
 *
 *   1. lowercase;
 *   2. collapse every run of separators (whitespace and/or commas) to a
 *      single space — comma and space are equivalent LIST separators, but
 *      order stays significant and separators are only ever replaced,
 *      never deleted, so digit groups can never merge ("10 17 20" stays
 *      distinct from "1017 20");
 *   3. canonical unit spacing — a digit followed (with or without a space)
 *      by a known unit token becomes "digit unit": "1km" → "1 km",
 *      "9:25am" → "9:25 am".
 */
export function normalizeAnswer(raw: string): string {
  const collapsed = raw.toLowerCase().replace(/[\s,]+/g, " ").trim();
  return collapsed.replace(UNIT_SPACING_RE, "$1 $2");
}

/**
 * TEXT_ENTRY canonicalization — normalizeAnswer() plus the tolerances a
 * typed word/phrase answer needs (applied to BOTH sides, so equality is
 * preserved under the transform):
 *
 *   1. unicode dashes (hyphen variants, en/em dash, minus sign) become
 *      the ASCII hyphen the child's keyboard produces — the bank stores
 *      "8 – 2 = 6" (en-dash) but a child types "8 - 2 = 6";
 *   2. a hyphen JOINING two letters becomes a space, so "ninety-six",
 *      "ninety six" and "Ninety-Six" all converge ("8-2" is digit-
 *      adjacent and is NOT touched by this rule);
 *   3. the math operators + = - get canonical single-space padding, so
 *      "6+2=8" matches "6 + 2 = 8" (fact-family answers);
 *   4. re-collapse any space runs the padding introduced.
 */
export function normalizeTextAnswer(raw: string): string {
  return normalizeAnswer(raw)
    .replace(/[‐-―−]/g, "-")
    .replace(/([a-z])-(?=[a-z])/g, "$1 ")
    .replace(/[+=-]/g, " $& ")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function judgeAnswer(
  format: QuestionFormat,
  contentJson: Json,
  answerGiven: string,
): boolean {
  const obj = asObject(contentJson);

  switch (format) {
    case "MULTIPLE_CHOICE": {
      const options = readStringArray(obj, "options", format);
      const correctIndex = readInteger(obj, "correct_index", format);
      if (correctIndex < 0 || correctIndex >= options.length) {
        throw new Error(
          `[correctness] correct_index ${correctIndex} out of range for ${options.length} options`,
        );
      }
      return options[correctIndex].trim() === answerGiven.trim();
    }

    case "NUMERIC_ENTRY": {
      // Any-of keys: content.accepted_answers lists every value that
      // grades correct ("Name one number that divides both 54 and 72"
      // accepts 1/2/3/6/9/18). Each entry is judged with the same
      // per-key logic as a plain correct_answer. content.correct_answer
      // stays present as the human-readable key (report + classifier).
      if ("accepted_answers" in obj) {
        const accepted = readStringArray(obj, "accepted_answers", format);
        if (accepted.length === 0) {
          throw new Error(
            "[correctness] accepted_answers is empty on NUMERIC_ENTRY content",
          );
        }
        return accepted.some((key) => numericKeyMatches(key, answerGiven));
      }
      const correct = readString(obj, "correct_answer", format);
      return numericKeyMatches(correct, answerGiven);
    }

    case "TEXT_ENTRY": {
      const correct = readString(obj, "correct_answer", format);
      return normalizeTextAnswer(answerGiven) === normalizeTextAnswer(correct);
    }

    case "DRAG_DROP": {
      const correctOrder = readArray(obj, "correct_order", format);
      const given = parseJsonArray(answerGiven);
      if (given === null) {
        return JSON.stringify(correctOrder) === answerGiven;
      }
      return (
        JSON.stringify(correctOrder.map(normalizeJsonToken)) ===
        JSON.stringify(given.map(normalizeJsonToken))
      );
    }
  }
}

// ---------------------------------------------------------------------------
// NUMERIC_ENTRY helpers
// ---------------------------------------------------------------------------

/**
 * Judge a single NUMERIC_ENTRY key against the child's answer — the P1
 * normalization pipeline: normalizeAnswer() both sides, then the key's
 * shape selects single-number mode (grouping stripped) or list mode
 * (separators significant), then numeric coercion where both sides
 * parse as numbers, else normalized exact match.
 */
function numericKeyMatches(correct: string, answerGiven: string): boolean {
  const a = normalizeAnswer(answerGiven);
  const c = normalizeAnswer(correct);
  // Single-number keys: strip all grouping from both sides so
  // "42 800", "42,800" and "42800" all match a key of "42 800".
  if (isSingleNumberKey(c)) {
    const aStripped = a.replace(/ /g, "");
    if (NUMERIC_RE.test(aStripped)) {
      return Number(aStripped) === Number(c.replace(/ /g, ""));
    }
    return a === c;
  }
  if (NUMERIC_RE.test(a) && NUMERIC_RE.test(c)) {
    return Number(a) === Number(c);
  }
  return a === c;
}

// ---------------------------------------------------------------------------
// DRAG_DROP helpers
// ---------------------------------------------------------------------------

function normalizeJsonToken(v: Json): Json {
  return typeof v === "string" ? normalizeAnswer(v) : v;
}

function parseJsonArray(raw: string): Json[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Json[]) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Json-shape narrowing helpers (per-format error messages)
// ---------------------------------------------------------------------------

function asObject(content: Json): Record<string, Json> {
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    throw new Error("[correctness] questions.content is not an object");
  }
  return content as Record<string, Json>;
}

function readString(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): string {
  const v = obj[key];
  if (typeof v !== "string") {
    throw new Error(
      `[correctness] ${key} missing or not a string on ${format} content`,
    );
  }
  return v;
}

function readInteger(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new Error(
      `[correctness] ${key} missing or not an integer on ${format} content`,
    );
  }
  return v;
}

function readStringArray(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): string[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(
      `[correctness] ${key} missing or not an array on ${format} content`,
    );
  }
  for (const item of v) {
    if (typeof item !== "string") {
      throw new Error(
        `[correctness] ${key} on ${format} content contains non-string entries`,
      );
    }
  }
  return v as string[];
}

function readArray(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): Json[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(
      `[correctness] ${key} missing or not an array on ${format} content`,
    );
  }
  return v;
}
