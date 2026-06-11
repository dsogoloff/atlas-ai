import { describe, expect, it } from "vitest";

import type { Json } from "@/lib/supabase/database.types";

import {
  isSingleNumberKey,
  judgeAnswer,
  normalizeAnswer,
  normalizeTextAnswer,
} from "./correctness";

// Fixture helpers mirror real seed shapes (supabase/seed.sql:162-198):
//   * MULTIPLE_CHOICE: { stem, options[], correct_index }
//   * NUMERIC_ENTRY:   { stem, correct_answer, accepted_answers? }
//   * TEXT_ENTRY:      { stem, correct_answer }
//   * DRAG_DROP:       { stem, items[], correct_order[] }
const mcContent = (options: string[], correctIndex: number): Json =>
  ({ stem: "stem", options, correct_index: correctIndex }) as Json;

const neContent = (correctAnswer: string): Json =>
  ({ stem: "stem", correct_answer: correctAnswer }) as Json;

const neAnyOfContent = (correctAnswer: string, accepted: string[]): Json =>
  ({
    stem: "stem",
    correct_answer: correctAnswer,
    accepted_answers: accepted,
  }) as Json;

const teContent = (correctAnswer: string): Json =>
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

describe("normalizeAnswer", () => {
  it("lowercases and collapses whitespace runs", () => {
    expect(normalizeAnswer("  Smaller   THAN  ")).toBe("smaller than");
  });
  it("treats comma and space as equivalent list separators", () => {
    expect(normalizeAnswer("10, 17, 20")).toBe("10 17 20");
    expect(normalizeAnswer("10,17,20")).toBe("10 17 20");
  });
  it("canonicalizes unit spacing after a digit", () => {
    expect(normalizeAnswer("1km 750m")).toBe("1 km 750 m");
    expect(normalizeAnswer("9:25am")).toBe("9:25 am");
  });
  it("does not split a unit token embedded in a longer word", () => {
    // "mins" is not the token "min" (word boundary), so it stays untouched.
    expect(normalizeAnswer("5 mins")).toBe("5 mins");
  });
});

describe("judgeAnswer / NUMERIC_ENTRY normalization (P1 live cases)", () => {
  // Real child answers that were wrongly graded incorrect before
  // normalization landed — all three must grade correct.
  it("grades '1km 750m' correct against '1 km 750 m'", () => {
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("1 km 750 m"), "1km 750m"),
    ).toBe(true);
  });
  it("grades '9:25am' correct against '9:25 am'", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("9:25 am"), "9:25am")).toBe(
      true,
    );
  });
  it("grades '10 17 20' correct against '10, 17, 20'", () => {
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("10, 17, 20"), "10 17 20"),
    ).toBe(true);
  });
  it("is case-insensitive for free-text answers", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("cylinder"), "Cylinder")).toBe(
      true,
    );
  });
  it("collapses repeated internal whitespace", () => {
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("1 km 750 m"), "1  km   750 m"),
    ).toBe(true);
  });
  it("accepts a comma where the bank uses a thousands space ('42,800' vs '42 800')", () => {
    // Pinned: comma/space separator equivalence makes thousands-grouping
    // punctuation interchangeable.
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("42 800"), "42,800")).toBe(
      true,
    );
  });
  it("single-number key '42 800' matches all grouping forms", () => {
    // The STORED key's shape selects the mode: one grouped number, so all
    // grouping (spaces/commas) is stripped from both sides before compare.
    // S.A.M. uses space-grouped thousands as standard notation.
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("42 800"), "42 800")).toBe(
      true,
    );
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("42 800"), "42,800")).toBe(
      true,
    );
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("42 800"), "42800")).toBe(
      true,
    );
  });
  it("single-number key '1000' (ungrouped) accepts grouped child input", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("1000"), "1 000")).toBe(true);
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("1000"), "1,000")).toBe(true);
  });
});

