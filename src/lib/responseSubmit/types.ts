// Atlas Assessment — response-submit DTOs.
//
// Single source of truth for the POST /api/assess/submit wire format.
// The route handler imports SubmitRequestSchema for inbound parsing;
// the orchestrator returns SubmitHandlerResult, which the route maps to
// NextResponse.
//
// Convention (matches src/lib/timeFlagging/types.ts):
//   * In-memory TS shapes (engine outputs) are camelCase.
//   * Wire / persisted shapes are snake_case.
//   * Convert at the boundary via the serializers below — never rename
//     in flight.

import { z } from "zod";

import type {
  HalfGradeLevel,
  PlacementEstimate,
  Strand,
} from "@/lib/engine/types";
import type { ClientQuestion } from "@/lib/questionPicker/types";
import type { TimeFlag } from "@/lib/timeFlagging";

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

// time_ms is client-supplied. There's no question_served_at column in v1,
// so server-side timing isn't available. The 30-min cap is a sanity bound;
// anything longer almost certainly means the child walked away.
export const SubmitRequestSchema = z.object({
  session_id: z.string().uuid(),
  question_id: z.string().uuid(),
  answer_given: z.string().max(2000),
  time_ms: z.number().int().min(0).max(1_800_000),
});

export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;

// ---------------------------------------------------------------------------
// Response (success)
// ---------------------------------------------------------------------------

export interface NextRequestJson {
  strand: Strand;
  target_difficulty: number;
  width: number;
}

export interface PlacementEstimateJson {
  overall_level: HalfGradeLevel;
  strand_levels: Record<Strand, HalfGradeLevel>;
  confidence: number;
}

/** Wire-shape termination reasons. Narrower than engine's
 *  TerminationDecision.reason — drops 'in-progress' (only ever emitted
 *  while done === false, never on a terminal response). */
export type TerminationReasonWire =
  | "confidence-threshold-met"
  | "max-questions-reached"
  | "bank-exhausted";

export interface SubmitResponseBody {
  is_correct: boolean;
  time_flag: TimeFlag;
  done: boolean;
  /** Count of responses persisted on this session AFTER this submit's
   *  response row landed. Item #12 Phase 7.7 — drives the child-facing
   *  progress chrome's "Question N of up to 25" copy. When done=false
   *  the displayed question number for `next_question` is
   *  `response_count + 1`. */
  response_count: number;
  /** Present iff done === false. Strand + difficulty band the engine
   *  wants next — diagnostic alongside next_question. */
  next_request?: NextRequestJson;
  /** Present iff done === false. The actual picked question (already
   *  audit-logged server-side); the client renders this directly without
   *  a follow-up fetch. compliance.md §8 — content is allowlist-stripped. */
  next_question?: ClientQuestion;
  /** Present iff done === true. Mirror of assessment_sessions.current_estimate. */
  placement?: PlacementEstimateJson;
  /** Present iff done === true. Why the session closed. */
  termination_reason?: TerminationReasonWire;
}

// ---------------------------------------------------------------------------
// Handler result (route maps to NextResponse)
// ---------------------------------------------------------------------------

export type SubmitErrorCode =
  | "invalid_body"
  | "unauthorized"
  | "forbidden"
  | "session_not_found"
  | "session_completed"
  | "question_not_found"
  | "flagger_error"
  | "internal";

export interface SubmitError {
  code: SubmitErrorCode;
  message: string;
  status: number;
}

export type SubmitHandlerResult =
  | { ok: true; body: SubmitResponseBody }
  | { ok: false; error: SubmitError };

// ---------------------------------------------------------------------------
// Boundary serializers (camelCase engine shapes -> snake_case wire shapes)
// ---------------------------------------------------------------------------

export function toNextRequestJson(req: {
  strand: Strand;
  targetDifficulty: number;
  width: number;
}): NextRequestJson {
  return {
    strand: req.strand,
    target_difficulty: req.targetDifficulty,
    width: req.width,
  };
}

export function toPlacementEstimateJson(
  est: PlacementEstimate,
): PlacementEstimateJson {
  return {
    overall_level: est.overallLevel,
    strand_levels: est.strandLevels,
    confidence: est.confidence,
  };
}

/** Runtime type guard for the persisted/wire shape. Use at any boundary
 *  reading current_estimate from the DB (typed there as Json | null) —
 *  callers should narrow with this guard before passing the value to
 *  fromPlacementEstimateJson. */
export function isPlacementEstimateJson(
  value: unknown,
): value is PlacementEstimateJson {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.overall_level === "string" &&
    typeof v.confidence === "number" &&
    typeof v.strand_levels === "object" &&
    v.strand_levels !== null
  );
}

/** Inverse of toPlacementEstimateJson: hydrates the snake_case wire/DB
 *  shape into the camelCase engine shape. Pure shape conversion — pass
 *  values you've already narrowed with isPlacementEstimateJson. */
export function fromPlacementEstimateJson(
  json: PlacementEstimateJson,
): PlacementEstimate {
  return {
    overallLevel: json.overall_level,
    strandLevels: json.strand_levels,
    confidence: json.confidence,
  };
}
