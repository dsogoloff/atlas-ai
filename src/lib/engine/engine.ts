// Atlas adaptive engine — Layer 1 (deterministic placement).
//
// Architecture per architecture.md / features.md §1:
//   Layer 1 (this file) maintains the posterior over the child's level
//   per strand and decides what difficulty to ask next. Output is a
//   NextQuestionRequest describing { strand, target_difficulty, width }.
//
//   Layer 2 (LLM-assisted question selection, future cycle) picks the
//   actual question from the candidate set the engine identified, using
//   the misconceptions seen so far. Layer 2 never overrides the math.
//
// All public functions here are pure and JSON-friendly.

import {
  confidenceWithin,
  meanLevelIndex,
  modeLevel,
  updateStrandPosterior,
  varianceLevelIndex,
} from "./bayesian";
import { LEVELS, STRANDS, levelAt, levelTheta } from "./levels";
import { PRIORS_V1, seedPosteriors } from "./priors";
import type {
  EnginePriorConfig,
  EngineQuestion,
  EngineResponse,
  EngineState,
  GradeKey,
  NextQuestionRequest,
  PlacementEstimate,
  Strand,
  TerminationDecision,
} from "./types";

/** Max questions per session per features.md §1. */
export const MAX_QUESTIONS = 25;

/** Posterior mass within ±1 half-grade of the mode required to terminate. */
export const CONFIDENCE_THRESHOLD = 0.9;

/** Width (in θ) Layer 2 may pick a question from, around the target. */
export const SELECTION_WIDTH = 0.3;

// ---------------------------------------------------------------------------
// State construction
// ---------------------------------------------------------------------------

/**
 * Options for createEngineState. Both fields optional — backward-compatible
 * with the no-args call (which produces uniform priors, the v1 pre-Item-#10
 * behaviour).
 *
 *   * `grade` — when provided and recognised, the engine seeds posteriors
 *     from `config.byGrade[grade]`. Null/undefined/unknown grades fall
 *     back to uniform via seedPosteriors (R3 + Q4 locks).
 *   * `config` — optional override of the default PRIORS_V1. Phase 3's
 *     replayEngineState passes the version-specific config from
 *     getPriorConfigByVersion so historical sessions replay under the
 *     EXACT prior config stamped on engine_prior_version at write time.
 */
export interface CreateEngineStateOptions {
  grade?: GradeKey | null;
  config?: EnginePriorConfig;
}

export function createEngineState(
  options: CreateEngineStateOptions = {},
): EngineState {
  const posteriors = seedPosteriors(
    options.grade,
    options.config ?? PRIORS_V1,
  );
  return {
    posteriors,
    responseCount: 0,
    servedQuestionIds: [],
  };
}

// ---------------------------------------------------------------------------
// Update on response
// ---------------------------------------------------------------------------

/**
 * Apply one response and return a new state. The caller is responsible
 * for looking up the question's difficulty and passing it in alongside
 * the response (the engine doesn't fetch from the DB).
 */
export function applyResponse(
  state: EngineState,
  question: EngineQuestion,
  response: EngineResponse,
): EngineState {
  if (question.id !== response.questionId) {
    throw new Error("question / response id mismatch");
  }
  if (question.strand !== response.strand) {
    throw new Error("question / response strand mismatch");
  }

  const updatedStrand = updateStrandPosterior(
    state.posteriors[question.strand],
    question.difficulty,
    response.isCorrect,
  );

  return {
    posteriors: { ...state.posteriors, [question.strand]: updatedStrand },
    responseCount: state.responseCount + 1,
    servedQuestionIds: state.servedQuestionIds.includes(question.id)
      ? state.servedQuestionIds
      : [...state.servedQuestionIds, question.id],
  };
}

// ---------------------------------------------------------------------------
// Next-question request (Layer 1)
// ---------------------------------------------------------------------------

/**
 * Pick the strand that needs the most information next (highest posterior
 * variance — standard "max-information" item selection for adaptive testing).
 * Within that strand, target the difficulty closest to the strand's
 * posterior mean (the level the child is most likely at).
 *
 * `excludedStrands` (Item #12 Phase 7.5) — strands the caller has already
 * determined cannot serve a question (empty bank, served-out, etc.). The
 * engine skips them and picks the highest-variance strand among the rest.
 * Returns `null` when every strand is excluded — the caller should treat
 * this as bank-exhausted termination.
 */