describe("judgeAnswer / NUMERIC_ENTRY normalization — wrong answers stay wrong", () => {
  it("rejects reordered list '10 20 17' vs '10, 17, 20' (order significant)", () => {
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("10, 17, 20"), "10 20 17"),
    ).toBe(false);
  });
  it("rejects '9:35 am' vs '9:25 am'", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("9:25 am"), "9:35 am")).toBe(
      false,
    );
  });
  it("rejects '2 km 750 m' vs '1 km 750 m'", () => {
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("1 km 750 m"), "2 km 750 m"),
    ).toBe(false);
  });
  it("rejects '1km750' vs '1 km 750 m'", () => {
    // Pinned WRONG: the answer is missing the trailing unit ("m"), and we
    // never invent units the child did not type — "1km750" normalizes to
    // "1 km 750", which is not "1 km 750 m".
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("1 km 750 m"), "1km750"),
    ).toBe(false);
  });
  it("rejects '1017 20' vs '10, 17, 20' (separators collapse, digits never join)", () => {
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("10, 17, 20"), "1017 20"),
    ).toBe(false);
  });
  it("rejects '101720' vs list key '10, 17, 20' (list keys never collapse)", () => {
    // The two modes must not cross: "10 17 20" has groups that are not
    // exactly 3 digits, so it is a LIST key — digits never join, and a
    // single-number submission cannot match it.
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("10, 17, 20"), "101720")).toBe(
      false,
    );
  });
  it("rejects '42 8000' vs single-number key '42 800'", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("42 800"), "42 8000")).toBe(
      false,
    );
  });
});

describe("single-number vs list mode — mutual exclusivity", () => {
  // judgeAnswer branches if/else on isSingleNumberKey(normalizedKey): a
  // boolean of the KEY alone. Exactly one mode runs per question, so the
  // paths cannot cross. These tests pin the partition on the boundary
  // shapes, then pin each side's behavior.
  it("partitions key shapes: one grouped number vs a list", () => {
    // Single-number shapes (strip-grouping mode):
    expect(isSingleNumberKey(normalizeAnswer("42 800"))).toBe(true);
    expect(isSingleNumberKey(normalizeAnswer("42,800"))).toBe(true);
    expect(isSingleNumberKey(normalizeAnswer("42800"))).toBe(true);
    expect(isSingleNumberKey(normalizeAnswer("1 234 567"))).toBe(true);
    expect(isSingleNumberKey(normalizeAnswer("3.5"))).toBe(true);
    // List shapes (separator-significant mode):
    expect(isSingleNumberKey(normalizeAnswer("10, 17, 20"))).toBe(false);
    expect(isSingleNumberKey(normalizeAnswer("10 17 20"))).toBe(false);
    expect(isSingleNumberKey(normalizeAnswer("9 68 81"))).toBe(false);
    // Non-numeric keys are never single-number mode:
    expect(isSingleNumberKey(normalizeAnswer("1 km 750 m"))).toBe(false);
    expect(isSingleNumberKey(normalizeAnswer("9:25 am"))).toBe(false);
  });
  it("list keys never apply single-number stripping", () => {
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("10, 17, 20"), "101720"),
    ).toBe(false);
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("10, 17, 20"), "1017 20"),
    ).toBe(false);
  });
  it("single-number keys never apply list semantics to reject grouping", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", neContent("42 800"), "42800")).toBe(
      true,
    );
  });
  it("pins the ambiguous boundary: 3-digit-grouped lists read as one number", () => {
    // "10 170 200" is shape-ambiguous (a list of three numbers OR one
    // grouped number 10 170 200). S.A.M. uses space-grouped thousands as
    // standard notation, so single-number mode is the chosen default —
    // pinned here so any future change to the partition is deliberate.
    expect(isSingleNumberKey(normalizeAnswer("10 170 200"))).toBe(true);
    expect(
      judgeAnswer("NUMERIC_ENTRY", neContent("10 170 200"), "10170200"),
    ).toBe(true);
  });
});

