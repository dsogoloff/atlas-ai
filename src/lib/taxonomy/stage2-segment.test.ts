// Unit tests for the answer-key parser of the conversion pipeline's Stage 2
// segmenter (scripts/conversion/stage2-segment.ts).
//
// Lives under src/ (next to the stage4-load tests) because the vitest config
// only discovers src/**/*.test.ts; the script itself stays in
// scripts/conversion/ alongside stages 1–3.
//
// ALL fixtures below are SYNTHETIC — fabricated answer-key text modeled on
// the two observed key layouts (L1/L2 tab table, L3 numbered list). No real
// S.A.M. licensed question text appears here; bare answer values only.

import { describe, expect, it } from "vitest";

import {
  normalizeMathDigits,
  parseAnswerKey,
  reattributeOrphanOptionBlocks,
  type SegmentedQuestion,
  type Stage1Extraction,
} from "../../../scripts/conversion/stage2-segment";

function extraction(text: string): Stage1Extraction {
  return {
    source: "synthetic-answer-key.pdf",
    extractedAt: "2026-01-01T00:00:00.000Z",
    pageCount: 1,
    pages: [{ page: 1, image: "page-01.png", text }],
  };
}

// ---------------------------------------------------------------------------
// normalizeMathDigits
// ---------------------------------------------------------------------------

describe("normalizeMathDigits", () => {
  it("maps mathematical-bold digits to ASCII", () => {
    expect(normalizeMathDigits("𝟒")).toBe("4");
    expect(normalizeMathDigits("𝟏𝟎𝟑𝟎")).toBe("1030");
    expect(normalizeMathDigits("𝟐/𝟏𝟏 , 𝟔/𝟏𝟏")).toBe("2/11 , 6/11");
  });

  it("leaves ASCII text untouched", () => {
    expect(normalizeMathDigits("716, 708, 652")).toBe("716, 708, 652");
    expect(normalizeMathDigits("cylinder")).toBe("cylinder");
  });
});

// ---------------------------------------------------------------------------
// Format A: tab table (L1/L2 layout) — backward compatibility
// ---------------------------------------------------------------------------

const TAB_TABLE_KEY = [
  "Answer Key – Level 1",
  "Task \tAnswer \tTask \tAnswer",
  "1 \t( 2 ) \t5 \t14",
  "2 \t30 - 2 = 28",
  "She gave away",
  "28 apples.",
  "3 \tNinety-six \t6 \t9, 68, 81",
  "4 \t780",
  "Beth \tDave",
].join("\n");

