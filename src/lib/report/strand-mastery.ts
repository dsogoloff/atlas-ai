// Per-strand mastery aggregation for the parent diagnostic report.
//
// Phase 8 (Item #12): the strand axis moved from the engine's closed
// 6-value enum to the V2026 12-value sub-strand union. computeStrandMastery
// now takes the SET OF APPLICABLE SUB-STRANDS as an explicit parameter
// (the brief: "the N sub-strands present at the child's level") and
// returns one row per applicable sub-strand, in the caller's order. The
// "always 6" guarantee is gone; output length matches input length.
//
// rollUpToParentStrands aggregates sub-strand mastery up to the 3 parent
// strands for the radar. Three rows, always — one per ParentStrand in
// PARENT_STRAND_ORDER.
//
// Tier bands match Stitch source 04/05 (unchanged):
//   mastery        (teal)     percentage >= 75
//   progressing    (orange)   50 <= percentage < 75
//   area_of_focus  (red)      percentage <  50  (only when total > 0)
//   no_data        (greyed)   total === 0
//
// Threshold rationale unchanged from pre-Phase-8 (see git blame for the
// pre-Phase-8 75 / 50 rationale comment).

import {
  PARENT_STRAND_ORDER,
  SUB_STRAND_TO_PARENT,
  type ParentStrand,
  type Strand,
} from "@/lib/report/types";

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

/** Radar input — one row per parent strand, derived from StrandMastery[]
 *  via rollUpToParentStrands. Always length 3 in PARENT_STRAND_ORDER. */
export interface ParentStrandMastery {
  strand: ParentStrand;
  correct: number;
  total: number;
  percentage: number;
  band: MasteryBand;
}

/** Inputs are pre-joined response/sub-strand pairs. The caller resolves
 *  each response's question → tax_content → sub_strand_code before passing
 *  here; responses whose question doesn't resolve to a sub-strand are
 *  filtered upstream (assemble.ts). */
export interface ScoredResponse {
  strand: Strand;
  isCorrect: boolean;
}

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

/** Computes per-sub-strand mastery rows for the given list of applicable
 *  sub-strands. Rows are returned in the order of `applicableStrands` —
 *  the caller controls display order. Sub-strands with zero responses get
 *  band='no_data' so the bar map renders a greyed bar (parent sees the
 *  full level coverage, not just sampled strands). */
export function computeStrandMastery(
  responses: readonly ScoredResponse[],
  applicableStrands: readonly Strand[],
): StrandMastery[] {
  const counts = new Map<Strand, { correct: number; total: number }>();
  for (const r of responses) {
    const cur = counts.get(r.strand) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (r.isCorrect) cur.correct += 1;
    counts.set(r.strand, cur);
  }

  return applicableStrands.map((strand) => {
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

/** Rolls sub-strand mastery up to the 3 parent strands for the radar.
 *  Always returns 3 rows in PARENT_STRAND_ORDER. A parent with zero
 *  applicable sub-strands at the child's level (or zero total responses
 *  across its applicable sub-strands) gets band='no_data', which the
 *  radar renders as a vertex at center with a greyed label. */
export function rollUpToParentStrands(
  subStrandMastery: readonly StrandMastery[],
): ParentStrandMastery[] {
  const counts = new Map<ParentStrand, { correct: number; total: number }>();
  for (const row of subStrandMastery) {
    const parent = SUB_STRAND_TO_PARENT[row.strand];
    const cur = counts.get(parent) ?? { correct: 0, total: 0 };
    cur.correct += row.correct;
    cur.total += row.total;
    counts.set(parent, cur);
  }

  return PARENT_STRAND_ORDER.map((parent) => {
    const { correct, total } = counts.get(parent) ?? { correct: 0, total: 0 };
    const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);
    return {
      strand: parent,
      correct,
      total,
      percentage,
      band: bandFor(percentage, total),
    };
  });
}
