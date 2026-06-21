import { describe, expect, it } from "vitest";

import { uniformPosterior } from "./bayesian";
import { createEngineState } from "./engine";
import { LEVELS, STRANDS } from "./levels";
import {
  SHORT_TEST_CONFIG,
  shortTestNextQuestionRequest,
  shortTestShouldTerminate,
} from "./shortTest";
import type {
  EngineState,
  Posteriors,
  Strand,
  StrandPosterior,
} from "./types";

// A sharply-peaked posterior (low variance). Used to make one strand "lower
// variance" than the uniform default so the phase-2 max-variance pick is
// deterministic.
function peakedPosterior(level: (typeof LEVELS)[number]): StrandPosterior {
  const idx = LEVELS.indexOf(level);
  const p = {} as StrandPosterior;
  for (let i = 0; i < LEVELS.length; i++) {
    if (i === idx) p[LEVELS[i]] = 0.9;
    else if (Math.abs(i - idx) === 1) p[LEVELS[i]] = 0.045;
    else p[LEVELS[i]] = 0.0001;
  }
  const total = LEVELS.reduce((s, l) => s + p[l], 0);
  for (const l of LEVELS) p[l] /= total;
  return p;
}

/** State whose `peaked` strands are low-variance, the rest uniform (high). */
function stateWith(
  peaked: readonly Strand[],
  responseCount: number,
): EngineState {
  const lo = peakedPosterior("3A");
  const posteriors = STRANDS.reduce((acc, s) => {
    acc[s] = peaked.includes(s) ? { ...lo } : uniformPosterior();
    return acc;
  }, {} as Posteriors);
  return { posteriors, responseCount, servedQuestionIds: [] };
}

function avail(entries: Array<[Strand, number]>): Map<Strand, number> {
  return new Map(entries);
}

describe("shortTestNextQuestionRequest — coverage then fill", () => {
  it("routes to an under-floor strand (fewest-served first) in phase 1", () => {
    const state = createEngineState();
    const availableByStrand = avail([
      ["number_sense", 5],
      ["operations_algorithms", 5],
      ["geometry", 5],
    ]);
    // number_sense already has 1; the other two have 0. Fewest-first must pick
    // a 0-count strand, never the 1-count number_sense.
    const req = shortTestNextQuestionRequest({
      state,
      strandCounts: { number_sense: 1 },
      availableByStrand,
      excludedStrands: new Set(),
    });
    expect(req).not.toBeNull();
    expect(req!.reason).toBe("short-floor");
    expect(req!.strand).not.toBe("number_sense");
  });

  it("only routes to in-scope (available > 0) strands", () => {
    const state = createEngineState();
    const availableByStrand = avail([
      ["geometry", 3],
      ["measurement", 0], // present but zero — out of scope
    ]);
    const req = shortTestNextQuestionRequest({
      state,
      strandCounts: {},
      availableByStrand,
      excludedStrands: new Set(),
    });
    expect(req!.strand).toBe("geometry");
  });

  it("treats a one-item strand as covered at one (effective floor clamps down)", () => {
    const state = stateWith(["data_statistics"], 3);
    // data_statistics has only 1 eligible item and is already served once →
    // covered. number_sense (floor 2) is under floor → phase 1 picks it.
    const req = shortTestNextQuestionRequest({
      state,
      strandCounts: { data_statistics: 1, number_sense: 0 },
      availableByStrand: avail([
        ["data_statistics", 1],
        ["number_sense", 5],
      ]),
      excludedStrands: new Set(),
    });
    expect(req!.reason).toBe("short-floor");
    expect(req!.strand).toBe("number_sense");
  });

  it("switches to phase-2 max-variance fill once every floor is met", () => {
    // Both strands met their floor of 2. geometry is peaked (low variance);
    // number_sense is uniform (high variance) → phase-2 picks number_sense.
    const state = stateWith(["geometry"], 4);
    const req = shortTestNextQuestionRequest({
      state,
      strandCounts: { number_sense: 2, geometry: 2 },
      availableByStrand: avail([
        ["number_sense", 5],
        ["geometry", 5],
      ]),
      excludedStrands: new Set(),
    });
    expect(req!.reason).toBe("short-adapt");
    expect(req!.strand).toBe("number_sense");
  });

  it("skips excluded strands and returns null when none remain", () => {
    const state = createEngineState();
    const availableByStrand = avail([["geometry", 3]]);
    const req = shortTestNextQuestionRequest({
      state,
      strandCounts: {},
      availableByStrand,
      excludedStrands: new Set<Strand>(["geometry"]),
    });
    expect(req).toBeNull();
  });
});

