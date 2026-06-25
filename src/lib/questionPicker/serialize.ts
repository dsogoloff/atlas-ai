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
//                                injected as content.image by the caller.
//                                Same rule applies per-tile: VISUAL_MATCHING
//                                left/right items' own image_path/image_alt
//                                stay server-side; the client sees only the
//                                minted item.image envelope.)
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

import { spreadOptions } from "./optionOrder";

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
  tileImages?: Record<string, ClientQuestionImage>,
): ClientQuestion {
  return {
    id: row.id,
    strand: row.strand,
    level: row.level,
    format: row.format,
    content: stripContent(row.format, row.content, image, tileImages, row.id),
  };
}

function stripContent(
  format: PickedQuestionRow["format"],
  content: Json,
  image: ClientQuestionImage | undefined,
  tileImages: Record<string, ClientQuestionImage> | undefined,
  seed: string,
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
        // Select-all: spread option order so the correct options are not
        // position-clustered (see optionOrder.ts). Graded by option id.
        options: spreadOptions(
          readLabeledItems(obj, "options"),
          readIdArray(obj, "correct"),
          seed,
        ),
        ...(image ? { image } : {}),
      };
      const count = readOptionalInteger(obj, "count");
      return count === undefined ? out : { ...out, count };
    }
    case "VISUAL_MATCHING":
      // Render-safe: stem, left[{id,label,image?}], right[{id,label,image?}].
      // Answer field `pairs` is NEVER read here. Per-tile `image` is the
      // pre-minted signed-URL envelope (tileImages map); the raw per-tile
      // `image_path`/`image_alt` are dropped by the key-by-key build below.
      return {
        stem,
        left: readLabeledItems(obj, "left", tileImages),
        right: readLabeledItems(obj, "right", tileImages),
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
    case "CLICK_IMAGE_SINGLE":
    case "IMAGE_ORDERING":
      // Render-safe: stem + tiles[{id,label,image?}]. The authored answer
      // model (content._authoring.answer_model) is answer-bearing and is
      // NEVER read here — the key-by-key build below cannot leak it. Per-tile
      // raw `image_path`/`image_alt` stay server-side; the client sees only
      // the minted `image` envelope (tileImages map), same as VISUAL_MATCHING.
      // No clustering to spread: CLICK_IMAGE_SINGLE has one correct tile;
      // IMAGE_ORDERING is author-ordered (order is the answer).
      return {
        stem,
        tiles: readLabeledItems(obj, "tiles", tileImages),
        ...(image ? { image } : {}),
      };
    case "CLICK_IMAGE_MULTI":
      // Select-all over image tiles: spread tile order so the correct tiles are
      // not position-clustered (see optionOrder.ts). The correct-id list is read
      // ONLY to compute the order (via readAnswerModelCorrect) — it is NOT emitted;
      // grading is server-side by tile id (`{type:"id-set",ids}`), never position.
      return {
        stem,
        tiles: spreadOptions(
          readLabeledItems(obj, "tiles", tileImages),
          readAnswerModelCorrect(obj),
          seed,
        ),
        ...(image ? { image } : {}),
      };
  }
}

/** Correct-option ids for a select-all field (e.g. SELECT_MULTIPLE `correct`).
 *  Read ONLY to compute display order; never emitted. Tolerant — returns [] if
 *  absent/malformed (order then falls back to a plain deterministic shuffle). */
function readIdArray(obj: Record<string, Json>, key: string): string[] {
  const v = obj[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Correct tile ids from a CLICK_IMAGE_MULTI authored answer model
 *  (content._authoring.answer_model.correct). Server-side only (see readIdArray). */
function readAnswerModelCorrect(obj: Record<string, Json>): string[] {
  const a = obj["_authoring"];
  if (a === null || typeof a !== "object" || Array.isArray(a)) return [];
  const m = (a as Record<string, Json>)["answer_model"];
  if (m === null || typeof m !== "object" || Array.isArray(m)) return [];
  const c = (m as Record<string, Json>)["correct"];
  return Array.isArray(c) ? c.filter((x): x is string => typeof x === "string") : [];
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
 * Render-safe {id,label,image?} array (SELECT_MULTIPLE options,
 * VISUAL_MATCHING left/right). Built field-by-field from `id` and `label`
 * only — any other key on an authored item (notably the answer-adjacent
 * per-tile `image_path`/`image_alt`) is dropped, never spread.
 *
 * When `tileImages` is supplied (VISUAL_MATCHING serve path), the
 * pre-minted signed-URL envelope for an item is attached as `image`. The
 * raw `image_path` stays server-side — the client only ever sees the
 * minted `image.{url,alt,required}`, never the bucket path. Items not in
 * the map keep the pre-existing `{id,label}` shape exactly.
 */
function readLabeledItems(
  obj: Record<string, Json>,
  key: string,
  tileImages?: Record<string, ClientQuestionImage>,
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
    const tileImage = tileImages?.[o.id];
    return tileImage
      ? { id: o.id, label: o.label, image: tileImage }
      : { id: o.id, label: o.label };
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
