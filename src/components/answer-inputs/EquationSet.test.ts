// Unit tests for the EquationSet pure helpers (node env, no DOM).

import { describe, expect, it } from "vitest";

import { defaultRows, rowsToEquationSet, type RowDraft } from "./EquationSet";
import type { EquationSetSpec } from "./types";
import type { Equation } from "@/lib/grading/types";

describe("defaultRows", () => {
  it("builds N empty rows with op = first allowed op", () => {
    const spec: EquationSetSpec = { kind: "equation-set", rows: 3, ops: ["x"] };
    expect(defaultRows(spec)).toEqual([
      { a: "", op: "x", b: "", result: "" },
      { a: "", op: "x", b: "", result: "" },
      { a: "", op: "x", b: "", result: "" },
    ]);
  });

  it("defaults op to '+' when ops is omitted", () => {
    const spec: EquationSetSpec = { kind: "equation-set", rows: 2 };
    expect(defaultRows(spec)).toEqual([
      { a: "", op: "+", b: "", result: "" },
      { a: "", op: "+", b: "", result: "" },
    ]);
  });
});

describe("rowsToEquationSet", () => {
  it("parses fully filled rows into Equation[] with an equation-set type", () => {
    const rows: RowDraft[] = [
      { a: "6", op: "+", b: "2", result: "8" },
      { a: "10", op: "-", b: "4", result: "6" },
    ];
    expect(rowsToEquationSet(rows)).toEqual({
      type: "equation-set",
      equations: [
        { a: 6, op: "+", b: 2, result: 8 },
        { a: 10, op: "-", b: 4, result: 6 },
      ],
    });
  });

  it("skips rows with any blank cell", () => {
    const rows: RowDraft[] = [
      { a: "6", op: "+", b: "2", result: "8" },
      { a: "", op: "+", b: "2", result: "8" },
      { a: "6", op: "+", b: "", result: "8" },
      { a: "6", op: "+", b: "2", result: "" },
    ];
    expect(rowsToEquationSet(rows)).toEqual({
      type: "equation-set",
      equations: [{ a: 6, op: "+", b: 2, result: 8 }],
    });
  });

  it("skips rows with a non-numeric (NaN) cell", () => {
    const rows: RowDraft[] = [
      { a: "6", op: "+", b: "two", result: "8" },
      { a: "abc", op: "-", b: "4", result: "6" },
      { a: "5", op: "+", b: "5", result: "10" },
    ];
    expect(rowsToEquationSet(rows)).toEqual({
      type: "equation-set",
      equations: [{ a: 5, op: "+", b: 5, result: 10 }],
    });
  });

  it("produces the expected equations for a 6/8/2 fact family", () => {
    const rows: RowDraft[] = [
      { a: "6", op: "+", b: "2", result: "8" },
      { a: "2", op: "+", b: "6", result: "8" },
      { a: "8", op: "-", b: "6", result: "2" },
      { a: "8", op: "-", b: "2", result: "6" },
    ];
    const expected: Equation[] = [
      { a: 6, op: "+", b: 2, result: 8 },
      { a: 2, op: "+", b: 6, result: 8 },
      { a: 8, op: "-", b: 6, result: 2 },
      { a: 8, op: "-", b: 2, result: 6 },
    ];
    const value = rowsToEquationSet(rows);
    expect(value).toEqual({ type: "equation-set", equations: expected });
  });

  it("returns an empty equation set when nothing is filled", () => {
    const rows: RowDraft[] = [
      { a: "", op: "+", b: "", result: "" },
      { a: "", op: "-", b: "", result: "" },
    ];
    expect(rowsToEquationSet(rows)).toEqual({
      type: "equation-set",
      equations: [],
    });
  });
});
