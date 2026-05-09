// Unit tests for aggregateMisconceptions. Pure function — no React,
// no DB. Console.warn is spied per test so unknown-code warnings stay
// out of the test output AND the warn contract is locked under
// assertion.
//
// Coverage:
//   * Counting & shape — empty input, single response, multiple
//     responses aggregating correctly.
//   * Dedup within response — Set semantics; same code twice in one
//     response counts once, but counts twice across two responses.
//   * Unknown code handling — R6/M2 lock: drop the row AND emit a
//     console.warn (asserted).
//   * topN slicing — default 3, custom override, returns all when
//     count ≤ topN.
//   * Sort order — occurrences desc, code ascending tiebreak (full
//     multi-tie chain).
//   * Output shape — label/description/strand passed through verbatim.
//
// Fixture helpers: `mkRow(code, strand?)` builds a full
// MisconceptionRow with defaulted label/description (irrelevant to
// most tests). `mkLookup(...rows)` zips rows into the Map shape the
// helper expects.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Strand } from "@/lib/engine/types";

import {
  aggregateMisconceptions,
  type MisconceptionRow,
} from "./misconception-aggregate";

// =============================================================================
// Fixtures
// =============================================================================

function mkRow(
  code: string,
  strand: Strand = "NUMBER_SENSE",
): MisconceptionRow {
  return {
    code,
    label: `Label for ${code}`,
    description: `Description for ${code}`,
    strand,
  };
}

function mkLookup(...rows: MisconceptionRow[]): Map<string, MisconceptionRow> {
  return new Map(rows.map((r) => [r.code, r]));
}

// =============================================================================
// Spy lifecycle — keeps test output clean AND lets us assert warn calls.
// =============================================================================

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// Tests
// =============================================================================

