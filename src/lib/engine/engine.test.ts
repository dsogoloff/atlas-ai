import { describe, expect, it } from "vitest";

import {
  confidenceWithin,
  meanLevelIndex,
  modeLevel,
  probCorrect,
  sigmoid,
  uniformPosterior,
  updateStrandPosterior,
} from "./bayesian";
import {
  MAX_QUESTIONS,
  applyResponse,
  createEngineState,
  nextQuestionRequest,
  placementEstimate,
  shouldTerminate,
} from "./engine";
import { LEVELS, STRANDS, levelAt, levelIndex, levelTheta } from "./levels";
import type { EngineQuestion, EngineResponse, Strand } from "./types";

// ---------------------------------------------------------------------------
// Math primitives
// ---------------------------------------------------------------------------

describe("sigmoid", () => {
  it("is 0.5 at zero", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5);
  });
  it("approaches 1 for large positive z and 0 for large negative z", () => {
    expect(sigmoid(20)).toBeGreaterThan(0.9999);
    expect(sigmoid(-20)).toBeLessThan(0.0001);
  });
  it("is symmetric around zero", () => {
    expect(sigmoid(2) + sigmoid(-2)).toBeCloseTo(1);
  });
});

describe("levelTheta", () => {
  it("spans -3 to +3 monotonically", () => {
    expect(levelTheta("KA")).toBeCloseTo(-3);
    expect(levelTheta("8B")).toBeCloseTo(3);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(levelTheta(LEVELS[i])).toBeGreaterThan(levelTheta(LEVELS[i - 1]));
    }
  });
});

describe("levelAt / levelIndex round-trip", () => {
  it("preserves level for integer indices", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      expect(levelIndex(levelAt(i))).toBe(i);
    }
  });
  it("clamps out-of-range indices", () => {
    expect(levelAt(-5)).toBe("KA");
    expect(levelAt(99)).toBe("8B");
  });
});

// ---------------------------------------------------------------------------
// Posterior shape
// ---------------------------------------------------------------------------

describe("uniformPosterior", () => {
  it("sums to 1 across all 18 levels", () => {
    const p = uniformPosterior();
    const total = LEVELS.reduce((s, l) => s + p[l], 0);
    expect(total).toBeCloseTo(1);
    expect(p.KA).toBeCloseTo(p["8B"]);
  });
});