describe("normalizeTextAnswer", () => {
  it("inherits normalizeAnswer behavior (case, separators, unit spacing)", () => {
    expect(normalizeTextAnswer("  Smaller   THAN  ")).toBe("smaller than");
    expect(normalizeTextAnswer("9:25AM")).toBe("9:25 am");
  });
  it("canonicalizes unicode dashes to the keyboard hyphen", () => {
    expect(normalizeTextAnswer("8 – 2 = 6")).toBe(
      normalizeTextAnswer("8 - 2 = 6"),
    );
  });
  it("turns a letter-joining hyphen into a space", () => {
    expect(normalizeTextAnswer("Ninety-six")).toBe("ninety six");
  });
  it("does NOT touch digit-adjacent hyphens", () => {
    expect(normalizeTextAnswer("8-2")).toBe("8 - 2");
    expect(normalizeTextAnswer("8-2")).not.toBe("8 2");
  });
  it("pads math operators so '6+2=8' matches the spaced form", () => {
    expect(normalizeTextAnswer("6+2=8")).toBe("6 + 2 = 8");
  });
});

describe("judgeAnswer / TEXT_ENTRY", () => {
  // The 8 reclassified bank answers, as the child would plausibly type
  // them on a full keyboard.
  it("grades 'Cylinder' correct against 'cylinder' (case)", () => {
    expect(judgeAnswer("TEXT_ENTRY", teContent("cylinder"), "Cylinder")).toBe(
      true,
    );
  });
  it("grades '9:25am' correct against '9:25 am' (unit spacing)", () => {
    expect(judgeAnswer("TEXT_ENTRY", teContent("9:25 am"), "9:25am")).toBe(
      true,
    );
  });
  it("grades 'ethan' correct against 'Ethan'", () => {
    expect(judgeAnswer("TEXT_ENTRY", teContent("Ethan"), "ethan")).toBe(true);
  });
  it("grades 'ninety six' and 'Ninety-Six' correct against 'Ninety-six'", () => {
    expect(
      judgeAnswer("TEXT_ENTRY", teContent("Ninety-six"), "ninety six"),
    ).toBe(true);
    expect(
      judgeAnswer("TEXT_ENTRY", teContent("Ninety-six"), "Ninety-Six"),
    ).toBe(true);
  });
  it("grades '1km 750m' correct against '1 km 750 m'", () => {
    expect(
      judgeAnswer("TEXT_ENTRY", teContent("1 km 750 m"), "1km 750m"),
    ).toBe(true);
  });
  it("grades 'smaller   than' correct against 'smaller than'", () => {
    expect(
      judgeAnswer("TEXT_ENTRY", teContent("smaller than"), "smaller   than"),
    ).toBe(true);
  });
  it("grades a hyphen-typed fact family correct against the en-dash key", () => {
    // SAM-L1-Q25 stores the S.A.M. en-dash ("8 – 2 = 6"); the child's
    // keyboard types a hyphen. Comma/space separators are interchangeable.
    expect(
      judgeAnswer(
        "TEXT_ENTRY",
        teContent("6 + 2 = 8, 2 + 6 = 8, 8 – 2 = 6, 8 – 6 = 2"),
        "6+2=8, 2+6=8, 8-2=6, 8-6=2",
      ),
    ).toBe(true);
  });
  it("rejects the wrong word ('greater than' vs 'smaller than')", () => {
    expect(
      judgeAnswer("TEXT_ENTRY", teContent("smaller than"), "greater than"),
    ).toBe(false);
  });
  it("rejects the wrong shape ('cone' vs 'cylinder')", () => {
    expect(judgeAnswer("TEXT_ENTRY", teContent("cylinder"), "cone")).toBe(
      false,
    );
  });
  it("rejects a reordered fact-family equation set (order significant)", () => {
    expect(
      judgeAnswer(
        "TEXT_ENTRY",
        teContent("6 + 2 = 8, 2 + 6 = 8"),
        "2 + 6 = 8, 6 + 2 = 8",
      ),
    ).toBe(false);
  });
  it("rejects '9:25 pm' vs '9:25 am'", () => {
    expect(judgeAnswer("TEXT_ENTRY", teContent("9:25 am"), "9:25 pm")).toBe(
      false,
    );
  });

  // SAM-L3-Q15 ("What is 1/6 + 3/6?", key "4/6") — reactivated as
  // TEXT_ENTRY by 20260611014520_prerun_q4_q15.sql. These pins prove the
  // fraction answer actually grades on the runtime path.
  it("grades the SAM-L3-Q15 fraction key '4/6' correct (incl. whitespace/case tolerance)", () => {
    expect(judgeAnswer("TEXT_ENTRY", teContent("4/6"), "4/6")).toBe(true);
    expect(judgeAnswer("TEXT_ENTRY", teContent("4/6"), "  4/6  ")).toBe(true);
  });
  it("matches '4 / 6' to '4/6' (slash is in the operator-padding set)", () => {
    // Founder-directed follow-up to the pre-run lane: "/" joined + = -
    // in the padding set, so spaced and unspaced fractions converge.
    expect(judgeAnswer("TEXT_ENTRY", teContent("4/6"), "4 / 6")).toBe(true);
    expect(judgeAnswer("TEXT_ENTRY", teContent("4 / 6"), "4/6")).toBe(true);
    expect(normalizeTextAnswer("4 / 6")).toBe(normalizeTextAnswer("4/6"));
    // Padding never merges digits: a different fraction stays wrong.
    expect(judgeAnswer("TEXT_ENTRY", teContent("4/6"), "4 6")).toBe(false);
  });
  it("rejects the wrong fraction '3/6' vs '4/6'", () => {
    expect(judgeAnswer("TEXT_ENTRY", teContent("4/6"), "3/6")).toBe(false);
  });
});

