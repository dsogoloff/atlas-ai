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
//   * NUMERIC_ENTRY   — content.correct_answer (string). Numeric coercion
//     when both sides parse as numbers (handles "007" === "7", "7.0" === "7");
//     otherwise trimmed exact string match.
//   * DRAG_DROP       — content.correct_order (array). JSON.stringify
//     equality. Works for arrays of primitives because JSON.stringify is
//     order-stable on arrays. Object answers would require canonical key
//     ordering — out of scope until a real DD seed lands with that shape.
//
// `judgeAnswer` throws on malformed content (missing per-format key, wrong
// type, out-of-range index) — those are content-authoring bugs and the
// route surfaces them as 500s rather than silently scoring a wrong-answer.

import type { Enums, Json } from "@/lib/supabase/database.types";

export type QuestionFormat = Enums<"question_format">;

const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

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
      const a = answerGiven.trim();
      const c = correct.trim();
      if (NUMERIC_RE.test(a) && NUMERIC_RE.test(c)) {
        return Number(a) === Number(c);
      }
      return a === c;
    }

    case "DRAG_DROP": {
      const correctOrder = readArray(obj, "correct_order", format);
      return JSON.stringify(correctOrder) === answerGiven;
    }
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
