// Display helpers for the child-facing assessment progress chrome and
// the parent-facing time-flag badge on the answer log. Pure functions,
// no React — extracted so the copy and the boundary logic can be
// asserted in vitest without dragging in React Testing Library.
//
// Item #12 Phase 7.7.

import { MAX_QUESTIONS } from "@/lib/engine/engine";
import type { TimeFlag } from "@/lib/timeFlagging";

// =============================================================================
// Progress chrome (Item #1, Option 2: "Question N of up to 25")
// =============================================================================

export interface ProgressDisplay {
  /** 1-indexed question number the child is currently looking at. */
  questionNumber: number;
  /** The session's ceiling — the "of up to N" denominator. Item #14: this
   *  is the per-session total stamped by /start (short = min(short cap,
   *  eligible pool); comprehensive = engine cap), NOT a fixed 25. */
  maxQuestions: number;
  /** Parent-facing copy: "Question 3 of up to 12" — the "up to"
   *  hedge is load-bearing. The session can terminate earlier on
   *  confidence-threshold-met or bank-exhausted; framing the total as the
   *  ceiling (not the target) keeps the copy honest. */
  copy: string;
  /** Bar width in percent, clamped to [0, 100]. The denominator is the
   *  session ceiling so the bar visually represents the worst-case
   *  remaining; the copy carries the early-termination disclosure. */
  percent: number;
}

/**
 * Build the display data for the child-facing progress chrome.
 *
 *   * `responseCount` — wire field `response_count` on /start and /submit
 *     responses (Phase 7.7 wire addition). Count of responses already
 *     persisted on this session BEFORE the served question is answered.
 *     Fresh start: 0. Resume with 3 past answers: 3.
 *
 * The displayed question number is `responseCount + 1` because the
 * child is currently looking at the unanswered N+1th question.
 *
 *   * `maxQuestions` — wire field `max_questions` on /start (Item #14). The
 *     session's ceiling: short = min(short-test cap, eligible-pool size) so
 *     the bar is cap- or exhaustion-bound; comprehensive = engine cap.
 *     Defaults to MAX_QUESTIONS for any caller that hasn't plumbed it through
 *     and is floored at 1 so the denominator is never zero.
 */
export function computeProgressDisplay(
  responseCount: number,
  maxQuestions: number = MAX_QUESTIONS,
): ProgressDisplay {
  const safe = Math.max(0, Math.floor(responseCount));
  const total = Math.max(1, Math.floor(maxQuestions));
  const questionNumber = Math.min(safe + 1, total);
  const percent = Math.min(100, (questionNumber / total) * 100);
  return {
    questionNumber,
    maxQuestions: total,
    copy: `Question ${questionNumber} of up to ${total}`,
    percent,
  };
}

// =============================================================================
// Time-flag badge (Item #2 Phase 7.7, Option B)
// =============================================================================
//
// Parent-facing copy on the per-question answer log. Plain English; NO
// penalty math (per features.md §2 — "Score-adjustment from time is
// explicitly out of scope" in v1). NORMAL and INVALID render no badge
// to keep the row visually clean — the right/wrong badge already
// carries the primary signal.

export type TimeFlagBadgeCopy = "Quick answer" | "Took longer than expected";

export function timeFlagBadge(flag: TimeFlag): TimeFlagBadgeCopy | null {
  switch (flag) {
    case "TOO_FAST":
      return "Quick answer";
    case "TOO_SLOW":
      return "Took longer than expected";
    case "NORMAL":
    case "INVALID":
      return null;
  }
}
