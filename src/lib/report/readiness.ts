// Atlas Assessment — SHORT-test readiness summary.
//
// The short test samples the S.A.M. booklet ONE LEVEL BELOW the child's grade
// (the picker does this — see questionPicker/levelBand + pickForSession). This
// module turns the result of that sample into an ASYMMETRIC, §2.4-safe readiness
// signal for the parent report:
//
//   * CLEAN PASS on the previous-level sample → the child "appears ready for"
//     their current grade level. The report shows the readiness line PLUS the
//     rest of the directional report + the comprehensive CTA.
//   * NOT a clean pass → NO readiness line, and NEVER any "not ready" / shaming
//     language. The report shows the same directional report (encouraging) + the
//     SAME comprehensive CTA. The readiness line is UPSIDE-ONLY; its absence is
//     never framed negatively.
//
// "Clean pass" is an editable threshold on the session's overall percentage
// (correct / attempted — placement.overall_percentage). Readiness is SHORT-only;
// comprehensive sessions return null (no readiness concept).

/**
 * Minimum overall percentage (0..1) on the previous-level sample to count as a
 * CLEAN PASS. Editable single knob — founder can tune. Default 0.8 (80%): high
 * enough that "appears ready" is a confident, upside-only signal, low enough to
 * tolerate one or two slips on a short 10–15 item sample.
 */
export const SHORT_TEST_CLEAN_PASS_RATIO = 0.8;

export type TestType = "short" | "comprehensive";

export interface ReadinessSummary {
  /** True iff a SHORT test was clean-passed (≥ threshold). Drives whether the
   *  upside-only readiness line renders. False is NEVER surfaced as a negative
   *  statement — it simply suppresses the line. */
  ready: boolean;
  /** The level the child appears ready for — their current grade level (the
   *  sample was the level below). Pre-formatted, e.g. "Grade 5". */
  currentLevelLabel: string;
}

/**
 * Compute the short-test readiness summary. Returns null for comprehensive
 * sessions (no readiness concept); for short sessions always returns a summary
 * so the caller can show the comprehensive CTA regardless of pass/no-pass.
 */
export function computeReadiness(args: {
  testType: TestType;
  /** Session overall percentage, 0..100 (placement.overall_percentage). */
  overallPercentage: number;
  /** Current S.A.M booklet level display (e.g. "0C", "3") — the level the child
   *  appears ready for. NEVER a school grade or half-grade code. */
  currentLevelLabel: string;
}): ReadinessSummary | null {
  if (args.testType !== "short") return null;
  const ready = args.overallPercentage >= SHORT_TEST_CLEAN_PASS_RATIO * 100;
  return { ready, currentLevelLabel: args.currentLevelLabel };
}

// =============================================================================
// PARENT-FACING COPY — FOUNDER-APPROVED 2026-06-17.
// =============================================================================
// §2.4 discipline: directional, encouraging, non-shaming. The readiness line is
// upside-only (clean pass); the non-pass case has NO copy by design — its
// absence is the framing. The comprehensive CTA is UNIVERSAL (shown to every
// short-test taker, pass or not). [current level] renders a legible label
// (Kindergarten / Nth Grade) via the report's grade-label mapping — never a
// code. Voice-locked narration prompt untouched.
// =============================================================================
export const READINESS_COPY = {
  /** Upside-only readiness line (shown ONLY on a clean pass). currentLevelLabel
   *  is the S.A.M booklet level (e.g. "0C", "3"); rendered as "S.A.M Level X"
   *  (no dot, matching the locked narration prompt). */
  readyLine: (currentLevelLabel: string): string =>
    `Great news — based on this quick check, your child appears ready for S.A.M Level ${currentLevelLabel}.`,
  /** Comprehensive CTA — shown to every short-test taker (pass or not). */
  comprehensiveCtaHeading: "See the full picture",
  comprehensiveCtaBody:
    "A complete S.A.M. assessment goes deeper than this quick check. We're running these at select neighborhood schools — tell us where your child goes and we'll find the right option.",
  comprehensiveCtaButton: "Find an assessment near us",

  // Capture form (explicit parent opt-in; collects contact + child's school
  // only — NO diagnostic result). Labels are presentational.
  form: {
    schoolLabel: "Child's school",
    parentNameLabel: "Your name",
    emailLabel: "Email",
    phoneLabel: "Phone (optional)",
    bestTimeLabel: "Best time to reach you (optional)",
    submitButton: "Submit",
    submittingButton: "Submitting…",
    errorMessage: "Something went wrong — please try again.",
  },

  // Generic confirmation (any school) — triage is manual at pilot. The online
  // line is a capture incentive with NO date and NO promise (§2.4: no "soon").
  confirmationHeading: "Thanks — we've got it.",
  confirmationBody:
    "We're adding more neighborhood schools, and an online assessment is in the works — we'll let you know what's available for your child.",
} as const;
