// Atlas Assessment — boundary translation.
//
// Two concerns, both about reconciling typed-internal-representation with
// messy-external-representation:
//
//   1. Fallback-tag completion. Production reads NOT NULL columns from
//      `questions` and constructs full ItemNormTags directly. Tests, ETL
//      probes, and manual tooling that flag without DB-backed tags use
//      `withFallbackTags` to substitute defaults. The substitution fires
//      `assertFallbackStillNeeded`, which throws in non-prod and error-
//      logs in prod.
//
//   2. JSONB shape conversion. SessionFlagResult is camelCase (in-memory
//      TS convention). The persisted shape on
//      `assessment_sessions.time_flag_summary` is snake_case (per Decision
//      6). `toSessionSummaryJson` / `fromSessionSummaryJson` translate at
//      the boundary; never rename by hand.

import { DEFAULT_FALLBACK_TAGS } from "./norms";
import type {
  ItemNormTags,
  SessionFlagResult,
  SessionSummaryJson,
} from "./types";

// ---------------------------------------------------------------------------
// Fallback-tag completion
// ---------------------------------------------------------------------------

export interface WithFallbackTagsResult {
  tags: ItemNormTags;
  /** True iff at least one field was substituted from DEFAULT_FALLBACK_TAGS. */
  usedFallback: boolean;
}

/**
 * Fills missing fields on a partial `ItemNormTags` from
 * `DEFAULT_FALLBACK_TAGS`. If any substitution happens, fires
 * `assertFallbackStillNeeded`.
 *
 * Production should never call this — `questions` columns are NOT NULL
 * (Migration A1) and full tags read directly from a row should be passed
 * to `flagResponseTime` without fallback completion. The function exists
 * for tests, ETL probes, and manual tooling.
 *
 * REMOVE-WHEN-TAGS-LAND: when content authoring is fully enforced
 * upstream and the assert no longer fires anywhere, delete this function
 * and `DEFAULT_FALLBACK_TAGS`. See norms.ts.
 */
export function withFallbackTags(
  partial: Partial<ItemNormTags>,
): WithFallbackTagsResult {
  const hasAll =
    typeof partial.word_count === "number" &&
    typeof partial.operation_type === "string" &&
    typeof partial.num_operations === "number" &&
    typeof partial.representation === "string";

  if (hasAll) {
    return { tags: partial as ItemNormTags, usedFallback: false };
  }

  const tags: ItemNormTags = {
    word_count: partial.word_count ?? DEFAULT_FALLBACK_TAGS.word_count,
    operation_type:
      partial.operation_type ?? DEFAULT_FALLBACK_TAGS.operation_type,
    num_operations:
      partial.num_operations ?? DEFAULT_FALLBACK_TAGS.num_operations,
    representation:
      partial.representation ?? DEFAULT_FALLBACK_TAGS.representation,
  };
  assertFallbackStillNeeded();
  return { tags, usedFallback: true };
}

/**
 * Self-decommissioning guard per Decision 3. Fires the moment the fallback
 * path activates: throws in non-prod (NODE_ENV !== 'production') so
 * dev/CI catches it loudly; error-logs in prod so live traffic doesn't
 * crash. Exported for direct callers that compose the substitution
 * themselves rather than using `withFallbackTags`.
 */
export function assertFallbackStillNeeded(): void {
  const message =
    `[timeFlagging] DEFAULT_FALLBACK_TAGS used. The question bank should ` +
    `ship fully-tagged items per features.md §2 (Migration A1 enforces ` +
    `this at the DB layer). The fallback path is masking a missing-tag ` +
    `bug somewhere upstream — content import, test fixture, or a code ` +
    `path that bypasses the questions row read. Per Decision 3, remove ` +
    `this hatch (grep: REMOVE-WHEN-TAGS-LAND) once empirical confidence ` +
    `in the schema constraint is confirmed.`;
  if (process.env.NODE_ENV !== "production") {
    throw new Error(message);
  }
  console.error(message);
}

// ---------------------------------------------------------------------------
// JSONB shape conversion
//
// `SessionFlagResult` is the in-memory shape (camelCase).
// `SessionSummaryJson` is the on-disk shape written into
// `assessment_sessions.time_flag_summary` (snake_case, per Decision 6).
//
// Both functions are mechanical key renames. Keep them mirror-images of
// each other so a round-trip is identity:
//   fromSessionSummaryJson(toSessionSummaryJson(x))  ===  x
//   toSessionSummaryJson(fromSessionSummaryJson(y))  ===  y
// ---------------------------------------------------------------------------

export function toSessionSummaryJson(
  result: SessionFlagResult,
): SessionSummaryJson {
  return {
    session_flag: result.flag,
    total: result.total,
    valid: result.valid,
    invalid: result.invalid,
    too_fast: result.tooFast,
    too_slow: result.tooSlow,
    normal: result.normal,
    invalid_ratio: result.invalidRatio,
    too_fast_ratio: result.tooFastRatio,
    too_slow_ratio: result.tooSlowRatio,
    fallback_count: result.fallbackCount,
    fallback_ratio: result.fallbackRatio,
    time_flag_config_version: result.timeFlagConfigVersion,
  };
}

export function fromSessionSummaryJson(
  json: SessionSummaryJson,
): SessionFlagResult {
  return {
    flag: json.session_flag,
    total: json.total,
    valid: json.valid,
    invalid: json.invalid,
    tooFast: json.too_fast,
    tooSlow: json.too_slow,
    normal: json.normal,
    invalidRatio: json.invalid_ratio,
    tooFastRatio: json.too_fast_ratio,
    tooSlowRatio: json.too_slow_ratio,
    fallbackCount: json.fallback_count,
    fallbackRatio: json.fallback_ratio,
    timeFlagConfigVersion: json.time_flag_config_version,
  };
}
