// Atlas Assessment — question-picker public types.
//
// The picker is the "Layer 1.5" deterministic shim between Layer 1 (the
// IRT/Bayesian engine — features.md §1, src/lib/engine/) and the route
// handlers that call it. Given a NextQuestionRequest from the engine, the
// picker turns the {strand, target_difficulty, width} band into a concrete
// question row from the bank.
//
// Layer 2 (LLM-assisted item selection, future cycle per architecture.md
// and engine.ts header) plugs in via the `chooser` callback in pickQuestion.
// The picker stays pure-deterministic for v1.
//
// Convention (matches src/lib/responseSubmit/types.ts and timeFlagging):
//   * In-memory TS shapes are camelCase.
//   * DB rows / wire shapes are snake_case.
//   * Convert at the boundary; never rename in flight.

import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  HalfGradeLevel,
  QuestionFormat,
  Strand,
} from "@/lib/engine/types";

// ---------------------------------------------------------------------------
// DB row subset returned by the picker
// ---------------------------------------------------------------------------

/**
 * The columns the picker selects from `questions`. Deliberately narrower
 * than `Database["public"]["Tables"]["questions"]["Row"]` — the picker
 * doesn't read time-norm tags (those are the time-flagger's concern) and
 * the handler doesn't need tenant_id back since it already had it to
 * scope the query.
 *
 * `external_id` is included for the deterministic tiebreak (see picker.ts).
 */
export interface PickedQuestionRow {
  id: string;
  external_id: string | null;
  strand: Strand;
  level: HalfGradeLevel;
  difficulty: number;
  format: QuestionFormat;
  content: Json;
}

// Compile-time guard: PickedQuestionRow keys must remain a subset of the
// real questions row. If the schema ever drops one of these columns, this
// fails to typecheck and the maintainer fixes the picker rather than
// silently returning undefined fields.
type _PickedRowKeyCheck =
  keyof PickedQuestionRow extends keyof Database["public"]["Tables"]["questions"]["Row"]
    ? true
    : never;
const _pickedRowKeyCheck: _PickedRowKeyCheck = true;
void _pickedRowKeyCheck;

// ---------------------------------------------------------------------------
// Server-side `questions.content` jsonb shape (reference; not a TS type)
// ---------------------------------------------------------------------------
//
// `questions.content` is jsonb at the DB layer (initial_schema.sql:214) and
// is typed as `Json` everywhere in TS — narrowed at consumption by
// `correctness.ts` (server-side judging) and `serialize.ts` (client-bound
// stripping). The shape, by format and cross-cutting:
//
//   Cross-cutting (any format) — added Item #13a Phase 1:
//     * image_path?    string  bucket-relative path into the
//                              `question-images` Supabase Storage bucket.
//                              Phase 2 server route mints a short-TTL
//                              signed URL from this and emits
//                              ClientQuestionImage.url on the wire.
//     * image_alt?     string  answer-SAFE alt-text. Must describe the
//                              answer-relevant aspects of the image
//                              without giving away the answer. The
//                              source JSON `image_description` fields
//                              are answer-LEAKING and cannot be reused
//                              directly — Phase 4 authoring pass rewrites
//                              each one. Mandatory when `image_path` is
//                              set; enforced at the API layer (Phase 2),
//                              not the schema (jsonb is schemaless).
//     * image_required? boolean  mirrors the source-JSON `image_required`
//                              flag — true when the image is essential
//                              to the diagnostic (e.g. Q02 "count
//                              triangles" needs the figure), false when
//                              decorative (e.g. Q11 "apples" — solvable
//                              from text alone).
//
//   MULTIPLE_CHOICE — stem, options[], correct_index, distractor_misconceptions?
//   NUMERIC_ENTRY   — stem, correct_answer, accepted_answers? (any-of keys)
//   TEXT_ENTRY      — stem, correct_answer
//   DRAG_DROP       — stem, items[], correct_order
//
// (See correctness.ts header for the per-format correct-answer key
// convention and the throws-on-malformed contract.)