describe("shortTestShouldTerminate — coverage + count, no SE gate", () => {
  const fullScope = avail(
    STRANDS.map((s) => [s, 5] as [Strand, number]),
  );

  it("stops at the hard cap regardless of coverage", () => {
    const state = createEngineState();
    const term = shortTestShouldTerminate({
      state: { ...state, responseCount: SHORT_TEST_CONFIG.hardCap },
      strandCounts: {},
      availableByStrand: fullScope,
    });
    expect(term).toEqual({ done: true, reason: "max-questions-reached" });
  });

  it("bank-exhausts when no strand is in scope", () => {
    const state = { ...createEngineState(), responseCount: 3 };
    const term = shortTestShouldTerminate({
      state,
      strandCounts: {},
      availableByStrand: avail([]),
    });
    expect(term).toEqual({ done: true, reason: "bank-exhausted" });
  });

  it("does NOT stop before coverage is met even past the soft floor", () => {
    // 11 items but geometry never covered → keep going (coverage priority).
    const counts: Partial<Record<Strand, number>> = {};
    for (const s of STRANDS) counts[s] = 2;
    counts.geometry = 0;
    const term = shortTestShouldTerminate({
      state: { ...createEngineState(), responseCount: 11 },
      strandCounts: counts,
      availableByStrand: fullScope,
    });
    expect(term.done).toBe(false);
  });

  it("does NOT stop before the soft floor even with full coverage", () => {
    // 3 in-scope strands, all covered (2 each = 6 items) but below softFloor 10.
    const threeScope = avail([
      ["number_sense", 5],
      ["operations_algorithms", 5],
      ["geometry", 5],
    ]);
    const term = shortTestShouldTerminate({
      state: { ...createEngineState(), responseCount: 6 },
      strandCounts: { number_sense: 2, operations_algorithms: 2, geometry: 2 },
      availableByStrand: threeScope,
    });
    expect(term.done).toBe(false);
  });

  it("stops once coverage AND the soft floor are both met", () => {
    const counts: Partial<Record<Strand, number>> = {};
    for (const s of STRANDS) counts[s] = 2; // all 6 covered = 12 items
    const term = shortTestShouldTerminate({
      state: { ...createEngineState(), responseCount: 12 },
      strandCounts: counts,
      availableByStrand: fullScope,
    });
    expect(term).toEqual({ done: true, reason: "confidence-threshold-met" });
  });

  it("coverage counts a thin (1-item) strand as met at one item", () => {
    // 5 strands covered to 2 + a 1-item strand served once = 11 items ≥ soft
    // floor, all effective floors met → stop.
    const thin = avail([
      ["number_sense", 5],
      ["operations_algorithms", 5],
      ["fractions_decimals", 5],
      ["measurement", 5],
      ["geometry", 5],
      ["data_statistics", 1],
    ]);
    const counts: Partial<Record<Strand, number>> = {
      number_sense: 2,
      operations_algorithms: 2,
      fractions_decimals: 2,
      measurement: 2,
      geometry: 2,
      data_statistics: 1,
    };
    const term = shortTestShouldTerminate({
      state: { ...createEngineState(), responseCount: 11 },
      strandCounts: counts,
      availableByStrand: thin,
    });
    expect(term).toEqual({ done: true, reason: "confidence-threshold-met" });
  });

  it("config stays in the 10–15 range", () => {
    expect(SHORT_TEST_CONFIG.softFloor).toBe(10);
    expect(SHORT_TEST_CONFIG.hardCap).toBe(15);
    expect(SHORT_TEST_CONFIG.perStrandFloorN).toBe(2);
  });
});