describe("parseAnswerKey — tab-table format", () => {
  const { byTask } = parseAnswerKey(extraction(TAB_TABLE_KEY));

  it("parses full rows into both task columns", () => {
    expect(byTask.get(1)).toMatchObject({ answer_kind: "OPTION", answer_value: 2 });
    expect(byTask.get(5)).toMatchObject({ answer_kind: "VALUE", answer_value: "14" });
  });

  it("accumulates multi-line worked solutions and extracts the result", () => {
    expect(byTask.get(2)?.answer_value).toBe("28");
    expect(byTask.get(2)?.raw_answer).toContain("She gave away");
  });

  it("handles word answers and number sequences", () => {
    expect(byTask.get(3)?.answer_value).toBe("Ninety-six");
    expect(byTask.get(6)?.answer_value).toBe("9, 68, 81");
  });

  it("keeps the first bare-number line when a stray block bleeds in", () => {
    expect(byTask.get(4)?.answer_value).toBe("780");
  });

  it("creates no spurious entries", () => {
    expect([...byTask.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// ---------------------------------------------------------------------------
// Format B: single-column numbered list (L3 layout)
// ---------------------------------------------------------------------------

const NUMBERED_LIST_KEY = [
  "Placement Worksheet – Level 3",
  "Copyright © Synthetic Test Fixture. All rights reserved. Not to be used without the",
  "written permission of the copyright owner.",
  "1", // stray page number — must not open task 1
  "1. 3",
  "2. Five hundred and eight",
  "3. 1000 , 999 , 909 , 100",
  "4. \t1", // tab after the period
  "5. 𝟒", // stacked bold-digit fraction: 4/9
  "𝟗",
  "6. 𝟐", // stacked bold-digit fraction list: 2/11, 6/11, 9/11, 10/11
  "𝟏𝟏 , 𝟔",
  "𝟏𝟏 , 𝟗",
  "𝟏𝟏 , 𝟏𝟎",
  "𝟏𝟏",
  "7.", // genuinely empty answer — must yield a gap, not an entry
  "8. \tcylinder",
  "9. \t1030",
  "Seriously Addictive Maths", // footer — must not be absorbed into task 9
].join("\n");

describe("parseAnswerKey — numbered-list format", () => {
  const { byTask } = parseAnswerKey(extraction(NUMBERED_LIST_KEY));

  it("parses simple numeric and word answers", () => {
    expect(byTask.get(1)).toMatchObject({ answer_kind: "VALUE", answer_value: "3" });
    expect(byTask.get(2)?.answer_value).toBe("Five hundred and eight");
    expect(byTask.get(8)?.answer_value).toBe("cylinder");
  });

  it("keeps number-sequence (ordering) answers intact", () => {
    expect(byTask.get(3)?.answer_value).toBe("1000 , 999 , 909 , 100");
  });

  it("tolerates a tab after the period", () => {
    expect(byTask.get(4)?.answer_value).toBe("1");
  });

  it("reconstructs a stacked bold-digit fraction", () => {
    expect(byTask.get(5)?.answer_value).toBe("4/9");
    expect(byTask.get(5)?.raw_answer).toBe("4\n9");
  });

  it("reconstructs a stacked bold-digit fraction list", () => {
    expect(byTask.get(6)?.answer_value).toBe("2/11, 6/11, 9/11, 10/11");
  });

  it("leaves an empty answer as a gap (no entry)", () => {
    expect(byTask.has(7)).toBe(false);
  });

  it("does not absorb footer text into the last answer", () => {
    expect(byTask.get(9)?.answer_value).toBe("1030");
    expect(byTask.get(9)?.raw_answer).toBe("1030");
  });

  it("ignores header noise and the stray page number", () => {
    expect([...byTask.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 8, 9]);
  });
});

// ---------------------------------------------------------------------------
// Format A: tab table — fullRow right-column continuation (memo M3 fix).
// The right column of a "N\ta\tN\ta" row can carry a worked solution that
// wraps onto following lines; the old parser committed the right column
// immediately and dropped the continuation.
// ---------------------------------------------------------------------------

const TAB_TABLE_CONTINUATION_KEY = [
  "Answer Key – Level 9", // synthetic
  "Task \tAnswer \tTask \tAnswer",
  "1 \t(2) \t7 \t4 km 600 m = 4600 m",
  "4600 ÷ 2 = 2300",
  "2300 m = 2 km 300 m",
  "Tom ran 2 km 300 m.",
  "2 \t9 \t8 \t(1)",
  "3 \t(4) \t9 \t30 - 2 = 28",
  "She gave away",
  "28 apples.",
  "Seriously Addictive Maths", // footer — must not be absorbed into task 9
].join("\n");

describe("parseAnswerKey — tab-table fullRow continuation", () => {
  const { byTask } = parseAnswerKey(extraction(TAB_TABLE_CONTINUATION_KEY));

  it("accumulates the right column's multi-line worked solution", () => {
    const entry = byTask.get(7);
    expect(entry?.raw_answer).toBe(
      "4 km 600 m = 4600 m\n4600 ÷ 2 = 2300\n2300 m = 2 km 300 m\nTom ran 2 km 300 m.",
    );
  });

  it("still extracts a clean value when a bare-number line exists", () => {
    expect(byTask.get(9)?.answer_value).toBe("28");
    expect(byTask.get(9)?.raw_answer).toContain("She gave away");
  });

  it("the left column and single-line right columns are unaffected", () => {
    expect(byTask.get(1)).toMatchObject({ answer_kind: "OPTION", answer_value: 2 });
    expect(byTask.get(2)?.answer_value).toBe("9");
    expect(byTask.get(3)).toMatchObject({ answer_kind: "OPTION", answer_value: 4 });
    expect(byTask.get(8)).toMatchObject({ answer_kind: "OPTION", answer_value: 1 });
  });

  it("does not absorb the trailing footer into the last open entry", () => {
    expect(byTask.get(9)?.raw_answer).not.toContain("Seriously Addictive");
  });

  it("creates no spurious entries", () => {
    expect([...byTask.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 7, 8, 9]);
  });
});

// ---------------------------------------------------------------------------
// Orphan option-block re-attribution (memo M2 fix). Synthetic fixtures
// reproducing the L3 page-14 (Q22/Q23) and page-4 (Q03/Q04) shapes —
// fabricated question text, real line STRUCTURE.
// ---------------------------------------------------------------------------

function seg(task_number: number, pages: number[], rawLines: string[]): SegmentedQuestion {
  return {
    task_number,
    pages,
    page_images: pages.map((p) => `page-${String(p).padStart(2, "0")}.png`),
    raw_text: rawLines.join("\n"),
  };
}

describe("reattributeOrphanOptionBlocks", () => {
  it("re-attaches an orphan (1)..(4) block that follows the next task's Answer: line", () => {
    // The Q22/Q23 shape: task 12's options landed inside task 13's block,
    // after "Answer:", with task 13's own diagram line following.
    const segments = [
      seg(12, [14], ["12. \tWhat is the largest 4-digit odd number?"]),
      seg(13, [14], [
        "13. What is the missing number in the pattern below.",
        "Answer:",
        "(1) 2000 \t(2) \t2002",
        "(3) 8887 \t(4) \t8889 \t( \t)",
        "? \t111 \t222 \t333 \t444",
      ]),
    ];
    const moves = reattributeOrphanOptionBlocks(segments);
    expect(moves).toEqual([
      {
        from_task: 13,
        to_task: 12,
        lines: ["(1) 2000 \t(2) \t2002", "(3) 8887 \t(4) \t8889 \t( \t)"],
      },
    ]);
    expect(segments[0].raw_text).toBe(
      [
        "12. \tWhat is the largest 4-digit odd number?",
        "(1) 2000 \t(2) \t2002",
        "(3) 8887 \t(4) \t8889 \t( \t)",
      ].join("\n"),
    );
    expect(segments[1].raw_text).toBe(
      [
        "13. What is the missing number in the pattern below.",
        "Answer:",
        "? \t111 \t222 \t333 \t444",
      ].join("\n"),
    );
  });

  it("re-attaches when the previous task ends with a bare answer circle (Q03/Q04 shape)", () => {
    const segments = [
      seg(3, [4], [
        "3. \tIn the number 507, what does the digit ‘5’",
        "stand for?",
        "( \t)",
      ]),
      seg(4, [4], [
        "4. \tArrange the numbers in order. Begin with the",
        "greatest.",
        "2000 \t808 \t200 \t888",
        "Answer: \t, \t, \t,",
        "(1) \t5 ones \t(2) \t5 \ttens",
        "(3) \t5 hundreds \t(4) \t5 \tthousands",
      ]),
    ];
    const moves = reattributeOrphanOptionBlocks(segments);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ from_task: 4, to_task: 3 });
    expect(segments[0].raw_text.endsWith(
      "(1) \t5 ones \t(2) \t5 \ttens\n(3) \t5 hundreds \t(4) \t5 \tthousands",
    )).toBe(true);
    expect(segments[1].raw_text).not.toContain("(1)");
    expect(segments[1].raw_text).toContain("Answer: \t, \t, \t,");
  });

  it("leaves a genuine MC task alone (options not preceded by Answer:)", () => {
    const segments = [
      seg(10, [8], ["10. \tWhat is 6 + 6?"]),
      seg(11, [8], [
        "11. Which of the following is equal to 14?",
        "(1) \t7 × 2 \t(2) \t7 × 3",
        "(3) \t7 ÷ 2 \t(4) \t4 ÷ 2 \t( \t)",
      ]),
    ];
    expect(reattributeOrphanOptionBlocks(segments)).toEqual([]);
    expect(segments[1].raw_text).toContain("(1)");
  });

  it("does not move a block when the previous task already has option markers", () => {
    const segments = [
      seg(5, [6], [
        "5. Pick one.",
        "(1) \ta \t(2) \tb",
        "(3) \tc \t(4) \td \t( \t)",
      ]),
      seg(6, [6], [
        "6. What is the missing number?",
        "Answer:",
        "(1) 1 \t(2) \t2",
        "(3) 3 \t(4) \t4 \t( \t)",
      ]),
    ];
    expect(reattributeOrphanOptionBlocks(segments)).toEqual([]);
  });

  it("does not move a block across pages", () => {
    const segments = [
      seg(7, [9], ["7. \tWhat is the smallest 3-digit number?"]),
      seg(8, [10], [
        "8. What comes next?",
        "Answer:",
        "(1) 10 \t(2) \t20",
        "(3) 30 \t(4) \t40 \t( \t)",
      ]),
    ];
    expect(reattributeOrphanOptionBlocks(segments)).toEqual([]);
  });

  it("requires the run's markers to be exactly (1)..(4) in order", () => {
    const segments = [
      seg(1, [2], ["1. \tName a shape."]),
      seg(2, [2], [
        "2. What is the missing number?",
        "Answer:",
        "(1) 5 \t(3) \t6", // (2) missing — not a complete option block
      ]),
    ];
    expect(reattributeOrphanOptionBlocks(segments)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

describe("parseAnswerKey — format detection", () => {
  it("prefers the tab-table parser when the Task/Answer header is present", () => {
    // A tab table whose worked solution happens to contain "N. " lines must
    // still go through the tab-table path.
    const text = [
      "Task \tAnswer \tTask \tAnswer",
      "1 \t( 3 ) \t2 \t42",
    ].join("\n");
    const { byTask } = parseAnswerKey(extraction(text));
    expect(byTask.get(1)).toMatchObject({ answer_kind: "OPTION", answer_value: 3 });
    expect(byTask.get(2)?.answer_value).toBe("42");
  });

  it("falls back to the tab-table parser when too few numbered lines exist", () => {
    const text = ["1 \t( 2 )", "2 \t17"].join("\n");
    const { byTask } = parseAnswerKey(extraction(text));
    expect(byTask.get(1)).toMatchObject({ answer_kind: "OPTION", answer_value: 2 });
    expect(byTask.get(2)?.answer_value).toBe("17");
  });
});