describe("probCorrect", () => {
  it("is high at high level / low difficulty", () => {
    expect(probCorrect("8B", -2)).toBeGreaterThan(0.99);
  });
  it("is low at low level / high difficulty", () => {
    expect(probCorrect("KA", 2)).toBeLessThan(0.01);
  });
  it("is 0.5 when level θ matches difficulty", () => {
    expect(probCorrect("3A", levelTheta("3A"))).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// Bayesian update
// ---------------------------------------------------------------------------

describe("updateStrandPosterior", () => {
  it("renormalises to sum 1", () => {
    const after = updateStrandPosterior(uniformPosterior(), 0, true);
    const total = LEVELS.reduce((s, l) => s + after[l], 0);
    expect(total).toBeCloseTo(1);
  });

  it("shifts posterior up after a correct answer to a hard item", () => {
    const before = uniformPosterior();
    const after = updateStrandPosterior(before, 2.0, true); // hard (≈ 7B)
    expect(meanLevelIndex(after)).toBeGreaterThan(meanLevelIndex(before));
  });

  it("shifts posterior down after a wrong answer to an easy item", () => {
    const before = uniformPosterior();
    const after = updateStrandPosterior(before, -2.0, false); // easy (≈ KB)
    expect(meanLevelIndex(after)).toBeLessThan(meanLevelIndex(before));
  });

  it("does not mutate the input prior", () => {
    const before = uniformPosterior();
    const beforeCopy = { ...before };
    updateStrandPosterior(before, 0, true);
    expect(before).toEqual(beforeCopy);
  });
});

// ---------------------------------------------------------------------------
// Summary statistics
// ---------------------------------------------------------------------------

describe("modeLevel and confidenceWithin", () => {
  it("uniform prior has low confidence within ±1", () => {
    const c = confidenceWithin(uniformPosterior(), 1);
    // Uniform → modeLevel returns the first level (KA, idx 0). Band is
    // levels 0..1, i.e., 2 of 18 = 1/9.
    expect(c).toBeCloseTo(2 / 18);
  });

  it("a sharply peaked posterior has high confidence within ±1", () => {
    let p = uniformPosterior();
    // Many correct answers at exactly level-3A difficulty drive the mass to ~3A.
    for (let i = 0; i < 8; i++) p = updateStrandPosterior(p, levelTheta("3A"), true);
    for (let i = 0; i < 8; i++) p = updateStrandPosterior(p, levelTheta("3A"), false);
    expect(confidenceWithin(p, 1)).toBeGreaterThan(0.5);
    // Mode should be near 3A (mix of correct + wrong at that difficulty
    // collapses there).
    const m = modeLevel(p);
    expect(Math.abs(LEVELS.indexOf(m) - LEVELS.indexOf("3A"))).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function makeQuestion(opts: {
  id: string;
  strand: Strand;
  level: keyof typeof LEVELS extends never ? never : (typeof LEVELS)[number];
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

describe("createEngineState", () => {
  it("starts with a uniform posterior on every strand and zero responses", () => {
    const s = createEngineState();
    expect(s.responseCount).toBe(0);
    expect(s.servedQuestionIds).toEqual([]);
    for (const strand of STRANDS) {
      const p = s.posteriors[strand];
      expect(p.KA).toBeCloseTo(p["8B"]);
    }
  });
});

describe("applyResponse", () => {
  it("only updates the strand of the question", () => {
    const s0 = createEngineState();
    const q = makeQuestion({ id: "q1", strand: "OPERATIONS", level: "2B" });
    const s1 = applyResponse(s0, q, answer(q, true));

    expect(s1.responseCount).toBe(1);
    expect(s1.servedQuestionIds).toEqual(["q1"]);

    // OPERATIONS posterior changed; others did not.
    expect(meanLevelIndex(s1.posteriors.OPERATIONS)).toBeGreaterThan(
      meanLevelIndex(s0.posteriors.OPERATIONS),
    );
    expect(s1.posteriors.NUMBER_SENSE).toEqual(s0.posteriors.NUMBER_SENSE);
  });

  it("rejects mismatched question and response", () => {
    const s0 = createEngineState();
    const q = makeQuestion({ id: "q1", strand: "OPERATIONS", level: "2B" });
    expect(() =>
      applyResponse(s0, q, { ...answer(q, true), questionId: "other" }),
    ).toThrow();
    expect(() =>
      applyResponse(s0, q, { ...answer(q, true), strand: "GEOMETRY" }),
    ).toThrow();
  });

  it("does not duplicate a re-applied question id in servedQuestionIds", () => {
    const s0 = createEngineState();
    const q = makeQuestion({ id: "q1", strand: "OPERATIONS", level: "2B" });
    const s1 = applyResponse(s0, q, answer(q, true));
    const s2 = applyResponse(s1, q, answer(q, true));
    expect(s2.servedQuestionIds).toEqual(["q1"]);
    expect(s2.responseCount).toBe(2);
  });
});

describe("nextQuestionRequest", () => {
  it("on a fresh state, all strand variances tie — picks the first", () => {
    const req = nextQuestionRequest(createEngineState());
    expect(req.strand).toBe(STRANDS[0]);
    expect(req.reason).toBe("max-variance-strand");
    // Mean of uniform is the middle index = 8.5 → level 4B (idx 9).
    // Either side of the midpoint is acceptable.
    expect(Math.abs(req.targetDifficulty)).toBeLessThan(0.5);
  });

  it("after concentrating one strand, picks a different (less-resolved) one", () => {
    let s = createEngineState();
    const q = makeQuestion({ id: "q1", strand: "OPERATIONS", level: "2B" });
    // Many alternating responses near 2B drive OPERATIONS to low variance.
    for (let i = 0; i < 12; i++) {
      s = applyResponse(s, { ...q, id: `q${i}` }, answer({ ...q, id: `q${i}` }, i % 2 === 0));
    }
    const req = nextQuestionRequest(s);
    expect(req.strand).not.toBe("OPERATIONS");
  });
});

describe("shouldTerminate", () => {
  it("returns in-progress on a fresh state", () => {
    expect(shouldTerminate(createEngineState())).toEqual({
      done: false,
      reason: "in-progress",
    });
  });

  it("terminates at the max-questions cap", () => {
    let s = createEngineState();
    for (let i = 0; i < MAX_QUESTIONS; i++) {
      const q = makeQuestion({ id: `q${i}`, strand: "OPERATIONS", level: "2B" });
      s = applyResponse(s, q, answer(q, true));
    }
    expect(shouldTerminate(s).done).toBe(true);
    expect(shouldTerminate(s).reason).toBe("max-questions-reached");
  });
});

// ---------------------------------------------------------------------------
// End-to-end simulation
// ---------------------------------------------------------------------------

describe("integration — simulated child at level 3A", () => {
  it("converges to a placement near 3A across all strands within MAX_QUESTIONS", () => {
    // Deterministic PRNG so the child's stochastic-but-reproducible
    // responses don't make this test flaky. Mulberry32.
    function prng(seed: number) {
      return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = prng(0xa71a5);

    let s = createEngineState();
    let i = 0;

    while (!shouldTerminate(s).done && i < MAX_QUESTIONS) {
      const req = nextQuestionRequest(s);
      const q: EngineQuestion = {
        id: `sim-q${i}`,
        strand: req.strand,
        level: levelAt((req.targetDifficulty + 3) * ((LEVELS.length - 1) / 6)),
        difficulty: req.targetDifficulty,
        format: "MULTIPLE_CHOICE",
      };

      // Realistic child: probability of correct = sigmoid(θ_true − b).
      const trueTheta = levelTheta("3A");
      const isCorrect = rand() < sigmoid(trueTheta - q.difficulty);

      s = applyResponse(s, q, answer(q, isCorrect));
      i++;
    }

    const est = placementEstimate(s);
    const trueIdx = LEVELS.indexOf("3A");
    const overallIdx = LEVELS.indexOf(est.overallLevel);

    // With 25 questions split across 6 strands (~4 per strand), full
    // 90%-within-±1 confidence per strand is unlikely. The spec allows
    // termination at the cap. What we assert is convergence quality:
    // overall mode lands within ±2 of the true level, and the engine
    // either hit confidence or hit the cap (no third option).
    expect(Math.abs(overallIdx - trueIdx)).toBeLessThanOrEqual(2);
    expect(["confidence-threshold-met", "max-questions-reached"]).toContain(
      shouldTerminate(s).reason,
    );
    // Confidence is at least better than the uniform-prior baseline of
    // ~0.17 — the engine actually learned something.
    expect(est.confidence).toBeGreaterThan(0.17);
  });
});
