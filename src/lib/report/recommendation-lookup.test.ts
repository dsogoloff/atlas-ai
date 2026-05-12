// Unit tests for pickNearestRecommendation. Pure function — no DB, no
// React. Pins the Phase 7.6 fallback policy:
//   * exact-level match wins
//   * otherwise nearest level in the same strand
//   * higher-level wins on equal distance (aspirational tiebreak)
//   * zero rows for the strand → null

import { describe, expect, it } from "vitest";

import type { HalfGradeLevel, Strand } from "@/lib/engine/types";

import {
  pickNearestRecommendation,
  type RecommendationCandidate,
} from "./recommendation-lookup";

function mk(
  strand: Strand,
  level: HalfGradeLevel,
  label = `${strand}@${level}`,
): RecommendationCandidate {
  return {
    strand,
    level,
    primary_recommendation: label,
    supplementary: [],
    notes: null,
  };
}

describe("pickNearestRecommendation", () => {
  describe("zero candidates for strand", () => {
    it("returns null when candidates is empty", () => {
      expect(
        pickNearestRecommendation("number_sense", "2B", []),
      ).toBeNull();
    });

    it("returns null when no candidate matches the strand", () => {
      const candidates = [mk("geometry", "2B"), mk("measurement", "3A")];
      expect(
        pickNearestRecommendation("number_sense", "2B", candidates),
      ).toBeNull();
    });
  });

  describe("exact match", () => {
    it("returns the exact (strand, level) row when available", () => {
      const candidates = [
        mk("number_sense", "2A"),
        mk("number_sense", "2B"),
        mk("number_sense", "3A"),
      ];
      const picked = pickNearestRecommendation(
        "number_sense",
        "2B",
        candidates,
      );
      expect(picked?.level).toBe("2B");
    });
  });

  describe("nearest-level fallback", () => {
    it("falls back to the closest level when exact match is missing", () => {
      // Target 3A; candidates at 2B (distance 1) and 4B (distance 3).
      const candidates = [
        mk("number_sense", "2B"),
        mk("number_sense", "4B"),
      ];
      const picked = pickNearestRecommendation(
        "number_sense",
        "3A",
        candidates,
      );
      expect(picked?.level).toBe("2B");
    });

    it("picks the only available row even at long distance", () => {
      // Single row at KA, target at 8B — should still return KA.
      const candidates = [mk("data_statistics", "KA")];
      const picked = pickNearestRecommendation(
        "data_statistics",
        "8B",
        candidates,
      );
      expect(picked?.level).toBe("KA");
    });

    it("ignores rows from other strands when finding nearest", () => {
      // Target = number_sense at 3A. number_sense has 2B (distance 1).
      // Another strand has an exact match at 3A — must be ignored.
      const candidates = [
        mk("operations_algorithms", "3A"),
        mk("number_sense", "2B"),
      ];
      const picked = pickNearestRecommendation(
        "number_sense",
        "3A",
        candidates,
      );
      expect(picked?.strand).toBe("number_sense");
      expect(picked?.level).toBe("2B");
    });
  });

  describe("equal-distance tiebreak: prefer higher level", () => {
    it("prefers higher level when target is exactly between two candidates", () => {
      // Target 2B (idx 5). 2A (idx 4, distance 1) and 3A (idx 6,
      // distance 1) are equidistant. 3A should win.
      const candidates = [mk("number_sense", "2A"), mk("number_sense", "3A")];
      const picked = pickNearestRecommendation(
        "number_sense",
        "2B",
        candidates,
      );
      expect(picked?.level).toBe("3A");
    });

    it("prefers higher level on equal distance even with three candidates around target", () => {
      // Target 4A (idx 8). 3B (idx 7) and 4B (idx 9) equidistant. 6A
      // far away. 4B wins on tiebreak.
      const candidates = [
        mk("geometry", "3B"),
        mk("geometry", "4B"),
        mk("geometry", "6A"),
      ];
      const picked = pickNearestRecommendation(
        "geometry",
        "4A",
        candidates,
      );
      expect(picked?.level).toBe("4B");
    });

    it("documented Phase 7.6 tiebreak: ascends, not descends", () => {
      // Sanity: ensure we did not accidentally invert the tiebreak.
      // Target KB. Candidates KA (distance 1) and 1A (distance 1).
      // Higher = 1A.
      const candidates = [mk("measurement", "KA"), mk("measurement", "1A")];
      const picked = pickNearestRecommendation(
        "measurement",
        "KB",
        candidates,
      );
      expect(picked?.level).toBe("1A");
    });
  });

  describe("Phase 7.6 seeded-bank scenario", () => {
    it("returns the single 2B row when the placement is at any other level", () => {
      // Mirrors the seed.sql state — one row per strand at 2B. The
      // engine assigns varying levels per child; every placement
      // should now produce a non-null pick.
      const seedRow = mk("number_sense", "2B", "Pack 2B");

      // Placement 3B → returns 2B (only option).
      expect(
        pickNearestRecommendation("number_sense", "3B", [seedRow])?.level,
      ).toBe("2B");

      // Placement 1A → returns 2B.
      expect(
        pickNearestRecommendation("number_sense", "1A", [seedRow])?.level,
      ).toBe("2B");

      // Placement 2B (exact) → returns 2B.
      expect(
        pickNearestRecommendation("number_sense", "2B", [seedRow])?.level,
      ).toBe("2B");
    });
  });
});
