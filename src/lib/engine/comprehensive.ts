// Atlas adaptive engine — comprehensive parameterization (routing/stopping/budget).
//
// This module layers a comprehensive ITEM-BUDGET + STRAND-COVERAGE routing
// policy on top of the EXISTING IRT/Bayesian core (engine.ts / bayesian.ts).
// It introduces NO new scoring model: the posteriors, the Bayesian update, and
// the per-strand variance/SE all come from the same core math the short test
// uses. What changes for a `test_type === "comprehensive"` session is only:
//
//   * how many items we serve (per-tier budget instead of the flat MAX_QUESTIONS),
//   * when we stop (soft floor + per-strand coverage floor + placement-SE
//     threshold, with a hard cap as the absolute backstop), and
//   * which strand we route to next (a phase-1 coverage floor, then phase-2
//     max-variance deepening — instead of the short test's pure max-variance pick).
//
// The short test path is unaffected: nothing here is reachable unless the
// caller explicitly branches on test_type === "comprehensive".
//
// NOTE on "in-scope" approximation: a strand's "in-scope-ness" for a given
// child SHOULD be a level-band question (does the tenant bank hold items in
// the child's neighbourhood for this strand?). v1 approximates it with
// tenant-wide active-content availability — STRANDS minus the empty-bank
// strands from discoverEmptyBankStrands. The picker is difficulty-TARGETED
// (nearest-to-target), not band-GATED, so a strand with content only far from
// the child's level still counts as in-scope here. Tightening "in-scope" to a
// true level-band predicate is a future refinement.

import {
  meanLevelIndex,
  varianceLevelIndex,
} from "./bayesian";
import { SELECTION_WIDTH } from "./engine";
import { LEVELS, levelAt, levelTheta } from "./levels";
import type { Tier } from "@/lib/tier/derive";
import type {
  EngineState,
  NextQuestionRequest,
  Strand,
  StrandPosterior,
  TerminationDecision,
} from "./types";

// ---------------------------------------------------------------------------
// Tunable config
// ---------------------------------------------------------------------------

export const COMPREHENSIVE_CONFIG = {
  // Per-tier item budget. softFloor = minimum items before we may stop;
  // hardCap = absolute max (always terminates). target = design aim (informational).
  // perStrandFloorN = phase-1 minimum items per in-scope strand before adaptive deepening.
  budgets: {
    G5_8: { target: 30, softFloor: 24, hardCap: 36, perStrandFloorN: 3 },
    K_4: { target: 20, softFloor: 16, hardCap: 26, perStrandFloorN: 2 },
  },
  // Placement confident when SE (sqrt of variance of the level ordinal under the
  // in-scope-average posterior) <= this, in half-grade-index units (~within one
  // half-grade).
  placementSeThreshold: 1.0,
} as const;

export type ComprehensiveBudget =
  (typeof COMPREHENSIVE_CONFIG.budgets)[Tier];

/** Per-tier item budget. */
export function comprehensiveBudget(tier: Tier): ComprehensiveBudget {
  return COMPREHENSIVE_CONFIG.budgets[tier];
}

// ---------------------------------------------------------------------------
// Placement standard error
// ---------------------------------------------------------------------------

/**
 * Standard error of the placement (in half-grade-index units): build the
 * average StrandPosterior across the in-scope strands (re-normalised), then
 * SE = sqrt(varianceLevelIndex(avg)). Mirrors how placementEstimate aggregates
 * across strands, but reports dispersion (SE) rather than the mode.
 *
 * Empty in-scope set → 0 (no dispersion to measure; the caller's
 * bank-exhausted branch handles the "nothing servable" case first).
 */
export function placementSe(
  state: EngineState,
  inScopeStrands: ReadonlySet<Strand>,
): number {
  if (inScopeStrands.size === 0) return 0;

  const avg = {} as StrandPosterior;
  let total = 0;
  for (const level of LEVELS) {
    let sum = 0;
    for (const strand of inScopeStrands) sum += state.posteriors[strand][level];
    avg[level] = sum;
    total += sum;
  }
  // Re-normalise (sum of N already-normalised posteriors is N, not 1).
  if (total > 0) {
    for (const level of LEVELS) avg[level] /= total;
  }

  return Math.sqrt(varianceLevelIndex(avg));
}

// ---------------------------------------------------------------------------
// Termination
// ---------------------------------------------------------------------------

interface ShouldTerminateArgs {
  state: EngineState;
  /** Per-strand served counts (post-state — includes the item just answered). */
  strandCounts: Partial<Record<Strand, number>>;
  inScopeStrands: ReadonlySet<Strand>;
  budget: ComprehensiveBudget;
}

