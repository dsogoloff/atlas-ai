import { describe, expect, it } from "vitest";

import {
  canonicalKey,
  evalOp,
  grade,
  gradeEquationValidity,
  gradeExactNumeric,
  gradeExactText,
  gradeMatchPairs,
  gradeSelectAll,
  gradeSelectCount,
  gradeSetEquality,
  isValidEquation,
  normalizeText,
  parseNumber,
} from "./grade";
import type { AnswerValue, CorrectAnswerModel, Equation } from "./types";

describe("normalizers", () => {
  it("collapses whitespace and lowercases by default", () => {
    expect(normalizeText("  Nine  Six ")).toBe("nine six");
    expect(normalizeText("Ninety-Six", true)).toBe("Ninety-Six");
  });
  it("parses numbers and rejects non-numbers", () => {
    expect(parseNumber("  +7 ")).toBe(7);
    expect(parseNumber("3.5")).toBe(3.5);
    expect(Number.isNaN(parseNumber("1 km"))).toBe(true);
    expect(Number.isNaN(parseNumber(""))).toBe(true);
  });
});

describe("exact-numeric", () => {
  it("matches within tolerance", () => {
    expect(gradeExactNumeric("42", 42).correct).toBe(true);
    expect(gradeExactNumeric("41.9", 42, 0.2).correct).toBe(true);
    expect(gradeExactNumeric("40", 42).correct).toBe(false);
  });
  it("rejects non-numeric entry", () => {
    expect(gradeExactNumeric("forty", 42).correct).toBe(false);
  });
});

describe("exact-text", () => {
  it("matches canonical and accepted alternates, case-insensitive", () => {
    expect(gradeExactText("ninety-six", "Ninety-six").correct).toBe(true);
    expect(
      gradeExactText("cylinder", "cylinder", ["a cylinder"]).correct,
    ).toBe(true);
    expect(gradeExactText("cube", "cylinder").correct).toBe(false);
  });
});

describe("equation helpers", () => {
  it("evaluates operators and guards divide-by-zero", () => {
    expect(evalOp(6, "+", 2)).toBe(8);
    expect(evalOp(8, "-", 6)).toBe(2);
    expect(evalOp(3, "x", 4)).toBe(12);
    expect(Number.isNaN(evalOp(1, "/", 0))).toBe(true);
  });
  it("validates equations", () => {
    expect(isValidEquation({ a: 6, op: "+", b: 2, result: 8 })).toBe(true);
    expect(isValidEquation({ a: 6, op: "+", b: 2, result: 9 })).toBe(false);
  });
  it("canonical key collapses commutative operands only when allowed", () => {
    const a: Equation = { a: 6, op: "+", b: 2, result: 8 };
    const b: Equation = { a: 2, op: "+", b: 6, result: 8 };
    expect(canonicalKey(a, true)).toBe(canonicalKey(b, true));
    expect(canonicalKey(a, false)).not.toBe(canonicalKey(b, false));
    // subtraction never collapses
    const s1: Equation = { a: 8, op: "-", b: 6, result: 2 };
    const s2: Equation = { a: 8, op: "-", b: 2, result: 6 };
    expect(canonicalKey(s1, true)).not.toBe(canonicalKey(s2, true));
  });
});

