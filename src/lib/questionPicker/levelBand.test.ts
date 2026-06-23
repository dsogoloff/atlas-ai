import { describe, expect, it } from "vitest";

import {
  BOOKLET_LEVELS,
  LEVEL_BAND_RADIUS,
  anchorBookletForChild,
  bookletBand,
  bookletOrdinalForHalfGrade,
  levelLockHalfGrades,
  previousBookletOrdinal,
  shortTestLevelBand,
} from "./levelBand";
import { CURRENT_ACADEMIC_YEAR_START } from "@/lib/tier/derive";

describe("constants", () => {
  it("band radius is ±1 (hold hard)", () => {
    expect(LEVEL_BAND_RADIUS).toBe(1);
  });
  it("booklet axis is 0A,0B,0C then grades 1–8", () => {
    expect(BOOKLET_LEVELS).toEqual([
      "0A", "0B", "0C", "1", "2", "3", "4", "5", "6", "7", "8",
    ]);
  });
});

describe("bookletOrdinalForHalfGrade", () => {
  it("maps the sub-grade-1 booklets", () => {
    expect(bookletOrdinalForHalfGrade("0A")).toBe(0);
    expect(bookletOrdinalForHalfGrade("0B")).toBe(1);
    expect(bookletOrdinalForHalfGrade("0C")).toBe(2);
  });
  it("folds kindergarten half-grades into the 0C booklet", () => {
    expect(bookletOrdinalForHalfGrade("KA")).toBe(2);
    expect(bookletOrdinalForHalfGrade("KB")).toBe(2);
  });
  it("maps both halves of a grade to the same booklet", () => {
    expect(bookletOrdinalForHalfGrade("5A")).toBe(7);
    expect(bookletOrdinalForHalfGrade("5B")).toBe(7);
    expect(bookletOrdinalForHalfGrade("1A")).toBe(3);
  });
  it("returns null for an unknown level", () => {
    expect(bookletOrdinalForHalfGrade("ZZ")).toBeNull();
  });
});

describe("bookletBand — ±1, clamped, no widening", () => {
  it("is the three booklets around a mid anchor", () => {
    expect(bookletBand(7)).toEqual([6, 7, 8]); // grade 5 → grades 4/5/6
  });
  it("clamps at the bottom (0C anchor reaches 0B, never below 0A)", () => {
    expect(bookletBand(2)).toEqual([1, 2, 3]); // 0C → 0B/0C/grade-1
    expect(bookletBand(0)).toEqual([0, 1]); // 0A → 0A/0B
  });
  it("clamps at the top", () => {
    expect(bookletBand(10)).toEqual([9, 10]);
  });
});

describe("halfGradesForBooklets / levelLockHalfGrades", () => {
  it("0C anchor band {0B,0C,grade1} → its half-grade set", () => {
    expect(levelLockHalfGrades(2).sort()).toEqual(
      ["0B", "0C", "1A", "1B", "KA", "KB"].sort(),
    );
  });
  it("grade-5 anchor band {grade4,grade5,grade6} → half grades 4A..6B", () => {
    expect(levelLockHalfGrades(7).sort()).toEqual(
      ["4A", "4B", "5A", "5B", "6A", "6B"].sort(),
    );
  });
});

describe("anchorBookletForChild", () => {
  it("intake young-band ladder: Pre-K (age 4) → 0A, Pre-K (age 5) → 0B, K → 0C", () => {
    expect(anchorBookletForChild("Pre-K (age 4)", 2000)).toBe(0); // 0A
    expect(anchorBookletForChild("Pre-K (age 5)", 2000)).toBe(1); // 0B
    expect(anchorBookletForChild("K", 2000)).toBe(2); // 0C
  });
  it("intake ladder: 1st → L1, 4th → L4 (grade N → booklet N)", () => {
    expect(anchorBookletForChild("1", 2000)).toBe(3); // L1
    expect(anchorBookletForChild("4", 2000)).toBe(6); // L4
  });
  it("floors at 0A — never anchors below Pre-K (age 4)", () => {
    // A sub-Pre-K birth year (grade < -2) clamps to the 0A floor.
    expect(
      anchorBookletForChild(null, CURRENT_ACADEMIC_YEAR_START - 2),
    ).toBe(0);
  });
  it("kindergarten anchors at the 0C booklet (ordinal 2)", () => {
    expect(anchorBookletForChild("K", 2000)).toBe(2);
    expect(anchorBookletForChild("Kindergarten", 2000)).toBe(2);
  });
  it("grade N anchors at booklet N (grade 5 → ordinal 7)", () => {
    expect(anchorBookletForChild("5", 2000)).toBe(7);
    expect(anchorBookletForChild("1st", 2000)).toBe(3);
  });
  it("falls back to birth_year when grade text is unparseable", () => {
    // age 8 at year start ≈ grade 3 → booklet ordinal 5
    expect(
      anchorBookletForChild("honors", CURRENT_ACADEMIC_YEAR_START - 8),
    ).toBe(5);
  });
});

describe("shortTestLevelBand (previous + current booklet)", () => {
  it("a 0B child (anchor 1) samples BOTH 0A and 0B (the regression case)", () => {
    // Previously resolved to {0A} only — identical to a 0A child's test.
    expect(shortTestLevelBand(1).sort()).toEqual(["0A", "0B"]);
  });
  it("a 0C child (anchor 2) samples 0B and the 0C booklet (incl. KA/KB fold)", () => {
    expect(previousBookletOrdinal(2)).toBe(1);
    // KA/KB fold into the 0C booklet ordinal, so they ride along with 0C.
    expect(shortTestLevelBand(2).sort()).toEqual(["0B", "0C", "KA", "KB"]);
  });
  it("a grade-1 child (anchor 3) samples the 0C booklet (incl. KA/KB) + grade 1", () => {
    expect(shortTestLevelBand(3).sort()).toEqual(["0C", "1A", "1B", "KA", "KB"]);
  });
  it("a grade-5 child (anchor 7) samples grade 4 and grade 5 (4A/4B/5A/5B)", () => {
    expect(previousBookletOrdinal(7)).toBe(6);
    expect(shortTestLevelBand(7).sort()).toEqual(["4A", "4B", "5A", "5B"]);
  });
  it("collapses to {0A} only at the floor (0A child, anchor 0)", () => {
    expect(previousBookletOrdinal(0)).toBe(0);
    expect(shortTestLevelBand(0).sort()).toEqual(["0A"]);
  });
});
