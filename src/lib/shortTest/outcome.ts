// Atlas Assessment — SHORT-TEST OUTCOME (Picker Calibration PR1).
//
// The single hand-off surface between the short test and the comprehensive
// picker. Computed deterministically on short-test completion from the session's
// graded responses + the engine's placement estimate, persisted to
// assessment_sessions.short_test_outcome (jsonb), and read back by the
// comprehensive picker (PR2/PR3) to anchor + weight its draw.
//
// Design:
//   * measured_level (M) — the PROVISIONAL S.A.M. booklet level the engine
//     settled on from performance (placementEstimate → booklet). This is the
//     comprehensive anchor.
//   * intake_level — the grade-derived booklet (the signup anchor). FALLBACK
//     only: used when no measured level is available, and as the report's
//     "appears ready for" label.
//   * pass_band — coarse performance bucket derived from the overall ratio,
//     with a graded-items floor (upside-only, no shaming — see readiness.ts).
//   * clean_pass_ratio — overall correct/graded ratio (0..1). Named for the
//     clean-pass threshold it is tested against.
//   * strand_map — per-strand correct/seen/ratio; drives the comprehensive
//     per-strand override (PR2.4).
//   * seen_item_ids — every question served in the short session; ALWAYS
//     subtracted from the comprehensive draw (PR2.1).
//
// All scoring thresholds live here as the canonical knobs. readiness.ts (the
// parent-report readiness line) consumes the same constants so the line and the
// pass_band never drift.

import type { Strand } from "@/lib/engine/types";

/** Coarse performance bucket for the short test. Drives the comprehensive
 *  global split (PR2.3) and the report readiness line (clean only). */
export type PassBand = "clean" | "mixed" | "weak" | "insufficient";

export interface StrandStat {
  correct: number;
  seen: number;
  /** correct / seen, 0 when seen === 0. */
  ratio: number;
}

export interface ShortTestOutcome {
  /** Provisional booklet level from performance (BOOKLET_LEVELS label, e.g.
   *  "0C", "3"). The comprehensive picker anchors on THIS, not intake. */
  measured_level: string;
  /** Grade-derived booklet level (fallback anchor + readiness label). */
  intake_level: string;
  pass_band: PassBand;
  /** Overall correct / graded ratio, 0..1. */
  clean_pass_ratio: number;
  /** Per-strand correct/seen/ratio, keyed by the engine strand code. */
  strand_map: Record<string, StrandStat>;
  /** Every question served in the short session (deduped, in service order). */
  seen_item_ids: string[];
}

// ---------------------------------------------------------------------------
// Thresholds — canonical knobs (readiness.ts re-exports the clean ratio).
// ---------------------------------------------------------------------------

/** Minimum graded items required to emit a non-"insufficient" pass_band (and
 *  thus the readiness line). Below this the short sample is too thin to make
 *  ANY confident statement — upside-only: we suppress, never shame. */
export const SHORT_TEST_MIN_GRADED = 8;

/** Overall ratio (0..1) at/above which the band is "clean". Matches the
 *  founder-tunable readiness clean-pass knob. */
export const SHORT_TEST_CLEAN_PASS_RATIO = 0.8;

/** Overall ratio (0..1) at/above which the band is "mixed" (below "clean").
 *  Below this is "weak" (floor-finding territory — PR3). */
export const SHORT_TEST_MIXED_FLOOR = 0.5;

/**
 * Derive the pass_band from the graded count and the overall ratio.
 *
 *   graded < MIN_GRADED            → "insufficient" (too thin; suppress readiness)
 *   ratio  >= CLEAN_PASS_RATIO     → "clean"
 *   ratio  >= MIXED_FLOOR          → "mixed"
 *   else                           → "weak"
 *
 * The graded floor takes priority over the ratio: a 3-of-3 sample is
 * "insufficient", not "clean".
 */
export function derivePassBand(correct: number, graded: number): PassBand {
  if (graded < SHORT_TEST_MIN_GRADED) return "insufficient";
  const ratio = correct / graded;
  if (ratio >= SHORT_TEST_CLEAN_PASS_RATIO) return "clean";
  if (ratio >= SHORT_TEST_MIXED_FLOOR) return "mixed";
  return "weak";
}

export interface OutcomeResponse {
  questionId: string;
  strand: Strand;
  isCorrect: boolean;
}

/**
 * Build the ShortTestOutcome from the session's graded responses plus the two
 * pre-resolved booklet levels (measured from the engine, intake from grade).
 *
 * Pure + deterministic. seen_item_ids preserves first-seen order and dedupes
 * (a question is served at most once per session, but we dedupe defensively).
 */
export function deriveShortTestOutcome(args: {
  measuredLevel: string;
  intakeLevel: string;
  responses: ReadonlyArray<OutcomeResponse>;
}): ShortTestOutcome {
  const { measuredLevel, intakeLevel, responses } = args;

  const strand_map: Record<string, StrandStat> = {};
  const seen_item_ids: string[] = [];
  const seenIds = new Set<string>();
  let graded = 0;
  let correct = 0;

  for (const r of responses) {
    graded += 1;
    if (r.isCorrect) correct += 1;

    const stat = (strand_map[r.strand] ??= { correct: 0, seen: 0, ratio: 0 });
    stat.seen += 1;
    if (r.isCorrect) stat.correct += 1;

    if (!seenIds.has(r.questionId)) {
      seenIds.add(r.questionId);
      seen_item_ids.push(r.questionId);
    }
  }

  for (const stat of Object.values(strand_map)) {
    stat.ratio = stat.seen === 0 ? 0 : stat.correct / stat.seen;
  }

  const clean_pass_ratio = graded === 0 ? 0 : correct / graded;

  return {
    measured_level: measuredLevel,
    intake_level: intakeLevel,
    pass_band: derivePassBand(correct, graded),
    clean_pass_ratio,
    strand_map,
    seen_item_ids,
  };
}
