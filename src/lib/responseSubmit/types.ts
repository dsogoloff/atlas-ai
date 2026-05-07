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

export interface SubmitResponseBody {
  is_correct: boolean;
  time_flag: TimeFlag;
  done: boolean;
  /** Present iff done === false. Strand + difficulty band the engine wants
   *  next. The actual question pick is a separate route (planned). */
  next_request?: NextRequestJson;
  /** Present iff done === true. Mirror of assessment_sessions.current_estimate. */
  placement?: PlacementEstimateJson;
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
