import { describe, expect, it } from "vitest";

import {
  READINESS_COPY,
  SHORT_TEST_CLEAN_PASS_RATIO,
  computeReadiness,
} from "./readiness";

describe("SHORT_TEST_CLEAN_PASS_RATIO", () => {
  it("is an editable proportion in (0,1]", () => {
    expect(SHORT_TEST_CLEAN_PASS_RATIO).toBeGreaterThan(0);
    expect(SHORT_TEST_CLEAN_PASS_RATIO).toBeLessThanOrEqual(1);
  });
});

describe("computeReadiness", () => {
  it("returns null for a comprehensive test (readiness is short-only)", () => {
    expect(
      computeReadiness({
        testType: "comprehensive",
        overallPercentage: 95,
        gradedCount: 12,
        currentLevelLabel: "Grade 5",
      }),
    ).toBeNull();
  });

  it("clean pass with enough graded items → ready, with the current-level label", () => {
    const r = computeReadiness({
      testType: "short",
      overallPercentage: SHORT_TEST_CLEAN_PASS_RATIO * 100,
      gradedCount: 10,
      currentLevelLabel: "Grade 5",
    });
    expect(r).toEqual({ ready: true, currentLevelLabel: "Grade 5" });
  });

  it("just below threshold → NOT ready (but still a summary, short test)", () => {
    const r = computeReadiness({
      testType: "short",
      overallPercentage: SHORT_TEST_CLEAN_PASS_RATIO * 100 - 1,
      gradedCount: 10,
      currentLevelLabel: "Grade 5",
    });
    expect(r).toEqual({ ready: false, currentLevelLabel: "Grade 5" });
  });

  it("clean ratio but FEWER than 8 graded → suppressed (insufficient sample)", () => {
    const r = computeReadiness({
      testType: "short",
      overallPercentage: 100,
      gradedCount: 7,
      currentLevelLabel: "Grade 5",
    });
    expect(r).toEqual({ ready: false, currentLevelLabel: "Grade 5" });
  });

  it("0A current level → readiness line suppressed (no genuine level below)", () => {
    const r = computeReadiness({
      testType: "short",
      overallPercentage: 100,
      gradedCount: 12,
      currentLevelLabel: "0A",
    });
    expect(r).toEqual({ ready: false, currentLevelLabel: "0A" });
  });

  it("zero score → not ready (no crash), short test still returns a summary", () => {
    const r = computeReadiness({
      testType: "short",
      overallPercentage: 0,
      gradedCount: 10,
      currentLevelLabel: "Kindergarten",
    });
    expect(r).toEqual({ ready: false, currentLevelLabel: "Kindergarten" });
  });
});

describe("READINESS_COPY confirmation (generic/fallback — no date, no promise)", () => {
  it("mentions the online assessment as a capture incentive", () => {
    expect(READINESS_COPY.confirmationBody.toLowerCase()).toContain("online");
  });
  it("uses NO 'soon' and NO firm timing (§2.4)", () => {
    const body = READINESS_COPY.confirmationBody.toLowerCase();
    expect(body).not.toContain("soon");
    expect(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|20\d\d|\d+\s*(weeks?|months?|days?))\b/.test(
        body,
      ),
    ).toBe(false);
  });
});
