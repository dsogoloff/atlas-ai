// Atlas Assessment — synthetic time-norm configuration.
//
// Per features.md §2:  T_expected = T_read + T_solve + T_input.
//
// Synthetic norms grounded in published literature:
//   * Reading WCPM — Hasbrouck & Tindal (2017) oral-reading-fluency 50th
//     percentile, mapped to half-grades by interpolating fall/winter/spring
//     medians. KA / KB and 8A / 8B extrapolated from the curve endpoints.
//     Stored as ORAL rates; the flagger applies `silentReadingMultiplier`
//     to convert (silent reading is ~1.3× faster than oral). Storing oral
//     and converting at use-time keeps the source values traceable to H&T.
//   * Math computation — AIMSweb / easyCBM digits-correct-per-minute
//     medians, scaled to per-operation seconds for grades K–5. Grades 6A–8B
//     extrapolate from NAEP grade-level proficiency curves rather than
//     direct half-grade fluency norms.
//   * Bar-model + Singapore-Math representation multipliers — expert-
//     estimated; flagged below as the FIRST empirical recalibration target.
//
// Calibration priority (in order, once we have ≥200–300 responses per item):
//   1. BAR_MODEL_REQUIRED multiplier — least-confident parameter.
//   2. Grades 6A–8B per-operation seconds — extrapolated, not measured.
//   3. silentReadingMultiplier — defaulted at 1.3 (conservative end of
//      research range); empirical Q1 candidate.
//   4. Per-response thresholds (0.4× / 2.5×) — verify against actual
//      response distributions; lognormal RT literature suggests they may
//      need to widen for high-difficulty items.
//
// Per-operation cell shape (option (a) per design review 2026-05-07):
// Each cell holds the seconds-for-ONE-application of the operation at
// fluency for that grade. Curves rise pre-fluency, plateau at fluency
// onset, and STAY flat thereafter — they do NOT continue rising at upper
// grades. Within-grade item-level complexity (e.g., 247+318 vs
// 8M+3.5M with regrouping) is captured by the question's IRT difficulty
// parameter, not by the (op × level) cell. See OperationType comment in
// types.ts for why ops are coarse rather than split (e.g., we do not
// separate division_facts vs long_division — `num_operations` does that
// work for multi-step items).
//
// Acknowledged limitation: a fluent 8A student tackling the hardest
// upper-grade item at maximum complexity will tend toward TOO_SLOW
// because IRT difficulty is calibrated against P(correct), not response
// time, and Rasch IRT has no time term. Documented in the calibration
// TODO; acceptable for v1 because TOO_SLOW only caveats the parent
// report, never adjusts placement (features.md §2 hard rule).
//
// Pedagogically nonsensical (op × grade) cells are `null` — the flagger
// throws on lookup in non-production and error-logs in production
// (mirroring assertFallbackStillNeeded). This catches content-tagging
// errors that would otherwise produce normal-looking expected times.
//
// To swap synthetic → empirical: build a same-shape `TimeFlagConfig`, bump
// `version`, pass it into `flagResponseTime` / `aggregateSessionFlags`.
// Every response row stores the version it was scored against, so historical
// rows can be re-analyzed under newer norms without losing audit trail.

import type {
  HalfGradeLevel,
  ItemNormTags,
  OperationType,
  QuestionFormat,
  RepresentationKind,
} from "./types";

/**
 * Bumped any time the synthetic table changes. When the empirical config
 * lands, use a value like `"empirical-v1.2026-Q3"` so historical rows
 * remain interpretable under their original synthetic version.
 *
 * Per Addition C: this is the single source of truth for the version
 * string; the flagger writes it onto every response row's
 * `time_flag_config_version` and onto every session summary's
 * `time_flag_config_version`. Do not derive it from build hashes or git
 * SHAs — those obscure real config changes.
 */
export const TIME_FLAG_CONFIG_VERSION = "synthetic-v1.2026-05" as const;

