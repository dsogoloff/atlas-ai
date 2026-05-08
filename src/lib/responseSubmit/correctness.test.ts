import { describe, expect, it } from "vitest";

import type { Json } from "@/lib/supabase/database.types";

import { judgeAnswer } from "./correctness";

// Fixture helpers mirror real seed shapes (supabase/seed.sql:162-198):
//   * MULTIPLE_CHOICE: { stem, options[], correct_index }
//   * NUMERIC_ENTRY:   { stem, correct_answer }
//   * DRAG_DROP:       { stem, items[], correct_order[] }
const mcContent = (options: string[], correctIndex: number): Json =>
  ({ stem: "stem", options, correct_index: correctIndex }) as Json;

const neContent = (correctAnswer: string): Json =>
  ({ stem: "stem", correct_answer: correctAnswer }) as Json;

const ddContent = (items: string[], correctOrder: string[]): Json =>
  ({ stem: "stem", items, correct_order: correctOrder }) as Json;

describe("judgeAnswer / MULTIPLE_CHOICE", () => {
  it("matches when answer equals options[correct_index]", () => {
    expect(
      judgeAnswer("MULTIPLE_CHOICE", mcContent(["A", "B", "C"], 0), "A"),
    ).toBe(true);
  });

  it("matches a non-zero correct_index", () => {
    expect(
      judgeAnswer("MULTIPLE_CHOICE", mcContent(["A", "B", "C"], 1), "B"),
    ).toBe(true);
  });

  it("rejects answers that match a different option", () => {
    expect(
      judgeAnswer("MULTIPLE_CHOICE", mcContent(["A", "B", "C"], 0), "B"),
    ).toBe(false);
  });

  it("trims whitespace on both sides", () => {
    expect(
      judgeAnswer("MULTIPLE_CHOICE", mcContent([" A ", "B"], 0), "  A  "),
    ).toBe(true);
  });

  it("is case-sensitive", () => {
    expect(
      judgeAnswer("MULTIPLE_CHOICE", mcContent(["a", "A"], 0), "A"),
    ).toBe(false);
  });

  it("works against the seed-shape fixture (47 - 19 = ?)", () => {
    // Mirrors PLACEHOLDER-Q-002 from supabase/seed.sql:170-176.
    const content = mcContent(["28", "38", "26", "32"], 0);
    expect(judgeAnswer("MULTIPLE_CHOICE", content, "28")).toBe(true);
    expect(judgeAnswer("MULTIPLE_CHOICE", content, "38")).toBe(false);
  });
});

describe("judgeAnswer / NUMERIC_ENTRY", () => {
  it("matches exact integer", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("7"), "7")).toBe(true);
  });
  it("strips leading zeros via numeric coercion", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("7"), "007")).toBe(true);
  });
  it("treats 7 and 7.0 as equal", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("7"), "7.0")).toBe(true);
  });
  it("trims whitespace then numerically compares", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("7"), "  7  ")).toBe(true);
  });
  it("matches negative numbers", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("-3"), "-3")).toBe(true);
  });
  it("rejects different numeric value", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("7"), "8")).toBe(false);
  });
  it("falls back to string equality when regex blocks coercion (1/2 vs 0.5)", () => {
    // Documented v1 limitation: NUMERIC_ENTRY questions are authored with
    // numeric correct answers and we do not promise fraction-aware compare.
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("0.5"), "1/2")).toBe(false);
  });
  it("matches non-numeric strings exactly when both sides skip coercion", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("1/2"), "1/2")).toBe(true);
  });
});

