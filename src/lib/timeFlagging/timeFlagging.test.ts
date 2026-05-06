// Atlas Assessment — timeFlagging unit tests.
//
// Boundary-band tests use 0.39 / 0.41 (and 2.49 / 2.51) rather than the
// exact band edges (0.4, 2.5). Floating-point ratio computation makes
// the exact-edge case ambiguous; stepping a percent off either side
// is unambiguous and tests the intended behavior.
//
// Fallback / assert tests rely on NODE_ENV !== 'production' (the vitest
// default). The single prod-mode behavioral test sets and restores
// NODE_ENV around the call.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CONFIG,
  DEFAULT_FALLBACK_TAGS,
  TIME_FLAG_CONFIG_VERSION,
  aggregateSessionFlags,
  assertFallbackStillNeeded,
  expectedTimeSec,
  flagResponseTime,
  fromSessionSummaryJson,
  toSessionSummaryJson,
  withFallbackTags,
  type FlagInput,
  type FlagResult,
  type HalfGradeLevel,
  type ItemNormTags,
  type SessionFlagResult,
} from "./index";

const baseTags: ItemNormTags = {
  word_count: 5,
  operation_type: "ADDITION",
  num_operations: 1,
  representation: "SYMBOLIC",
};

function input(over: Partial<FlagInput> = {}): FlagInput {
  return {
    level: "3A",
    format: "MULTIPLE_CHOICE",
    tags: baseTags,
    timeMs: 5000,
    ...over,
  };
}

// Minimal FlagResult — only fields aggregateSessionFlags actually reads.
function fr(
  flag: FlagResult["flag"],
  usedFallback = false,
): FlagResult {
  return {
    expectedTimeSec: 10,
    actualTimeSec: 10,
    timeRatio: 1,
    flag,
    configVersion: TIME_FLAG_CONFIG_VERSION,
    components: { tRead: 0, tSolve: 0, tInput: 0 },
    usedFallback,
  };
}

// ---------------------------------------------------------------------------
// expectedTimeSec
// ---------------------------------------------------------------------------