/**
 * `null` in `secondsPerOperation` cells signals "this op is off-curriculum
 * at this grade." The flagger throws on lookup in non-prod and error-logs
 * in prod — never silently produces an expected-time. Catches content-
 * tagging errors (e.g., an ALGEBRA tag mistakenly applied to a KA item).
 */
export type OperationGradeCell = number | null;

export interface TimeFlagConfig {
  version: string;
  /** Words-correct-per-minute ORAL reading rate, by half-grade. */
  readingWcpm: Record<HalfGradeLevel, number>;
  /**
   * Multiplier on `readingWcpm` to convert oral → silent reading rate.
   * Word-problem reading is silent (or sub-vocalized), and silent rates
   * run ~1.3–1.6× oral. Default 1.3 (conservative end of the research
   * range — errs toward not-over-correcting). Empirical recalibration
   * may move it up.
   */
  silentReadingMultiplier: number;
  /** Seconds per single application of the named operation, by half-grade.
   *  `null` = op is off-curriculum at this grade; flagger throws on lookup.
   *  Multiplied by `num_operations` for T_solve. */
  secondsPerOperation: Record<
    OperationType,
    Record<HalfGradeLevel, OperationGradeCell>
  >;
  /** Multipliers on T_solve for non-symbolic representations. */
  representationMultiplier: Record<RepresentationKind, number>;
  /** Time to register the answer once the student knows it. */
  inputSecondsByFormat: Record<QuestionFormat, number>;
  /** Seconds floor below which a response is INVALID (accidental tap). */
  invalidFloorSec: number;
  /** Per-response thresholds (ratio = actual / expected). */
  perResponse: { tooFastBelow: number; tooSlowAbove: number };
  /** Session-level rollup thresholds. */
  session: {
    unreliableInvalidRatio: number;
    rushedTooFastRatio: number;
    strugglingTooSlowRatio: number;
  };
}

// ---------------------------------------------------------------------------
// Reading WCPM — Hasbrouck & Tindal (2017), 50th-percentile ORAL fluency.
// Half-grade values interpolated from fall/winter/spring medians. KA / KB
// and 8A / 8B extrapolated from the curve endpoints. Silent-reading
// conversion happens at flag-time via `silentReadingMultiplier`.
// ---------------------------------------------------------------------------

const READING_WCPM: Record<HalfGradeLevel, number> = {
  KA: 5,    KB: 15,
  "1A": 25, "1B": 50,
  "2A": 65, "2B": 90,
  "3A": 80, "3B": 100,
  "4A": 95, "4B": 115,
  "5A": 110, "5B": 130,
  "6A": 125, "6B": 145,
  "7A": 130, "7B": 145,
  "8A": 135, "8B": 150,
};

// ---------------------------------------------------------------------------
// Per-operation solve seconds, by half-grade.
//
// Each cell = seconds for ONE application of the operation, for a student
// at developmentally-typical fluency for that grade. Curves DESCEND through
// pre-fluency grades and PLATEAU at fluency onset (see fluency-onset row
// for each op). Plateaus do not rise at upper grades — see file-level
// comment for the rationale.
//
// `null` = op is off-curriculum at this grade. Lookup throws (non-prod) or
// error-logs (prod). Do not "improve" by populating these cells without a
// curriculum-mapping basis.
// ---------------------------------------------------------------------------

const SECONDS_PER_OPERATION: Record<
  OperationType,
  Record<HalfGradeLevel, OperationGradeCell>
