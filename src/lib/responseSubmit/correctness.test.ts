import { describe, expect, it } from "vitest";

import type { Json } from "@/lib/supabase/database.types";

import { judgeAnswer } from "./correctness";

const content = (correct: Json): Json => ({ correct_answer: correct });

describe("judgeAnswer / MULTIPLE_CHOICE", () => {
  it("matches exact option id", () => {
    expect(judgeAnswer("MULTIPLE_CHOICE", content("A"), "A")).toBe(true);
  });
  it("rejects different option id", () => {
    expect(judgeAnswer("MULTIPLE_CHOICE", content("A"), "B")).toBe(false);
  });
  it("trims whitespace on both sides", () => {
    expect(judgeAnswer("MULTIPLE_CHOICE", content(" A "), "  A  ")).toBe(true);
  });
  it("is case-sensitive", () => {
    expect(judgeAnswer("MULTIPLE_CHOICE", content("a"), "A")).toBe(false);
  });
});

describe("judgeAnswer / NUMERIC_ENTRY", () => {
  it("matches exact integer", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", content("7"), "7")).toBe(true);
  });
  it("strips leading zeros via numeric coercion", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", content("7"), "007")).toBe(true);
  });
  it("treats 7 and 7.0 as equal", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", content("7"), "7.0")).toBe(true);
  });
  it("trims whitespace then numerically compares", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", content("7"), "  7  ")).toBe(true);
  });
  it("matches negative numbers", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", content("-3"), "-3")).toBe(true);
  });
  it("rejects different numeric value", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", content("7"), "8")).toBe(false);
  });
  it("falls back to string equality when regex blocks coercion (1/2 vs 0.5)", () => {
    // Documented v1 limitation: NUMERIC_ENTRY questions are authored with
    // numeric correct answers and we do not promise fraction-aware compare.
    expect(judgeAnswer("NUMERIC_ENTRY", content("0.5"), "1/2")).toBe(false);
  });
  it("matches non-numeric strings exactly when both sides skip coercion", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", content("1/2"), "1/2")).toBe(true);
  });
});

describe("judgeAnswer / DRAG_DROP", () => {
  it("matches when client sends JSON.stringify of correct_answer", () => {
    const order = ["A", "B", "C"];
    expect(
      judgeAnswer("DRAG_DROP", content(order), JSON.stringify(order)),
    ).toBe(true);
  });
  it("rejects different ordering", () => {
    expect(
      judgeAnswer(
        "DRAG_DROP",
        content(["A", "B", "C"]),
        JSON.stringify(["A", "C", "B"]),
      ),
    ).toBe(false);
  });
});

describe("judgeAnswer / content errors", () => {
  it("throws when content is not an object", () => {
    expect(() => judgeAnswer("MULTIPLE_CHOICE", "raw" as Json, "A")).toThrow();
  });
  it("throws when content is null", () => {
    expect(() => judgeAnswer("MULTIPLE_CHOICE", null, "A")).toThrow();
  });
  it("throws when content is an array", () => {
    expect(() =>
      judgeAnswer("MULTIPLE_CHOICE", ["A", "B"] as Json, "A"),
    ).toThrow();
  });
  it("throws when correct_answer is missing", () => {
    expect(() =>
      judgeAnswer("MULTIPLE_CHOICE", { stem: "x" } as Json, "A"),
    ).toThrow();
  });
});
