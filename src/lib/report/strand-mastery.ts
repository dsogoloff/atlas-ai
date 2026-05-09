// Per-strand mastery aggregation for the parent diagnostic report.
//
// Pure function: given a session's responses (pre-joined to each
// question's strand), computes correct/total/percentage and a tier band
// per strand. All 6 strands appear in the output regardless of whether
// the child saw any questions in them — the engine doesn't always sample
// every strand, and the report must still render the bar (greyed out
// when band === "no_data").
//
// Tier bands match Stitch source 04/05:
//   mastery        (teal)     percentage >= 75
//   progressing    (orange)   50 <= percentage < 75
//   area_of_focus  (red)      percentage <  50  (only when total > 0)
//   no_data        (greyed)   total === 0 — engine never sampled this strand
//
// Threshold rationale: Stitch examples are 80 + 92 for Mastery and 65 +
// 70 for Progressing — no example at 75–79, so the boundary is
// underdetermined by the design source. Picked 75 to match the "B grade"
// academic convention and keep more children feeling "Mastery" rather
// than the stricter ≥80 fit. Trivial to tune via THRESHOLDS below.

import type { Strand } from "@/lib/engine/types";

export type MasteryBand =
  | "mastery"
  | "progressing"
  | "area_of_focus"
  | "no_data";

export interface StrandMastery {
  strand: Strand;
  correct: number;
  total: number;
  /** Rounded to integer. Zero when total === 0 (no_data band). */
  percentage: number;
  band: MasteryBand;
}

/** Inputs are pre-joined response/strand pairs. The page server component
 *  joins responses to questions before calling this helper. */
export interface ScoredResponse {
  strand: Strand;
  isCorrect: boolean;
}

// Stable display order matching features.md §1 strand listing.
const STRAND_ORDER: readonly Strand[] = [
  "NUMBER_SENSE",
  "OPERATIONS",
  "WORD_PROBLEMS",
  "FRACTIONS_DECIMALS",
  "GEOMETRY",
  "MEASUREMENT_DATA",
] as const;

const THRESHOLDS = {
  masteryMin: 75,
  progressingMin: 50,
} as const;

function bandFor(percentage: number, total: number): MasteryBand {
  if (total === 0) return "no_data";
  if (percentage >= THRESHOLDS.masteryMin) return "mastery";
  if (percentage >= THRESHOLDS.progressingMin) return "progressing";
  return "area_of_focus";
}

export function computeStrandMastery(
  responses: ScoredResponse[],
): StrandMastery[] {
  // Single-pass aggregation. O(N) over responses, O(6) over strands.
  const counts = new Map<Strand, { correct: number; total: number }>();
  for (const r of responses) {
    const cur = counts.get(r.strand) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (r.isCorrect) cur.correct += 1;
    counts.set(r.strand, cur);
  }

  return STRAND_ORDER.map((strand) => {
    const { correct, total } = counts.get(strand) ?? { correct: 0, total: 0 };
    const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);
    return {
      strand,
      correct,
      total,
      percentage,
      band: bandFor(percentage, total),
    };
  });
}
