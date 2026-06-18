// Level / strand reference data for the IRT engine.
//
// Half-grade levels are mapped linearly to ability θ in [-3, +3]. This
// is intentionally simple — calibration via response data (architecture.md
// "calibration data loop") will refine difficulty parameters; the level→θ
// mapping itself can stay fixed.

import type { HalfGradeLevel, Strand } from "./types";

export const STRANDS = [
  "number_sense",
  "operations_algorithms",
  "fractions_decimals",
  "measurement",
  "geometry",
  "data_statistics",
] as const satisfies readonly Strand[];

/** All 21 half-grade levels in monotonically increasing ability order. The
 *  pre-K young band (0A/0B/0C) was added to the half_grade_level enum in
 *  migration 20260616120000 (before KA); they sit below KA on the scale. */
export const LEVELS = [
  "0A", "0B", "0C",
  "KA", "KB",
  "1A", "1B",
  "2A", "2B",
  "3A", "3B",
  "4A", "4B",
  "5A", "5B",
  "6A", "6B",
  "7A", "7B",
  "8A", "8B",
] as const satisfies readonly HalfGradeLevel[];

/** Ordinal (0..17) for arithmetic comparisons. */
export function levelIndex(level: HalfGradeLevel): number {
  const i = LEVELS.indexOf(level);
  /* c8 ignore next */
  if (i < 0) throw new Error(`unknown level: ${level}`);
  return i;
}

/** Level corresponding to an ordinal, clamped to the valid range. */
export function levelAt(index: number): HalfGradeLevel {
  const clamped = Math.max(0, Math.min(LEVELS.length - 1, Math.round(index)));
  return LEVELS[clamped];
}

/** θ for a level — linear, ANCHORED so KA = -3 and 8B = +3 regardless of how
 *  many sub-KA levels exist. This preserves every KA…8B θ value unchanged after
 *  the 0A/0B/0C extension (no engine recalibration); the pre-K levels simply
 *  extend below -3 (0C ≈ -3.35, 0A ≈ -4.06) at the same per-level step. */
export function levelTheta(level: HalfGradeLevel): number {
  const kaIndex = levelIndex("KA");
  // Step from the KA…8B span (17 intervals) — independent of sub-KA levels.
  const step = 6 / (levelIndex("8B") - kaIndex);
  return -3 + (levelIndex(level) - kaIndex) * step;
}