export function nextQuestionRequest(
  state: EngineState,
  excludedStrands: ReadonlySet<Strand> = new Set(),
): NextQuestionRequest | null {
  let chosenStrand: Strand | null = null;
  let chosenVariance = -1;

  for (const strand of STRANDS) {
    if (excludedStrands.has(strand)) continue;
    const v = varianceLevelIndex(state.posteriors[strand]);
    if (v > chosenVariance) {
      chosenVariance = v;
      chosenStrand = strand;
    }
  }

  if (chosenStrand === null) return null;

  const meanIdx = meanLevelIndex(state.posteriors[chosenStrand]);
  const meanLevel = levelAt(meanIdx);

  return {
    strand: chosenStrand,
    targetDifficulty: levelTheta(meanLevel),
    width: SELECTION_WIDTH,
    reason: "max-variance-strand",
  };
}

// ---------------------------------------------------------------------------
// Termination
// ---------------------------------------------------------------------------

/**
 * Done when:
 *   * the response cap is hit (forces a stop), or
 *   * every NON-EXHAUSTED strand is at or above the confidence threshold
 *     (90% mass within ±1 half-grade of the mode), or
 *   * every strand is exhausted (bank cannot serve any more questions).
 *
 * `exhaustedStrands` (Item #12 Phase 7.5) — strands the caller has
 * determined cannot serve any more questions (empty bank). Treated as
 * terminal-confident: no additional data is achievable for them, so
 * termination should not wait on their confidence threshold. Distinct
 * from "strand has data but every row has been served this session";
 * v1 callers conflate the two (both produce strand-exhausted from the
 * picker), which is fine — the bank-exhausted termination reason
 * captures both equally well.
 *
 * The "all NON-exhausted strands" rule is conservative — we don't end
 * early just because one strand is well-resolved. Tightening per-strand
 * thresholds is a calibration question for later.
 */
export function shouldTerminate(
  state: EngineState,
  exhaustedStrands: ReadonlySet<Strand> = new Set(),
): TerminationDecision {
  if (state.responseCount >= MAX_QUESTIONS) {
    return { done: true, reason: "max-questions-reached" };
  }

  let anyServableStrand = false;
  for (const strand of STRANDS) {
    if (exhaustedStrands.has(strand)) continue;
    anyServableStrand = true;
    const c = confidenceWithin(state.posteriors[strand], 1);
    if (c < CONFIDENCE_THRESHOLD) {
      return { done: false, reason: "in-progress" };
    }
  }

  // All non-exhausted strands met the threshold. If no servable strand
  // exists at all (every strand is in exhaustedStrands), the session
  // is bank-exhausted; otherwise it terminated on confidence.
  if (!anyServableStrand) {
    return { done: true, reason: "bank-exhausted" };
  }
  return { done: true, reason: "confidence-threshold-met" };
}

// ---------------------------------------------------------------------------
// Placement estimate
// ---------------------------------------------------------------------------

/**
 * Aggregate placement summary written into assessment_sessions.current_estimate.
 * Per-strand level = mode of that strand's posterior. Overall level is the
 * mode of the across-strand average posterior. Confidence is the mass
 * within ±1 half-grade of the overall mode under the same average.
 */
export function placementEstimate(state: EngineState): PlacementEstimate {
  const strandLevels = STRANDS.reduce(
    (acc, strand) => {
      acc[strand] = modeLevel(state.posteriors[strand]);
      return acc;
    },
    {} as Record<Strand, ReturnType<typeof modeLevel>>,
  );

  // Average posterior across strands.
  const avg = LEVELS.map((level) => {
    let sum = 0;
    for (const strand of STRANDS) sum += state.posteriors[strand][level];
    return sum / STRANDS.length;
  });

  // Mode of the average.
  let bestIdx = 0;
  for (let i = 1; i < avg.length; i++) {
    if (avg[i] > avg[bestIdx]) bestIdx = i;
  }
  const overallLevel = LEVELS[bestIdx];

  // Confidence = mass within ±1 of the overall mode in the average.
  const lo = Math.max(0, bestIdx - 1);
  const hi = Math.min(LEVELS.length - 1, bestIdx + 1);
  let confidence = 0;
  for (let i = lo; i <= hi; i++) confidence += avg[i];

  return { overallLevel, strandLevels, confidence };
}
