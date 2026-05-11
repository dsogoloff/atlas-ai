import { describe, expect, it } from "vitest";

import { formatGradeLevel } from "./gradeLevel";

describe("formatGradeLevel", () => {
  it("expands 'K' to 'Kindergarten'", () => {
    expect(formatGradeLevel("K")).toBe("Kindergarten");
  });

  it("expands '1' to '1st Grade'", () => {
    expect(formatGradeLevel("1")).toBe("1st Grade");
  });

  it("expands '2' to '2nd Grade'", () => {
    expect(formatGradeLevel("2")).toBe("2nd Grade");
  });

  it("expands '3' to '3rd Grade'", () => {
    expect(formatGradeLevel("3")).toBe("3rd Grade");
  });

  it("expands '4'–'8' to 'Nth Grade' with the 'th' suffix", () => {
    expect(formatGradeLevel("4")).toBe("4th Grade");
    expect(formatGradeLevel("5")).toBe("5th Grade");
    expect(formatGradeLevel("6")).toBe("6th Grade");
    expect(formatGradeLevel("7")).toBe("7th Grade");
    expect(formatGradeLevel("8")).toBe("8th Grade");
  });

  it("passes through unknown shapes verbatim (admin imports / CSV)", () => {
    expect(formatGradeLevel("Pre-K")).toBe("Pre-K");
    expect(formatGradeLevel("Grade 2")).toBe("Grade 2");
    expect(formatGradeLevel("Kindergarten")).toBe("Kindergarten");
  });
});
