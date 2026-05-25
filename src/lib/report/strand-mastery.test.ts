// Unit tests for computeStrandMastery + rollUpToParentStrands. Pure
// functions — no React, no DB.
//
// Phase 8 contract changes:
//   * Strand union is the V2026 12-value sub-strand set, not the engine's
//     6-value enum.
//   * computeStrandMastery takes an `applicableStrands` parameter; output
//     length matches input length (variable, not always 6).
//   * Output order follows `applicableStrands` order — caller controls.
//   * rollUpToParentStrands aggregates sub-strand rows up to the 3 parent
//     strands for the radar; always 3 rows in PARENT_STRAND_ORDER.
//
// Band thresholds unchanged: 75 mastery / 50 progressing / <50 area_of_focus,
// no_data when total === 0.

import { describe, expect, it } from "vitest";

import type { Strand } from "@/lib/report/types";

import {
  computeStrandMastery,
  rollUpToParentStrands,
  type ScoredResponse,
} from "./strand-mastery";

const mk = (strand: Strand, isCorrect: boolean, count = 1): ScoredResponse[] =>
  Array.from({ length: count }, () => ({ strand, isCorrect }));

// Representative applicable-strand sets at different levels. The brief
// describes a child seeing the N sub-strands applicable at their level
// (2-8); these match the spec's applies_to_level_codes for l3 (7 sub-
// strands) and l1 (4 sub-strands).
const L3_APPLICABLE: readonly Strand[] = [
  "whole_numbers",
  "fractions",
  "money",
  "measurement",
  "geometry",
  "area_volume",
  "data_representation",
];

const L1_APPLICABLE: readonly Strand[] = [
  "whole_numbers",
  "measurement",
  "geometry",
  "data_representation",
];

describe("computeStrandMastery (Phase 8 — variable length, caller-ordered)", () => {
  describe("shape contract", () => {
    it("returns one row per applicable strand, in caller order", () => {
      const result = computeStrandMastery([], L3_APPLICABLE);
      expect(result).toHaveLength(7);
      expect(result.map((r) => r.strand)).toEqual(L3_APPLICABLE);
    });

    it("supports the smallest realistic level (4 applicable strands at l1)", () => {
      const result = computeStrandMastery([], L1_APPLICABLE);
      expect(result).toHaveLength(4);
      expect(result.map((r) => r.strand)).toEqual(L1_APPLICABLE);
    });

    it("returns no rows when applicableStrands is empty", () => {
      const result = computeStrandMastery(mk("fractions", true, 3), []);
      expect(result).toHaveLength(0);
    });
  });

  describe("aggregation", () => {
    it("counts correct/total per strand across responses (single strand)", () => {
      const result = computeStrandMastery(
        [...mk("whole_numbers", true, 3), ...mk("whole_numbers", false, 1)],
        L3_APPLICABLE,
      );
      const wn = result.find((r) => r.strand === "whole_numbers")!;
      expect(wn).toMatchObject({ correct: 3, total: 4, percentage: 75 });
    });

    it("does not cross-contaminate strands", () => {
      const result = computeStrandMastery(
        [
          ...mk("whole_numbers", true, 2),
          ...mk("fractions", false, 2),
          ...mk("geometry", true, 1),
          ...mk("geometry", false, 1),
        ],
        L3_APPLICABLE,
      );
      const wn = result.find((r) => r.strand === "whole_numbers")!;
      const fr = result.find((r) => r.strand === "fractions")!;
      const geo = result.find((r) => r.strand === "geometry")!;
      expect(wn).toMatchObject({ correct: 2, total: 2, percentage: 100 });
      expect(fr).toMatchObject({ correct: 0, total: 2, percentage: 0 });
      expect(geo).toMatchObject({ correct: 1, total: 2, percentage: 50 });
    });

    it("ignores responses whose strand is not in applicableStrands", () => {
      // `algebra` is not applicable at l3. Counts must not appear.
      const result = computeStrandMastery(
        [...mk("algebra", true, 5), ...mk("whole_numbers", true, 1)],
        L3_APPLICABLE,
      );
      expect(result.find((r) => r.strand === "algebra")).toBeUndefined();
      const wn = result.find((r) => r.strand === "whole_numbers")!;
      expect(wn).toMatchObject({ correct: 1, total: 1, percentage: 100 });
    });

    it("rounds percentage to nearest integer (2/3 → 67)", () => {
      const result = computeStrandMastery(
        [...mk("fractions", true, 2), ...mk("fractions", false, 1)],
        L3_APPLICABLE,
      );
      const fr = result.find((r) => r.strand === "fractions")!;
      expect(fr.percentage).toBe(67);
    });
  });

  describe("band derivation", () => {
    it("returns mastery at exactly 75%", () => {
      const result = computeStrandMastery(
        [...mk("whole_numbers", true, 3), ...mk("whole_numbers", false, 1)],
        L3_APPLICABLE,
      );
      const wn = result.find((r) => r.strand === "whole_numbers")!;
      expect(wn.percentage).toBe(75);
      expect(wn.band).toBe("mastery");
    });

    it("returns progressing at 74%", () => {
      const result = computeStrandMastery(
        [...mk("whole_numbers", true, 37), ...mk("whole_numbers", false, 13)],
        L3_APPLICABLE,
      );
      const wn = result.find((r) => r.strand === "whole_numbers")!;
      expect(wn.percentage).toBe(74);
      expect(wn.band).toBe("progressing");
    });

    it("returns progressing at exactly 50%", () => {
      const result = computeStrandMastery(
        [...mk("geometry", true, 1), ...mk("geometry", false, 1)],
        L3_APPLICABLE,
      );
      const geo = result.find((r) => r.strand === "geometry")!;
      expect(geo.percentage).toBe(50);
      expect(geo.band).toBe("progressing");
    });

    it("returns area_of_focus at 49%", () => {
      const result = computeStrandMastery(
        [...mk("fractions", true, 24), ...mk("fractions", false, 25)],
        L3_APPLICABLE,
      );
      const fr = result.find((r) => r.strand === "fractions")!;
      expect(fr.percentage).toBe(49);
      expect(fr.band).toBe("area_of_focus");
    });

    it("returns area_of_focus at 0% when total > 0", () => {
      const result = computeStrandMastery(
        mk("fractions", false, 3),
        L3_APPLICABLE,
      );
      const fr = result.find((r) => r.strand === "fractions")!;
      expect(fr).toMatchObject({
        percentage: 0,
        total: 3,
        band: "area_of_focus",
      });
    });

    it("returns no_data when total === 0 for an applicable strand", () => {
      const result = computeStrandMastery([], L3_APPLICABLE);
      for (const r of result) {
        expect(r).toMatchObject({ total: 0, percentage: 0, band: "no_data" });
      }
    });
  });
});