> = {
  // Fluency onset 2A → plateau 4.
  ADDITION: hg({
    KA: 6,  KB: 5,
    "1A": 5, "1B": 4,
    "2A": 4, "2B": 4, "3A": 4, "3B": 4,
    "4A": 4, "4B": 4, "5A": 4, "5B": 4,
    "6A": 4, "6B": 4, "7A": 4, "7B": 4, "8A": 4, "8B": 4,
  }),

  // Fluency onset 2A → plateau 5.
  SUBTRACTION: hg({
    KA: 7,  KB: 6,
    "1A": 6, "1B": 5,
    "2A": 5, "2B": 5, "3A": 5, "3B": 5,
    "4A": 5, "4B": 5, "5A": 5, "5B": 5,
    "6A": 5, "6B": 5, "7A": 5, "7B": 5, "8A": 5, "8B": 5,
  }),

  // Fluency onset 4A → plateau 5.
  // KA: null — multiplication concept unavailable at K (sharing/groups
  // exist but explicit multiplication is post-K curriculum).
  MULTIPLICATION: hg({
    KA: null, KB: 11,
    "1A": 10, "1B": 9, "2A": 8, "2B": 7, "3A": 6, "3B": 5,
    "4A": 5, "4B": 5, "5A": 5, "5B": 5,
    "6A": 5, "6B": 5, "7A": 5, "7B": 5, "8A": 5, "8B": 5,
  }),

  // Fluency onset 5A → plateau 5.
  // KA-1A: null — division as numeric op enters curriculum at 1B (early
  // sharing) and develops through long division at 4B–5A.
  DIVISION: hg({
    KA: null, KB: null,
    "1A": null, "1B": 14, "2A": 12, "2B": 10, "3A": 8, "3B": 7,
    "4A": 6, "4B": 6, "5A": 5, "5B": 5,
    "6A": 5, "6B": 5, "7A": 5, "7B": 5, "8A": 5, "8B": 5,
  }),

  // Fluency onset 5A → plateau 10.
  // KA-1A: null — fractions enter curriculum at 1B (informal half/quarter).
  FRACTION_OP: hg({
    KA: null, KB: null,
    "1A": null, "1B": 18, "2A": 15, "2B": 13, "3A": 12, "3B": 11,
    "4A": 11, "4B": 10, "5A": 10, "5B": 10,
    "6A": 10, "6B": 10, "7A": 10, "7B": 10, "8A": 10, "8B": 10,
  }),

  // Fluency onset 5A → plateau 11.
  // KA-3A: null — Singapore Math (Dimensions) introduces decimals at 4A.
  // Per design review: surface a 3A DECIMAL_OP tag as a content error
  // rather than populate.
  DECIMAL_OP: hg({
    KA: null, KB: null,
    "1A": null, "1B": null, "2A": null, "2B": null, "3A": null, "3B": 13,
    "4A": 12, "4B": 11, "5A": 11, "5B": 11,
    "6A": 11, "6B": 11, "7A": 11, "7B": 11, "8A": 11, "8B": 11,
  }),

  // Fluency onset 6A → plateau 12.
  // KA-4A: null — percents introduced ~5A.
  PERCENT_OP: hg({
    KA: null, KB: null,
    "1A": null, "1B": null, "2A": null, "2B": null, "3A": null, "3B": null,
    "4A": null, "4B": 16, "5A": 14, "5B": 13,
    "6A": 12, "6B": 12, "7A": 12, "7B": 12, "8A": 12, "8B": 12,
  }),

  // Fluency onset 3A → plateau 8.
  GEOMETRY: hg({
    KA: 12, KB: 10,
    "1A": 9, "1B": 9, "2A": 8, "2B": 8, "3A": 8, "3B": 8,
    "4A": 8, "4B": 8, "5A": 8, "5B": 8,
    "6A": 8, "6B": 8, "7A": 8, "7B": 8, "8A": 8, "8B": 8,
  }),

  // Fluency onset 3A → plateau 8.
  MEASUREMENT: hg({
    KA: 11, KB: 10,
    "1A": 9, "1B": 9, "2A": 8, "2B": 8, "3A": 8, "3B": 8,
    "4A": 8, "4B": 8, "5A": 8, "5B": 8,
    "6A": 8, "6B": 8, "7A": 8, "7B": 8, "8A": 8, "8B": 8,
  }),

  // Fluency onset 3A → plateau 9.
  PATTERN: hg({
    KA: 11, KB: 10,
    "1A": 9, "1B": 9, "2A": 9, "2B": 9, "3A": 9, "3B": 9,
    "4A": 9, "4B": 9, "5A": 9, "5B": 9,
    "6A": 9, "6B": 9, "7A": 9, "7B": 9, "8A": 9, "8B": 9,
  }),

  // Fluency onset 6A → plateau 12.
  // KA-3B: null — formal algebra emerges ~4A; informal pre-algebra
  // patterns at 3B are coded as PATTERN, not ALGEBRA.
  ALGEBRA: hg({
    KA: null, KB: null,
    "1A": null, "1B": null, "2A": null, "2B": null, "3A": null, "3B": null,
    "4A": 18, "4B": 16, "5A": 14, "5B": 13,
    "6A": 12, "6B": 12, "7A": 12, "7B": 12, "8A": 12, "8B": 12,
  }),

  // Fluency onset 2A → plateau 4.
  COUNTING: hg({
    KA: 7,  KB: 6,
    "1A": 5, "1B": 5, "2A": 4, "2B": 4, "3A": 4, "3B": 4,
    "4A": 4, "4B": 4, "5A": 4, "5B": 4,
    "6A": 4, "6B": 4, "7A": 4, "7B": 4, "8A": 4, "8B": 4,
  }),

  // Fluency onset 1A → plateau 4 (identification is near-immediate even
  // at K, just slowed by attention/motor latency).
  IDENTIFY: hg({
    KA: 6,  KB: 5,
    "1A": 4, "1B": 4, "2A": 4, "2B": 4, "3A": 4, "3B": 4,
    "4A": 4, "4B": 4, "5A": 4, "5B": 4,
    "6A": 4, "6B": 4, "7A": 4, "7B": 4, "8A": 4, "8B": 4,
  }),
};