// The fact-family case the brief calls out: numbers 6, 8, 2.
describe("set-equality — fact family 6/8/2", () => {
  const canonical: Equation[] = [
    { a: 6, op: "+", b: 2, result: 8 },
    { a: 2, op: "+", b: 6, result: 8 },
    { a: 8, op: "-", b: 6, result: 2 },
    { a: 8, op: "-", b: 2, result: 6 },
  ];

  it("accepts the four sentences in shuffled line order", () => {
    const shuffled: Equation[] = [
      { a: 8, op: "-", b: 2, result: 6 },
      { a: 6, op: "+", b: 2, result: 8 },
      { a: 8, op: "-", b: 6, result: 2 },
      { a: 2, op: "+", b: 6, result: 8 },
    ];
    expect(gradeSetEquality(shuffled, canonical, true).correct).toBe(true);
  });

  it("accepts a commutative variant (addends swapped)", () => {
    const variant: Equation[] = [
      { a: 2, op: "+", b: 6, result: 8 }, // swapped vs canonical's 6+2
      { a: 8, op: "-", b: 6, result: 2 },
      { a: 8, op: "-", b: 2, result: 6 },
    ];
    expect(gradeSetEquality(variant, canonical, true).correct).toBe(true);
  });

  it("accepts the three distinct facts (no redundant 4th addition)", () => {
    const three: Equation[] = [
      { a: 6, op: "+", b: 2, result: 8 },
      { a: 8, op: "-", b: 6, result: 2 },
      { a: 8, op: "-", b: 2, result: 6 },
    ];
    expect(gradeSetEquality(three, canonical, true).correct).toBe(true);
  });

  it("rejects a missing fact", () => {
    const missing: Equation[] = [
      { a: 6, op: "+", b: 2, result: 8 },
      { a: 8, op: "-", b: 6, result: 2 },
    ];
    expect(gradeSetEquality(missing, canonical, true).correct).toBe(false);
  });

  it("rejects a wrong fact", () => {
    const wrong: Equation[] = [
      { a: 6, op: "+", b: 2, result: 8 },
      { a: 8, op: "-", b: 6, result: 2 },
      { a: 8, op: "-", b: 2, result: 5 }, // wrong result
    ];
    expect(gradeSetEquality(wrong, canonical, true).correct).toBe(false);
  });

  it("without commutativity, addend order is significant", () => {
    const swapped: Equation[] = [
      { a: 2, op: "+", b: 6, result: 8 },
      { a: 6, op: "+", b: 2, result: 8 },
      { a: 8, op: "-", b: 6, result: 2 },
      { a: 8, op: "-", b: 2, result: 6 },
    ];
    // canonical has both additions; produced has both → still equal as sets
    expect(gradeSetEquality(swapped, canonical, false).correct).toBe(true);
    // but dropping one addition now fails (no collapse)
    const dropOne: Equation[] = [
      { a: 2, op: "+", b: 6, result: 8 },
      { a: 8, op: "-", b: 6, result: 2 },
      { a: 8, op: "-", b: 2, result: 6 },
    ];
    expect(gradeSetEquality(dropOne, canonical, false).correct).toBe(false);
  });
});

describe("equation-validity", () => {
  it("accepts true equations built from allowed numbers", () => {
    const produced: Equation[] = [
      { a: 6, op: "+", b: 2, result: 8 },
      { a: 8, op: "-", b: 2, result: 6 },
    ];
    expect(
      gradeEquationValidity(produced, [2, 6, 8], 2, ["+", "-"], true).correct,
    ).toBe(true);
  });
  it("rejects a false equation", () => {
    const produced: Equation[] = [{ a: 6, op: "+", b: 2, result: 9 }];
    expect(gradeEquationValidity(produced, [2, 6, 9], 1).correct).toBe(false);
  });
  it("rejects a disallowed number", () => {
    const produced: Equation[] = [{ a: 6, op: "+", b: 1, result: 7 }];
    expect(gradeEquationValidity(produced, [2, 6, 8], 1).correct).toBe(false);
  });
  it("enforces the required line count", () => {
    const produced: Equation[] = [{ a: 6, op: "+", b: 2, result: 8 }];
    expect(gradeEquationValidity(produced, [2, 6, 8], 2).correct).toBe(false);
  });
});

describe("select-all", () => {
  it("matches the exact selected set (order-irrelevant)", () => {
    expect(gradeSelectAll(["c", "a"], ["a", "b", "c"]).correct).toBe(false);
    expect(gradeSelectAll(["c", "a", "b"], ["a", "b", "c"]).correct).toBe(true);
  });
  it("rejects an extra selection", () => {
    expect(gradeSelectAll(["a", "b", "c", "d"], ["a", "b", "c"]).correct).toBe(
      false,
    );
  });
  it("rejects a missing selection", () => {
    expect(gradeSelectAll(["a", "b"], ["a", "b", "c"]).correct).toBe(false);
  });
  it("collapses duplicate selections before comparing", () => {
    expect(gradeSelectAll(["a", "a", "b", "c"], ["a", "b", "c"]).correct).toBe(
      true,
    );
  });
});

describe("select-count", () => {
  const optionIds = Array.from({ length: 15 }, (_, i) => `o${i}`);
  it("accepts the right distinct count of valid ids (any 10 of 15)", () => {
    const ten = optionIds.slice(0, 10);
    expect(gradeSelectCount(ten, 10, optionIds).correct).toBe(true);
  });
  it("rejects the wrong count", () => {
    expect(gradeSelectCount(optionIds.slice(0, 9), 10, optionIds).correct).toBe(
      false,
    );
  });
  it("rejects an out-of-set id", () => {
    expect(
      gradeSelectCount([...optionIds.slice(0, 9), "nope"], 10, optionIds)
        .correct,
    ).toBe(false);
  });
  it("counts DISTINCT ids — duplicates do not pad the count", () => {
    const nineDistinctPlusDup = [...optionIds.slice(0, 9), "o0"];
    expect(gradeSelectCount(nineDistinctPlusDup, 10, optionIds).correct).toBe(
      false,
    );
  });
});

