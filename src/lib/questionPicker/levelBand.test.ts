import { describe, expect, it } from "vitest";

import {
  BOOKLET_LEVELS,
  LEVEL_BAND_RADIUS,
  anchorBookletForChild,
  bookletBand,
  bookletOrdinalForHalfGrade,
  levelLockHalfGrades,
  previousBookletHalfGrades,
  previousBookletOrdinal,
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

describe("previous booklet (short-test sampling)", () => {
  it("a 0C child (anchor 2) samples the 0B booklet (ordinal 1)", () => {
    expect(previousBookletOrdinal(2)).toBe(1);
    expect(previousBookletHalfGrades(2).sort()).toEqual(["0B"]);
  });
  it("a grade-5 child (anchor 7) samples grade 4 (ordinal 6 → 4A/4B)", () => {
    expect(previousBookletOrdinal(7)).toBe(6);
    expect(previousBookletHalfGrades(7).sort()).toEqual(["4A", "4B"]);
  });
  it("clamps at the bottom (0A child stays at 0A)", () => {
    expect(previousBookletOrdinal(0)).toBe(0);
  });
});
