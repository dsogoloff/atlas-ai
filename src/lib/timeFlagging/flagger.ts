// Atlas Assessment — pure flagging logic.
//
// Per features.md §2:
//   * v1 NEVER adjusts the placement score from time. The flagger produces
//     per-response and session-level flags only; the engine ignores them.
//   * Pure deterministic TypeScript — no LLM calls (architecture.md
//     decision #3 LLM-discipline pattern).
//
// All state lives in the inputs. No module-level mutation. Re-entry safe.

import {
  DEFAULT_CONFIG,
  type OperationGradeCell,
  type TimeFlagConfig,
} from "./norms";
import type {
  FlagInput,
  FlagResult,
  HalfGradeLevel,
  ItemNormTags,
  OperationType,
  QuestionFormat,
  SessionFlagResult,
  SessionTimeFlag,
  TimeFlag,
} from "./types";

// ---------------------------------------------------------------------------
// Expected-time formula:  T_expected = T_read + T_solve + T_input
// ---------------------------------------------------------------------------

export interface ExpectedTimeBreakdown {
  tRead: number;
  tSolve: number;
  tInput: number;
  total: number;
}

/**
 * Computes T_expected for a fully-tagged item at the given grade. Pure.
 *
 * Throws on:
 *   * num_operations < 1
 *   * word_count < 0
 *   * (op × level) cell is null in non-production (content-tagging error)
 * Error-logs in production for the null-cell case and uses a high sentinel
 * (60s) so the response will likely flag TOO_FAST and surface upstream
 * rather than passing as NORMAL.
 */
export function expectedTimeSec(
  level: HalfGradeLevel,
  format: QuestionFormat,
  tags: ItemNormTags,
  config: TimeFlagConfig = DEFAULT_CONFIG,
): ExpectedTimeBreakdown {
  if (tags.num_operations < 1) {
    throw new Error(
      `[timeFlagging] num_operations must be >= 1 (got ${tags.num_operations})`,
    );
  }
  if (tags.word_count < 0) {
    throw new Error(
      `[timeFlagging] word_count must be >= 0 (got ${tags.word_count})`,
    );
  }

  // T_read — reading is silent; convert oral WCPM → silent and divide.
  // (word_count / silentWcpm) × 60 = seconds.
  const oralWcpm = config.readingWcpm[level];
  const silentWcpm = oralWcpm * config.silentReadingMultiplier;
  const tRead =
    tags.word_count > 0 ? (tags.word_count / silentWcpm) * 60 : 0;

  // T_solve — per-op cell × num_operations × representation multiplier.
  const cell = config.secondsPerOperation[tags.operation_type][level];
  const perOp = lookupSecondsPerOp(cell, tags.operation_type, level);
  const repMult = config.representationMultiplier[tags.representation];
  const tSolve = perOp * tags.num_operations * repMult;

  // T_input — fixed per format.
  const tInput = config.inputSecondsByFormat[format];

  return { tRead, tSolve, tInput, total: tRead + tSolve + tInput };
}

/**
 * Resolves a `(op × grade)` cell. `null` means the combination is off-
 * curriculum — almost always a content-tagging error. Throws in non-prod;
 * error-logs and returns a high sentinel (60s) in prod so the response
 * will visibly flag rather than silently pass.
 */
function lookupSecondsPerOp(
  cell: OperationGradeCell,
  op: OperationType,
  level: HalfGradeLevel,
): number {
  if (cell !== null) return cell;

  const message =
    `[timeFlagging] No norm cell for op=${op} at level=${level}. ` +
    `This (op × grade) combination is off-curriculum — likely a ` +
    `content-tagging error. See norms.ts for the curriculum mapping.`;

  if (process.env.NODE_ENV !== "production") {
    throw new Error(message);
  }
  console.error(message);
  // Production sentinel: high enough that any realistic response time
  // will produce TOO_FAST and surface upstream, rather than passing as
  // NORMAL. We accept a small false-positive rate on the affected
  // session in exchange for visibility on the underlying bug.
  return 60;
}

// ---------------------------------------------------------------------------
// Per-response flag.
//
// Order matters: the absolute INVALID floor is checked BEFORE the ratio
// bands, so a 0.3s tap on a 60s-expected item is INVALID, not TOO_FAST.
// Excluding INVALIDs from rushed/struggling aggregation prevents single
// stray taps from contaminating genuine patterns.
// ---------------------------------------------------------------------------

