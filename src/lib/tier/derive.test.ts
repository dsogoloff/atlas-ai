// Unit tests for tier derivation. Pure functions — no React, no DB.
//
// Coverage:
//   * parseGradeLevel — every documented input pattern, garbage paths,
//     nullish paths, whitespace tolerance, case-insensitivity.
//   * tierFromBirthYear — age boundaries relative to
//     CURRENT_ACADEMIC_YEAR_START, schema-edge years (2000, 2030).
//   * deriveTier — composition (precedence, fallback, garbage falls
//     through).
//   * Calendar trip-wire — asserts CURRENT_ACADEMIC_YEAR_START matches
//     the active academic-year start computed from `new Date()`. The
//     only time-sensitive test in the file. Fails ~Sep 2026, prompting
//     a one-line bump.

import { describe, expect, it } from "vitest";

import {
  CURRENT_ACADEMIC_YEAR_START,
  deriveTier,
  parseGradeLevel,
  tierFromBirthYear,
} from "./derive";

describe("parseGradeLevel", () => {
  it("recognises every half_grade_level enum value", () => {
    // The 18 values defined at
    // supabase/migrations/20260426000000_initial_schema.sql:37-47.
    const k4 = ["KA", "KB", "1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
    const g58 = ["5A", "5B", "6A", "6B", "7A", "7B", "8A", "8B"];
    for (const v of k4) expect(parseGradeLevel(v)).toBe("K_4");
    for (const v of g58) expect(parseGradeLevel(v)).toBe("G5_8");
  });

  it("recognises bare digits K-8", () => {
    expect(parseGradeLevel("K")).toBe("K_4");
    for (const d of ["1", "2", "3", "4"]) {
      expect(parseGradeLevel(d)).toBe("K_4");
    }
    for (const d of ["5", "6", "7", "8"]) {
      expect(parseGradeLevel(d)).toBe("G5_8");
    }
  });

  it("recognises Pre-K variants", () => {
    for (const v of [
      "Pre-K",
      "pre-k",
      "PRE K",
      "prek",
      "Prek",
      "pre k",
      "Pre-Kindergarten",
      "pre kindergarten",
    ]) {
      expect(parseGradeLevel(v)).toBe("K_4");
    }
  });

  it("recognises Kindergarten word form", () => {
    for (const v of ["Kindergarten", "kindergarten", "KINDERGARTEN"]) {
      expect(parseGradeLevel(v)).toBe("K_4");
    }
  });

  it("recognises ordinal forms (1st, 5th, ...)", () => {
    expect(parseGradeLevel("1st")).toBe("K_4");
    expect(parseGradeLevel("4th")).toBe("K_4");
    expect(parseGradeLevel("5th")).toBe("G5_8");
    expect(parseGradeLevel("8th")).toBe("G5_8");
  });

  it("recognises ordinal forms with trailing 'grade'", () => {
    expect(parseGradeLevel("1st grade")).toBe("K_4");
    expect(parseGradeLevel("5th Grade")).toBe("G5_8");
    expect(parseGradeLevel("8TH GRADE")).toBe("G5_8");
  });

  it("recognises leading 'Grade N' form", () => {
    expect(parseGradeLevel("Grade 1")).toBe("K_4");
    expect(parseGradeLevel("grade 5")).toBe("G5_8");
    expect(parseGradeLevel("GRADE 8")).toBe("G5_8");
  });

  it("recognises word forms (first, fifth, ...)", () => {
    expect(parseGradeLevel("first")).toBe("K_4");
    expect(parseGradeLevel("Fourth")).toBe("K_4");
    expect(parseGradeLevel("Fifth")).toBe("G5_8");
    expect(parseGradeLevel("EIGHTH")).toBe("G5_8");
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseGradeLevel("  3A  ")).toBe("K_4");
    expect(parseGradeLevel("\t5\n")).toBe("G5_8");
  });

  it("returns null for null and empty / whitespace-only inputs", () => {
    expect(parseGradeLevel(null)).toBe(null);
    expect(parseGradeLevel("")).toBe(null);
    expect(parseGradeLevel("   ")).toBe(null);
    expect(parseGradeLevel("\t\n")).toBe(null);
  });

  it("returns null for out-of-range digits", () => {
    expect(parseGradeLevel("0")).toBe(null);
    expect(parseGradeLevel("9")).toBe(null);
    expect(parseGradeLevel("12")).toBe(null);
    expect(parseGradeLevel("-1")).toBe(null);
  });

  it("returns null for unrecognised strings (falls through to birth_year)", () => {
    for (const v of [
      "Honors",
      "lol",
      "Advanced",
      "9th",
      "ninth",
      "k-4",
      "5-8",
    ]) {
      expect(parseGradeLevel(v)).toBe(null);
    }
  });
});