describe("aggregateMisconceptions", () => {
  describe("counting & shape", () => {
    it("returns empty array for empty input", () => {
      const result = aggregateMisconceptions({
        codes: [],
        lookup: new Map(),
      });
      expect(result).toEqual([]);
    });

    it("returns single row when one response flags one code", () => {
      const result = aggregateMisconceptions({
        codes: [["M1"]],
        lookup: mkLookup(mkRow("M1")),
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ code: "M1", occurrences: 1 });
    });

    it("aggregates occurrences across multiple responses", () => {
      const result = aggregateMisconceptions({
        codes: [["M1"], ["M1"], ["M1"]],
        lookup: mkLookup(mkRow("M1")),
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.occurrences).toBe(3);
    });

    it("returns multiple distinct codes", () => {
      const result = aggregateMisconceptions({
        codes: [["M1"], ["M2"], ["M3"]],
        lookup: mkLookup(mkRow("M1"), mkRow("M2"), mkRow("M3")),
      });
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.code).sort()).toEqual(["M1", "M2", "M3"]);
    });
  });

  describe("dedup within response", () => {
    it("counts a code once even when listed twice in same response", () => {
      const result = aggregateMisconceptions({
        codes: [["M1", "M1"]],
        lookup: mkLookup(mkRow("M1")),
      });
      expect(result[0]!.occurrences).toBe(1);
    });

    it("counts a code twice when in two separate responses", () => {
      const result = aggregateMisconceptions({
        codes: [["M1"], ["M1"]],
        lookup: mkLookup(mkRow("M1")),
      });
      expect(result[0]!.occurrences).toBe(2);
    });

    it("dedupes within response then sums across responses", () => {
      // Response 1 lists M1 twice (counts as 1).
      // Response 2 lists M1 once (counts as 1).
      // Total = 2.
      const result = aggregateMisconceptions({
        codes: [["M1", "M1"], ["M1"]],
        lookup: mkLookup(mkRow("M1")),
      });
      expect(result[0]!.occurrences).toBe(2);
    });
  });

  describe("unknown code handling", () => {
    it("drops codes missing from lookup", () => {
      const result = aggregateMisconceptions({
        codes: [["UNKNOWN"]],
        lookup: new Map(),
      });
      expect(result).toEqual([]);
    });

    it("calls console.warn when an unknown code is encountered", () => {
      aggregateMisconceptions({
        codes: [["UNKNOWN"]],
        lookup: new Map(),
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "[misconception-aggregate] unknown misconception code",
        expect.objectContaining({ code: "UNKNOWN", occurrences: 1 }),
      );
    });

    it("returns only known codes when input has a mix of known/unknown", () => {
      const result = aggregateMisconceptions({
        codes: [["M1"], ["UNKNOWN"], ["M1"], ["GHOST"]],
        lookup: mkLookup(mkRow("M1")),
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.code).toBe("M1");
      expect(result[0]!.occurrences).toBe(2);
      // Both unknowns should have warned.
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("topN slicing", () => {
    it("returns at most 3 rows by default", () => {
      const result = aggregateMisconceptions({
        codes: [
          ["A"], ["A"], ["A"], ["A"], ["A"], // 5
          ["B"], ["B"], ["B"], ["B"],        // 4
          ["C"], ["C"], ["C"],               // 3
          ["D"], ["D"],                      // 2
          ["E"],                             // 1
        ],
        lookup: mkLookup(
          mkRow("A"),
          mkRow("B"),
          mkRow("C"),
          mkRow("D"),
          mkRow("E"),
        ),
      });
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.code)).toEqual(["A", "B", "C"]);
    });

    it("respects custom topN", () => {
      const result = aggregateMisconceptions(
        {
          codes: [["A"], ["A"], ["B"], ["C"]],
          lookup: mkLookup(mkRow("A"), mkRow("B"), mkRow("C")),
        },
        1,
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.code).toBe("A");
    });

    it("returns all rows when count <= topN", () => {
      const result = aggregateMisconceptions({
        codes: [["A"], ["B"]],
        lookup: mkLookup(mkRow("A"), mkRow("B")),
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("sort order", () => {
    it("sorts by occurrence count descending", () => {
      const result = aggregateMisconceptions({
        codes: [["B"], ["A"], ["A"], ["A"], ["C"], ["C"]],
        lookup: mkLookup(mkRow("A"), mkRow("B"), mkRow("C")),
      });
      expect(result.map((r) => r.code)).toEqual(["A", "C", "B"]);
      expect(result.map((r) => r.occurrences)).toEqual([3, 2, 1]);
    });

    it("breaks ties by code ascending (alphabetical)", () => {
      // Two codes tied at 1 occurrence each. Z should sort after A.
      const result = aggregateMisconceptions({
        codes: [["Z"], ["A"]],
        lookup: mkLookup(mkRow("A"), mkRow("Z")),
      });
      expect(result.map((r) => r.code)).toEqual(["A", "Z"]);
    });

    it("sorts a mixed multi-tie scenario correctly", () => {
      // Counts:
      //   D = 3 (highest, alone)
      //   A = 2, B = 2, C = 2 (three-way tie at 2 → alphabetical)
      //   E = 1 (lowest, alone)
      // Note: default topN=3 would slice; pass topN=5 to see full sort.
      const result = aggregateMisconceptions(
        {
          codes: [
            ["D"], ["D"], ["D"],
            ["A"], ["A"],
            ["B"], ["B"],
            ["C"], ["C"],
            ["E"],
          ],
          lookup: mkLookup(
            mkRow("A"),
            mkRow("B"),
            mkRow("C"),
            mkRow("D"),
            mkRow("E"),
          ),
        },
        5,
      );
      expect(result.map((r) => r.code)).toEqual(["D", "A", "B", "C", "E"]);
      expect(result.map((r) => r.occurrences)).toEqual([3, 2, 2, 2, 1]);
    });
  });

  describe("output shape", () => {
    it("preserves label, description, strand from lookup row", () => {
      const result = aggregateMisconceptions({
        codes: [["M1"]],
        lookup: mkLookup(mkRow("M1", "GEOMETRY")),
      });
      expect(result[0]).toEqual({
        code: "M1",
        label: "Label for M1",
        description: "Description for M1",
        strand: "GEOMETRY",
        occurrences: 1,
      });
    });
  });
});
