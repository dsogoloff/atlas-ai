// Atlas Assessment — server→client question serializer.
//
// Strict allowlist per compliance.md §8 Constraint 1: the wire payload
// includes the stem and visible answer choices and NOTHING ELSE from
// `questions.content`. Specifically prohibited from crossing the boundary:
//
//   * correct_answer            (NUMERIC_ENTRY)
//   * correct_index             (MULTIPLE_CHOICE)
//   * correct_order             (DRAG_DROP)
//   * distractor_misconceptions (MULTIPLE_CHOICE)
//
// We achieve this by *constructing* the output object key-by-key from the
// allowed fields rather than spreading and deleting — a spread-then-delete
// is one missed property name from leaking answers.
//
// Throwing semantics: malformed `content` (missing required key, wrong
// type) throws. The orchestrator surfaces these as 500s — they're
// content-authoring bugs, not user-input errors. Mirrors the posture in
// src/lib/responseSubmit/correctness.ts.

import type { Json } from "@/lib/supabase/database.types";

import type {
  ClientQuestion,
  ClientQuestionContent,
  PickedQuestionRow,
} from "./types";

export function toClientQuestion(row: PickedQuestionRow): ClientQuestion {
  return {
    id: row.id,
    strand: row.strand,
    level: row.level,
    format: row.format,
    content: stripContent(row.format, row.content),
  };
}

function stripContent(
  format: PickedQuestionRow["format"],
  content: Json,
): ClientQuestionContent {
  const obj = asObject(content);
  const stem = readString(obj, "stem");

  switch (format) {
    case "MULTIPLE_CHOICE":
      return { stem, options: readStringArray(obj, "options") };
    case "NUMERIC_ENTRY":
      return { stem };
    case "DRAG_DROP":
      return { stem, items: readStringArray(obj, "items") };
  }
}

// ---------------------------------------------------------------------------
// Json-shape narrowing helpers
// ---------------------------------------------------------------------------

function asObject(content: Json): Record<string, Json> {
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    throw new Error("[serialize] questions.content is not an object");
  }
  return content as Record<string, Json>;
}

function readString(obj: Record<string, Json>, key: string): string {
  const v = obj[key];
  if (typeof v !== "string") {
    throw new Error(`[serialize] questions.content.${key} is not a string`);
  }
  return v;
}

function readStringArray(obj: Record<string, Json>, key: string): string[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(`[serialize] questions.content.${key} is not an array`);
  }
  for (const item of v) {
    if (typeof item !== "string") {
      throw new Error(
        `[serialize] questions.content.${key} contains non-string entries`,
      );
    }
  }
  return v as string[];
}
