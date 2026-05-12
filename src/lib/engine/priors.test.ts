// Atlas Assessment — priors module unit tests (Item #10 Phase 2).
//
// Locks the design points / Q-decisions from the Item #10 plan:
//   * Q5 (zod validation): module loads (the test file's import statement
//     IS the load test); ACTIVE_PRIOR_VERSION matches the JSON literal.
//   * Q6 (engine coupling): covered by engine.test.ts (next unit), not here.
//   * R3 + Q4 (silent fall-back): null/undefined/unknown grade → uniform.
//   * design point a (registry throw): getPriorConfigByVersion contract.
//   * design point d (truncation desired): edge-grade peak at GA-GB,
//     monotonic decrease, near-zero mass at far end.
//   * R2 (algorithmic placeholder): cross-strand uniformity within a
//     grade — locked here as documentation of v1; v2 will violate it
//     when strand divergence lands.

import { describe, expect, it } from "vitest";

import { uniformPosterior } from "./bayesian";
import { LEVELS, STRANDS } from "./levels";
import {
  ACTIVE_PRIOR_VERSION,
  GRADES,
  PRIORS_V1,
  getPriorConfigByVersion,
  seedPosteriors,
} from "./priors";
import type {
  GradeKey,
  HalfGradeLevel,
  Posteriors,
  StrandPosterior,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers + epsilons
// ---------------------------------------------------------------------------

const FLOAT_EPS = 1e-9;
const NEAR_ZERO_MASS = 1e-6;
const MONOTONIC_EPS = 1e-9;

function findArgmaxLevel(p: StrandPosterior): HalfGradeLevel {
  let best: HalfGradeLevel = LEVELS[0];
  let bestMass = -Infinity;
  for (const level of LEVELS) {
    if (p[level] > bestMass) {
      bestMass = p[level];
      best = level;
    }
  }
  return best;
}

function expectMonotonicDecreaseFromPeak(
  p: StrandPosterior,
  peak: HalfGradeLevel,
): void {
  const peakIdx = LEVELS.indexOf(peak);
  // Walk left from peak — each step's mass must be <= the previous step's.
  for (let i = peakIdx - 1; i >= 0; i--) {
    expect(p[LEVELS[i]]).toBeLessThanOrEqual(p[LEVELS[i + 1]] + MONOTONIC_EPS);
  }
  // Walk right from peak.
  for (let i = peakIdx + 1; i < LEVELS.length; i++) {
    expect(p[LEVELS[i]]).toBeLessThanOrEqual(p[LEVELS[i - 1]] + MONOTONIC_EPS);
  }
}

function expectAllStrandsUniform(p: Posteriors): void {
  const reference = uniformPosterior();
  for (const strand of STRANDS) {
    for (const level of LEVELS) {
      expect(p[strand][level]).toBe(reference[level]);
    }
  }
}

// ---------------------------------------------------------------------------
// 1. priors-v1.json + module-load (Q5 lock)
// ---------------------------------------------------------------------------
//
// The import of priors.ts at the top of this file IS the module-load test.
// If priors-v1.json fails zod validation, the file fails to load and every
// test in it fails. The two assertions below lock the version-stamp
// invariants only.

describe("priors-v1.json + module-load (Q5 lock)", () => {
  it("ACTIVE_PRIOR_VERSION equals 'v1'", () => {
    expect(ACTIVE_PRIOR_VERSION).toBe("v1");
  });

  it("ACTIVE_PRIOR_VERSION matches PRIORS_V1.version", () => {
    expect(PRIORS_V1.version).toBe(ACTIVE_PRIOR_VERSION);
  });
});

// ---------------------------------------------------------------------------
// 2. PRIORS_V1 structural completeness
// ---------------------------------------------------------------------------

describe("PRIORS_V1 structural completeness", () => {
  it("covers all 9 grades, all 6 strands per grade, all 18 levels per strand", () => {
    for (const grade of GRADES) {
      const gradeBlock = PRIORS_V1.byGrade[grade];
      expect(gradeBlock).toBeDefined();
      for (const strand of STRANDS) {
        const posterior = gradeBlock[strand];
        expect(posterior).toBeDefined();
        for (const level of LEVELS) {
          expect(posterior[level]).toBeTypeOf("number");
        }
      }
    }
  });

  it("every (grade, strand) posterior sums to 1.0 within float tolerance", () => {
    for (const grade of GRADES) {
      for (const strand of STRANDS) {
        const posterior = PRIORS_V1.byGrade[grade][strand];
        const sum = LEVELS.reduce((acc, l) => acc + posterior[l], 0);
        expect(Math.abs(sum - 1)).toBeLessThan(FLOAT_EPS);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Discrete-Gaussian shape: edge grades (design point d)
// ---------------------------------------------------------------------------

describe("Discrete-Gaussian shape: edge grades (truncation locked)", () => {
  it("grade K: peak at KA-KB, monotonic decrease, near-zero mass at 8B", () => {
    for (const strand of STRANDS) {
      const posterior = PRIORS_V1.byGrade["K"][strand];
      const peak = findArgmaxLevel(posterior);
      expect(["KA", "KB"]).toContain(peak);
      expectMonotonicDecreaseFromPeak(posterior, peak);
      expect(posterior["8B"]).toBeLessThan(NEAR_ZERO_MASS);
    }
  });

  it("grade 8: peak at 8A-8B, monotonic decrease, near-zero mass at KA", () => {
    for (const strand of STRANDS) {
      const posterior = PRIORS_V1.byGrade["8"][strand];
      const peak = findArgmaxLevel(posterior);
      expect(["8A", "8B"]).toContain(peak);
      expectMonotonicDecreaseFromPeak(posterior, peak);
      expect(posterior["KA"]).toBeLessThan(NEAR_ZERO_MASS);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Discrete-Gaussian shape: mid grades (algorithmic sanity)
// ---------------------------------------------------------------------------

describe("Discrete-Gaussian shape: mid grades (algorithmic sanity)", () => {
  it("grade 3 peaks at 3A-3B; grade 5 peaks at 5A-5B", () => {
    for (const strand of STRANDS) {
      const grade3Peak = findArgmaxLevel(PRIORS_V1.byGrade["3"][strand]);
      expect(["3A", "3B"]).toContain(grade3Peak);

      const grade5Peak = findArgmaxLevel(PRIORS_V1.byGrade["5"][strand]);
      expect(["5A", "5B"]).toContain(grade5Peak);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Cross-strand uniformity within a grade (v1 only)
// ---------------------------------------------------------------------------
//
// v1's algorithmic-gaussian-discrete generator does not branch on strand,
// so all 6 strands within a single grade produce identical posteriors.
// Locked HERE for v1; v2 will explicitly violate this when strand-specific
// priors land (cf. roadmap/v2-progress-tracking.md feature 16).

describe("Cross-strand uniformity within a grade (v1 placeholder, NOT a v2 invariant)", () => {
  it("all 6 strands within a single grade produce identical posteriors", () => {
    for (const grade of GRADES) {
      const gradeBlock = PRIORS_V1.byGrade[grade];
      const reference = gradeBlock[STRANDS[0]];
      for (const strand of STRANDS) {
        for (const level of LEVELS) {
          expect(gradeBlock[strand][level]).toBe(reference[level]);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 6. getPriorConfigByVersion (design point a — throw on unknown)
// ---------------------------------------------------------------------------

describe("getPriorConfigByVersion (throw on unknown)", () => {
  it("returns PRIORS_V1 for version 'v1'", () => {
    expect(getPriorConfigByVersion("v1")).toBe(PRIORS_V1);
  });

  it("throws on unknown version with descriptive message naming version + known set", () => {
    expect(() => getPriorConfigByVersion("v99")).toThrow(/v99/);
    expect(() => getPriorConfigByVersion("v99")).toThrow(/known versions/);
    expect(() => getPriorConfigByVersion("")).toThrow(/known versions/);
  });
});

// ---------------------------------------------------------------------------
// 7. seedPosteriors fall-back paths (R3 + Q4 locks)
// ---------------------------------------------------------------------------

describe("seedPosteriors fall-back paths", () => {
  it("null grade returns uniform across all 6 strands", () => {
    expectAllStrandsUniform(seedPosteriors(null));
  });

  it("undefined grade returns uniform across all 6 strands", () => {
    expectAllStrandsUniform(seedPosteriors(undefined));
  });

  it("unknown grade string (cast via 'as GradeKey') returns uniform", () => {
    const unknownGrade = "99" as GradeKey;
    expectAllStrandsUniform(seedPosteriors(unknownGrade));
  });
});

// ---------------------------------------------------------------------------
// 8. seedPosteriors known-grade path
// ---------------------------------------------------------------------------

describe("seedPosteriors known-grade path", () => {
  it("returns the config's posteriors for a valid grade", () => {
    const result = seedPosteriors("3");
    for (const strand of STRANDS) {
      for (const level of LEVELS) {
        expect(result[strand][level]).toBe(
          PRIORS_V1.byGrade["3"][strand][level],
        );
      }
    }
  });

  it("returned posteriors are independent copies — mutation does not affect config", () => {
    const result = seedPosteriors("2");
    const beforeMutation = PRIORS_V1.byGrade["2"]["number_sense"]["KA"];

    // Mutate the returned object aggressively.
    result["number_sense"]["KA"] = -999;

    // Config registry must be unchanged.
    expect(PRIORS_V1.byGrade["2"]["number_sense"]["KA"]).toBe(beforeMutation);

    // A subsequent call returns a fresh copy with original values.
    const result2 = seedPosteriors("2");
    expect(result2["number_sense"]["KA"]).toBe(beforeMutation);
  });

  it("config parameter defaults to PRIORS_V1 when omitted", () => {
    const explicit = seedPosteriors("4", PRIORS_V1);
    const defaulted = seedPosteriors("4");
    for (const strand of STRANDS) {
      for (const level of LEVELS) {
        expect(defaulted[strand][level]).toBe(explicit[strand][level]);
      }
    }
  });
});
