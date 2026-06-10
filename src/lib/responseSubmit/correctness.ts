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
//     tolerance — see its comment), then numeric coercion when both sides
//     parse as numbers (handles "007" === "7", "7.0" === "7"); otherwise
//     normalized exact string match.
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
      const correct = readString(obj, "correct_answer", format);
      const a = normalizeAnswer(answerGiven);
      const c = normalizeAnswer(correct);
      if (NUMERIC_RE.test(a) && NUMERIC_RE.test(c)) {
        return Number(a) === Number(c);
      }
      return a === c;
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
