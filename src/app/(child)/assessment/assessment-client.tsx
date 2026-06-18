"use client";

// Atlas Assessment — child-facing session orchestrator.
//
// Owns the FSM (via useReducer + reducer.ts), fires the two API effects
// (startSession on entry into 'starting'; submitResponse on entry into
// running.submitting), and renders QuestionShell wrapping a per-question
// QuestionTimer. Time tracking is delegated to QuestionTimer — see its
// header for the rationale (compiler-lint constraints around refs and
// purity in render).

import { useEffect, useReducer, useState } from "react";

import { startSession, submitResponse } from "./lib/api";
import { initialState, reduce } from "./lib/reducer";
import { mascotPoseFor } from "./lib/mascot";
import { computeProgressDisplay } from "@/lib/display/progress";
import type { Tier } from "@/lib/tier/derive";
import type { ProctoringMode } from "@/lib/proctoring/mode";

import { Mascot } from "./components/Mascot";
import { QuestionShell } from "./components/QuestionShell";
import { QuestionTimer } from "./components/QuestionTimer";
import { CompletionScreen } from "./components/CompletionScreen";
import { ResumeBanner } from "./components/ResumeBanner";
import { ErrorPanel } from "./components/ErrorPanel";
import { DevTestModeChooser } from "./components/DevTestModeChooser";
import { ParentIntro } from "./components/ParentIntro";
import { Welcome } from "./components/Welcome";

interface Props {
  childId: string;
  childName: string;
  tier: Tier;
  /** DEV-ONLY. True iff ENABLE_COMPREHENSIVE_PILOT is on (read server-side in
   *  page.tsx). When false (always, in prod) the session auto-starts a SHORT
   *  test with no extra UI — the default path is unchanged. When true, the
   *  pre-start DevTestModeChooser gates the auto-start so QA can pick the test
   *  type. The server re-checks the same flag, so this is convenience UI only. */
  comprehensivePilotEnabled?: boolean;
  /** True iff ENABLE_PARENT_INTRO is on (read server-side). When true, a
   *  pre-start parent intro / instructions screen gates the auto-start; when
   *  false (default) the session auto-starts unchanged. */
  parentIntroEnabled?: boolean;
  /** Age-dependent proctoring mode for the intro screen (derived from the
   *  child's grade in page.tsx). Only read when parentIntroEnabled. */
  proctoringMode?: ProctoringMode;
}

export function AssessmentClient({
  childId,
  childName,
  tier,
  comprehensivePilotEnabled = false,
  parentIntroEnabled = false,
  proctoringMode = "no-assistance",
}: Props) {
  const [state, dispatch] = useReducer(reduce, initialState);

  // Pre-start gates. The start effect is held until `startConfirmed`, which is
  // released ONLY by the child tapping the Welcome screen — so the test begins
  // on the tap, never auto-advances. Earlier gates just unlock the screens in
  // front of Welcome: the parent intro (ENABLE_PARENT_INTRO) shows first, then
  // the DEV pilot chooser (ENABLE_COMPREHENSIVE_PILOT), then the child Welcome.
  // `introAcknowledged` / `testModeChosen` default true when their gate is off,
  // so the default short-test path goes straight to Welcome.
  const [startConfirmed, setStartConfirmed] = useState(false);
  const [introAcknowledged, setIntroAcknowledged] = useState(
    !parentIntroEnabled,
  );
  const [testModeChosen, setTestModeChosen] = useState(
    !comprehensivePilotEnabled,
  );
  const [comprehensive, setComprehensive] = useState(false);

  // Effect: startSession on every entry into 'starting' (once confirmed).
  const isStarting = state.kind === "starting";
  useEffect(() => {
    if (!isStarting || !startConfirmed) return;
    let cancelled = false;
    void startSession(childId, comprehensive).then((result) => {
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
  }, [isStarting, startConfirmed, childId, comprehensive]);

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
    // Gate 1: parent intro / instructions (ENABLE_PARENT_INTRO). Shows first,
    // before any child-facing UI. Tapping Start only acknowledges it — the
    // child Welcome (gate 3) still releases the actual start.
    if (parentIntroEnabled && !introAcknowledged) {
      return (
        <ParentIntro
          mode={proctoringMode}
          tier={tier}
          onStart={() => setIntroAcknowledged(true)}
        />
      );
    }
    // Gate 2 (DEV-ONLY): pilot flag on → let QA pick the test type. Never
    // reached in production (flag off → testModeChosen true at init). Choosing
    // advances to Welcome; it does not start the session.
    if (comprehensivePilotEnabled && !testModeChosen) {
      return (
        <DevTestModeChooser
          tier={tier}
          comprehensive={comprehensive}
          onChange={setComprehensive}
          onStart={() => setTestModeChosen(true)}
        />
      );
    }
    // Gate 3: the child Welcome — the first child-facing screen. Static; the
    // child taps once to start. This is the sole releaser of startConfirmed, so
    // the start effect (and the network call) only fire on the tap.
    if (!startConfirmed) {
      return (
        <Welcome
          childName={childName}
          tier={tier}
          onStart={() => setStartConfirmed(true)}
        />
      );
    }
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