// ---------------------------------------------------------------------------
// Client-bound payload (compliance.md §8 Constraint 1 — answers stripped)
// ---------------------------------------------------------------------------

/**
 * Question shape sent to the browser. Every field is allowlisted by the
 * serializer in serialize.ts — anything not on this list is dropped.
 *
 * Per compliance.md §8 the following MUST NOT appear on the wire:
 *   * correct_answer        (NUMERIC_ENTRY / TEXT_ENTRY)
 *   * accepted_answers      (NUMERIC_ENTRY any-of keys)
 *   * correct_index         (MULTIPLE_CHOICE)
 *   * correct_order         (DRAG_DROP)
 *   * distractor_misconceptions  (any format)
 *   * misconception_tags    (any format — denormalised diagnostic data)
 *   * external_id           (S.A.M. catalog ID — licensing audit, server-only)
 *   * image_path            (Phase 2 mints a signed URL from this; the
 *                            raw bucket path never crosses to the client)
 *   * _authoring            (authored answer model + interaction metadata for
 *                            held image-input rows — answer-bearing; the
 *                            serializer never reads it)
 */
export interface ClientQuestion {
  id: string;
  strand: Strand;
  level: HalfGradeLevel;
  format: QuestionFormat;
  content: ClientQuestionContent;
}

/**
 * Image envelope on the client wire. Populated by the next-question route
 * (Phase 2) when the server-side `content.image_path` is set. The `url`
 * is a short-TTL signed URL minted via the Supabase Storage API; the raw
 * bucket path stays server-side per the allowlist above.
 *
 * `alt` is the answer-safe alt-text from `content.image_alt`; mandatory
 * when present. Phase 4 authoring pass populates the underlying field
 * for every image-essential item.
 *
 * `required` mirrors the server-side `content.image_required` flag. The
 * client uses this to drive fallback behavior on image-load failure
 * (per docs/item-13a-phase-3-visual-gate.md §5):
 *   * required=true  — image is essential to the diagnostic (e.g. Q02
 *                      "count triangles"). On load failure, render an
 *                      inline error + Retry UI. (Phase 3.5 wires the
 *                      input-disable behavior on top of this signal.)
 *   * required=false — image is decorative (e.g. apples on a word
 *                      problem solvable from text). On load failure,
 *                      hide the image area gracefully and let the
 *                      child proceed.
 *
 * Defaults to `false` at mint time when the server-side field is absent.
 */
export interface ClientQuestionImage {
  url: string;
  alt: string;
  required: boolean;
}

/** One render-safe option/target for SELECT_MULTIPLE / VISUAL_MATCHING.
 *
 *  `image` is an optional per-tile signed-URL envelope (per-tile matching
 *  images — e.g. L1 Q13 shapes→names, Q15 3D solids→names, Q07 scene +
 *  candidate tiles). Server-side the authored item may carry its own
 *  `image_path` (+ optional answer-safe `image_alt`); the serve path mints
 *  a short-TTL signed URL per tile (mintMatchingTileImages) and the
 *  serializer attaches it here. The raw `image_path` NEVER crosses to the
 *  client — same allowlist posture as the question-level image. When
 *  absent, the tile renders its text `label`. Display-only: grading still
 *  matches on ids (content.pairs), never on the image. */
export interface ClientLabeledItem {
  id: string;
  label: string;
  image?: ClientQuestionImage;
}

/** One template cell for MULTI_BLANK on the wire (text or a fillable blank).
 *  Mirrors FillToken in answer-inputs/types.ts — render-safe (no answer). */
export type ClientFillToken =
  | { t: "text"; value: string }
  | { t: "blank"; id: string; placeholder?: string };

