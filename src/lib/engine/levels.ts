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

/** All 18 half-grade levels in monotonically increasing ability order. */
export const LEVELS = [
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

/** θ for a level — linear from KA(-3) to 8B(+3). */
export function levelTheta(level: HalfGradeLevel): number {
  const i = levelIndex(level);
  // 18 levels spread over 6 units of θ: step = 6 / 17 ≈ 0.3529.
  const step = 6 / (LEVELS.length - 1);
  return -3 + i * step;
}
