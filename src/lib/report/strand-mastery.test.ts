// Unit tests for computeStrandMastery. Pure function — no React, no DB.
//
// Coverage:
//   * Shape contract — always 6 rows in canonical STRAND_ORDER.
//   * Aggregation — correct/total counts, cross-strand isolation,
//     percentage rounding.
//   * Band derivation — boundary tests at 75 (mastery edge) and 50
//     (progressing edge), exact + just-below pairs to catch off-by-one.
//   * no_data discrimination — fires only when total === 0, not when
//     percentage rounds to 0 with at least one response.
//   * Ordering stability — independent of input order.
//
// Fixture helper: `mk(strand, isCorrect, count)` builds repeated
// responses inline. Avoids per-test array literal noise.

import { describe, expect, it } from "vitest";

import type { Strand } from "@/lib/engine/types";

import {
  computeStrandMastery,
  type ScoredResponse,
} from "./strand-mastery";

// =============================================================================
// Fixtures
// =============================================================================

const mk = (
  strand: Strand,
  isCorrect: boolean,
  count = 1,
): ScoredResponse[] =>
  Array.from({ length: count }, () => ({ strand, isCorrect }));

// All 6 strands in canonical STRAND_ORDER. Tests that need to assert
// ordering compare against this constant.
const ORDER: readonly Strand[] = [
  "NUMBER_SENSE",
  "OPERATIONS",
  "WORD_PROBLEMS",
  "FRACTIONS_DECIMALS",
  "GEOMETRY",
  "MEASUREMENT_DATA",
] as const;

// =============================================================================
// Tests
// =============================================================================

