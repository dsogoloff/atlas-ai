"use client";

// Atlas Assessment — child-facing session orchestrator.
//
// Owns the FSM (via useReducer + reducer.ts), fires the two API effects
// (startSession on entry into 'starting'; submitResponse on entry into
// running.submitting), and renders QuestionShell wrapping a per-question
// QuestionTimer. Time tracking is delegated to QuestionTimer — see its
// header for the rationale (compiler-lint constraints around refs and
// purity in render).

import { useEffect, useReducer } from "react";

import { startSession, submitResponse } from "./lib/api";
import { initialState, reduce } from "./lib/reducer";
import { mascotPoseFor } from "./lib/mascot";
import { computeProgressDisplay } from "@/lib/display/progress";
import type { Tier } from "@/lib/tier/derive";

import { Mascot } from "./components/Mascot";
import { QuestionShell } from "./components/QuestionShell";
import { QuestionTimer } from "./components/QuestionTimer";
import { CompletionScreen } from "./components/CompletionScreen";
import { ResumeBanner } from "./components/ResumeBanner";
import { ErrorPanel } from "./components/ErrorPanel";

interface Props {
  childId: string;
  childName: string;
  tier: Tier;
}

export function AssessmentClient({ childId, childName, tier }: Props) {
  const [state, dispatch] = useReducer(reduce, initialState);

  // Effect: startSession on every entry into 'starting'.
  const isStarting = state.kind === "starting";
  useEffect(() => {
    if (!isStarting) return;
    let cancelled = false;
    void startSession(childId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        dispatch(
          result.resumed
            ? { type: "START_RESUME", body: result.body }
            : { type: "START_OK", body: result.body },
        );
      } else {
        dispatch({ type: "START_ERR", error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isStarting, childId]);

  // Effect: submitResponse when (running, submitting) with pending args.
  // The reducer creates a fresh `pending` object on each SUBMIT and on
  // RETRY_FROM_ERROR with a submit context, so identity comparison on
  // the dep correctly fires once per submission attempt.
  const submittingPending =
    state.kind === "running" && state.submitting && state.pending
      ? state.pending
      : null;
  const submittingSessionId =
    state.kind === "running" ? state.sessionId : null;
  const submittingQuestionId =
    state.kind === "running" ? state.question.id : null;

  useEffect(() => {
    if (!submittingPending || !submittingSessionId || !submittingQuestionId) {
      return;
    }
    let cancelled = false;
    void submitResponse({
      sessionId: submittingSessionId,
      questionId: submittingQuestionId,
      answerGiven: submittingPending.answerGiven,
      timeMs: submittingPending.timeMs,
    }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        dispatch(
          result.body.done
            ? { type: "SUBMIT_OK_DONE", body: result.body }
            : { type: "SUBMIT_OK_NEXT", body: result.body },
        );
      } else {
        dispatch({ type: "SUBMIT_ERR", error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [submittingPending, submittingSessionId, submittingQuestionId]);

  function handleSubmit(answerGiven: string, timeMs: number) {
    if (state.kind !== "running" || state.submitting) return;
    dispatch({ type: "SUBMIT", answerGiven, timeMs });
  }

  function handleRetry() {
    dispatch({ type: "RETRY_FROM_ERROR" });
  }

  if (state.kind === "starting") {
    return <Loading tier={tier} />;
  }

  if (state.kind === "completed") {
    return (
      <CompletionScreen
        childName={childName}
        terminationReason={state.terminationReason}
        tier={tier}
      />
    );
  }

  if (state.kind === "error") {
    return (
      <ErrorPanel
        kind={state.reason}
        canRetry={state.canRetry}
        onRetry={state.canRetry ? handleRetry : undefined}
      />
    );
  }

  const { question } = state;
  const progress = computeProgressDisplay(state.responseCount);
  return (
    <>
      {state.resumed && <ResumeBanner />}
      <QuestionShell
        prompt={question.content.stem}
        tier={tier}
        progress={progress}
        image={question.content.image}
      >
        {/* key={question.id} remounts QuestionTimer per question, capturing
            a fresh start time and resetting any internal input state. */}
        <QuestionTimer
          key={question.id}
          question={question}
          onSubmit={handleSubmit}
          disabled={state.submitting}
          tier={tier}
        />
      </QuestionShell>
    </>
  );
}

function Loading({ tier }: { tier: Tier }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sam-cream">
      {/* Greeting beat — mascot waves while the session starts. K-4 gets
          the entrance pop + idle bounce; G5-8 stays smaller and still. */}
      <Mascot
        pose={mascotPoseFor("starting")}
        tier={tier}
        size={tier === "K_4" ? 144 : 96}
        entrance
      />
      <div className="flex items-center gap-3 rounded-full border border-sam-gray-light bg-white px-6 py-3 shadow-sm">
        <span
          className="material-symbols-outlined animate-spin text-sam-teal"
          aria-hidden="true"
        >
          progress_activity
        </span>
        <span className="font-display-child text-sm font-bold text-sam-navy">
          Getting ready…
        </span>
      </div>
    </div>
  );
}
