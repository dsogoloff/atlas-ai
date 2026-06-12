import { describe, expect, it } from "vitest";

import { MATH_ANSWER_MAX_LENGTH, isMathSafeAnswer } from "./sanitizer";

describe("isMathSafeAnswer", () => {
  it("accepts plain math answers", () => {
    for (const answer of [
      "3/4",
      "12.5",
      "(2,3)",
      "47-19",
      "2 × 3",
      "2x3",
      "10 ÷ 2",
      "1, 2, 3",
      "3:4",
      "= 28",
      "",
    ]) {
      expect(isMathSafeAnswer(answer)).toBe(true);
    }
  });

  it("rejects a name-like answer", () => {
    expect(isMathSafeAnswer("John Smith")).toBe(false);
  });

  it("rejects an email-like answer", () => {
    expect(isMathSafeAnswer("kid@example.com")).toBe(false);
  });

  it("rejects any answer containing letters outside the allowlist", () => {
    expect(isMathSafeAnswer("twelve")).toBe(false);
    expect(isMathSafeAnswer("3 apples")).toBe(false);
  });

  it("rejects punctuation outside the allowlist", () => {
    expect(isMathSafeAnswer("3!")).toBe(false);
    expect(isMathSafeAnswer("yes?")).toBe(false);
    expect(isMathSafeAnswer("3;4")).toBe(false);
  });

  it("rejects an over-length input even when every char is allowlisted", () => {
    const overLength = "1".repeat(MATH_ANSWER_MAX_LENGTH + 1);
    expect(overLength.length).toBeGreaterThan(MATH_ANSWER_MAX_LENGTH);
    expect(isMathSafeAnswer(overLength)).toBe(false);
  });

  it("accepts an input exactly at the length cap", () => {
    const atCap = "1".repeat(MATH_ANSWER_MAX_LENGTH);
    expect(atCap.length).toBe(MATH_ANSWER_MAX_LENGTH);
    expect(isMathSafeAnswer(atCap)).toBe(true);
  });
});
