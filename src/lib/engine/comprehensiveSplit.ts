// Atlas adaptive engine — COMPREHENSIVE level split (Picker Calibration PR2).
//
// The comprehensive test anchors on the short test's MEASURED level (M) and
// composes its draw across level OFFSETS from M — below (M-1, M-2), at (M), and
// reach (M+1) — in proportions set by the short test's pass_band. Within those
// global proportions, each strand's distribution is shifted by how the child did
// on that strand (strand_map): a strand the child struggled on pulls more from
// below level; a strong strand pulls less below.
//
// This module is the PURE policy: the base split per pass_band, the per-strand
// adjustment, and the per-pick offset planner (which offset is most under its
// target so far). Anchor resolution + the booklet↔level mapping live in the
// picker layer (levelBand.ts); this module speaks only in integer offsets.
//
// PR3 layers floor-find (weak → keep walking down past M-2 until solid) and the
// ceiling/edge clamps (availableOffsets) on top — this module already takes the
// available-offset set so those clamps drop in without reshaping the policy.

import type { PassBand } from "@/lib/shortTest/outcome";

export interface OffsetWeight {
  /** Booklet offset relative to the anchor M (e.g. -1 = M-1, +1 = reach). */
  offset: number;
  /** Target proportion of the draw at this offset (weights sum to ~1). */
  weight: number;
}

/**
 * Base split per pass_band, in (M-1 / M / Reach) terms from the spec:
 *
 *   clean (≥0.8):        M-1 .30 / M .50 / M+1 .20   (probe up to M+1)
 *   mixed (0.5–0.8):     M-1 .50 / M .30 / M-2 .20   (M-2 backstop)
 *   weak (<0.5):         floor-find — below-weighted; PR3 extends the walk down
 *   insufficient / none: M-1 .50 / M .30 / M+1 .20   (neutral)
 *
 * Weights are design targets; the planner approximates them across the draw.
 */
export function baseSplit(passBand: PassBand | null): OffsetWeight[] {
  switch (passBand) {
    case "clean":
      return [
        { offset: -1, weight: 0.3 },
        { offset: 0, weight: 0.5 },
        { offset: 1, weight: 0.2 },
      ];
    case "mixed":
      return [
        { offset: -2, weight: 0.2 },
        { offset: -1, weight: 0.5 },
        { offset: 0, weight: 0.3 },
      ];
    case "weak":
      // Floor-finding: weighted below M, lightest at M. PR3 extends the walk
      // further down (M-3…) until a solid level is found; PR2 seeds the bias.
      return [
        { offset: -2, weight: 0.4 },
        { offset: -1, weight: 0.4 },
        { offset: 0, weight: 0.2 },
      ];
    case "insufficient":
    case null:
      // Neutral 50/30/20 on (M-1 / M / Reach) — conservative start with no signal.
      return [
        { offset: -1, weight: 0.5 },
        { offset: 0, weight: 0.3 },
        { offset: 1, weight: 0.2 },
      ];
  }
}

/** How hard strand_map shifts a strand's split (0 = off, 1 = full pivot). */
const STRAND_SHIFT_GAIN = 0.8;

/**
 * Adjust a base split for one strand by its strand_map ratio. A low ratio
 * (struggled) moves weight toward below-level offsets; a high ratio moves it
 * up / lightens below-level. `ratio` in [0,1]; pivot 0.5 (no shift). Weights are
 * renormalised to sum 1. A null ratio (strand unseen on the short test) returns
 * the base unchanged.
 *
 * "Global split sets totals; strand_map sets where within those totals items
 * come from" — this is the per-strand redistribution (PR2.4).
 */
export function strandAdjustedSplit(
  base: OffsetWeight[],
  ratio: number | null,
): OffsetWeight[] {
  if (ratio === null) return base.map((o) => ({ ...o }));
  const shift = Math.max(-0.5, Math.min(0.5, 0.5 - ratio)); // >0 ⇒ struggling
  const adjusted = base.map(({ offset, weight }) => {
    const dir = offset < 0 ? 1 : offset > 0 ? -1 : 0; // below up, reach down
    return {
      offset,
      weight: Math.max(0, weight * (1 + dir * shift * STRAND_SHIFT_GAIN)),
    };
  });
  const total = adjusted.reduce((s, o) => s + o.weight, 0) || 1;
  return adjusted.map((o) => ({ offset: o.offset, weight: o.weight / total }));
}

/**
 * Pick the next offset to draw from: the available offset whose served count is
 * furthest BELOW its target share of the budget (largest deficit). Ties resolve
 * to the LOWER offset first (favour covering below-level / floor-finding).
 *
 * `availableOffsets` gates which offsets are servable (in axis range now; PR3
 * adds bank/ceiling availability). Returns null when none are available.
 */
export function planNextOffset(args: {
  split: OffsetWeight[];
  /** Items already served at each offset (this strand). */
  servedByOffset: ReadonlyMap<number, number>;
  /** Total target item count for the draw (the per-pick proportion base). */
  totalBudget: number;
  availableOffsets: ReadonlySet<number>;
}): number | null {
  const { split, servedByOffset, totalBudget, availableOffsets } = args;
  const candidates = split.filter((o) => availableOffsets.has(o.offset));
  if (candidates.length === 0) return null;

  let best: number | null = null;
  let bestDeficit = -Infinity;
  for (const { offset, weight } of candidates) {
    const target = weight * totalBudget;
    const served = servedByOffset.get(offset) ?? 0;
    const deficit = target - served;
    if (
      deficit > bestDeficit ||
      (deficit === bestDeficit && (best === null || offset < best))
    ) {
      bestDeficit = deficit;
      best = offset;
    }
  }
  return best;
}
