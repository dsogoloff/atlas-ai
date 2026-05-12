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
//   * image_path                (Item #13a Phase 2 — the raw bucket path
//                                stays server-side; a freshly minted
//                                signed URL crosses to the client instead,
//                                injected as content.image by the caller)
//
// We achieve this by *constructing* the output object key-by-key from the
// allowed fields rather than spreading and deleting — a spread-then-delete
// is one missed property name from leaking answers.
//
// Throwing semantics: malformed `content` (missing required key, wrong
// type) throws. The orchestrator surfaces these as 500s — they're
// content-authoring bugs, not user-input errors. Mirrors the posture in
// src/lib/responseSubmit/correctness.ts.
//
// Image plumbing (Item #13a Phase 2): callers that need to serve images
// pass a pre-minted `ClientQuestionImage` envelope as the second argument.
// The serializer is intentionally NOT coupled to the Supabase Storage SDK
// — minting is a separate concern in mintImage.ts. Use serveQuestion()
// from serveQuestion.ts as the canonical "mint + serialize" entry point
// in handler code; call toClientQuestion() directly only in tests that
// want to exercise serialization without storage SDK involvement.

import type { Json } from "@/lib/supabase/database.types";

import type {
  ClientQuestion,
  ClientQuestionContent,
  ClientQuestionImage,
  PickedQuestionRow,
} from "./types";

export function toClientQuestion(
  row: PickedQuestionRow,
  image?: ClientQuestionImage,
): ClientQuestion {
  return {
    id: row.id,
    strand: row.strand,
    level: row.level,
    format: row.format,
    content: stripContent(row.format, row.content, image),
  };
}

function stripContent(
  format: PickedQuestionRow["format"],
  content: Json,
  image: ClientQuestionImage | undefined,
): ClientQuestionContent {
  const obj = asObject(content);
  const stem = readString(obj, "stem");

  // Each branch threads `image` through via conditional spread. When
  // `image` is undefined the spread produces `{}`, so the resulting
  // object has no `image` key at all (Object.keys returns the
  // pre-Phase-2 shape exactly — important for the allowlist-invariants
  // test). JSON.stringify of `{ image: undefined }` would also drop the
  // key, but Object.keys would not — the spread covers both.
  switch (format) {
    case "MULTIPLE_CHOICE":
      return {
        stem,
        options: readStringArray(obj, "options"),
        ...(image ? { image } : {}),
      };
    case "NUMERIC_ENTRY":
      return { stem, ...(image ? { image } : {}) };
    case "DRAG_DROP":
      return {
        stem,
        items: readStringArray(obj, "items"),
        ...(image ? { image } : {}),
      };
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
