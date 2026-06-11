// Atlas Assessment — session-start DTOs.
//
// Single source of truth for the POST /api/assess/start wire format.
// Mirrors the responseSubmit/types.ts pattern: route handler imports
// StartRequestSchema for inbound parsing; handler returns
// StartHandlerResult, route maps to NextResponse.
//
// Convention (matches responseSubmit/types.ts and timeFlagging):
//   * In-memory TS shapes are camelCase.
//   * Wire / persisted shapes are snake_case.
//   * Convert at the boundary; never rename in flight.

import { z } from "zod";

import type { NextRequestJson } from "@/lib/responseSubmit/types";
import type { ClientQuestion } from "@/lib/questionPicker/types";

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const StartRequestSchema = z.object({
  child_id: z.string().uuid(),
});

export type StartRequest = z.infer<typeof StartRequestSchema>;

// ---------------------------------------------------------------------------
// Response (success — fresh start AND resume both return 200)
// ---------------------------------------------------------------------------
//
// Body shape is identical for fresh and resumed sessions. A resumed
// session with real progress (≥1 answered question) carries
// `resumed: true` so clients can distinguish "you started a fresh
// session" from "you reconnected to an existing one".
//
// HISTORY (P3 session-resume loop): resume used to ride an HTTP 409 +
// `body.error.code='session_in_progress'` envelope. Encoding a SUCCESS
// as an error status meant anything keying off the status line saw a
// failure, and a child returning to an in-progress assessment got a
// sterile "Something went wrong" → Try again → 409 loop (every retry
// re-hit the same live session). Resume is a success; it is now a 200
// and "you resumed" is data, not an error.

export interface StartResponseBody {
  session_id: string;
  question: ClientQuestion;
  next_request: NextRequestJson;
  /** Count of responses already persisted on this session BEFORE the
   *  served `question` is answered. Item #12 Phase 7.7 — drives the
   *  child-facing progress chrome. Fresh session → 0; resume → the
   *  number of past answers (so the displayed question number is
   *  `response_count + 1`). */
  response_count: number;
  /** Present (and true) iff an existing IN_PROGRESS session with ≥1
   *  answered question was resumed — drives the client's resume banner.
   *  Absent for fresh sessions AND zero-progress resumes, which should
   *  look fresh to the child (see handler.ts header). */
  resumed?: true;
}

// ---------------------------------------------------------------------------
// Handler result (route maps to NextResponse with the embedded status)
// ---------------------------------------------------------------------------

export type StartErrorCode =
  | "invalid_body"
  | "unauthorized"
  | "forbidden"
  | "consent_required"
  | "child_not_found"
  | "bank_unservable"
  | "internal";

export interface StartError {
  code: StartErrorCode;
  message: string;
  status: number;
}

export type StartHandlerResult =
  | { ok: true; status: 200; body: StartResponseBody }
  | { ok: false; error: StartError };
