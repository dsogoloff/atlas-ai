// Unit tests for the EquationFill pure helpers (node env, no DOM).

import { describe, expect, it } from "vitest";

import { blankIds, buildBlanksAnswer } from "./EquationFill";
import type { EquationFillSpec } from "./types";

describe("blankIds", () => {
  it("returns blank ids in template order, skipping text tokens", () => {
    const spec: EquationFillSpec = {
      kind: "equation-fill",
      tokens: [
        { t: "blank", id: "a" },
        { t: "text", value: "+" },
        { t: "blank", id: "b" },
        { t: "text", value: "=" },
        { t: "blank", id: "sum" },
      ],
    };
    expect(blankIds(spec)).toEqual(["a", "b", "sum"]);
  });

  it("returns an empty array when there are no blanks", () => {
    const spec: EquationFillSpec = {
      kind: "equation-fill",
      tokens: [{ t: "text", value: "3 + 4 = 7" }],
    };
    expect(blankIds(spec)).toEqual([]);
  });
});

describe("buildBlanksAnswer", () => {
  it("wraps the values map into a blanks AnswerValue", () => {
    const values = { a: "3", b: "4", sum: "7" };
    expect(buildBlanksAnswer(values)).toEqual({
      type: "blanks",
      values: { a: "3", b: "4", sum: "7" },
    });
  });

  it("preserves empty/partial entries verbatim", () => {
    expect(buildBlanksAnswer({ a: "3", b: "" })).toEqual({
      type: "blanks",
      values: { a: "3", b: "" },
    });
  });
});
