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
import { MARKETING_EVENTS } from "@/lib/marketing/events";
import { trackOnce } from "@/lib/marketing/track";
import { computeProgressDisplay } from "@/lib/display/progress";
import type { Tier } from "@/lib/tier/derive";
import type { ProctoringMode } from "@/lib/proctoring/mode";

import { QuestionShell } from "./components/QuestionShell";
import { QuestionTimer } from "./components/QuestionTimer";
import { CompletionScreen } from "./components/CompletionScreen";
import { ResumeBanner } from "./components/ResumeBanner";
import { ErrorPanel } from "./components/ErrorPanel";
import { DevTestModeChooser } from "./components/DevTestModeChooser";
import { ChildHandoff } from "./components/ChildHandoff";
import { ParentIntro } from "./components/ParentIntro";
import { Welcome } from "./components/Welcome";

interface Props {
  childId: string;
  childName: string;
  tier: Tier;
  /** True iff ENABLE_COMPREHENSIVE_PILOT is on (read server-side in page.tsx).
   *  When false (always, in prod) the parent sees a "pass the screen to your
   *  child" handoff (ChildHandoff) that proceeds into the SHORT test — no type
   *  selection. When true (DEV/QA), the pre-start DevTestModeChooser is shown at
   *  the same gate so QA can pick short vs comprehensive. The server re-checks
   *  the same flag, so the chooser is convenience UI only, not a boundary. */
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
  // the handoff gate, then the child Welcome. The handoff gate always shows one
  // screen — in production (pilot flag off) the parent-facing ChildHandoff into
  // the short test; with the pilot flag on (DEV/QA) the DevTestModeChooser so
  // comprehensive stays reachable. (The beta welcome no longer lives here — it
  // is shown ONCE during onboarding, between COPPA and child setup; see the
  // add-child route.) `introAcknowledged` defaults true when the intro gate is
  // off, so that gate is skipped on the default path.
  const [startConfirmed, setStartConfirmed] = useState(false);
  const [introAcknowledged, setIntroAcknowledged] = useState(
    !parentIntroEnabled,
  );
  const [testModeChosen, setTestModeChosen] = useState(false);
  const [comprehensive, setComprehensive] = useState(false);
  // Bumped once per accepted answer submit; drives the K-4 footer mascot's
  // celebrate beat in QuestionShell (the only per-question mascot mount).
  const [celebrateTick, setCelebrateTick] = useState(0);

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
    // Fire the footer celebrate beat immediately on the child's submit (once
    // per accepted answer, every format) — independent of the server result.
    setCelebrateTick((t) => t + 1);
  }

  function handleRetry() {
    dispatch({ type: "RETRY_FROM_ERROR" });
  }

  // Marketing conversion: `assessment_start`. Fired at the handoff gate — the
  // parent-context transition where the parent passes the screen to the child —
  // so it never fires from a child item screen. Deduped per child per tab.
  // Carries the persisted UTMs plus the test type; NO child data (see
  // lib/marketing/events.ts, which allowlists the payload). The Meta half is
  // queued here (no pixel on this route) and flushed from a parent surface.
  function confirmHandoff() {
    trackOnce(MARKETING_EVENTS.ASSESSMENT_START, childId, {
      assessment_type: comprehensive ? "comprehensive" : "short",
    });
    setTestModeChosen(true);
  }

  if (state.kind === "starting") {
    // Gate 1: parent intro / instructions (ENABLE_PARENT_INTRO). Shows before
    // any child-facing UI. Tapping Start only acknowledges it — the child
    // Welcome (gate 3) still releases the actual start.
    if (parentIntroEnabled && !introAcknowledged) {
      return (
        <ParentIntro
          mode={proctoringMode}
          tier={tier}
          onStart={() => setIntroAcknowledged(true)}
        />
      );
    }
    // Gate 2: the handoff. In production (pilot flag off) the parent gets the
    // "pass the screen to your child" handoff (ChildHandoff), which proceeds
    // into the SHORT test — no type selection. With the pilot flag on (DEV/QA)
    // the test-type chooser is shown here instead, so the comprehensive run
    // stays reachable. Either path only advances to Welcome; neither starts the
    // session (the short default keeps `comprehensive` false).
    if (!testModeChosen) {
      return comprehensivePilotEnabled ? (
        <DevTestModeChooser
          tier={tier}
          comprehensive={comprehensive}
          onChange={setComprehensive}
          onStart={confirmHandoff}
        />
      ) : (
        <ChildHandoff tier={tier} onContinue={confirmHandoff} />
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
    return <Loading />;
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
  const progress = computeProgressDisplay(
    state.responseCount,
    state.maxQuestions,
  );
  return (
    <>
      {state.resumed && <ResumeBanner />}
      <QuestionShell
        prompt={question.content.stem}
        tier={tier}
        progress={progress}
        image={question.content.image}
        celebrateTick={celebrateTick}
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

// Brief transition after the child taps "Let's go!" on the Welcome screen,
// while startSession runs. NO mascot here — the Welcome screen already showed
// the waving mascot, and a second standalone mascot screen was redundant. Just
// a minimal spinner so the wait reads as "loading", not a new screen.
function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sam-cream">
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
