// Atlas Assessment — child-facing API client wrappers.
//
// Typed fetch wrappers around POST /api/assess/start and POST /api/assess/submit.
// All transport / parse failures resolve to a discriminated `ApiError` shape;
// callers never see a thrown promise so reducer transitions stay deterministic.
//
// HTTP status mappings (verified against handler.ts in both routes):
//   /start
//     200 → fresh session                          → { ok, status: 200, body }
//     409 → session_in_progress (resume)           → { ok, status: 409, body } (NOT an error)
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
  | { ok: true; status: 200 | 409; body: StartResponseBody }
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

export async function startSession(childId: string): Promise<StartResult> {
  let res: Response;
  try {
    res = await fetch("/api/assess/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ child_id: childId }),
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  if (res.status === 200 || res.status === 409) {
    const body = await readJson<StartResponseBody>(res);
    if (!body) return { ok: false, error: { kind: "server", status: res.status } };
    return { ok: true, status: res.status as 200 | 409, body };
  }

  return { ok: false, error: mapStartError(res.status) };
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
