import { describe, expect, it } from "vitest";

import { uniformPosterior } from "./bayesian";
import { applyResponse, createEngineState } from "./engine";
import {
  COMPREHENSIVE_CONFIG,
  comprehensiveBudget,
  comprehensiveNextQuestionRequest,
  comprehensiveShouldTerminate,
  placementSe,
} from "./comprehensive";
import { LEVELS, STRANDS, levelTheta } from "./levels";
import type {
  EngineQuestion,
  EngineResponse,
  EngineState,
  Posteriors,
  Strand,
  StrandPosterior,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers — mirror engine.test.ts style.
// ---------------------------------------------------------------------------

function makeQuestion(opts: {
  id: string;
  strand: Strand;
  level: (typeof LEVELS)[number];
}): EngineQuestion {
  return {
    id: opts.id,
    strand: opts.strand,
    level: opts.level,
    difficulty: levelTheta(opts.level),
    format: "MULTIPLE_CHOICE",
  };
}

function answer(q: EngineQuestion, isCorrect: boolean): EngineResponse {
  return { questionId: q.id, strand: q.strand, isCorrect, takenSeconds: 30 };
}

/**
 * A posterior sharply peaked at `level` (low variance ⇒ SE well under the
 * threshold). Built directly (the prompt permits constructing StrandPosteriors
 * directly) so the peak is tight and deterministic: ~0.9 mass on the level,
 * ~0.05 on each neighbour, the rest spread thin. Variance ≈ 0.1 ⇒ SE ≈ 0.32.
 */
function peakedPosterior(level: (typeof LEVELS)[number]): StrandPosterior {
  const idx = LEVELS.indexOf(level);
  const p = {} as StrandPosterior;
  for (let i = 0; i < LEVELS.length; i++) {
    if (i === idx) p[LEVELS[i]] = 0.9;
    else if (Math.abs(i - idx) === 1) p[LEVELS[i]] = 0.045;
    else p[LEVELS[i]] = 0.0001;
  }
  // Normalise defensively.
  const total = LEVELS.reduce((s, l) => s + p[l], 0);
  for (const l of LEVELS) p[l] /= total;
  return p;
}

/** A state whose in-scope strands are all sharply peaked (placementSe low). */
function peakedState(
  inScope: readonly Strand[],
  level: (typeof LEVELS)[number],
  responseCount: number,
): EngineState {
  const peaked = peakedPosterior(level);
  const posteriors = STRANDS.reduce((acc, s) => {
    acc[s] = inScope.includes(s) ? { ...peaked } : uniformPosterior();
    return acc;
  }, {} as Posteriors);
  return { posteriors, responseCount, servedQuestionIds: [] };
}

// ---------------------------------------------------------------------------
// 1. Floor-then-adapt routing order
// ---------------------------------------------------------------------------

describe("comprehensiveNextQuestionRequest — floor then adapt", () => {
  const inScope = new Set<Strand>(STRANDS);

  it("routes to an under-floor strand (fewest-first) while any are under the floor", () => {
    const state = createEngineState();
    // number_sense has 1, operations_algorithms has 0, rest have 0. With a
    // floor of 2, the fewest-first rule should pick a 0-count strand, never
    // the 1-count number_sense.
    const strandCounts: Partial<Record<Strand, number>> = { number_sense: 1 };
    const req = comprehensiveNextQuestionRequest({
      state,
      strandCounts,
      inScopeStrands: inScope,
      excludedStrands: new Set(),
      perStrandFloorN: 2,
    });
    expect(req).not.toBeNull();
    expect(req!.reason).toBe("comprehensive-floor");
    expect(req!.strand).not.toBe("number_sense"); // a 0-count strand is fewer
  });

  it("flips to adapt (max-variance) once every in-scope strand meets the floor", () => {
    // All strands at the floor (count == 2). One strand still has high
    // variance (uniform); the rest are peaked (low variance). Phase 2 should
    // pick the high-variance one.
    const peaked = peakedPosterior("4A");
    const posteriors = STRANDS.reduce((acc, s) => {
      acc[s] = s === "geometry" ? uniformPosterior() : { ...peaked };
      return acc;
    }, {} as Posteriors);
    const state: EngineState = {
      posteriors,
      responseCount: 12,
      servedQuestionIds: [],
    };
    const strandCounts = STRANDS.reduce(
      (acc, s) => {
        acc[s] = 2;
        return acc;
      },
      {} as Partial<Record<Strand, number>>,
    );
    const req = comprehensiveNextQuestionRequest({
      state,
      strandCounts,
      inScopeStrands: inScope,
      excludedStrands: new Set(),
      perStrandFloorN: 2,
    });
    expect(req).not.toBeNull();
    expect(req!.reason).toBe("comprehensive-adapt");
    expect(req!.strand).toBe("geometry");
  });

  it("returns null when every in-scope strand is excluded", () => {
    const req = comprehensiveNextQuestionRequest({
      state: createEngineState(),
      strandCounts: {},
      inScopeStrands: inScope,
      excludedStrands: new Set<Strand>(STRANDS),
      perStrandFloorN: 2,
    });
    expect(req).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Both-conditions stopping
// ---------------------------------------------------------------------------

describe("comprehensiveShouldTerminate — floor AND se AND softFloor required", () => {
  const budget = COMPREHENSIVE_CONFIG.budgets.K_4; // softFloor 16, floor 2, hardCap 26
  const inScope: Strand[] = ["number_sense", "operations_algorithms"];
  const inScopeSet = new Set<Strand>(inScope);

  function counts(map: Partial<Record<Strand, number>>) {
    return map;
  }

  it("NOT done when SE is ok but a strand is under the floor", () => {
    const state = peakedState(inScope, "4A", 20); // SE low, responseCount past softFloor
    expect(placementSe(state, inScopeSet)).toBeLessThanOrEqual(
      COMPREHENSIVE_CONFIG.placementSeThreshold,
    );
    const term = comprehensiveShouldTerminate({
      state,
      strandCounts: counts({ number_sense: 5, operations_algorithms: 1 }), // 1 < floor 2
      inScopeStrands: inScopeSet,
      budget,
    });
    expect(term.done).toBe(false);
  });

  it("NOT done when the floor is met but SE is above threshold", () => {
    // Uniform posteriors ⇒ high SE.
    const state: EngineState = {
      posteriors: STRANDS.reduce((acc, s) => {
        acc[s] = uniformPosterior();
        return acc;
      }, {} as Posteriors),
      responseCount: 20,
      servedQuestionIds: [],
    };
    expect(placementSe(state, inScopeSet)).toBeGreaterThan(
      COMPREHENSIVE_CONFIG.placementSeThreshold,
    );
    const term = comprehensiveShouldTerminate({
      state,
      strandCounts: counts({ number_sense: 3, operations_algorithms: 3 }),
      inScopeStrands: inScopeSet,
      budget,
    });
    expect(term.done).toBe(false);
  });

  it("NOT done before the soft floor even when floor + SE both hold", () => {
    const state = peakedState(inScope, "4A", budget.softFloor - 1); // below softFloor
    expect(placementSe(state, inScopeSet)).toBeLessThanOrEqual(
      COMPREHENSIVE_CONFIG.placementSeThreshold,
    );
    const term = comprehensiveShouldTerminate({
      state,
      strandCounts: counts({ number_sense: 8, operations_algorithms: 8 }),
      inScopeStrands: inScopeSet,
      budget,
    });
    expect(term.done).toBe(false);
  });

  it("done='confidence-threshold-met' when responseCount>=softFloor AND floor met AND SE ok", () => {
    const state = peakedState(inScope, "4A", budget.softFloor);
    expect(placementSe(state, inScopeSet)).toBeLessThanOrEqual(
      COMPREHENSIVE_CONFIG.placementSeThreshold,
    );
    const term = comprehensiveShouldTerminate({
      state,
      strandCounts: counts({ number_sense: 8, operations_algorithms: 8 }),
      inScopeStrands: inScopeSet,
      budget,
    });
    expect(term).toEqual({ done: true, reason: "confidence-threshold-met" });
  });
});

// ---------------------------------------------------------------------------
// 3. Hard-cap termination
// ---------------------------------------------------------------------------

describe("comprehensiveShouldTerminate — hard cap", () => {
  const budget = COMPREHENSIVE_CONFIG.budgets.G5_8; // hardCap 36
  const inScopeSet = new Set<Strand>(STRANDS);

  it("done='max-questions-reached' at hardCap regardless of SE / floor", () => {
    // Uniform (SE high) and all strands under the floor — neither confidence
    // condition holds — yet the hard cap forces termination.
    const state: EngineState = {
      posteriors: STRANDS.reduce((acc, s) => {
        acc[s] = uniformPosterior();
        return acc;
      }, {} as Posteriors),
      responseCount: budget.hardCap,
      servedQuestionIds: [],
    };
    const term = comprehensiveShouldTerminate({
      state,
      strandCounts: {}, // all strands at 0 — well under the floor
      inScopeStrands: inScopeSet,
      budget,
    });
    expect(term).toEqual({ done: true, reason: "max-questions-reached" });
  });
});

// ---------------------------------------------------------------------------
// 4. Empty / out-of-scope strand skip
// ---------------------------------------------------------------------------

describe("comprehensive — out-of-scope strands are ignored", () => {
  const budget = COMPREHENSIVE_CONFIG.budgets.K_4;

  it("a strand not in inScopeStrands is never routed", () => {
    // Only number_sense is in scope; the (high-variance) uniform strands that
    // are out of scope must not be chosen.
    const inScope = new Set<Strand>(["number_sense"]);
    const state = createEngineState(); // all uniform ⇒ all tie on variance
    const req = comprehensiveNextQuestionRequest({
      state,
      strandCounts: {},
      inScopeStrands: inScope,
      excludedStrands: new Set(),
      perStrandFloorN: budget.perStrandFloorN,
    });
    expect(req).not.toBeNull();
    expect(req!.strand).toBe("number_sense");
  });

  it("an out-of-scope strand is not required for floorMet — session can terminate", () => {
    // Only number_sense + operations_algorithms in scope (e.g. the other 4
    // strands have empty banks). Both meet the floor, SE ok, past softFloor —
    // terminates even though the other 4 strands have zero coverage.
    const inScope: Strand[] = ["number_sense", "operations_algorithms"];
    const inScopeSet = new Set<Strand>(inScope);
    const state = peakedState(inScope, "2B", budget.softFloor);
    const term = comprehensiveShouldTerminate({
      state,
      strandCounts: { number_sense: 4, operations_algorithms: 4 },
      inScopeStrands: inScopeSet,
      budget,
    });
    expect(term).toEqual({ done: true, reason: "confidence-threshold-met" });
  });

  it("done='bank-exhausted' when the in-scope set is empty", () => {
    const term = comprehensiveShouldTerminate({
      state: createEngineState(),
      strandCounts: {},
      inScopeStrands: new Set<Strand>(),
      budget,
    });
    expect(term).toEqual({ done: true, reason: "bank-exhausted" });
  });
});

// ---------------------------------------------------------------------------
// 5. Per-tier budgets
// ---------------------------------------------------------------------------

describe("comprehensiveBudget — per-tier numbers", () => {
  it("returns the G5_8 budget", () => {
    expect(comprehensiveBudget("G5_8")).toEqual({
      target: 30,
      softFloor: 24,
      hardCap: 36,
      perStrandFloorN: 3,
    });
  });

  it("returns the K_4 budget", () => {
    expect(comprehensiveBudget("K_4")).toEqual({
      target: 20,
      softFloor: 16,
      hardCap: 26,
      perStrandFloorN: 2,
    });
  });
});

// ---------------------------------------------------------------------------
// placementSe sanity
// ---------------------------------------------------------------------------

describe("placementSe", () => {
  it("is 0 for an empty in-scope set", () => {
    expect(placementSe(createEngineState(), new Set<Strand>())).toBe(0);
  });

  it("is lower for a peaked posterior than for a uniform one", () => {
    const inScope = new Set<Strand>(["number_sense"]);
    const uniformState = createEngineState();
    const peaked = peakedState(["number_sense"], "4A", 8);
    expect(placementSe(peaked, inScope)).toBeLessThan(
      placementSe(uniformState, inScope),
    );
  });

  it("drops as evidence accumulates through the engine's own update path", () => {
    // Build a number_sense posterior through applyResponse, mirroring how the
    // real engine accumulates evidence: consistently correct on easy items and
    // wrong on hard items brackets ability and collapses variance. SE after
    // strong evidence is well below the SE on a fresh (uniform) state.
    let s = createEngineState();
    const seStart = placementSe(s, new Set<Strand>(["number_sense"]));
    for (let i = 0; i < 10; i++) {
      const easy = makeQuestion({ id: `e${i}`, strand: "number_sense", level: "2A" });
      s = applyResponse(s, easy, answer(easy, true));
      const hard = makeQuestion({ id: `h${i}`, strand: "number_sense", level: "4B" });
      s = applyResponse(s, hard, answer(hard, false));
    }
    const seEnd = placementSe(s, new Set<Strand>(["number_sense"]));
    expect(seEnd).toBeLessThan(seStart);
  });
});