describe("expectedTimeSec", () => {
  it("computes finite breakdown for canonical inputs", () => {
    const r = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags);
    expect(r.tRead).toBeGreaterThan(0);
    expect(r.tSolve).toBeGreaterThan(0);
    expect(r.tInput).toBeGreaterThan(0);
    expect(r.total).toBe(r.tRead + r.tSolve + r.tInput);
    expect(Number.isFinite(r.total)).toBe(true);
  });

  it("returns T_read = 0 when word_count = 0", () => {
    const r = expectedTimeSec("3A", "MULTIPLE_CHOICE", {
      ...baseTags,
      word_count: 0,
    });
    expect(r.tRead).toBe(0);
  });

  it("BAR_MODEL_REQUIRED scales T_solve by 1.5×; T_read and T_input unchanged", () => {
    const sym = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags);
    const bm = expectedTimeSec("3A", "MULTIPLE_CHOICE", {
      ...baseTags,
      representation: "BAR_MODEL_REQUIRED",
    });
    expect(bm.tRead).toBe(sym.tRead);
    expect(bm.tInput).toBe(sym.tInput);
    expect(bm.tSolve).toBeCloseTo(sym.tSolve * 1.5, 5);
  });

  it("num_operations=3 triples T_solve before representation multiplier", () => {
    const single = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags);
    const triple = expectedTimeSec("3A", "MULTIPLE_CHOICE", {
      ...baseTags,
      num_operations: 3,
    });
    expect(triple.tSolve).toBeCloseTo(single.tSolve * 3, 5);
  });

  it("silentReadingMultiplier reduces T_read vs the oral baseline", () => {
    const oralOnly = { ...DEFAULT_CONFIG, silentReadingMultiplier: 1.0 };
    const oral = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags, oralOnly);
    const silent = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags);
    expect(silent.tRead).toBeCloseTo(oral.tRead / 1.3, 5);
  });

  it("throws when num_operations < 1", () => {
    expect(() =>
      expectedTimeSec("3A", "MULTIPLE_CHOICE", { ...baseTags, num_operations: 0 }),
    ).toThrow(/num_operations must be >= 1/);
  });

  it("throws when word_count < 0", () => {
    expect(() =>
      expectedTimeSec("3A", "MULTIPLE_CHOICE", { ...baseTags, word_count: -1 }),
    ).toThrow(/word_count must be >= 0/);
  });

  it("throws on null op×grade cell (ALGEBRA at KA) in non-prod", () => {
    expect(() =>
      expectedTimeSec("KA", "MULTIPLE_CHOICE", {
        ...baseTags,
        operation_type: "ALGEBRA",
      }),
    ).toThrow(/off-curriculum/);
  });

  it("throws on null op×grade cell (DECIMAL_OP at 3A) in non-prod", () => {
    expect(() =>
      expectedTimeSec("3A", "MULTIPLE_CHOICE", {
        ...baseTags,
        operation_type: "DECIMAL_OP",
      }),
    ).toThrow(/off-curriculum/);
  });

  it("covers all 18 half-grades for ADDITION (smoke)", () => {
    const grades: ReadonlyArray<HalfGradeLevel> = [
      "KA", "KB",
      "1A", "1B", "2A", "2B", "3A", "3B",
      "4A", "4B", "5A", "5B",
      "6A", "6B", "7A", "7B", "8A", "8B",
    ];
    for (const level of grades) {
      const r = expectedTimeSec(level, "MULTIPLE_CHOICE", baseTags);
      expect(Number.isFinite(r.total)).toBe(true);
      expect(r.total).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// flagResponseTime
// ---------------------------------------------------------------------------

describe("flagResponseTime", () => {
  it("INVALID precedes TOO_FAST: 0.3s on a long-expected item", () => {
    const r = flagResponseTime(input({ timeMs: 300 }));
    expect(r.flag).toBe("INVALID");
    expect(r.reason).toMatch(/below the/);
  });

  it("INVALID at 0.999s but not at 1.0s", () => {
    expect(flagResponseTime(input({ timeMs: 999 })).flag).toBe("INVALID");
    expect(flagResponseTime(input({ timeMs: 1000 })).flag).not.toBe("INVALID");
  });

  it("TOO_FAST when ratio is just below 0.4", () => {
    const expected = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags).total;
    const r = flagResponseTime(input({ timeMs: expected * 0.39 * 1000 }));
    expect(r.flag).toBe("TOO_FAST");
  });

  it("NORMAL when ratio is just above 0.4", () => {
    const expected = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags).total;
    const r = flagResponseTime(input({ timeMs: expected * 0.41 * 1000 }));
    expect(r.flag).toBe("NORMAL");
  });

  it("TOO_SLOW when ratio is just above 2.5", () => {
    const expected = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags).total;
    const r = flagResponseTime(input({ timeMs: expected * 2.51 * 1000 }));
    expect(r.flag).toBe("TOO_SLOW");
  });

  it("NORMAL when ratio is just below 2.5", () => {
    const expected = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags).total;
    const r = flagResponseTime(input({ timeMs: expected * 2.49 * 1000 }));
    expect(r.flag).toBe("NORMAL");
  });

  it("NORMAL at center (ratio ≈ 1.0); no reason populated", () => {
    const expected = expectedTimeSec("3A", "MULTIPLE_CHOICE", baseTags).total;
    const r = flagResponseTime(input({ timeMs: expected * 1000 }));
    expect(r.flag).toBe("NORMAL");
    expect(r.reason).toBeUndefined();
  });

  it("propagates configVersion onto the result", () => {
    expect(flagResponseTime(input()).configVersion).toBe(
      TIME_FLAG_CONFIG_VERSION,
    );
  });

  it("propagates usedFallback through to FlagResult (default false)", () => {
    expect(flagResponseTime(input()).usedFallback).toBe(false);
    expect(flagResponseTime(input({ usedFallback: true })).usedFallback).toBe(true);
  });

  it("honors sub-second precision (0.5s flagged INVALID)", () => {
    const r = flagResponseTime(input({ timeMs: 500 }));
    expect(r.actualTimeSec).toBe(0.5);
    expect(r.flag).toBe("INVALID");
  });
});

// ---------------------------------------------------------------------------
// aggregateSessionFlags
// ---------------------------------------------------------------------------

