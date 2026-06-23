// Atlas Assessment — child-facing API client wrappers.
//
// Typed fetch wrappers around POST /api/assess/start and POST /api/assess/submit.
// All transport / parse failures resolve to a discriminated `ApiError` shape;
// callers never see a thrown promise so reducer transitions stay deterministic.
//
// HTTP status mappings (verified against handler.ts in both routes):
//   /start
//     200 → fresh session OR resume               → { ok, resumed, body }
//           (body.resumed === true marks a resumed in-progress session)
//     401 → unauthorized                           → kind: "unauthorized"
//     404 → child_not_found                        → kind: "not_found"
//     422 → bank_unservable                        → kind: "unavailable"
//     5xx → internal                               → kind: "server"
//   /submit
//     200 → success                                → { ok, body }
//     401 → unauthorized                           → kind: "unauthorized"
//     403 → forbidden (session not owned)          → kind: "forbidden"
//     404 → session_not_found | question_not_found → kind: "not_found"
//     409 → session_completed                      → kind: "session_completed"
//     5xx → internal | flagger_error               → kind: "server"
//
// P3 (session-resume loop) hardening on /start: ANY response carrying a
// complete session payload — session_id + question + next_request +
// response_count — resolves to success and routes into the in-progress
// flow, regardless of the status line. The server only emits that
// payload when a live session exists, and "Try again" against a live
// session must never loop sterilely. This also keeps the legacy resume
// shape working (pre-P3 servers returned the payload under HTTP 409 +
// body.error "session_in_progress", which is what caused the loop when
// treated as an error).
//
// Network failure (fetch throws): kind: "network".
// JSON parse failure on a 2xx/409: kind: "server" (the route emitted malformed JSON).

import type { StartResponseBody } from "@/lib/sessionStart/types";
import type { SubmitResponseBody } from "@/lib/responseSubmit/types";

export type ApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "unavailable"
  | "session_completed"
  | "server"
  | "network";

export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
}

export type StartResult =
  | { ok: true; resumed: boolean; body: StartResponseBody }
  | { ok: false; error: ApiError };

export type SubmitResult =
  | { ok: true; body: SubmitResponseBody }
  | { ok: false; error: ApiError };

export interface SubmitArgs {
  sessionId: string;
  questionId: string;
  answerGiven: string;
  timeMs: number;
}

export async function startSession(
  childId: string,
  comprehensive = false,
): Promise<StartResult> {
  let res: Response;
  try {
    res = await fetch("/api/assess/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // `comprehensive` is sent only when explicitly opted in (the dev-only
      // chooser). The server still double-gates on ENABLE_COMPREHENSIVE_PILOT
      // and ignores the flag in production, so a forged `true` can never
      // start a comprehensive session there.
      body: JSON.stringify(
        comprehensive ? { child_id: childId, comprehensive: true } : { child_id: childId },
      ),
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  // P3 hardening: a complete session payload is a success no matter what
  // the status line says (covers the legacy 409 resume shape — see the
  // file header). Field-level checks keep an error envelope like
  // `{ error: {...} }` from ever being mistaken for a session.
  const body = await readJson<StartResponseBody>(res);
  if (body !== null && isStartSessionBody(body)) {
    return {
      ok: true,
      resumed: body.resumed === true || res.status === 409,
      body,
    };
  }

  if (res.status === 200 || res.status === 409) {
    // Status says success but the payload is missing or malformed — the
    // route emitted broken JSON.
    return { ok: false, error: { kind: "server", status: res.status } };
  }

  return { ok: false, error: mapStartError(res.status) };
}

/** Narrows an arbitrary /start payload to "complete session payload" —
 *  everything the reducer needs to enter the running state. */
function isStartSessionBody(body: Partial<StartResponseBody>): boolean {
  return (
    typeof body.session_id === "string" &&
    body.session_id.length > 0 &&
    typeof body.response_count === "number" &&
    typeof body.max_questions === "number" &&
    body.question !== undefined &&
    body.question !== null &&
    typeof body.question.id === "string" &&
    body.next_request !== undefined &&
    body.next_request !== null
  );
}

export async function submitResponse(args: SubmitArgs): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch("/api/assess/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_id: args.sessionId,
        question_id: args.questionId,
        answer_given: args.answerGiven,
        time_ms: args.timeMs,
      }),
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  if (res.status === 200) {
    const body = await readJson<SubmitResponseBody>(res);
    if (!body) return { ok: false, error: { kind: "server", status: 200 } };
    return { ok: true, body };
  }

  return { ok: false, error: mapSubmitError(res.status) };
}

function mapStartError(status: number): ApiError {
  if (status === 401) return { kind: "unauthorized", status };
  if (status === 403) return { kind: "forbidden", status };
  if (status === 404) return { kind: "not_found", status };
  if (status === 422) return { kind: "unavailable", status };
  return { kind: "server", status };
}

function mapSubmitError(status: number): ApiError {
  if (status === 401) return { kind: "unauthorized", status };
  if (status === 403) return { kind: "forbidden", status };
  if (status === 404) return { kind: "not_found", status };
  if (status === 409) return { kind: "session_completed", status };
  return { kind: "server", status };
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
