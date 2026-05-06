// Atlas Assessment — `timeFlagging` public API.
//
// Barrel re-exports for `@/lib/timeFlagging`. Group by source file so the
// surface area stays mappable. Internal helpers (e.g., `lookupSecondsPerOp`
// in flagger.ts) are not re-exported and remain module-private.
//
// Implementation status (features.md §2):
//   * Library + schema only. No API route or UI integration in v1.
//   * Future response-submit code reads NOT NULL question tag columns,
//     constructs ItemNormTags directly, and calls `flagResponseTime`.
//     Session-completion code calls `aggregateSessionFlags` over the
//     session's FlagResult[] and persists via `toSessionSummaryJson`.
//   * Integration contract documented in INTEGRATION.md.

// ---- types ----------------------------------------------------------------
export type {
  // Schema-aligned enums (mirror Postgres types).
  HalfGradeLevel,
  QuestionFormat,
  OperationType,
  RepresentationKind,
  TimeFlag,
  SessionTimeFlag,
  // Domain shapes.
  ItemNormTags,
  FlagInput,
  FlagResult,
  SessionFlagResult,
  SessionSummaryJson,
} from "./types";

// ---- config ---------------------------------------------------------------
export {
  TIME_FLAG_CONFIG_VERSION,
  DEFAULT_CONFIG,
  DEFAULT_FALLBACK_TAGS,
} from "./norms";

export type { OperationGradeCell, TimeFlagConfig } from "./norms";

// ---- flagger --------------------------------------------------------------
export {
  expectedTimeSec,
  flagResponseTime,
  aggregateSessionFlags,
} from "./flagger";

export type { ExpectedTimeBreakdown } from "./flagger";

// ---- serialization / boundary ---------------------------------------------
export {
  withFallbackTags,
  assertFallbackStillNeeded,
  toSessionSummaryJson,
  fromSessionSummaryJson,
} from "./serialization";

export type { WithFallbackTagsResult } from "./serialization";