describe("judgeAnswer / TEXT_ENTRY content errors", () => {
  it("throws when correct_answer is missing", () => {
    expect(() =>
      judgeAnswer("TEXT_ENTRY", { stem: "x" } as Json, "cylinder"),
    ).toThrow(/correct_answer/);
  });
  it("throws when correct_answer is not a string", () => {
    expect(() =>
      judgeAnswer("TEXT_ENTRY", { correct_answer: 7 } as Json, "7"),
    ).toThrow(/correct_answer/);
  });
});

describe("judgeAnswer / NUMERIC_ENTRY accepted_answers (any-of keys)", () => {
  // SAM-L4-Q27: "Name one number that can divide both 54 and 72."
  const q27 = neAnyOfContent("1, 2, 3, 6, 9 or 18", [
    "1",
    "2",
    "3",
    "6",
    "9",
    "18",
  ]);

  it("grades every accepted value correct", () => {
    for (const v of ["1", "2", "3", "6", "9", "18"]) {
      expect(judgeAnswer("NUMERIC_ENTRY", q27, v)).toBe(true);
    }
  });
  it("applies per-key numeric coercion ('06' matches accepted '6')", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", q27, "06")).toBe(true);
  });
  it("rejects non-divisors", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", q27, "4")).toBe(false);
    expect(judgeAnswer("NUMERIC_ENTRY", q27, "54")).toBe(false);
  });
  it("never compares against the human-readable correct_answer", () => {
    expect(judgeAnswer("NUMERIC_ENTRY", q27, "1, 2, 3, 6, 9 or 18")).toBe(
      false,
    );
  });
  it("throws when accepted_answers is empty", () => {
    expect(() =>
      judgeAnswer("NUMERIC_ENTRY", neAnyOfContent("1", []), "1"),
    ).toThrow(/accepted_answers/);
  });
  it("throws when accepted_answers contains non-strings", () => {
    expect(() =>
      judgeAnswer(
        "NUMERIC_ENTRY",
        { stem: "s", correct_answer: "1", accepted_answers: [1] } as Json,
        "1",
      ),
    ).toThrow(/non-string/);
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
  it("normalizes string tokens on both sides (case/unit spacing)", () => {
    expect(
      judgeAnswer(
        "DRAG_DROP",
        ddContent(["750 m", "1 km"], ["750 m", "1 km"]),
        JSON.stringify(["750m", "1KM"]),
      ),
    ).toBe(true);
  });
  it("still rejects reordered tokens after normalization", () => {
    expect(
      judgeAnswer(
        "DRAG_DROP",
        ddContent(["750 m", "1 km"], ["750 m", "1 km"]),
        JSON.stringify(["1 km", "750 m"]),
      ),
    ).toBe(false);
  });
  it("grades non-JSON answers wrong instead of throwing", () => {
    expect(
      judgeAnswer("DRAG_DROP", ddContent(["A", "B"], ["A", "B"]), "not json"),
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