/** Identity helper — constrains the literal to a complete map at compile time. */
function hg(
  table: Record<HalfGradeLevel, OperationGradeCell>,
): Record<HalfGradeLevel, OperationGradeCell> {
  return table;
}

/**
 * Representation multipliers on T_solve. BAR_MODEL_REQUIRED is the
 * least-confident parameter — first empirical recalibration target.
 */
const REPRESENTATION_MULTIPLIER: Record<RepresentationKind, number> = {
  SYMBOLIC: 1.0,
  PICTORIAL: 1.2,
  BAR_MODEL_REQUIRED: 1.5,
  WORD_PROBLEM_SINGLE: 1.3,
  WORD_PROBLEM_MULTI: 1.6,
};

const INPUT_SECONDS_BY_FORMAT: Record<QuestionFormat, number> = {
  MULTIPLE_CHOICE: 2,
  NUMERIC_ENTRY: 5,
  DRAG_DROP: 6,
};

export const DEFAULT_CONFIG: TimeFlagConfig = {
  version: TIME_FLAG_CONFIG_VERSION,
  readingWcpm: READING_WCPM,
  silentReadingMultiplier: 1.3,
  secondsPerOperation: SECONDS_PER_OPERATION,
  representationMultiplier: REPRESENTATION_MULTIPLIER,
  inputSecondsByFormat: INPUT_SECONDS_BY_FORMAT,
  invalidFloorSec: 1.0,
  perResponse: { tooFastBelow: 0.4, tooSlowAbove: 2.5 },
  session: {
    unreliableInvalidRatio: 0.2,
    rushedTooFastRatio: 0.3,
    strugglingTooSlowRatio: 0.25,
  },
};

/**
 * Conservative defaults applied by `withFallbackTags(partial)` when an item
 * is missing any of the four blocking norm tags.
 *
 * v1-only escape hatch: production reads NOT NULL columns from `questions`
 * (Migration A1), so this default is never consulted from production paths.
 * Tests, ETL probes, and manual tooling that flag without DB-backed tags
 * may use it. The moment any item ships fully tagged AND a fallback fires,
 * `assertFallbackStillNeeded` (in serialization.ts) throws in non-prod and
 * error-logs in prod — see Decision 3.
 */
export const DEFAULT_FALLBACK_TAGS: ItemNormTags = {
  word_count: 0,
  operation_type: "ADDITION",
  num_operations: 1,
  representation: "SYMBOLIC",
};
