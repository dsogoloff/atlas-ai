// Atlas Assessment — child-facing FSM.
//
// Pure reducer for the assessment session lifecycle. Owns four view-states
// (starting / running / completed / error) and the transitions between
// them. The component layer fires API effects and dispatches actions; the
// reducer never calls fetch.
//
// Retry semantics (Item #5 ambiguity #8 resolution): manual retry only,
// surfaced via RETRY_FROM_ERROR. The error state carries a `resumeFrom`
// context so the component can either re-call /start or re-call /submit
// with the original answer + time_ms — this preserves correctness if the
// first submit partially succeeded server-side.

import type { ClientQuestion } from "@/lib/questionPicker/types";
import type { StartResponseBody } from "@/lib/sessionStart/types";
import type {
  PlacementEstimateJson,
  SubmitResponseBody,
  TerminationReasonWire,
} from "@/lib/responseSubmit/types";

import type { ApiError, ApiErrorKind } from "./api";

interface PendingSubmit {
  answerGiven: string;
  timeMs: number;
}

/** What a RETRY_FROM_ERROR action should restore. The component reads this
 *  to decide which API call to re-fire. */
export type ResumeContext =
  | { kind: "start" }
  | {
      kind: "submit";
      sessionId: string;
      question: ClientQuestion;
      answerGiven: string;
      timeMs: number;
    };

export type ViewState =
  | { kind: "starting" }
  | {
      kind: "running";
      sessionId: string;
      question: ClientQuestion;
      /** True iff this state was entered via START_RESUME (HTTP 409 on /start). */
      resumed: boolean;
      submitting: boolean;
      /** Present iff submitting === true. Captured at SUBMIT so RETRY can replay. */
      pending?: PendingSubmit;
    }
  | {
      kind: "completed";
      placement: PlacementEstimateJson;
      terminationReason: TerminationReasonWire;
    }
  | {
      kind: "error";
      reason: ApiErrorKind;
      canRetry: boolean;
      resumeFrom: ResumeContext;
    };

export type Action =
  | { type: "START_OK"; body: StartResponseBody }
  | { type: "START_RESUME"; body: StartResponseBody }
  | { type: "START_ERR"; error: ApiError }
  | { type: "SUBMIT"; answerGiven: string; timeMs: number }
  | { type: "SUBMIT_OK_NEXT"; body: SubmitResponseBody }
  | { type: "SUBMIT_OK_DONE"; body: SubmitResponseBody }
  | { type: "SUBMIT_ERR"; error: ApiError }
  | { type: "RETRY_FROM_ERROR" };

export const initialState: ViewState = { kind: "starting" };

export function reduce(state: ViewState, action: Action): ViewState {
  switch (action.type) {
    case "START_OK":
      if (state.kind !== "starting") return state;
      return {
        kind: "running",
        sessionId: action.body.session_id,
        question: action.body.question,
        resumed: false,
        submitting: false,
      };

    case "START_RESUME":
      if (state.kind !== "starting") return state;
      return {
        kind: "running",
        sessionId: action.body.session_id,
        question: action.body.question,
        resumed: true,
        submitting: false,
      };

    case "START_ERR":
      if (state.kind !== "starting") return state;
      return {
        kind: "error",
        reason: action.error.kind,
        canRetry: isRetryable(action.error.kind),
        resumeFrom: { kind: "start" },
      };

    case "SUBMIT":
      // Defensive: ignore double-clicks during submit and stray dispatches
      // outside the running state.
      if (state.kind !== "running" || state.submitting) return state;
      return {
        ...state,
        submitting: true,
        pending: { answerGiven: action.answerGiven, timeMs: action.timeMs },
      };

    case "SUBMIT_OK_NEXT": {
      if (state.kind !== "running" || !state.submitting) return state;
      const next = action.body.next_question;
      // Defensive: SUBMIT_OK_NEXT should only fire when done === false and
      // next_question is present. If the body is misshaped, stay put — the
      // component layer can surface this as a bug.
      if (action.body.done || !next) return state;
      return {
        kind: "running",
        sessionId: state.sessionId,
        question: next,
        resumed: false,
        submitting: false,
      };
    }

    case "SUBMIT_OK_DONE": {
      if (state.kind !== "running" || !state.submitting) return state;
      const { placement, termination_reason } = action.body;
      if (!action.body.done || !placement || !termination_reason) return state;
      return {
        kind: "completed",
        placement,
        terminationReason: termination_reason,
      };
    }

    case "SUBMIT_ERR":
      if (state.kind !== "running" || !state.submitting || !state.pending) {
        return state;
      }
      return {
        kind: "error",
        reason: action.error.kind,
        canRetry: isRetryable(action.error.kind),
        resumeFrom: {
          kind: "submit",
          sessionId: state.sessionId,
          question: state.question,
          answerGiven: state.pending.answerGiven,
          timeMs: state.pending.timeMs,
        },
      };

    case "RETRY_FROM_ERROR":
      if (state.kind !== "error" || !state.canRetry) return state;
      if (state.resumeFrom.kind === "start") {
        return { kind: "starting" };
      }
      return {
        kind: "running",
        sessionId: state.resumeFrom.sessionId,
        question: state.resumeFrom.question,
        resumed: false,
        submitting: true,
        pending: {
          answerGiven: state.resumeFrom.answerGiven,
          timeMs: state.resumeFrom.timeMs,
        },
      };
  }
}

/** Network and server (5xx) errors are retryable. Auth/permission/missing-
 *  resource/completed errors are terminal — the user has to take a different
 *  path (sign in again, contact support, go back to dashboard). */
function isRetryable(kind: ApiErrorKind): boolean {
  return kind === "network" || kind === "server";
}
