// Atlas Assessment — time-flagging types.
//
// String literals here mirror the Postgres enums declared in:
//   supabase/migrations/20260507000000_add_question_time_norm_tags.sql
//   supabase/migrations/20260507000200_add_response_time_flags.sql
// If you change a value here, change the enum there (and vice versa).
//
// Half-grade level + question format are imported from the schema-derived
// types — never carry a parallel definition.
//
// Naming convention (deliberate split):
//   * In-memory TS shapes are camelCase (FlagResult, SessionFlagResult).
//   * Postgres column-shaped structs are snake_case (ItemNormTags mirrors
//     `questions` columns; SessionSummaryJson mirrors the persisted
//     `assessment_sessions.time_flag_summary` jsonb shape).
//   * Translate at the boundary via toSessionSummaryJson /
//     fromSessionSummaryJson in serialization.ts. Never rename by hand.

import type { Enums } from "@/lib/supabase/database.types";

export type HalfGradeLevel = Enums<"half_grade_level">;
export type QuestionFormat = Enums<"question_format">;

// OperationType is intentionally coarse (13 categories vs the reference's
// 25-30). Within-category difficulty variance is captured by the question's
// IRT difficulty parameter, not by sub-categorizing operations. Empirical
// recalibration may surface false positives that justify splitting specific
// ops; do not pre-split based on intuition alone.
export type OperationType =
  | "ADDITION"
  | "SUBTRACTION"
  | "MULTIPLICATION"
  | "DIVISION"
  | "FRACTION_OP"
  | "DECIMAL_OP"
  | "PERCENT_OP"
  | "GEOMETRY"
  | "MEASUREMENT"
  | "PATTERN"
  | "ALGEBRA"
  | "COUNTING"
  | "IDENTIFY";

/** Postgres enum `representation_kind` — column on `questions` is `representation`. */
export type RepresentationKind =
  | "SYMBOLIC"
  | "PICTORIAL"
  | "BAR_MODEL_REQUIRED"
  | "WORD_PROBLEM_SINGLE"
  | "WORD_PROBLEM_MULTI";

/** Postgres enum `time_flag`. */
export type TimeFlag = "INVALID" | "TOO_FAST" | "TOO_SLOW" | "NORMAL";

/** Postgres enum `session_time_flag`. */
export type SessionTimeFlag =
  | "unreliable"
  | "rushed"
  | "struggling"
  | "mixed"
  | "normal";

/**
 * The four blocking norm tags from features.md §2 every question must carry.
 * Migration A1 adds these as NOT NULL on `questions` — items missing any
 * cannot exist in the bank, so production callers always pass the full set.
 *
 * Keys are snake_case to match the Postgres column names directly; this
 * struct is built from a `questions` row read, never composed in TS code
 * that would benefit from camelCase.
 *
 * Non-production paths (tests, ETL probes, manual tooling) that need to
 * flag without DB-backed tags should call `withFallbackTags(partial)` from
 * serialization.ts to fill missing fields and trigger the assertion guard.
 */
export interface ItemNormTags {
  word_count: number;
  operation_type: OperationType;
  /** Discrete operations the student must perform (≥1). */
  num_operations: number;
  representation: RepresentationKind;
}

/**
 * Inputs the per-response flagger needs. `tags` is REQUIRED and full —
 * production callers read NOT NULL columns from `questions` and pass them
 * directly. Non-production callers synthesize via `withFallbackTags` and
 * set `usedFallback: true` for telemetry.
 */
export interface FlagInput {
  /** The question's authored half-grade level (used for T_read + T_solve). */
  level: HalfGradeLevel;
  /** UI input format (used for T_input lookup). */
  format: QuestionFormat;
  /** Full norm tags. Required — partial inputs are an upstream concern. */
  tags: ItemNormTags;
  /** Elapsed response time in milliseconds. Caller divides by 1000. */
  timeMs: number;
  /**
   * True iff `tags` was synthesized via `withFallbackTags`. Pass-through for
   * session telemetry; the flagger itself doesn't read it. Default false.
   */
  usedFallback?: boolean;
}

export interface FlagResult {
  /** T_read + T_solve + T_input, in seconds. */
  expectedTimeSec: number;
  /** Actual time recorded, in seconds (sub-second precision). */
  actualTimeSec: number;
  /** actualTimeSec / expectedTimeSec. */
  timeRatio: number;
  flag: TimeFlag;
  configVersion: string;
  /** Components for diagnostics / future calibration. */
  components: { tRead: number; tSolve: number; tInput: number };
  /** Mirrors FlagInput.usedFallback. Lets session telemetry count
   *  fallback-tagged responses without separately tracking them. */
  usedFallback: boolean;
  /** Human-readable reason; populated when flag !== 'NORMAL'. */
  reason?: string;
}

/**
 * Session-level rollup. All fields camelCase per the in-memory convention.
 * Persist via `toSessionSummaryJson(...)` — never write this struct directly
 * to jsonb (the column shape is snake_case per Decision 6).
 */
export interface SessionFlagResult {
  flag: SessionTimeFlag;
  total: number;
  valid: number;
  invalid: number;
  tooFast: number;
  tooSlow: number;
  normal: number;
  invalidRatio: number;
  /** Computed over valid items only (excludes INVALIDs). */
  tooFastRatio: number;
  /** Computed over valid items only (excludes INVALIDs). */
  tooSlowRatio: number;
  /** Count of responses whose tags were synthesized via withFallbackTags. */
  fallbackCount: number;
  /** Computed over total responses (not valid-only). */
  fallbackRatio: number;
  timeFlagConfigVersion: string;
}

/**
 * Persisted shape of `assessment_sessions.time_flag_summary` (jsonb).
 * Keys are snake_case per Decision 6, deliberately distinct from
 * SessionFlagResult so the boundary is explicit. Translate via
 * toSessionSummaryJson / fromSessionSummaryJson in serialization.ts;
 * never rename by hand.
 */
export interface SessionSummaryJson {
  session_flag: SessionTimeFlag;
  total: number;
  valid: number;
  invalid: number;
  too_fast: number;
  too_slow: number;
  normal: number;
  invalid_ratio: number;
  too_fast_ratio: number;
  too_slow_ratio: number;
  fallback_count: number;
  fallback_ratio: number;
  time_flag_config_version: string;
}
