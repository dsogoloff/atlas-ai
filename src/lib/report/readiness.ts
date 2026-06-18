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
  /** Current grade-level label, e.g. ReportContent.child.grade_label. */
  currentLevelLabel: string;
}): ReadinessSummary | null {
  if (args.testType !== "short") return null;
  const ready = args.overallPercentage >= SHORT_TEST_CLEAN_PASS_RATIO * 100;
  return { ready, currentLevelLabel: args.currentLevelLabel };
}

// =============================================================================
// DRAFT — PARENT-FACING COPY — PENDING FOUNDER APPROVAL (do NOT treat as final)
// =============================================================================
// §2.4 discipline: directional, encouraging, non-shaming. "appears ready" (not
// "is ready"/guaranteed). The non-pass case has NO copy here by design — its
// absence is the framing. The comprehensive CTA names the comprehensive as the
// next step, available in person or online. Swap approved wording in place;
// the component renders these verbatim.
// =============================================================================
export const READINESS_COPY = {
  /** Upside-only readiness line (shown ONLY on a clean pass). DRAFT. */
  readyLine: (currentLevelLabel: string): string =>
    `Great news — based on this quick check, your child appears ready for ${currentLevelLabel}.`,
  /** Comprehensive CTA — shown for every short test (pass or not). DRAFT. */
  comprehensiveCtaHeading: "See the full picture", // DRAFT
  comprehensiveCtaBody:
    // DRAFT
    "A comprehensive assessment takes a fuller look at your child's strengths and next steps. It's available in person at a S.A.M center or online.",
  comprehensiveCtaButton: "Explore a comprehensive assessment", // DRAFT
} as const;
