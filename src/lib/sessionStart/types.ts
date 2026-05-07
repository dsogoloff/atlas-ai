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
// Response (success — covers 200 OK and 409 Conflict resume)
// ---------------------------------------------------------------------------
//
// Body shape is identical for 200 and 409. The 409 case carries an
// inline `error.code='session_in_progress'` so clients can distinguish
// "you started a fresh session" from "you reconnected to an existing
// one" without inspecting the HTTP status. Per the design memo gate
// approval — keeps the resume payload usable while flagging it.

export interface StartResponseBody {
  session_id: string;
  question: ClientQuestion;
  next_request: NextRequestJson;
  /** Present iff the session already existed (HTTP 409). */
  error?: { code: "session_in_progress"; message: string };
}

// ---------------------------------------------------------------------------
// Handler result (route maps to NextResponse with the embedded status)
// ---------------------------------------------------------------------------

export type StartErrorCode =
  | "invalid_body"
  | "unauthorized"
  | "forbidden"
  | "child_not_found"
  | "bank_unservable"
  | "internal";

export interface StartError {
  code: StartErrorCode;
  message: string;
  status: number;
}

export type StartHandlerResult =
  | { ok: true; status: 200 | 409; body: StartResponseBody }
  | { ok: false; error: StartError };