/**
 * Comprehensive stopping rule. Reuses the existing wire reasons so the
 * termination_reason on the response/analytics stays in the locked enum.
 *
 *   * responseCount >= hardCap            → done, "max-questions-reached"
 *   * inScopeStrands empty                → done, "bank-exhausted"
 *   * else done="confidence-threshold-met" ONLY when ALL THREE hold:
 *       - responseCount >= softFloor
 *       - every in-scope strand met its perStrandFloorN coverage floor
 *       - placementSe <= placementSeThreshold
 *   * otherwise not done
 *
 * The floor and the SE check are BOTH required (not either/or), plus the soft
 * floor — or the hard cap fires.
 *
 * KNOWN EDGE — exhausted-strand-under-floor: a strand whose (small) bank is
 * served out before reaching perStrandFloorN keeps floorMet permanently false,
 * so confidence-met can never fire and the session runs to the hard cap. That
 * is the intended backstop: the hard cap always terminates. Pilot banks are
 * sized so the 2–3 item floor is satisfiable per in-scope strand; if a strand
 * cannot reach the floor it should not be in `inScopeStrands` in the first
 * place (empty-bank strands are already excluded upstream). This is acceptable
 * for the pilot; a stricter "served-out counts as floor-met" relaxation is a
 * future refinement if real banks prove too thin.
 */
export function comprehensiveShouldTerminate(
  args: ShouldTerminateArgs,
): TerminationDecision {
  const { state, strandCounts, inScopeStrands, budget } = args;

  if (state.responseCount >= budget.hardCap) {
    return { done: true, reason: "max-questions-reached" };
  }

  if (inScopeStrands.size === 0) {
    return { done: true, reason: "bank-exhausted" };
  }

  let floorMet = true;
  for (const strand of inScopeStrands) {
    if ((strandCounts[strand] ?? 0) < budget.perStrandFloorN) {
      floorMet = false;
      break;
    }
  }

  const seOk =
    placementSe(state, inScopeStrands) <=
    COMPREHENSIVE_CONFIG.placementSeThreshold;

  if (state.responseCount >= budget.softFloor && floorMet && seOk) {
    return { done: true, reason: "confidence-threshold-met" };
  }

  return { done: false, reason: "in-progress" };
}

// ---------------------------------------------------------------------------
// Next-question routing
// ---------------------------------------------------------------------------

interface NextRequestArgs {
  state: EngineState;
  strandCounts: Partial<Record<Strand, number>>;
  inScopeStrands: ReadonlySet<Strand>;
  excludedStrands: ReadonlySet<Strand>;
  /** Per-strand coverage floor (from the tier budget). */
  perStrandFloorN: number;
}

/**
 * Comprehensive next-question routing — two phases:
 *
 *   PHASE 1 (coverage floor): among in-scope, non-excluded strands still under
 *     perStrandFloorN, pick the one with the FEWEST items served (tie-break:
 *     highest varianceLevelIndex). reason "comprehensive-floor".
 *   PHASE 2 (adapt): once every candidate meets the floor, pick the candidate
 *     with the highest varianceLevelIndex (max ability-uncertainty). reason
 *     "comprehensive-adapt".
 *
 * Within the chosen strand, target the difficulty closest to its posterior-mean
 * level (mirrors engine.nextQuestionRequest), width SELECTION_WIDTH.
 *
 * Returns null when no candidate strand exists (all in-scope strands excluded).
 */
export function comprehensiveNextQuestionRequest(
  args: NextRequestArgs,
): NextQuestionRequest | null {
  const { state, strandCounts, inScopeStrands, excludedStrands, perStrandFloorN } =
    args;

  const candidates: Strand[] = [];
  for (const strand of inScopeStrands) {
    if (!excludedStrands.has(strand)) candidates.push(strand);
  }
  if (candidates.length === 0) return null;

  const countOf = (s: Strand) => strandCounts[s] ?? 0;
  const varOf = (s: Strand) => varianceLevelIndex(state.posteriors[s]);

  const underFloor = candidates.filter((s) => countOf(s) < perStrandFloorN);

  let chosen: Strand;
  let reason: NextQuestionRequest["reason"];

  if (underFloor.length > 0) {
    // PHASE 1: fewest-served first; tie-break on highest variance.
    chosen = underFloor[0];
    for (const s of underFloor) {
      const c = countOf(s);
      const cc = countOf(chosen);
      if (c < cc || (c === cc && varOf(s) > varOf(chosen))) {
        chosen = s;
      }
    }
    reason = "comprehensive-floor";
  } else {
    // PHASE 2: highest variance among candidates.
    chosen = candidates[0];
    for (const s of candidates) {
      if (varOf(s) > varOf(chosen)) chosen = s;
    }
    reason = "comprehensive-adapt";
  }

  const meanLevel = levelAt(meanLevelIndex(state.posteriors[chosen]));

  return {
    strand: chosen,
    targetDifficulty: levelTheta(meanLevel),
    width: SELECTION_WIDTH,
    reason,
  };
}