describe("tierFromBirthYear", () => {
  // ageAtStart = CURRENT_ACADEMIC_YEAR_START (2025) - birthYear.
  // Boundary: ageAtStart >= 10 → G5_8.

  it("returns K_4 for birth years that put a child below 5th grade", () => {
    expect(tierFromBirthYear(2020)).toBe("K_4"); // age 5 — K
    expect(tierFromBirthYear(2019)).toBe("K_4"); // age 6 — 1st
    expect(tierFromBirthYear(2018)).toBe("K_4"); // age 7 — 2nd
    expect(tierFromBirthYear(2017)).toBe("K_4"); // age 8 — 3rd
    expect(tierFromBirthYear(2016)).toBe("K_4"); // age 9 — 4th
  });

  it("returns G5_8 for birth years that put a child at 5th grade or higher", () => {
    expect(tierFromBirthYear(2015)).toBe("G5_8"); // age 10 — 5th
    expect(tierFromBirthYear(2014)).toBe("G5_8"); // age 11 — 6th
    expect(tierFromBirthYear(2013)).toBe("G5_8"); // age 12 — 7th
    expect(tierFromBirthYear(2012)).toBe("G5_8"); // age 13 — 8th
  });

  it("handles schema-edge years without throwing", () => {
    // Schema check: birth_year between 2000 and 2030.
    expect(tierFromBirthYear(2000)).toBe("G5_8"); // ageAtStart 25 — far past 8th
    expect(tierFromBirthYear(2030)).toBe("K_4"); // ageAtStart -5 — pre-birth
  });
});

describe("deriveTier", () => {
  it("uses grade_level when parseable (precedence over birth_year)", () => {
    // grade_level says G5_8 even though birth_year would say K_4.
    expect(
      deriveTier({ grade_level: "5A", birth_year: 2020 }),
    ).toBe("G5_8");
    // grade_level says K_4 even though birth_year would say G5_8.
    expect(
      deriveTier({ grade_level: "K", birth_year: 2010 }),
    ).toBe("K_4");
  });

  it("falls back to birth_year when grade_level is null", () => {
    expect(
      deriveTier({ grade_level: null, birth_year: 2015 }),
    ).toBe("G5_8");
    expect(
      deriveTier({ grade_level: null, birth_year: 2020 }),
    ).toBe("K_4");
  });

  it("falls back to birth_year when grade_level is unrecognised", () => {
    expect(
      deriveTier({ grade_level: "Honors", birth_year: 2018 }),
    ).toBe("K_4");
    expect(
      deriveTier({ grade_level: "Advanced", birth_year: 2014 }),
    ).toBe("G5_8");
  });

  it("falls back to birth_year when grade_level is empty / whitespace", () => {
    expect(
      deriveTier({ grade_level: "", birth_year: 2015 }),
    ).toBe("G5_8");
    expect(
      deriveTier({ grade_level: "   ", birth_year: 2020 }),
    ).toBe("K_4");
  });
});

describe("CURRENT_ACADEMIC_YEAR_START (calendar trip-wire)", () => {
  it("matches the active academic year — bump this constant when the test fails", () => {
    // Trip-wire. The constant is hardcoded so tier derivation stays a
    // pure function. This test is the one place we cross-check it
    // against wall-clock time, so the failure is unambiguous: bump
    // CURRENT_ACADEMIC_YEAR_START in derive.ts.
    //
    // Convention: academic year starts in September (month index 8).
    // Before September of year Y, the active year-start is Y - 1;
    // from September onward, it's Y.
    const now = new Date();
    const year = now.getFullYear();
    const expected = now.getMonth() >= 8 ? year : year - 1;
    expect(CURRENT_ACADEMIC_YEAR_START).toBe(expected);
  });
});
