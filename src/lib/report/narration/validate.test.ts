// Unit tests for the narration validation gate. All-or-nothing per the
// brief — any single failure mode invalidates the whole narration.

import { describe, expect, it } from "vitest";

import { validateNarration } from "./validate";

const VALID_PROSE = {
  placement_line: "Aiden showed steady command at S.A.M Level 3A.",
  strand_lede:
    "Here's how Aiden's responses spread across the five mathematics strands the assessment covered.",
  key_findings: {
    strengths: [
      "Whole Numbers: consistent mastery across the items in this sub-strand.",
      "Measurement: solid command of the measurement items.",
    ],
    growth_areas: [
      "Fraction comparison: responses followed denominator size rather than the size of the fraction itself.",
      "Keyword-driven operation choice in word problems.",
    ],
  },
  recommendations_lede:
    "A short, ordered plan built around Aiden's placement and the two patterns above.",
};

describe("validateNarration", () => {
  it("accepts a fully valid prose object", () => {
    const result = validateNarration(VALID_PROSE);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.prose).toEqual(VALID_PROSE);
    }
  });

  it("rejects when a field is missing", () => {
    // Drop recommendations_lede — one of the four required fields.
    const { recommendations_lede: _omit, ...missingOne } = VALID_PROSE;
    void _omit;
    expect(validateNarration(missingOne).valid).toBe(false);
  });

  it("rejects when a field is wrong-typed", () => {
    const wrongType = { ...VALID_PROSE, strand_lede: 42 };
    expect(validateNarration(wrongType).valid).toBe(false);
  });

  it("rejects when a prose field is empty string", () => {
    const empty = { ...VALID_PROSE, placement_line: "" };
    expect(validateNarration(empty).valid).toBe(false);
  });

  it("rejects when a prose field exceeds max prose length", () => {
    // 601 > 600 (the MAX_PROSE_LENGTH bound). Confirms the over-length
    // hallucination floor without depending on a specific exported constant.
    const tooLong = "x".repeat(601);
    const over = { ...VALID_PROSE, placement_line: tooLong };
    expect(validateNarration(over).valid).toBe(false);
  });

  it("accepts empty strengths array (thin-bank case — no measured strand data)", () => {
    const thinBank = {
      ...VALID_PROSE,
      key_findings: { ...VALID_PROSE.key_findings, strengths: [] },
    };
    expect(validateNarration(thinBank).valid).toBe(true);
  });

  it("accepts empty growth_areas array (no misconceptions, no fallback strand data)", () => {
    const noGrowth = {
      ...VALID_PROSE,
      key_findings: { ...VALID_PROSE.key_findings, growth_areas: [] },
    };
    expect(validateNarration(noGrowth).valid).toBe(true);
  });

  it("rejects when key_findings has too many items (>3 per list)", () => {
    const tooMany = {
      ...VALID_PROSE,
      key_findings: {
        ...VALID_PROSE.key_findings,
        strengths: ["a", "b", "c", "d"],
      },
    };
    expect(validateNarration(tooMany).valid).toBe(false);
  });

  it("rejects when a key_findings item is empty string", () => {
    const emptyItem = {
      ...VALID_PROSE,
      key_findings: {
        ...VALID_PROSE.key_findings,
        strengths: ["valid item", ""],
      },
    };
    expect(validateNarration(emptyItem).valid).toBe(false);
  });

  it("rejects when key_findings is missing a sub-array", () => {
    const missingSub = {
      ...VALID_PROSE,
      key_findings: { strengths: ["a"] }, // growth_areas missing
    };
    expect(validateNarration(missingSub).valid).toBe(false);
  });

  it("rejects when key_findings is missing entirely", () => {
    const { key_findings: _omit, ...missingKf } = VALID_PROSE;
    void _omit;
    expect(validateNarration(missingKf).valid).toBe(false);
  });
});