describe("match-pairs", () => {
  const correct = { l1: "r1", l2: "r2", l3: "r3" };
  it("grades all-right true with a full perPair", () => {
    const res = gradeMatchPairs({ l1: "r1", l2: "r2", l3: "r3" }, correct);
    expect(res.correct).toBe(true);
    expect(res.perPair).toEqual({ l1: true, l2: true, l3: true });
  });
  it("is BINARY false when one pair is wrong, with a per-pair breakdown", () => {
    const res = gradeMatchPairs({ l1: "r1", l2: "rX", l3: "r3" }, correct);
    expect(res.correct).toBe(false);
    expect(res.perPair).toEqual({ l1: true, l2: false, l3: true });
  });
  it("rejects a missing left id", () => {
    const res = gradeMatchPairs({ l1: "r1", l2: "r2" }, correct);
    expect(res.correct).toBe(false);
    expect(res.perPair?.l3).toBe(false);
  });
  it("rejects an extra left id the model does not expect", () => {
    const res = gradeMatchPairs(
      { l1: "r1", l2: "r2", l3: "r3", l4: "r4" },
      correct,
    );
    expect(res.correct).toBe(false);
  });
});

describe("grade() dispatcher", () => {
  it("routes each rule and rejects shape mismatches", () => {
    const factFamily: CorrectAnswerModel = {
      rule: "set-equality",
      canonical: [
        { a: 6, op: "+", b: 2, result: 8 },
        { a: 8, op: "-", b: 2, result: 6 },
        { a: 8, op: "-", b: 6, result: 2 },
      ],
      allowCommutative: true,
    };
    const good: AnswerValue = {
      type: "equation-set",
      equations: [
        { a: 2, op: "+", b: 6, result: 8 },
        { a: 8, op: "-", b: 2, result: 6 },
        { a: 8, op: "-", b: 6, result: 2 },
      ],
    };
    expect(grade(good, factFamily).correct).toBe(true);

    // wrong-shaped answer for the rule is a clean (non-throwing) incorrect
    const wrongShape: AnswerValue = { type: "scalar", value: "8" };
    expect(grade(wrongShape, factFamily).correct).toBe(false);
  });

  it("grades per-blank, requiring every blank", () => {
    const model: CorrectAnswerModel = {
      rule: "per-blank",
      blanks: {
        sum: { value: "10", numeric: true },
        a: { value: "7", numeric: true },
      },
    };
    expect(
      grade({ type: "blanks", values: { sum: "10", a: "7" } }, model).correct,
    ).toBe(true);
    const partial = grade(
      { type: "blanks", values: { sum: "10", a: "6" } },
      model,
    );
    expect(partial.correct).toBe(false);
    expect(partial.perBlank).toEqual({ sum: true, a: false });
  });

  it("routes select-all / select-count / match-pairs and rejects shape mismatches", () => {
    expect(
      grade(
        { type: "id-set", ids: ["a", "b"] },
        { rule: "select-all", correct: ["a", "b"] },
      ).correct,
    ).toBe(true);
    expect(
      grade(
        { type: "id-set", ids: ["a"] },
        { rule: "select-count", count: 1, optionIds: ["a", "b"] },
      ).correct,
    ).toBe(true);
    const pairRes = grade(
      { type: "pairs", pairs: { l1: "r1" } },
      { rule: "match-pairs", pairs: { l1: "r1" } },
    );
    expect(pairRes.correct).toBe(true);
    expect(pairRes.perPair).toEqual({ l1: true });

    // wrong-shaped answers are a clean (non-throwing) incorrect
    expect(
      grade(
        { type: "scalar", value: "a" },
        { rule: "select-all", correct: ["a"] },
      ).correct,
    ).toBe(false);
    expect(
      grade(
        { type: "id-set", ids: ["l1"] },
        { rule: "match-pairs", pairs: { l1: "r1" } },
      ).correct,
    ).toBe(false);
  });

  it("grades mc-index and exact-numeric/text", () => {
    expect(
      grade({ type: "mc-index", index: 0 }, { rule: "mc-index", index: 0 })
        .correct,
    ).toBe(true);
    expect(
      grade(
        { type: "scalar", value: "508" },
        { rule: "exact-numeric", value: 508 },
      ).correct,
    ).toBe(true);
    expect(
      grade(
        { type: "scalar", value: "Five hundred and eight" },
        {
          rule: "exact-text",
          value: "five hundred and eight",
        },
      ).correct,
    ).toBe(true);
  });
});
