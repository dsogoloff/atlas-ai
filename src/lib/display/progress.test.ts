// Unit tests for the display helpers powering the child progress chrome
// and the parent-facing time-flag badge. Pure functions; vitest only.

import { describe, expect, it } from "vitest";

import { MAX_QUESTIONS } from "@/lib/engine/engine";

import { computeProgressDisplay, timeFlagBadge } from "./progress";

describe("computeProgressDisplay", () => {
  it("renders 'Question 1 of up to 25' for a fresh session", () => {
    const d = computeProgressDisplay(0);
    expect(d.questionNumber).toBe(1);
    expect(d.maxQuestions).toBe(MAX_QUESTIONS);
    expect(d.copy).toBe(`Question 1 of up to ${MAX_QUESTIONS}`);
    expect(d.percent).toBeCloseTo((1 / MAX_QUESTIONS) * 100);
  });

  it("renders 'Question 4 of up to 25' for a resume with 3 past answers", () => {
    const d = computeProgressDisplay(3);
    expect(d.questionNumber).toBe(4);
    expect(d.copy).toBe(`Question 4 of up to ${MAX_QUESTIONS}`);
    expect(d.percent).toBeCloseTo((4 / MAX_QUESTIONS) * 100);
  });

  it("clamps questionNumber to MAX_QUESTIONS at the ceiling", () => {
    const d = computeProgressDisplay(MAX_QUESTIONS - 1);
    expect(d.questionNumber).toBe(MAX_QUESTIONS);
    expect(d.copy).toBe(`Question ${MAX_QUESTIONS} of up to ${MAX_QUESTIONS}`);
    expect(d.percent).toBe(100);
  });

  it("never exceeds MAX_QUESTIONS even if responseCount is out of range", () => {
    // Defensive — shouldn't happen at runtime since the server caps
    // responseCount at MAX_QUESTIONS via shouldTerminate, but the
    // helper handles it cleanly without lying about the question
    // number.
    const d = computeProgressDisplay(999);
    expect(d.questionNumber).toBe(MAX_QUESTIONS);
    expect(d.percent).toBe(100);
  });

  it("treats negative responseCount as 0", () => {
    const d = computeProgressDisplay(-5);
    expect(d.questionNumber).toBe(1);
  });

  it("floors fractional responseCount", () => {
    // Defensive — wire shape is integer but a stale client could send
    // anything; clamp behavior matters for visual stability.
    const d = computeProgressDisplay(2.7);
    expect(d.questionNumber).toBe(3);
  });

  // Item #14 — the denominator is the per-session ceiling, not a fixed 25.
  it("uses the supplied per-session ceiling as the denominator", () => {
    const d = computeProgressDisplay(0, 12);
    expect(d.maxQuestions).toBe(12);
    expect(d.copy).toBe("Question 1 of up to 12");
    expect(d.percent).toBeCloseTo((1 / 12) * 100);
  });

  it("clamps to a thin exhaustion-bound ceiling (e.g. L1 = 8)", () => {
    const d = computeProgressDisplay(20, 8);
    expect(d.questionNumber).toBe(8);
    expect(d.copy).toBe("Question 8 of up to 8");
    expect(d.percent).toBe(100);
  });

  it("floors the ceiling at 1 so the denominator is never zero", () => {
    const d = computeProgressDisplay(0, 0);
    expect(d.maxQuestions).toBe(1);
    expect(d.percent).toBe(100);
  });

  it("defaults to MAX_QUESTIONS when no ceiling is supplied", () => {
    const d = computeProgressDisplay(0);
    expect(d.maxQuestions).toBe(MAX_QUESTIONS);
  });
});

describe("timeFlagBadge", () => {
  it("returns 'Quick answer' for TOO_FAST", () => {
    expect(timeFlagBadge("TOO_FAST")).toBe("Quick answer");
  });

  it("returns 'Took longer than expected' for TOO_SLOW", () => {
    expect(timeFlagBadge("TOO_SLOW")).toBe("Took longer than expected");
  });

  it("returns null for NORMAL (no badge — uncluttered row)", () => {
    expect(timeFlagBadge("NORMAL")).toBeNull();
  });

  it("returns null for INVALID (sub-second; signal is noise)", () => {
    expect(timeFlagBadge("INVALID")).toBeNull();
  });
});
