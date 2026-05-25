// Unit tests for the narration validation gate. All-or-nothing per the
// brief — any single failure mode invalidates the whole narration.

import { describe, expect, it } from "vitest";

import { validateNarration } from "./validate";

const VALID_PROSE = {
  placement_line: "Aiden showed steady command at S.A.M. Level 3A.",
  strand_lede:
    "Here's how Aiden's responses spread across the five mathematics strands the assessment covered.",
  misconceptions_lede:
    "Two specific patterns came up across Aiden's responses. They're useful signals for where to focus next.",
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

  it("rejects when a field is empty string", () => {
    const empty = { ...VALID_PROSE, misconceptions_lede: "" };
    expect(validateNarration(empty).valid).toBe(false);
  });

  it("rejects when a field exceeds max prose length", () => {
    // 601 > 600 (the MAX_PROSE_LENGTH bound). Confirms the over-length
    // hallucination floor without depending on a specific exported constant.
    const tooLong = "x".repeat(601);
    const over = { ...VALID_PROSE, placement_line: tooLong };
    expect(validateNarration(over).valid).toBe(false);
  });
});
