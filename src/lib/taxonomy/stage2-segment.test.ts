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
  parseLevelLabel,
  QUESTION_MARKER,
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
// parseLevelLabel — digit levels plus the Kindergarten 0A/0B/0C labels
// ---------------------------------------------------------------------------

describe("parseLevelLabel", () => {
  it("parses plain digit levels", () => {
    expect(parseLevelLabel("…\nLevel 5\nPlacement Worksheet")).toBe("Level 5");
    expect(parseLevelLabel("Level 12")).toBe("Level 12");
  });

  it("parses the Kindergarten 0A/0B/0C labels", () => {
    expect(parseLevelLabel("Level 0A\nPlacement Worksheet")).toBe("Level 0A");
    expect(parseLevelLabel("…header…\nLevel 0B")).toBe("Level 0B");
    expect(parseLevelLabel("Level 0C")).toBe("Level 0C");
  });

  it("captures 0A as a unit, never the bare 0", () => {
    expect(parseLevelLabel("Level 0A")).not.toBe("Level 0");
  });

  it("is case-insensitive and normalizes to upper-case", () => {
    expect(parseLevelLabel("level 0a")).toBe("Level 0A");
  });

  it("returns null when no label is present", () => {
    expect(parseLevelLabel("Placement Worksheet Answer Key")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// QUESTION_MARKER — spaced-period task openers (L5 task 2: "2 . Which …")
// ---------------------------------------------------------------------------

describe("QUESTION_MARKER", () => {
  it("matches the standard 'N. ' opener", () => {
    expect(QUESTION_MARKER.exec("1. What is the missing number ?")?.[1]).toBe("1");
    expect(QUESTION_MARKER.exec("12. \tArrange the numbers.")?.[1]).toBe("12");
  });

  it("matches the spaced-period variant 'N . '", () => {
    expect(QUESTION_MARKER.exec("2 . Which is greater, 12 357 or 13 275?")?.[1]).toBe("2");
  });

  it("does not match decimals or mid-sentence numbers", () => {
    expect(QUESTION_MARKER.exec("3.716, 3.671, 3.617")).toBeNull();
    expect(QUESTION_MARKER.exec("25 608 = 20 000 + 5000")).toBeNull();
    expect(QUESTION_MARKER.exec("1.45 a.m.")).toBeNull();
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
// Format A: tab table — column-delta rescue shapes (L5/L6/0A/0C layouts).
// The text layer of those keys drops a column's answer or merges two tasks'
// cells onto one line. ALL fixtures synthetic; bare answer values only.
// ---------------------------------------------------------------------------

// L5-style: 30 tasks, right column = left + 15. Exercises:
//   * trailing right task number with its answer on the NEXT line ("8\t400\t23")
//   * a row whose task-number tab degraded to a space ("10 3, x")
const L5_SHAPE_KEY = [
  "Task \tAnswer \tTask \tAnswer",
  "1 \t(3) \t16 \t(2)",
  "2 \t13 275 \t17 \t(4)",
  "3 \t290 \t18 \t(3)",
  "4 \t30 \t19 \t(3)",
  "5 \t(3) \t20 \t(1)",
  "6 \t72 390 \t21 \t(2)",
  "7 \t(2) \t22 \t120",
  "8 \t400 \t23",
  "1.45 a.m.",
  "9 \t5 !",
  "24 \t92",
  "10 3, !\"",
  "# , !$",
  "25 \t108",
  "Seriously Addictive Maths",
].join("\n");

describe("parseAnswerKey — two-column rescue: trailing task number + space row", () => {
  const { byTask } = parseAnswerKey(extraction(L5_SHAPE_KEY));

  it("splits a row whose right column carries only the task number", () => {
    expect(byTask.get(8)?.answer_value).toBe("400");
    expect(byTask.get(8)?.raw_answer).toBe("400");
    expect(byTask.get(23)?.raw_answer).toBe("1.45 a.m.");
  });

  it("recovers a task whose number/answer tab degraded to a space", () => {
    expect(byTask.get(10)?.raw_answer).toBe('3, !"\n# , !$');
  });

  it("does not turn continuation prose starting with a digit into a task", () => {
    // "1.45 a.m." (decimal) stayed task 23's answer; no task 1 overwrite.
    expect(byTask.get(1)).toMatchObject({ answer_kind: "OPTION", answer_value: 3 });
  });

  it("collapses space-grouped thousands in a full row's left column", () => {
    expect(byTask.get(2)?.answer_value).toBe("13275");
  });

  it("creates no spurious entries", () => {
    expect([...byTask.keys()].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    ]);
  });
});

// L6-style: right column = left + 6. Exercises:
//   * "N1 \tN2" rows — both answers lost from the text layer
//   * "N1 \tN2 \tanswer" rows — left answer lost, tail is the right answer
//   * a continuation line carrying the next right-column row inline
const L6_SHAPE_KEY = [
  "Task \tAnswer \tTask \tAnswer",
  "1 \t85 000 \t7 \t(1)",
  "2 \t(1) \t8 \t10.125",
  "11 \t17",
  "12 \t18 \t(4)",
  "13 \t19 \t140 x 75 x 70 = 735 000",
  "735 - 320 = 415",
  "14 \t(1) \t20 \t(3)",
  "26 \t'",
  '"# x 100% = 60% \t32 \t59',
  "27 \t(4) \t33 \t110",
  "Seriously Addictive Maths",
].join("\n");

describe("parseAnswerKey — two-column rescue: lost-answer rows + embedded row", () => {
  const { byTask } = parseAnswerKey(extraction(L6_SHAPE_KEY));

  it("collapses space-grouped thousands into a clean value", () => {
    expect(byTask.get(1)?.answer_value).toBe("85000");
  });

  it("treats a bare 'N1 \\tN2' row as two tasks with lost answers", () => {
    expect(byTask.has(11)).toBe(false);
    expect(byTask.has(17)).toBe(false);
  });

  it("gives the tail of 'N1 \\tN2 \\tanswer' to the right task", () => {
    expect(byTask.has(12)).toBe(false);
    expect(byTask.get(18)).toMatchObject({ answer_kind: "OPTION", answer_value: 4 });
    expect(byTask.get(19)?.answer_value).toBe("415");
    expect(byTask.get(19)?.raw_answer).toContain("735 - 320 = 415");
  });

  it("splits a continuation line that carries the next right-column row", () => {
    expect(byTask.get(26)?.raw_answer).toBe('\'\n"# x 100% = 60%');
    expect(byTask.get(32)?.raw_answer).toBe("59");
  });

  it("leaves genuine full rows untouched", () => {
    expect(byTask.get(14)).toMatchObject({ answer_kind: "OPTION", answer_value: 1 });
    expect(byTask.get(20)).toMatchObject({ answer_kind: "OPTION", answer_value: 3 });
    expect(byTask.get(27)).toMatchObject({ answer_kind: "OPTION", answer_value: 4 });
    expect(byTask.get(33)?.answer_value).toBe("110");
  });
});

// 0A-style: row-major pairs (right column = left + 1) and NO clean fullRow
// anywhere — the delta must be derived from the rescue shapes themselves.
const PAIRED_SHAPE_KEY = [
  "Task \tAnswer \tTask \tAnswer",
  "1 \t2",
  "3 \t4 \tred; \tblue; \tgreen",
  "7 \t8 \tCar circled",
  "9",
  "Arrow drawn",
  "13 \t14",
  "Seriously Addictive Maths",
].join("\n");

describe("parseAnswerKey — paired layout without any full row", () => {
  const { byTask } = parseAnswerKey(extraction(PAIRED_SHAPE_KEY));

  it("derives the column delta from the rescue shapes (delta 1)", () => {
    expect(byTask.has(1)).toBe(false); // both answers lost
    expect(byTask.has(2)).toBe(false);
    expect(byTask.get(4)?.raw_answer).toBe("red; \tblue; \tgreen");
    expect(byTask.get(8)?.raw_answer).toBe("Car circled");
    expect(byTask.has(13)).toBe(false);
    expect(byTask.has(14)).toBe(false);
  });

  it("keeps bare-number rows with continuation answers working", () => {
    expect(byTask.get(9)?.raw_answer).toBe("Arrow drawn");
  });
});

// Single-column key (0B layout, header "Task \tAnswer"): the rescue shapes
// must stay OFF — "10 \t8" is task 10 with the genuine numeric answer 8.
const SINGLE_COLUMN_KEY = [
  "Task \tAnswer",
  "2 \tMagnet",
  "5 \t9, 7, 6, 4, 3, 2, 1",
  "10 \t8",
  "11 \t12",
  "Seriously Addictive Maths",
].join("\n");

describe("parseAnswerKey — single-column key disables rescue shapes", () => {
  const { byTask } = parseAnswerKey(extraction(SINGLE_COLUMN_KEY));

  it("keeps numeric answers that look like task numbers", () => {
    expect(byTask.get(10)?.answer_value).toBe("8");
    expect(byTask.get(11)?.answer_value).toBe("12");
    expect(byTask.has(12)).toBe(false);
  });

  it("parses ordinary single-column entries", () => {
    expect(byTask.get(2)?.answer_value).toBe("Magnet");
    expect(byTask.get(5)?.answer_value).toBe("9, 7, 6, 4, 3, 2, 1");
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
