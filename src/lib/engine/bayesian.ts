// 1PL (Rasch) Bayesian update for a single strand's posterior.
//
// Model:  P(correct | θ, b) = sigmoid(θ - b)
// Update: posterior(θ) ∝ P(response | θ, b) * prior(θ)
// Prior is whatever posterior we held before this response.
//
// The discrete posterior over 18 levels makes this exact (no MCMC), fast
// (18 multiplications + 1 normalization), and trivially serializable.

import { LEVELS, levelTheta } from "./levels";
import type { HalfGradeLevel, StrandPosterior } from "./types";

export function sigmoid(z: number): number {
  // Numerically stable form: avoid Math.exp(huge).
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

/** P(correct response | level, question difficulty). */
export function probCorrect(level: HalfGradeLevel, difficulty: number): number {
  return sigmoid(levelTheta(level) - difficulty);
}

/**
 * Uniform posterior over all 18 levels — the prior used at the start of
 * a fresh assessment session for each strand.
 */
export function uniformPosterior(): StrandPosterior {
  const p = 1 / LEVELS.length;
  // Build via reduce so the type-checker accepts the partial→full transition.
  return LEVELS.reduce(
    (acc, level) => {
      acc[level] = p;
      return acc;
    },
    {} as StrandPosterior,
  );
}

/**
 * Bayesian update of a strand posterior given one observation.
 * Returns a new posterior object — does not mutate the input.
 */
export function updateStrandPosterior(
  prior: StrandPosterior,
  difficulty: number,
  isCorrect: boolean,
): StrandPosterior {
  const next = {} as StrandPosterior;
  let total = 0;

  for (const level of LEVELS) {
    const pc = probCorrect(level, difficulty);
    const likelihood = isCorrect ? pc : 1 - pc;
    const posterior = prior[level] * likelihood;
    next[level] = posterior;
    total += posterior;
  }

  // Normalise. If total is 0 (shouldn't happen in practice — would
  // require every level to have probability 0 or likelihood 0), fall
  // back to the uniform distribution rather than producing NaN.
  if (total === 0) return uniformPosterior();

  for (const level of LEVELS) next[level] /= total;
  return next;
}

// ---------------------------------------------------------------------------
// Posterior summary statistics
// ---------------------------------------------------------------------------

/** Level with the highest posterior mass. */
export function modeLevel(p: StrandPosterior): HalfGradeLevel {
  let best: HalfGradeLevel = LEVELS[0];
  let bestP = -1;
  for (const level of LEVELS) {
    if (p[level] > bestP) {
      bestP = p[level];
      best = level;
    }
  }
  return best;
}

/** Mean of the level ordinal under the posterior — useful for selection. */
export function meanLevelIndex(p: StrandPosterior): number {
  let sum = 0;
  for (let i = 0; i < LEVELS.length; i++) sum += i * p[LEVELS[i]];
  return sum;
}

/** Variance of the level ordinal under the posterior. */
export function varianceLevelIndex(p: StrandPosterior): number {
  const mean = meanLevelIndex(p);
  let v = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    const d = i - mean;
    v += d * d * p[LEVELS[i]];
  }
  return v;
}

/**
 * Posterior mass within ±radius half-grades of the mode level.
 * radius=1 means "the mode and one level either side" (3 levels total at
 * the mode, fewer at the boundaries) — used as the confidence metric for
 * termination per features.md §1 (90% threshold).
 */
export function confidenceWithin(p: StrandPosterior, radius: number): number {
  const mode = modeLevel(p);
  const modeIdx = LEVELS.indexOf(mode);
  const lo = Math.max(0, modeIdx - radius);
  const hi = Math.min(LEVELS.length - 1, modeIdx + radius);
  let mass = 0;
  for (let i = lo; i <= hi; i++) mass += p[LEVELS[i]];
  return mass;
}
