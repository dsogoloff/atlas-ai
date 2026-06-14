// Atlas Assessment — server→client question serializer.
//
// Strict allowlist per compliance.md §8 Constraint 1: the wire payload
// includes the stem and visible answer choices and NOTHING ELSE from
// `questions.content`. Specifically prohibited from crossing the boundary:
//
//   * correct_answer            (NUMERIC_ENTRY / TEXT_ENTRY)
//   * accepted_answers          (NUMERIC_ENTRY any-of keys)
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
  ClientFillToken,
  ClientLabeledItem,
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
    case "TEXT_ENTRY":
      // TEXT_ENTRY mirrors NUMERIC_ENTRY on the wire: stem only. Both
      // correct_answer and accepted_answers stay server-side.
      return { stem, ...(image ? { image } : {}) };
    case "DRAG_DROP":
      return {
        stem,
        items: readStringArray(obj, "items"),
        ...(image ? { image } : {}),
      };
    case "SELECT_MULTIPLE": {
      // Render-safe: stem, select_rule, options[{id,label}], count?.
      // Answer field `correct` is NEVER read here.
      const out: Extract<ClientQuestionContent, { select_rule: string }> = {
        stem,
        select_rule: readString(obj, "select_rule"),
        options: readLabeledItems(obj, "options"),
        ...(image ? { image } : {}),
      };
      const count = readOptionalInteger(obj, "count");
      return count === undefined ? out : { ...out, count };
    }
    case "VISUAL_MATCHING":
      // Render-safe: stem, left[{id,label}], right[{id,label}].
      // Answer field `pairs` is NEVER read here.
      return {
        stem,
        left: readLabeledItems(obj, "left"),
        right: readLabeledItems(obj, "right"),
        ...(image ? { image } : {}),
      };
    case "MULTI_BLANK":
      // Render-safe: stem, tokens (text + blank ids).
      // Answer field `blanks` is NEVER read here.
      return {
        stem,
        tokens: readFillTokens(obj, "tokens"),
        ...(image ? { image } : {}),
      };
    case "EQUATION_SET": {
      // Render-safe: stem, rows, ops?. EVERY answer field
      // (canonical/allowedNumbers/requireCount/…) is NEVER read here.
      const out: Extract<ClientQuestionContent, { rows: number }> = {
        stem,
        rows: readInteger(obj, "rows"),
        ...(image ? { image } : {}),
      };
      const ops = readOptionalStringArray(obj, "ops");
      return ops === undefined ? out : { ...out, ops };
    }
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

function readInteger(obj: Record<string, Json>, key: string): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new Error(`[serialize] questions.content.${key} is not an integer`);
  }
  return v;
}

function readOptionalInteger(
  obj: Record<string, Json>,
  key: string,
): number | undefined {
  const v = obj[key];
  if (v === undefined) return undefined;
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new Error(`[serialize] questions.content.${key} is not an integer`);
  }
  return v;
}

function readOptionalStringArray(
  obj: Record<string, Json>,
  key: string,
): string[] | undefined {
  if (obj[key] === undefined) return undefined;
  return readStringArray(obj, key);
}

/**
 * Render-safe {id,label} array (SELECT_MULTIPLE options, VISUAL_MATCHING
 * left/right). Built field-by-field from `id` and `label` only — any other
 * key on an authored item (none expected, but defensively) is dropped.
 */
function readLabeledItems(
  obj: Record<string, Json>,
  key: string,
): ClientLabeledItem[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(`[serialize] questions.content.${key} is not an array`);
  }
  return v.map((item, i) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        `[serialize] questions.content.${key}[${i}] is not an object`,
      );
    }
    const o = item as Record<string, Json>;
    if (typeof o.id !== "string" || typeof o.label !== "string") {
      throw new Error(
        `[serialize] questions.content.${key}[${i}] missing string id/label`,
      );
    }
    return { id: o.id, label: o.label };
  });
}

/**
 * Render-safe FillToken array (MULTI_BLANK tokens). Built field-by-field —
 * a blank token carries only its id + optional placeholder; no answer.
 */
function readFillTokens(
  obj: Record<string, Json>,
  key: string,
): ClientFillToken[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(`[serialize] questions.content.${key} is not an array`);
  }
  return v.map((item, i) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        `[serialize] questions.content.${key}[${i}] is not an object`,
      );
    }
    const o = item as Record<string, Json>;
    if (o.t === "text") {
      if (typeof o.value !== "string") {
        throw new Error(
          `[serialize] questions.content.${key}[${i}] text token missing string value`,
        );
      }
      return { t: "text", value: o.value };
    }
    if (o.t === "blank") {
      if (typeof o.id !== "string") {
        throw new Error(
          `[serialize] questions.content.${key}[${i}] blank token missing string id`,
        );
      }
      return typeof o.placeholder === "string"
        ? { t: "blank", id: o.id, placeholder: o.placeholder }
        : { t: "blank", id: o.id };
    }
    throw new Error(
      `[serialize] questions.content.${key}[${i}] has unknown token type`,
    );
  });
}
