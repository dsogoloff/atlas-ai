// Atlas Assessment — server-side answer judging.
//
// Per compliance.md §8 the correct answer never crosses to the client,
// so the submit route reads `questions.content -> 'correct_answer'` and
// judges here. Format-specific rules are the bare minimum for v1:
//
//   * MULTIPLE_CHOICE — trimmed exact string match (option ID).
//   * NUMERIC_ENTRY   — numeric coercion when both sides parse as numbers
//                       (handles "007" === "7", "7.0" === "7"); otherwise
//                       trimmed exact string match.
//   * DRAG_DROP       — JSON.stringify equality. TODO: revisit once
//                       drag-drop seed lands — canonical key ordering is
//                       required for true equivalence on object answers.
//
// `judgeAnswer` throws on malformed `content` (no correct_answer field, or
// non-object jsonb) — those are content-authoring bugs and the route
// surfaces them as 500s rather than silently scoring a wrong-answer.

import type { Enums, Json } from "@/lib/supabase/database.types";

export type QuestionFormat = Enums<"question_format">;

const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

export function judgeAnswer(
  format: QuestionFormat,
  contentJson: Json,
  answerGiven: string,
): boolean {
  const correct = extractCorrectAnswer(contentJson);

  switch (format) {
    case "MULTIPLE_CHOICE":
      return String(correct).trim() === answerGiven.trim();

    case "NUMERIC_ENTRY": {
      const a = answerGiven.trim();
      const c = String(correct).trim();
      if (NUMERIC_RE.test(a) && NUMERIC_RE.test(c)) {
        return Number(a) === Number(c);
      }
      return a === c;
    }

    case "DRAG_DROP":
      return JSON.stringify(correct) === answerGiven;
  }
}

function extractCorrectAnswer(contentJson: Json): Json {
  if (
    contentJson === null ||
    typeof contentJson !== "object" ||
    Array.isArray(contentJson)
  ) {
    throw new Error("[correctness] questions.content is not an object");
  }
  const v = contentJson.correct_answer;
  if (v === undefined) {
    throw new Error("[correctness] correct_answer missing on questions.content");
  }
  return v;
}
