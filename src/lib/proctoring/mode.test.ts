import { describe, expect, it } from "vitest";

import {
  READ_ALOUD_MAX_GRADE,
  deriveProctoringMode,
  gradeFromBirthYear,
  parseGradeNumber,
  proctoringModeForGrade,
} from "./mode";
import { CURRENT_ACADEMIC_YEAR_START } from "@/lib/tier/derive";

describe("READ_ALOUD_MAX_GRADE", () => {
  it("is the single cutoff constant (grade 2)", () => {
    expect(READ_ALOUD_MAX_GRADE).toBe(2);
  });
});

describe("proctoringModeForGrade — boundary at 2/3", () => {
  it("grade 2 and below is read-aloud", () => {
    expect(proctoringModeForGrade(0)).toBe("read-aloud"); // kindergarten
    expect(proctoringModeForGrade(1)).toBe("read-aloud");
    expect(proctoringModeForGrade(2)).toBe("read-aloud");
  });

  it("grade 3 and above is no-assistance", () => {
    expect(proctoringModeForGrade(3)).toBe("no-assistance");
    expect(proctoringModeForGrade(4)).toBe("no-assistance");
    expect(proctoringModeForGrade(8)).toBe("no-assistance");
  });

  it("the flip happens exactly at the cutoff constant", () => {
    expect(proctoringModeForGrade(READ_ALOUD_MAX_GRADE)).toBe("read-aloud");
    expect(proctoringModeForGrade(READ_ALOUD_MAX_GRADE + 1)).toBe(
      "no-assistance",
    );
  });
});

describe("parseGradeNumber", () => {
  it("parses bare digits", () => {
    expect(parseGradeNumber("2")).toBe(2);
    expect(parseGradeNumber("5")).toBe(5);
  });
  it("parses half-grade enum values", () => {
    expect(parseGradeNumber("2A")).toBe(2);
    expect(parseGradeNumber("3b")).toBe(3);
  });
  it("parses kindergarten variants as 0", () => {
    expect(parseGradeNumber("K")).toBe(0);
    expect(parseGradeNumber("ka")).toBe(0);
    expect(parseGradeNumber("Kindergarten")).toBe(0);
  });
  it("parses pre-k variants as below kindergarten (read-aloud band)", () => {
    expect(parseGradeNumber("pre-k")).toBeLessThanOrEqual(READ_ALOUD_MAX_GRADE);
  });
  it("parses ordinals and word forms", () => {
    expect(parseGradeNumber("2nd")).toBe(2);
    expect(parseGradeNumber("third")).toBe(3);
    expect(parseGradeNumber("Grade 3")).toBe(3);
    expect(parseGradeNumber("5th grade")).toBe(5);
  });
  it("returns null on garbage / empty / null", () => {
    expect(parseGradeNumber("honors")).toBeNull();
    expect(parseGradeNumber("")).toBeNull();
    expect(parseGradeNumber(null)).toBeNull();
  });
});

describe("gradeFromBirthYear", () => {
  it("maps a kindergarten-age child (age 5 at year start) to grade 0", () => {
    expect(gradeFromBirthYear(CURRENT_ACADEMIC_YEAR_START - 5)).toBe(0);
  });
  it("maps a 3rd-grade-age child (age 8) to grade 3", () => {
    expect(gradeFromBirthYear(CURRENT_ACADEMIC_YEAR_START - 8)).toBe(3);
  });
});

describe("deriveProctoringMode", () => {
  it("routes on grade_level when present (read-aloud side)", () => {
    expect(
      deriveProctoringMode({ grade_level: "2", birth_year: 2000 }),
    ).toBe("read-aloud");
  });
  it("routes on grade_level when present (no-assistance side)", () => {
    expect(
      deriveProctoringMode({ grade_level: "3rd", birth_year: 2000 }),
    ).toBe("no-assistance");
  });
  it("falls back to birth_year when grade_level is unparseable", () => {
    expect(
      deriveProctoringMode({
        grade_level: "honors",
        birth_year: CURRENT_ACADEMIC_YEAR_START - 7, // ~grade 2
      }),
    ).toBe("read-aloud");
    expect(
      deriveProctoringMode({
        grade_level: null,
        birth_year: CURRENT_ACADEMIC_YEAR_START - 8, // ~grade 3
      }),
    ).toBe("no-assistance");
  });
});