export type ClientQuestionContent =
  | { stem: string; options: string[]; image?: ClientQuestionImage }   // MULTIPLE_CHOICE
  | { stem: string; image?: ClientQuestionImage }                       // NUMERIC_ENTRY / TEXT_ENTRY
  | { stem: string; items: string[]; image?: ClientQuestionImage }      // DRAG_DROP
  | {
      // SELECT_MULTIPLE — answer field `correct` stripped.
      stem: string;
      select_rule: string;
      options: ClientLabeledItem[];
      count?: number;
      image?: ClientQuestionImage;
    }
  | {
      // VISUAL_MATCHING — answer field `pairs` stripped.
      stem: string;
      left: ClientLabeledItem[];
      right: ClientLabeledItem[];
      image?: ClientQuestionImage;
    }
  | {
      // MULTI_BLANK — answer field `blanks` stripped.
      stem: string;
      tokens: ClientFillToken[];
      image?: ClientQuestionImage;
    }
  | {
      // EQUATION_SET — every answer field (canonical / allowedNumbers / …)
      // stripped.
      stem: string;
      rows: number;
      ops?: string[];
      image?: ClientQuestionImage;
    }
  | {
      // CLICK_IMAGE_SINGLE / CLICK_IMAGE_MULTI / IMAGE_ORDERING — selectable
      // image (or text-label) tiles. The authored answer model lives at
      // content._authoring.answer_model and is NEVER serialized (read
      // server-side only by correctness.ts). Each tile's raw image_path stays
      // server-side; the client sees only the per-tile minted `image`
      // envelope. The three formats share this shape; the client narrows on
      // ClientQuestion.format, not on content.
      stem: string;
      tiles: ClientLabeledItem[];
      image?: ClientQuestionImage;
    };

// ---------------------------------------------------------------------------
// Picker contract
// ---------------------------------------------------------------------------

/** What the picker is asked to find. Mirrors engine.NextQuestionRequest
 *  but is repeated here so the picker module has no engine import cycle
 *  if it ever needs to be reused. */
export interface PickerRequest {
  strand: Strand;
  /** IRT difficulty target. The picker treats `width` as advisory only —
   *  see picker.ts for the strand-exhaustion rationale. */
  targetDifficulty: number;
  width: number;
}

/** Side-data the picker needs that doesn't come from the engine state. */
export interface PickerContext {
  tenantId: string;
  /** Question IDs already served in this session — never repeat. Sourced
   *  from EngineState.servedQuestionIds at the call site. */
  servedQuestionIds: ReadonlyArray<string>;
  /** Optional cap on candidates fetched. v1 callers leave this at 1 (the
   *  default chooser returns the first row). Layer 2 will raise this and
   *  pass a misconception-aware chooser. */
  candidateLimit?: number;
  /** Optional allow-list of `questions.level` values the pick may draw from —
   *  the S.A.M. booklet level band (see levelBand.ts). HOLD HARD: when set, a
   *  candidate whose level is outside it is excluded with NO widening fallback
   *  (an empty in-band set yields `strand-exhausted`). When omitted, no level
   *  filter is applied (legacy/level-blind behavior). The comprehensive picker
   *  receives the ±1 band; the short picker receives the previous booklet. */
  levelBand?: readonly string[];
}

/** Discriminated result. `strand-exhausted` is the only failure mode the
 *  picker reports; DB errors throw so the orchestrator can map them to 500. */
export type PickerResult =
  | { ok: true; question: PickedQuestionRow }
  | { ok: false; reason: "strand-exhausted" };

/** Layer-2 plug-in point. Receives the candidate set (size determined by
 *  PickerContext.candidateLimit) and returns the chosen row, or null to
 *  signal the chooser declined to pick (treated as strand-exhausted by
 *  the orchestrator). The default chooser returns candidates[0] ?? null. */
export type Chooser = (
  candidates: ReadonlyArray<PickedQuestionRow>,
) => PickedQuestionRow | null;