describe("rollUpToParentStrands", () => {
  it("returns 3 rows in PARENT_STRAND_ORDER (number_algebra → measurement_geometry → statistics)", () => {
    const result = rollUpToParentStrands([]);
    expect(result.map((r) => r.strand)).toEqual([
      "number_algebra",
      "measurement_geometry",
      "statistics",
    ]);
  });

  it("aggregates correct/total across sub-strands belonging to each parent", () => {
    // l3 layout: whole_numbers + fractions + money under number_algebra;
    // measurement + geometry + area_volume under measurement_geometry;
    // data_representation under statistics.
    const subStrand = computeStrandMastery(
      [
        ...mk("whole_numbers", true, 8),
        ...mk("whole_numbers", false, 2),
        ...mk("fractions", true, 1),
        ...mk("fractions", false, 3),
        ...mk("geometry", true, 3),
        ...mk("geometry", false, 1),
        ...mk("data_representation", true, 2),
        ...mk("data_representation", false, 0),
      ],
      L3_APPLICABLE,
    );
    const parents = rollUpToParentStrands(subStrand);

    // number_algebra: whole_numbers (8/10) + fractions (1/4) = 9/14 = 64%
    const na = parents.find((r) => r.strand === "number_algebra")!;
    expect(na).toMatchObject({ correct: 9, total: 14, percentage: 64 });
    expect(na.band).toBe("progressing");

    // measurement_geometry: geometry only (3/4) = 75%
    // (measurement + area_volume in L3_APPLICABLE but with 0 responses
    // contribute 0/0 each — included in totals but neutral)
    const mg = parents.find((r) => r.strand === "measurement_geometry")!;
    expect(mg).toMatchObject({ correct: 3, total: 4, percentage: 75 });
    expect(mg.band).toBe("mastery");

    // statistics: data_representation (2/2) = 100%
    const st = parents.find((r) => r.strand === "statistics")!;
    expect(st).toMatchObject({ correct: 2, total: 2, percentage: 100 });
    expect(st.band).toBe("mastery");
  });

  it("returns no_data for a parent with zero responses across its applicable sub-strands", () => {
    // L1_APPLICABLE includes no statistics-parent sub-strands at l1
    // beyond data_representation — but if that has 0 responses, the
    // parent rolls up to no_data.
    const subStrand = computeStrandMastery(
      mk("whole_numbers", true, 2),
      L1_APPLICABLE,
    );
    const parents = rollUpToParentStrands(subStrand);
    const st = parents.find((r) => r.strand === "statistics")!;
    expect(st).toMatchObject({ correct: 0, total: 0, band: "no_data" });
  });
});