export function flagResponseTime(
  input: FlagInput,
  config: TimeFlagConfig = DEFAULT_CONFIG,
): FlagResult {
  const actualTimeSec = input.timeMs / 1000;

  const { tRead, tSolve, tInput, total: expectedTimeSecValue } =
    expectedTimeSec(input.level, input.format, input.tags, config);

  const timeRatio =
    expectedTimeSecValue > 0 ? actualTimeSec / expectedTimeSecValue : 1;

  let flag: TimeFlag;
  let reason: string | undefined;

  if (actualTimeSec < config.invalidFloorSec) {
    flag = "INVALID";
    reason =
      `Response in ${actualTimeSec.toFixed(2)}s, below the ` +
      `${config.invalidFloorSec}s floor. Likely accidental submit or ` +
      `double-tap — not a meaningful attempt.`;
  } else if (timeRatio < config.perResponse.tooFastBelow) {
    flag = "TOO_FAST";
    reason =
      `Answered in ${actualTimeSec.toFixed(1)}s vs ` +
      `${expectedTimeSecValue.toFixed(1)}s expected ` +
      `(${(timeRatio * 100).toFixed(0)}%). ` +
      `Possible guess or pattern-match.`;
  } else if (timeRatio > config.perResponse.tooSlowAbove) {
    flag = "TOO_SLOW";
    reason =
      `Answered in ${actualTimeSec.toFixed(1)}s vs ` +
      `${expectedTimeSecValue.toFixed(1)}s expected ` +
      `(${(timeRatio * 100).toFixed(0)}%). ` +
      `Possible struggle, distraction, or interruption.`;
  } else {
    flag = "NORMAL";
  }

  return {
    expectedTimeSec: expectedTimeSecValue,
    actualTimeSec,
    timeRatio,
    flag,
    configVersion: config.version,
    components: { tRead, tSolve, tInput },
    usedFallback: input.usedFallback ?? false,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Session-level rollup.
//
// Per features.md §2:
//   unreliable  — ≥20% INVALID over all responses (recommend re-take;
//                 do not surface diagnostic results)
//   rushed      — ≥30% TOO_FAST over VALID responses (caveat report)
//   struggling  — ≥25% TOO_SLOW over VALID responses (caveat differently)
//   mixed       — both rushed and struggling thresholds met
//   normal      — otherwise
//
// Ratios are always computed over their proper denominators so they
// remain observable on the result struct even within unreliable sessions.
// The flag decision is mutually exclusive: when `unreliable` fires, the
// rushed and struggling thresholds are not consulted, so a session is
// never reported as both unreliable and rushed.
//
// Fallback-tagged responses are counted alongside the four flag categories
// (per Q1 decision (a)) so the parent report can disclose how much of the
// expected-time signal was synthesized vs measured.
// ---------------------------------------------------------------------------

export function aggregateSessionFlags(
  results: readonly FlagResult[],
  config: TimeFlagConfig = DEFAULT_CONFIG,
): SessionFlagResult {
  const total = results.length;

  let invalid = 0;
  let tooFast = 0;
  let tooSlow = 0;
  let normal = 0;
  let fallbackCount = 0;
  for (const r of results) {
    switch (r.flag) {
      case "INVALID":
        invalid++;
        break;
      case "TOO_FAST":
        tooFast++;
        break;
      case "TOO_SLOW":
        tooSlow++;
        break;
      case "NORMAL":
        normal++;
        break;
    }
    if (r.usedFallback) fallbackCount++;
  }

  const valid = total - invalid;
  const invalidRatio = total > 0 ? invalid / total : 0;
  const tooFastRatio = valid > 0 ? tooFast / valid : 0;
  const tooSlowRatio = valid > 0 ? tooSlow / valid : 0;
  const fallbackRatio = total > 0 ? fallbackCount / total : 0;

  let flag: SessionTimeFlag = "normal";
  if (total > 0) {
    if (invalidRatio >= config.session.unreliableInvalidRatio) {
      flag = "unreliable";
    } else {
      const isRushed = tooFastRatio >= config.session.rushedTooFastRatio;
      const isStruggling =
        tooSlowRatio >= config.session.strugglingTooSlowRatio;
      if (isRushed && isStruggling) flag = "mixed";
      else if (isRushed) flag = "rushed";
      else if (isStruggling) flag = "struggling";
    }
  }

  return {
    flag,
    total,
    valid,
    invalid,
    tooFast,
    tooSlow,
    normal,
    invalidRatio,
    tooFastRatio,
    tooSlowRatio,
    fallbackCount,
    fallbackRatio,
    timeFlagConfigVersion: config.version,
  };
}
