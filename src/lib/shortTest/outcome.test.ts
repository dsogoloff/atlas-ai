import { describe, expect, it } from "vitest";

import {
  derivePassBand,
  deriveShortTestOutcome,
  SHORT_TEST_CLEAN_PASS_RATIO,
  SHORT_TEST_MIN_GRADED,
  SHORT_TEST_MIXED_FLOOR,
  type OutcomeResponse,
} from "./outcome";

function resp(
  strand: OutcomeResponse["strand"],
  isCorrect: boolean,
  questionId: string,
): OutcomeResponse {
  return { strand, isCorrect, questionId };
}

describe("derivePassBand", () => {
  it("flags fewer than the graded floor as insufficient regardless of ratio", () => {
    // 7-of-7 perfect, but below the 8-item floor.
    expect(derivePassBand(7, 7)).toBe("insufficient");
    expect(SHORT_TEST_MIN_GRADED).toBe(8);
  });

  it("clean at/above the clean ratio once the floor is met", () => {
    // 8 graded, 0.8 ratio (rounded boundary): 7/8 = 0.875 clean; 8/10 = 0.8 clean.
    expect(derivePassBand(8, 10)).toBe("clean");
    expect(derivePassBand(7, 8)).toBe("clean");
    // exactly at the threshold counts as clean.
    expect(derivePassBand(8, 8)).toBe("clean");
    expect(SHORT_TEST_CLEAN_PASS_RATIO).toBe(0.8);
  });

  it("mixed between the mixed floor and the clean ratio", () => {
    // 6/10 = 0.6 mixed; 5/10 = 0.5 mixed (boundary inclusive).
    expect(derivePassBand(6, 10)).toBe("mixed");
    expect(derivePassBand(5, 10)).toBe("mixed");
    expect(SHORT_TEST_MIXED_FLOOR).toBe(0.5);
  });

  it("weak below the mixed floor", () => {
    // 4/10 = 0.4 weak; 0/12 weak.
    expect(derivePassBand(4, 10)).toBe("weak");
    expect(derivePassBand(0, 12)).toBe("weak");
  });
});

describe("deriveShortTestOutcome", () => {
  it("computes per-strand correct/seen/ratio, overall ratio, band, and seen ids", () => {
    const responses: OutcomeResponse[] = [
      resp("number_sense", true, "q1"),
      resp("number_sense", true, "q2"),
      resp("operations_algorithms", false, "q3"),
      resp("operations_algorithms", true, "q4"),
      resp("geometry", true, "q5"),
      resp("geometry", true, "q6"),
      resp("measurement", true, "q7"),
      resp("measurement", false, "q8"),
      resp("fractions_decimals", true, "q9"),
      resp("data_statistics", true, "q10"),
    ];

    const outcome = deriveShortTestOutcome({
      measuredLevel: "4",
      intakeLevel: "5",
      responses,
    });

    expect(outcome.measured_level).toBe("4");
    expect(outcome.intake_level).toBe("5");
    expect(outcome.seen_item_ids).toEqual([
      "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10",
    ]);
    // 8 correct of 10 → 0.8 → clean.
    expect(outcome.clean_pass_ratio).toBeCloseTo(0.8, 10);
    expect(outcome.pass_band).toBe("clean");

    expect(outcome.strand_map.number_sense).toEqual({
      correct: 2,
      seen: 2,
      ratio: 1,
    });
    expect(outcome.strand_map.operations_algorithms).toEqual({
      correct: 1,
      seen: 2,
      ratio: 0.5,
    });
    expect(outcome.strand_map.measurement).toEqual({
      correct: 1,
      seen: 2,
      ratio: 0.5,
    });
    expect(outcome.strand_map.fractions_decimals).toEqual({
      correct: 1,
      seen: 1,
      ratio: 1,
    });
  });

  it("dedupes seen_item_ids defensively while still counting each response", () => {
    const responses: OutcomeResponse[] = [
      resp("number_sense", true, "q1"),
      resp("number_sense", false, "q1"),
    ];
    const outcome = deriveShortTestOutcome({
      measuredLevel: "1",
      intakeLevel: "1",
      responses,
    });
    expect(outcome.seen_item_ids).toEqual(["q1"]);
    expect(outcome.strand_map.number_sense.seen).toBe(2);
    expect(outcome.strand_map.number_sense.correct).toBe(1);
  });

  it("an empty session yields a 0 ratio and insufficient band", () => {
    const outcome = deriveShortTestOutcome({
      measuredLevel: "0C",
      intakeLevel: "0C",
      responses: [],
    });
    expect(outcome.clean_pass_ratio).toBe(0);
    expect(outcome.pass_band).toBe("insufficient");
    expect(outcome.seen_item_ids).toEqual([]);
    expect(outcome.strand_map).toEqual({});
  });
});