describe("aggregateSessionFlags", () => {
  it("empty array → flag='normal', zero everything", () => {
    const s = aggregateSessionFlags([]);
    expect(s.flag).toBe("normal");
    expect(s.total).toBe(0);
    expect(s.invalidRatio).toBe(0);
    expect(s.tooFastRatio).toBe(0);
    expect(s.tooSlowRatio).toBe(0);
    expect(s.fallbackRatio).toBe(0);
  });

  it("20% INVALID exactly → 'unreliable'", () => {
    const flags: FlagResult[] = [
      ...Array.from({ length: 2 }, () => fr("INVALID")),
      ...Array.from({ length: 8 }, () => fr("NORMAL")),
    ];
    const s = aggregateSessionFlags(flags);
    expect(s.flag).toBe("unreliable");
    expect(s.invalidRatio).toBe(0.2);
  });

  it("19% INVALID → not 'unreliable'", () => {
    const flags: FlagResult[] = [
      ...Array.from({ length: 19 }, () => fr("INVALID")),
      ...Array.from({ length: 81 }, () => fr("NORMAL")),
    ];
    const s = aggregateSessionFlags(flags);
    expect(s.flag).not.toBe("unreliable");
    expect(s.invalidRatio).toBe(0.19);
  });

  it("rushed denominator excludes INVALID: 1 INVALID + 6 TOO_FAST out of 20 → rushed", () => {
    // 6 / 19 valid = 31.6% > 30%. If denominator were 20, it'd be 30% exactly
    // (boundary), and the test wouldn't prove the denominator-fix.
    const flags: FlagResult[] = [
      fr("INVALID"),
      ...Array.from({ length: 6 }, () => fr("TOO_FAST")),
      ...Array.from({ length: 13 }, () => fr("NORMAL")),
    ];
    const s = aggregateSessionFlags(flags);
    expect(s.flag).toBe("rushed");
    expect(s.tooFastRatio).toBeCloseTo(6 / 19, 5);
  });

  it("both rushed and struggling thresholds met → 'mixed'", () => {
    const flags: FlagResult[] = [
      ...Array.from({ length: 4 }, () => fr("TOO_FAST")),
      ...Array.from({ length: 3 }, () => fr("TOO_SLOW")),
      ...Array.from({ length: 3 }, () => fr("NORMAL")),
    ];
    const s = aggregateSessionFlags(flags);
    expect(s.flag).toBe("mixed");
  });

  it("pure NORMAL session → 'normal'", () => {
    const s = aggregateSessionFlags(
      Array.from({ length: 10 }, () => fr("NORMAL")),
    );
    expect(s.flag).toBe("normal");
  });

  it("unreliable preempts rushed; rushed/struggling ratios still observable", () => {
    // 5 INVALID + 4 TOO_FAST + 1 NORMAL out of 10:
    //   invalidRatio = 0.5 → unreliable fires
    //   tooFastRatio over valid = 4/5 = 0.8 → would be rushed if not unreliable
    const flags: FlagResult[] = [
      ...Array.from({ length: 5 }, () => fr("INVALID")),
      ...Array.from({ length: 4 }, () => fr("TOO_FAST")),
      fr("NORMAL"),
    ];
    const s = aggregateSessionFlags(flags);
    expect(s.flag).toBe("unreliable");
    expect(s.tooFastRatio).toBeCloseTo(4 / 5, 5);
  });

  it("counts fallbackCount; fallbackRatio is over total (not valid-only)", () => {
    const flags: FlagResult[] = [
      fr("NORMAL", true),
      fr("NORMAL", true),
      fr("INVALID", false),
      fr("NORMAL", false),
    ];
    const s = aggregateSessionFlags(flags);
    expect(s.fallbackCount).toBe(2);
    expect(s.fallbackRatio).toBe(0.5); // 2/4 over total, not 2/3 over valid
  });

  it("propagates configVersion onto the rollup", () => {
    const s = aggregateSessionFlags([fr("NORMAL")]);
    expect(s.timeFlagConfigVersion).toBe(TIME_FLAG_CONFIG_VERSION);
  });
});

// ---------------------------------------------------------------------------
// withFallbackTags + assertFallbackStillNeeded
// ---------------------------------------------------------------------------