describe("judgeAnswer / DRAG_DROP", () => {
  it("matches when client sends JSON.stringify of correct_order", () => {
    const order = ["A", "B", "C"];
    expect(
      judgeAnswer("DRAG_DROP", ddContent(order, order), JSON.stringify(order)),
    ).toBe(true);
  });
  it("rejects different ordering", () => {
    expect(
      judgeAnswer(
        "DRAG_DROP",
        ddContent(["A", "B", "C"], ["A", "B", "C"]),
        JSON.stringify(["A", "C", "B"]),
      ),
    ).toBe(false);
  });
  it("works against the seed-shape fixture (fraction ordering)", () => {
    // Mirrors PLACEHOLDER-Q-004 from supabase/seed.sql:185-189.
    const items = ["1/2", "1/4", "3/4", "1/3"];
    const correctOrder = ["1/4", "1/3", "1/2", "3/4"];
    expect(
      judgeAnswer(
        "DRAG_DROP",
        ddContent(items, correctOrder),
        JSON.stringify(correctOrder),
      ),
    ).toBe(true);
  });
});

describe("judgeAnswer / content errors — generic", () => {
  it("throws when content is not an object", () => {
    expect(() => judgeAnswer("MULTIPLE_CHOICE", "raw" as Json, "A")).toThrow(
      /not an object/,
    );
  });
  it("throws when content is null", () => {
    expect(() => judgeAnswer("MULTIPLE_CHOICE", null, "A")).toThrow(
      /not an object/,
    );
  });
  it("throws when content is an array", () => {
    expect(() =>
      judgeAnswer("MULTIPLE_CHOICE", ["A", "B"] as Json, "A"),
    ).toThrow(/not an object/);
  });
});

describe("judgeAnswer / MULTIPLE_CHOICE content errors", () => {
  it("throws when options is missing", () => {
    expect(() =>
      judgeAnswer(
        "MULTIPLE_CHOICE",
        { correct_index: 0 } as Json,
        "A",
      ),
    ).toThrow(/options/);
  });
  it("throws when correct_index is missing", () => {
    expect(() =>
      judgeAnswer(
        "MULTIPLE_CHOICE",
        { options: ["A", "B"] } as Json,
        "A",
      ),
    ).toThrow(/correct_index/);
  });
  it("throws when correct_index is not an integer", () => {
    expect(() =>
      judgeAnswer(
        "MULTIPLE_CHOICE",
        { options: ["A", "B"], correct_index: 0.5 } as Json,
        "A",
      ),
    ).toThrow(/correct_index/);
  });
  it("throws when correct_index is out of range (negative)", () => {
    expect(() =>
      judgeAnswer("MULTIPLE_CHOICE", mcContent(["A", "B"], -1), "A"),
    ).toThrow(/out of range/);
  });
  it("throws when correct_index is out of range (>= options.length)", () => {
    expect(() =>
      judgeAnswer("MULTIPLE_CHOICE", mcContent(["A", "B"], 2), "A"),
    ).toThrow(/out of range/);
  });
  it("throws when options contains non-string entries", () => {
    expect(() =>
      judgeAnswer(
        "MULTIPLE_CHOICE",
        { options: ["A", 42], correct_index: 0 } as Json,
        "A",
      ),
    ).toThrow(/non-string/);
  });
});

describe("judgeAnswer / NUMERIC_ENTRY content errors", () => {
  it("throws when correct_answer is missing", () => {
    expect(() =>
      judgeAnswer("NUMERIC_ENTRY", { stem: "x" } as Json, "7"),
    ).toThrow(/correct_answer/);
  });
  it("throws when correct_answer is not a string", () => {
    expect(() =>
      judgeAnswer("NUMERIC_ENTRY", { correct_answer: 7 } as Json, "7"),
    ).toThrow(/correct_answer/);
  });
});

describe("judgeAnswer / DRAG_DROP content errors", () => {
  it("throws when correct_order is missing", () => {
    expect(() =>
      judgeAnswer("DRAG_DROP", { items: ["A", "B"] } as Json, "[]"),
    ).toThrow(/correct_order/);
  });
  it("throws when correct_order is not an array", () => {
    expect(() =>
      judgeAnswer(
        "DRAG_DROP",
        { items: ["A", "B"], correct_order: "A,B" } as Json,
        "[]",
      ),
    ).toThrow(/correct_order/);
  });
});