describe("computeStrandMastery", () => {
  describe("shape contract", () => {
    it("returns exactly 6 rows for empty input", () => {
      const result = computeStrandMastery([]);
      expect(result).toHaveLength(6);
    });

    it("returns rows in canonical STRAND_ORDER", () => {
      const result = computeStrandMastery([]);
      expect(result.map((r) => r.strand)).toEqual(ORDER);
    });

    it("returns 6 rows with single-strand input (others get no_data)", () => {
      const result = computeStrandMastery(mk("OPERATIONS", true, 4));
      expect(result).toHaveLength(6);

      const ops = result.find((r) => r.strand === "OPERATIONS")!;
      expect(ops.band).toBe("mastery");

      const others = result.filter((r) => r.strand !== "OPERATIONS");
      expect(others).toHaveLength(5);
      for (const r of others) {
        expect(r.band).toBe("no_data");
        expect(r.total).toBe(0);
      }
    });
  });

  describe("aggregation", () => {
    it("counts correct/total per strand across multiple responses", () => {
      const result = computeStrandMastery([
        ...mk("NUMBER_SENSE", true, 3),
        ...mk("NUMBER_SENSE", false, 1),
      ]);
      const ns = result.find((r) => r.strand === "NUMBER_SENSE")!;
      expect(ns.correct).toBe(3);
      expect(ns.total).toBe(4);
      expect(ns.percentage).toBe(75);
    });

    it("sums responses across strands without cross-contamination", () => {
      const result = computeStrandMastery([
        ...mk("NUMBER_SENSE", true, 2),
        ...mk("OPERATIONS", false, 2),
        ...mk("GEOMETRY", true, 1),
        ...mk("GEOMETRY", false, 1),
      ]);
      const ns = result.find((r) => r.strand === "NUMBER_SENSE")!;
      const ops = result.find((r) => r.strand === "OPERATIONS")!;
      const geo = result.find((r) => r.strand === "GEOMETRY")!;

      expect(ns).toMatchObject({ correct: 2, total: 2, percentage: 100 });
      expect(ops).toMatchObject({ correct: 0, total: 2, percentage: 0 });
      expect(geo).toMatchObject({ correct: 1, total: 2, percentage: 50 });
    });

    it("rounds percentage to nearest integer (2/3 → 67)", () => {
      const result = computeStrandMastery([
        ...mk("WORD_PROBLEMS", true, 2),
        ...mk("WORD_PROBLEMS", false, 1),
      ]);
      const wp = result.find((r) => r.strand === "WORD_PROBLEMS")!;
      expect(wp.percentage).toBe(67);
    });
  });

  describe("band derivation", () => {
    it("returns mastery at exactly 75%", () => {
      // 3/4 = 75
      const result = computeStrandMastery([
        ...mk("NUMBER_SENSE", true, 3),
        ...mk("NUMBER_SENSE", false, 1),
      ]);
      const ns = result.find((r) => r.strand === "NUMBER_SENSE")!;
      expect(ns.percentage).toBe(75);
      expect(ns.band).toBe("mastery");
    });

    it("returns progressing at 74%", () => {
      // 37/50 = 74
      const result = computeStrandMastery([
        ...mk("NUMBER_SENSE", true, 37),
        ...mk("NUMBER_SENSE", false, 13),
      ]);
      const ns = result.find((r) => r.strand === "NUMBER_SENSE")!;
      expect(ns.percentage).toBe(74);
      expect(ns.band).toBe("progressing");
    });

    it("returns progressing at exactly 50%", () => {
      // 1/2 = 50
      const result = computeStrandMastery([
        ...mk("OPERATIONS", true, 1),
        ...mk("OPERATIONS", false, 1),
      ]);
      const ops = result.find((r) => r.strand === "OPERATIONS")!;
      expect(ops.percentage).toBe(50);
      expect(ops.band).toBe("progressing");
    });

    it("returns area_of_focus at 49%", () => {
      // 24/49 = 48.98 → rounds to 49
      const result = computeStrandMastery([
        ...mk("GEOMETRY", true, 24),
        ...mk("GEOMETRY", false, 25),
      ]);
      const geo = result.find((r) => r.strand === "GEOMETRY")!;
      expect(geo.percentage).toBe(49);
      expect(geo.band).toBe("area_of_focus");
    });

    it("returns area_of_focus at 0% with total > 0", () => {
      // 0/3 = 0; total > 0 distinguishes from no_data.
      const result = computeStrandMastery(mk("FRACTIONS_DECIMALS", false, 3));
      const fd = result.find((r) => r.strand === "FRACTIONS_DECIMALS")!;
      expect(fd.percentage).toBe(0);
      expect(fd.total).toBe(3);
      expect(fd.band).toBe("area_of_focus");
    });

    it("returns no_data at total === 0 (not area_of_focus)", () => {
      // Empty input; every strand has total === 0 → no_data, not
      // area_of_focus, even though percentage is also 0.
      const result = computeStrandMastery([]);
      for (const r of result) {
        expect(r.total).toBe(0);
        expect(r.percentage).toBe(0);
        expect(r.band).toBe("no_data");
      }
    });
  });

  describe("ordering", () => {
    it("first row is NUMBER_SENSE, last is MEASUREMENT_DATA", () => {
      const result = computeStrandMastery([]);
      expect(result[0]!.strand).toBe("NUMBER_SENSE");
      expect(result[5]!.strand).toBe("MEASUREMENT_DATA");
    });

    it("ordering is stable across calls regardless of input order", () => {
      const inputA: ScoredResponse[] = [
        ...mk("MEASUREMENT_DATA", true, 1),
        ...mk("NUMBER_SENSE", false, 1),
        ...mk("GEOMETRY", true, 1),
      ];
      const inputB: ScoredResponse[] = [
        ...mk("NUMBER_SENSE", false, 1),
        ...mk("GEOMETRY", true, 1),
        ...mk("MEASUREMENT_DATA", true, 1),
      ];
      const orderA = computeStrandMastery(inputA).map((r) => r.strand);
      const orderB = computeStrandMastery(inputB).map((r) => r.strand);
      expect(orderA).toEqual(ORDER);
      expect(orderB).toEqual(ORDER);
    });
  });
});