describe("withFallbackTags + assertFallbackStillNeeded", () => {
  it("returns full tags + usedFallback=false when partial is complete", () => {
    const result = withFallbackTags(baseTags);
    expect(result.usedFallback).toBe(false);
    expect(result.tags).toEqual(baseTags);
  });

  it("throws in non-prod when any field is missing", () => {
    expect(() => withFallbackTags({ word_count: 5 })).toThrow(
      /REMOVE-WHEN-TAGS-LAND/,
    );
  });

  it("assertFallbackStillNeeded throws directly in non-prod", () => {
    expect(() => assertFallbackStillNeeded()).toThrow(/REMOVE-WHEN-TAGS-LAND/);
  });

  describe("under prod NODE_ENV", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("substitutes defaults and returns usedFallback=true without throwing", () => {
      const result = withFallbackTags({ word_count: 5 });
      expect(result.usedFallback).toBe(true);
      expect(result.tags.word_count).toBe(5);
      expect(result.tags.operation_type).toBe(DEFAULT_FALLBACK_TAGS.operation_type);
      expect(result.tags.num_operations).toBe(DEFAULT_FALLBACK_TAGS.num_operations);
      expect(result.tags.representation).toBe(DEFAULT_FALLBACK_TAGS.representation);
    });
  });
});

// ---------------------------------------------------------------------------
// JSONB serialization
// ---------------------------------------------------------------------------

describe("toSessionSummaryJson / fromSessionSummaryJson", () => {
  const sample: SessionFlagResult = {
    flag: "rushed",
    total: 20,
    valid: 19,
    invalid: 1,
    tooFast: 6,
    tooSlow: 2,
    normal: 11,
    invalidRatio: 1 / 20,
    tooFastRatio: 6 / 19,
    tooSlowRatio: 2 / 19,
    fallbackCount: 0,
    fallbackRatio: 0,
    timeFlagConfigVersion: TIME_FLAG_CONFIG_VERSION,
  };

  it("renames camelCase → snake_case", () => {
    const j = toSessionSummaryJson(sample);
    expect(j.session_flag).toBe("rushed");
    expect(j.too_fast).toBe(6);
    expect(j.too_slow_ratio).toBeCloseTo(2 / 19, 5);
    expect(j.fallback_count).toBe(0);
    expect(j.time_flag_config_version).toBe(TIME_FLAG_CONFIG_VERSION);
  });

  it("roundtrip is identity", () => {
    expect(fromSessionSummaryJson(toSessionSummaryJson(sample))).toEqual(sample);
  });
});

// ---------------------------------------------------------------------------
// Schema cell sentinels (Decision 3 alignment — null cells are policy)
// ---------------------------------------------------------------------------

describe("schema cell sentinels", () => {
  it("DEFAULT_CONFIG.version matches TIME_FLAG_CONFIG_VERSION", () => {
    expect(DEFAULT_CONFIG.version).toBe(TIME_FLAG_CONFIG_VERSION);
  });

  it("ALGEBRA cells null through 3B; populated from 4A", () => {
    const cells = DEFAULT_CONFIG.secondsPerOperation.ALGEBRA;
    expect(cells.KA).toBeNull();
    expect(cells["3B"]).toBeNull();
    expect(cells["4A"]).not.toBeNull();
  });

  it("DECIMAL_OP cells null through 3A; populated from 3B", () => {
    const cells = DEFAULT_CONFIG.secondsPerOperation.DECIMAL_OP;
    expect(cells["3A"]).toBeNull();
    expect(cells["3B"]).not.toBeNull();
  });

  it("PERCENT_OP cells null through 4A; populated from 4B", () => {
    const cells = DEFAULT_CONFIG.secondsPerOperation.PERCENT_OP;
    expect(cells["4A"]).toBeNull();
    expect(cells["4B"]).not.toBeNull();
  });

  it("ADDITION populated at every grade", () => {
    const cells = DEFAULT_CONFIG.secondsPerOperation.ADDITION;
    for (const [level, value] of Object.entries(cells)) {
      expect(value, `ADDITION at ${level} should not be null`).not.toBeNull();
    }
  });
});
