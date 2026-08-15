import { describe, expect, it } from "vitest";

import { LEVELS } from "@/lib/engine/levels";
import {
  BOOKABLE_CANONICAL_LEVELS,
  CANONICAL_LEVELS,
  CanonicalLevelError,
  isBookableCanonicalLevel,
  isCanonicalLevel,
  placementStrings,
  samLevelLabel,
  toCanonicalLevel,
  type CanonicalLevel,
} from "@/lib/report/canonical-level";

type HalfGrade = (typeof LEVELS)[number];

/** The complete engine argmax axis -> canonical target. `null` = must throw.
 *  This table IS the contract; every one of the 21 band values appears. */
const EXPECTED: ReadonlyArray<readonly [HalfGrade, CanonicalLevel | null]> = [
  ["0A", "L0A"],
  ["0B", "L0B"],
  ["0C", "L0C"],
  ["KA", "L0C"],
  ["KB", "L0C"],
  ["1A", "L1"],
  ["1B", "L1"],
  ["2A", "L2"],
  ["2B", "L2"],
  ["3A", "L3"],
  ["3B", "L3"],
  ["4A", "L4"],
  ["4B", "L4"],
  ["5A", "L5"],
  ["5B", "L5"],
  ["6A", "L6"],
  ["6B", "L6"],
  ["7A", "L7"],
  ["7B", "L7"],
  ["8A", null],
  ["8B", null],
];

describe("toCanonicalLevel — all 21 engine band values", () => {
  it("covers the entire engine axis with no gaps", () => {
    // Guards against a level being added to the engine and silently skipped
    // by this table.
    expect(EXPECTED.map(([band]) => band)).toEqual([...LEVELS]);
    expect(EXPECTED).toHaveLength(21);
  });

  for (const [band, canonical] of EXPECTED) {
    if (canonical === null) continue;
    it(`${band} -> ${canonical}`, () => {
      expect(toCanonicalLevel(band)).toBe(canonical);
    });
  }
});

describe("toCanonicalLevel — fail loud above the canonical set", () => {
  for (const band of ["8A", "8B"] as const) {
    it(`${band} throws CanonicalLevelError rather than clamping`, () => {
      expect(() => toCanonicalLevel(band)).toThrow(CanonicalLevelError);
    });

    it(`${band} never resolves to L6 or any other string`, () => {
      let result: unknown = "UNSET";
      try {
        result = toCanonicalLevel(band);
      } catch (err) {
        result = err;
      }
      expect(result).toBeInstanceOf(CanonicalLevelError);
      expect(typeof result).not.toBe("string");
    });
  }

  it("carries the offending half-grade for logging", () => {
    try {
      toCanonicalLevel("8B");
      expect.unreachable("8B must throw");
    } catch (err) {
      expect(err).toBeInstanceOf(CanonicalLevelError);
      expect((err as CanonicalLevelError).halfGrade).toBe("8B");
    }
  });

  it("throws on a half-grade the booklet axis does not recognise", () => {
    expect(() =>
      toCanonicalLevel("ZZ" as unknown as HalfGrade),
    ).toThrow(CanonicalLevelError);
  });
});

describe("the K/0C seam", () => {
  it("L0C is reached from ALL THREE of 0C, KA and KB", () => {
    expect(toCanonicalLevel("0C")).toBe("L0C");
    expect(toCanonicalLevel("KA")).toBe("L0C");
    expect(toCanonicalLevel("KB")).toBe("L0C");
  });

  it("does NOT inherit the halfGradeToTaxLevelCode defect (KA -> l0a)", () => {
    // The tax-code path sends KA/KB to l0a/l0b. The contract must not.
    expect(toCanonicalLevel("KA")).not.toBe("L0A");
    expect(toCanonicalLevel("KB")).not.toBe("L0B");
  });
});

describe("the frozen canonical set", () => {
  it("is exactly the nine bookable values plus L7", () => {
    expect([...CANONICAL_LEVELS]).toEqual([
      "L0A", "L0B", "L0C", "L1", "L2", "L3", "L4", "L5", "L6", "L7",
    ]);
    expect([...BOOKABLE_CANONICAL_LEVELS]).toHaveLength(9);
  });

  it("never contains L8", () => {
    expect(CANONICAL_LEVELS).not.toContain("L8");
    expect(isCanonicalLevel("L8")).toBe(false);
  });

  it("every value is L-prefixed and byte-exact", () => {
    for (const value of CANONICAL_LEVELS) {
      expect(value).toMatch(/^L(0[ABC]|[1-7])$/);
    }
  });

  it("L7 is canonical but not bookable; L6 is both", () => {
    expect(isCanonicalLevel("L7")).toBe(true);
    expect(isBookableCanonicalLevel("L7")).toBe(false);
    expect(isBookableCanonicalLevel("L6")).toBe(true);
  });

  it("every reachable band value canonicalizes into the frozen set", () => {
    for (const [band, canonical] of EXPECTED) {
      if (canonical === null) continue;
      expect(isCanonicalLevel(toCanonicalLevel(band))).toBe(true);
    }
  });
});

describe("placementStrings — the chokepoint", () => {
  it("pairs the unchanged parent label with the canonical value", () => {
    expect(placementStrings("3A")).toEqual({
      samLevel: "S.A.M Level 3",
      canonicalLevel: "L3",
    });
    expect(placementStrings("KA")).toEqual({
      samLevel: "S.A.M Level 0C",
      canonicalLevel: "L0C",
    });
    expect(placementStrings("0A")).toEqual({
      samLevel: "S.A.M Level 0A",
      canonicalLevel: "L0A",
    });
  });

  it("the label half is byte-identical to samLevelLabel for every band value", () => {
    // The parent-facing string must not change as a side effect of this lane.
    for (const [band, canonical] of EXPECTED) {
      if (canonical === null) continue;
      expect(placementStrings(band).samLevel).toBe(samLevelLabel(band));
    }
  });

  it("refuses to emit a label with no contract value", () => {
    expect(() => placementStrings("8B")).toThrow(CanonicalLevelError);
  });
});
