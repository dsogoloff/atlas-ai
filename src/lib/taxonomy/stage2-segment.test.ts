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
