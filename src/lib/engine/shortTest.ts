// Atlas adaptive engine — SHORT-test parameterization (Picker Calibration PR1).
//
// The short test is a quick, STRATIFIED sample: ~2 items per strand, covering
// every necessary strand before filling toward a 10–15 item range. It layers a
// coverage-first routing + coverage/count stopping policy on top of the SAME
// IRT/Bayesian core the comprehensive test uses (engine.ts / bayesian.ts) — no
// new scoring model. Structurally this mirrors comprehensive.ts, with three
// differences that make it the SHORT test:
//
//   * fixed item budget (10–15), not the per-tier comprehensive budget;
//   * NO placement-SE gate in the stop — the short test is a quick check, not a
//     confident placement, so it stops on coverage + count alone;
//   * the per-strand coverage floor adapts DOWN to what the (narrow)
//     short_test_eligible pool can actually serve — a strand with only one
//     eligible item is "covered" at one, so the test still terminates in range
//     instead of running to the hard cap.
//
// "Necessary strand" = a strand with ≥1 active short_test_eligible item in the
// previous-booklet band (availableByStrand, discovered by the picker layer).
// Strands absent from / zero in that map are out of scope and never routed to —
// so no servable strand reads zero, and out-of-scope strands don't block the stop.

import { meanLevelIndex, varianceLevelIndex } from "./bayesian";
import { SELECTION_WIDTH } from "./engine";
import { levelAt, levelTheta } from "./levels";
import type {
  EngineState,
  NextQuestionRequest,
  Strand,
  TerminationDecision,
} from "./types";

// ---------------------------------------------------------------------------
// Tunable config
// ---------------------------------------------------------------------------

export const SHORT_TEST_CONFIG = {
  /** Coverage aim per in-scope strand (clamped down to availability). */
  perStrandFloorN: 2,
  /** Minimum items before the test may stop on coverage. */
  softFloor: 10,
  /** Absolute max items (always terminates). */
  hardCap: 15,
  /** Design aim (informational): ~2 × 6 strands. */
  target: 12,
} as const;

export type ShortTestConfig = typeof SHORT_TEST_CONFIG;

/** Per-strand coverage floor, clamped to what the eligible pool can serve. A
 *  strand with only `available` eligible items is "covered" at `available`. */
function effectiveFloor(available: number, config: ShortTestConfig): number {
  return Math.min(config.perStrandFloorN, available);
}

function inScopeEntries(
  availableByStrand: ReadonlyMap<Strand, number>,
): Array<[Strand, number]> {
  const out: Array<[Strand, number]> = [];
  for (const [strand, n] of availableByStrand) {
    if (n > 0) out.push([strand, n]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Termination
// ---------------------------------------------------------------------------

interface ShortShouldTerminateArgs {
  state: EngineState;
  /** Per-strand served counts (post-state — includes the item just answered). */
  strandCounts: Partial<Record<Strand, number>>;
  /** Count of active short_test_eligible items in the band, per strand. */
  availableByStrand: ReadonlyMap<Strand, number>;
  config?: ShortTestConfig;
}

/**
 * Short-test stopping rule. Reuses the locked wire reasons so termination_reason
 * stays in the enum.
 *
 *   * responseCount >= hardCap        → done, "max-questions-reached"
 *   * no in-scope strand              → done, "bank-exhausted"
 *   * else done="confidence-threshold-met" when BOTH:
 *       - responseCount >= softFloor
 *       - every in-scope strand met its effective coverage floor
 *   * otherwise not done
 *
 * Coverage takes priority over exact count: the test won't stop until every
 * necessary strand is covered, then fills to the soft floor; the hard cap is the
 * absolute backstop.
 */
export function shortTestShouldTerminate(
  args: ShortShouldTerminateArgs,
): TerminationDecision {
  const config = args.config ?? SHORT_TEST_CONFIG;
  const { state, strandCounts, availableByStrand } = args;

  if (state.responseCount >= config.hardCap) {
    return { done: true, reason: "max-questions-reached" };
  }

  const inScope = inScopeEntries(availableByStrand);
  if (inScope.length === 0) {
    return { done: true, reason: "bank-exhausted" };
  }

  let floorMet = true;
  for (const [strand, available] of inScope) {
    if ((strandCounts[strand] ?? 0) < effectiveFloor(available, config)) {
      floorMet = false;
      break;
    }
  }

  if (state.responseCount >= config.softFloor && floorMet) {
    return { done: true, reason: "confidence-threshold-met" };
  }

  return { done: false, reason: "in-progress" };
}

// ---------------------------------------------------------------------------
// Next-question routing
// ---------------------------------------------------------------------------

interface ShortNextRequestArgs {
  state: EngineState;
  strandCounts: Partial<Record<Strand, number>>;
  availableByStrand: ReadonlyMap<Strand, number>;
  excludedStrands: ReadonlySet<Strand>;
  config?: ShortTestConfig;
}

/**
 * Short-test next-question routing — two phases (mirrors the comprehensive
 * router, but with the availability-clamped floor):
 *
 *   PHASE 1 (coverage): among in-scope, non-excluded strands still under their
 *     effective floor, pick the FEWEST-served (tie-break: highest variance).
 *     reason "short-floor".
 *   PHASE 2 (fill/adapt): once every candidate meets its floor, pick the
 *     highest-variance candidate. reason "short-adapt".
 *
 * Within the chosen strand, target the difficulty closest to its posterior-mean
 * level, width SELECTION_WIDTH.
 *
 * Returns null when no in-scope, non-excluded strand remains (caller treats as
 * bank-exhausted).
 */
export function shortTestNextQuestionRequest(
  args: ShortNextRequestArgs,
): NextQuestionRequest | null {
  const config = args.config ?? SHORT_TEST_CONFIG;
  const { state, strandCounts, availableByStrand, excludedStrands } = args;

  const candidates: Strand[] = [];
  for (const [strand, available] of availableByStrand) {
    if (available > 0 && !excludedStrands.has(strand)) candidates.push(strand);
  }
  if (candidates.length === 0) return null;

  const countOf = (s: Strand) => strandCounts[s] ?? 0;
  const varOf = (s: Strand) => varianceLevelIndex(state.posteriors[s]);
  const floorOf = (s: Strand) =>
    effectiveFloor(availableByStrand.get(s) ?? 0, config);

  const underFloor = candidates.filter((s) => countOf(s) < floorOf(s));

  let chosen: Strand;
  let reason: NextQuestionRequest["reason"];

  if (underFloor.length > 0) {
    chosen = underFloor[0];
    for (const s of underFloor) {
      const c = countOf(s);
      const cc = countOf(chosen);
      if (c < cc || (c === cc && varOf(s) > varOf(chosen))) {
        chosen = s;
      }
    }
    reason = "short-floor";
  } else {
    chosen = candidates[0];
    for (const s of candidates) {
      if (varOf(s) > varOf(chosen)) chosen = s;
    }
    reason = "short-adapt";
  }

  const meanLevel = levelAt(meanLevelIndex(state.posteriors[chosen]));

  return {
    strand: chosen,
    targetDifficulty: levelTheta(meanLevel),
    width: SELECTION_WIDTH,
    reason,
  };
}
