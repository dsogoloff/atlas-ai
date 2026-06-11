// Unit tests for the pure checker functions of the conversion pipeline's
// Stage 5 answer-key audit (scripts/conversion/stage5-audit.ts).
//
// Lives under src/ (next to the stage4 loader tests) because the vitest
// config only discovers src/**/*.test.ts; the script itself stays in
// scripts/conversion/ alongside stages 1–4.
//
// ALL question fixtures below are SYNTHETIC — fabricated math questions
// written for these tests. No real S.A.M. licensed text appears here.

import { describe, expect, it } from "vitest";

import {
  answersEquivalent,
  auditDragDrop,
  auditMultipleChoice,
  auditNumericEntry,
  evalArithmetic,
  extractExpectedAnswer,
  extractWorkedKeyFinalAnswer,
  formatAuditLogLine,
  interpretMcKey,
  normalizeAnswerText,
  parseExternalId,
  parseOptionMarker,
  parseSqlValuesTuples,
  parseQuestionInserts,
  resolveKeyOptionMarker,
  stripDigitGroupSpaces,
  tokenizeKeyList,
  verdictOf,
  type CheckResult,
} from "../../../scripts/conversion/stage5-audit";

// ---------------------------------------------------------------------------
// Arithmetic evaluator
// ---------------------------------------------------------------------------

describe("evalArithmetic", () => {
  it("evaluates the multiplication-sign variants", () => {
    expect(evalArithmetic("9 × 3")).toBe(27);
    expect(evalArithmetic("9 x 3")).toBe(27);
    expect(evalArithmetic("9*3")).toBe(27);
  });

  it("evaluates division, addition chains, and precedence", () => {
    expect(evalArithmetic("6 ÷ 3")).toBe(2);
    expect(evalArithmetic("9 ÷ 2")).toBe(4.5);
    expect(evalArithmetic("600+40+8")).toBe(648);
    expect(evalArithmetic("2 + 3 × 4")).toBe(14);
    expect(evalArithmetic("(2 + 3) × 4")).toBe(20);
  });

  it("handles unary minus, decimals, and plain numbers", () => {
    expect(evalArithmetic("-5 + 2")).toBe(-3);
    expect(evalArithmetic("1.5 × 2")).toBe(3);
    expect(evalArithmetic("42")).toBe(42);
    expect(evalArithmetic("4/9")).toBeCloseTo(4 / 9);
  });

  it("refuses units, words, currency, and space-grouped digits", () => {
    expect(evalArithmetic("1 km 750 m")).toBeNull();
    expect(evalArithmetic("cylinder")).toBeNull();
    expect(evalArithmetic("$70.85")).toBeNull();
    expect(evalArithmetic("62 009")).toBeNull();
    expect(evalArithmetic("9:25 am")).toBeNull();
    expect(evalArithmetic("")).toBeNull();
    expect(evalArithmetic("3 +")).toBeNull();
    expect(evalArithmetic("(3 + 2")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stem target extraction
// ---------------------------------------------------------------------------

describe("extractExpectedAnswer", () => {
  it('reads "equal to N" stems', () => {
    expect(extractExpectedAnswer("Which of the following is equal to 24?")?.value).toBe(24);
  });

  it('reads missing-addend "A and ___ make N" stems', () => {
    expect(
      extractExpectedAnswer("What is the missing number? 4 and ___ make 10.")?.value,
    ).toBe(6);
  });

  it('reads "<expr> = ___" stems anchored at the stem end', () => {
    expect(
      extractExpectedAnswer("What is the missing number? 500 + 30 + 2 = ___")?.value,
    ).toBe(532);
    // NOT at the end — "___ tens 6 ones" would make target extraction wrong.
    expect(
      extractExpectedAnswer("What is the missing number? 76 = ___ tens 6 ones"),
    ).toBeNull();
  });

  it('reads "more/less than" and bare "What is <expr>?" stems', () => {
    expect(extractExpectedAnswer("What is 3 more than 54?")?.value).toBe(57);
    expect(extractExpectedAnswer("What is 3 less than 54?")?.value).toBe(51);
    expect(extractExpectedAnswer("What is 400 + 50 + 3?")?.value).toBe(453);
  });

  it("returns null for stems without a computable target", () => {
    expect(extractExpectedAnswer("What is the greatest 4-digit even number?")).toBeNull();
    expect(
      extractExpectedAnswer("What comes next in the pattern below? 60, 40, 20, ?"),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

describe("normalizeAnswerText / stripDigitGroupSpaces / tokenizeKeyList", () => {
  it("joins stacked fractions, folds bold digits, collapses whitespace", () => {
    expect(normalizeAnswerText("4\n9")).toBe("4/9");
    expect(normalizeAnswerText("𝟒\n𝟗")).toBe("4/9");
    expect(normalizeAnswerText("  Ninety -  Six ")).toBe("ninety - six");
  });

  it("strips digit-grouping spaces", () => {
    expect(stripDigitGroupSpaces("32 001")).toBe("32001");
    expect(stripDigitGroupSpaces("42 800")).toBe("42800");
    expect(stripDigitGroupSpaces("1 km 750 m")).toBe("1 km 750 m");
  });

  it("tokenizes list keys on comma/semicolon/newline after fraction join", () => {
    expect(tokenizeKeyList("716, 708, 652, 629")).toEqual(["716", "708", "652", "629"]);
    expect(tokenizeKeyList("2\n11 , 6\n11")).toEqual(["2/11", "6/11"]);
    expect(tokenizeKeyList("a; b\nc")).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------
// Answer equivalence (incl. the P1 judge normalizer)
// ---------------------------------------------------------------------------

describe("answersEquivalent", () => {
  it("ignores case / whitespace / comma / unit-spacing noise (P1 classes)", () => {
    expect(answersEquivalent("1 km 750 m", "1KM 750  m")).toBe(true);
    expect(answersEquivalent("9:25 am", "9:25AM")).toBe(true);
    expect(answersEquivalent("10, 17, 20", "10 17 20")).toBe(true);
    expect(answersEquivalent("42 800", "42,800")).toBe(true);
  });

  it("never equates a separated list with a joined number", () => {
    expect(answersEquivalent("1, 2", "12")).toBe(false);
  });

  it("still distinguishes genuinely different values", () => {
    expect(answersEquivalent("98", "96")).toBe(false);
    expect(answersEquivalent("smaller than", "greater than")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Option-marker resolution (conventions per PR #28's mc-index-audit.ts)
// ---------------------------------------------------------------------------

describe("parseOptionMarker / resolveKeyOptionMarker", () => {
  const options = ["9 996", "9 997", "9 998", "9 999"];

  it('parses "(N)" as an explicit marker and a bare integer as a reading', () => {
    expect(parseOptionMarker("(3)")).toEqual({ ordinal: 3, explicit: true });
    expect(parseOptionMarker("3")).toEqual({ ordinal: 3, explicit: false });
    expect(parseOptionMarker("see solution")).toBeNull();
    expect(parseOptionMarker("4/9")).toBeNull();
  });

  it("resolves a marker to the 1-based option value when options exist", () => {
    const r = resolveKeyOptionMarker("3", options);
    expect(r.kind).toBe("resolved");
    expect(r.kind === "resolved" && r.value).toBe("9 998");
  });

  it("is unresolvable for a small bare integer without recorded options", () => {
    expect(resolveKeyOptionMarker("3", null).kind).toBe("unresolvable");
    expect(resolveKeyOptionMarker("(2)", null).kind).toBe("unresolvable");
    expect(resolveKeyOptionMarker("(7)", options).kind).toBe("unresolvable");
  });

  it("treats large bare integers as literal values, not markers", () => {
    expect(resolveKeyOptionMarker("98", null).kind).toBe("not-marker");
    expect(resolveKeyOptionMarker("9", options).kind).toBe("not-marker");
  });
});

// ---------------------------------------------------------------------------
// Worked-solution final-answer extraction
// ---------------------------------------------------------------------------

describe("extractWorkedKeyFinalAnswer", () => {
  // Synthetic reproduction of the SAM-L4-Q15 class: the parsed key only
  // captured a conversion of a quantity GIVEN in the stem.
  const stem =
    "When Casey had walked 2 km 400 m, she had walked 3 times as far as Dana. " +
    "How far had Dana walked? Express your answer in kilometres and metres.";

  it("flags an equation restating a stem quantity as an intermediate line", () => {
    const r = extractWorkedKeyFinalAnswer("2 km 400 m = 2400 m", stem);
    expect(r.kind).toBe("extracted");
    expect(r.kind === "extracted" && r.value).toBe("2400 m");
    expect(r.kind === "extracted" && r.intermediate).toBe(true);
  });

  it("takes the right-most value of the last equation chain", () => {
    const r = extractWorkedKeyFinalAnswer("2400 ÷ 3 = 800 m\n800 m = 0 km 800 m", stem);
    expect(r.kind === "extracted" && r.value).toBe("0 km 800 m");
    expect(r.kind === "extracted" && r.intermediate).toBe(false);
  });

  it("takes the trailing quantity of a sentence key", () => {
    const r = extractWorkedKeyFinalAnswer("Dana had walked 0 km 800 m.", stem);
    expect(r.kind).toBe("extracted");
    expect(r.kind === "extracted" && r.value).toBe("0 km 800 m");
  });

  it("is uncertain when no final value is mechanically extractable", () => {
    expect(
      extractWorkedKeyFinalAnswer("The 3 baskets hold the same amount.", stem).kind,
    ).toBe("uncertain");
    // ":"-times must not yield a bogus "25 am" tail.
    expect(extractWorkedKeyFinalAnswer("Finish time 9:25 am", stem).kind).toBe("uncertain");
  });

  it("leaves plain literal keys to the ordinary comparison", () => {
    expect(extractWorkedKeyFinalAnswer("532", stem).kind).toBe("not-worked");
    expect(extractWorkedKeyFinalAnswer("smaller than", stem).kind).toBe("not-worked");
    expect(extractWorkedKeyFinalAnswer("1 km 750 m", stem).kind).toBe("not-worked");
  });
});

// ---------------------------------------------------------------------------
// MC key interpretation
// ---------------------------------------------------------------------------

describe("interpretMcKey", () => {
  const options = ["7 × 2", "7 × 3", "7 ÷ 2", "8 ÷ 4"];

  it('treats "(3)" as a definitive 1-based option marker', () => {
    expect(interpretMcKey("(3)", options)).toEqual([
      { index: 2, basis: 'explicit option marker "(3)" (1-based)' },
    ]);
  });

  it("reads a bare small integer as 1-based option number AND as a value", () => {
    // "2" is both option number 2 (index 1) and the value of "8 ÷ 4" (index 3).
    const candidates = interpretMcKey("2", options);
    expect(candidates.map((c) => c.index).sort()).toEqual([1, 3]);
  });

  it("matches key text against option text", () => {
    expect(interpretMcKey("7 × 3", options).map((c) => c.index)).toEqual([1]);
  });

  it("matches a non-index numeric key against evaluated option values", () => {
    expect(interpretMcKey("14", options).map((c) => c.index)).toEqual([0]);
  });

  it("returns no candidates for an uninterpretable key", () => {
    expect(interpretMcKey("see worked solution", options)).toEqual([]);
    expect(interpretMcKey("", options)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// MULTIPLE_CHOICE audit — including the SAM-L3-Q11-class off-by-one
// ---------------------------------------------------------------------------

describe("auditMultipleChoice", () => {
  // Synthetic reproduction of the live mis-key mechanism: key says "1"
  // (1-based option 1), stage 3 emitted correct_index=1 (0-based slot 2).
  const offByOne = {
    stem: "Which of the following is equal to 14?",
    options: ["7 × 2", "7 × 3", "7 ÷ 2", "8 ÷ 4"],
    correct_index: 1,
    distractor_misconceptions: { "0": "OP_MULT_AS_REPEATED_ADD" },
  };

  it("fails stem-arithmetic when the keyed option does not hit the stated target", () => {
    const checks = auditMultipleChoice(offByOne, null);
    const arith = checks.find((c) => c.name === "stem-arithmetic");
    expect(arith?.status).toBe("fail");
    expect(arith?.detail).toContain('"7 × 3" = 21');
    expect(arith?.detail).toContain('index 0');
    expect(verdictOf(checks)).toBe("SUSPECT");
  });

  it("fails key-agreement when the stored index contradicts the parsed key", () => {
    const checks = auditMultipleChoice(offByOne, { raw_answer: "1", answer_kind: "VALUE" });
    const key = checks.find((c) => c.name === "key-agreement");
    expect(key?.status).toBe("fail");
    expect(key?.detail).toContain("plausible index(es): 0");
  });

  it("passes a consistent question on both checks", () => {
    const good = { ...offByOne, correct_index: 0, distractor_misconceptions: { "1": "X" } };
    const checks = auditMultipleChoice(good, { raw_answer: "(1)", answer_kind: "OPTION" });
    expect(checks.find((c) => c.name === "stem-arithmetic")?.status).toBe("pass");
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
    expect(verdictOf(checks)).toBe("CLEAN");
  });

  it("fails structure on an out-of-range correct_index", () => {
    const checks = auditMultipleChoice({ ...offByOne, correct_index: 4 }, null);
    expect(checks[0]).toMatchObject({ name: "structure", status: "fail" });
    expect(verdictOf(checks)).toBe("SUSPECT");
  });

  it("fails the distractor map when it covers the keyed correct option", () => {
    const checks = auditMultipleChoice(
      { ...offByOne, distractor_misconceptions: { "1": "X" } },
      null,
    );
    expect(checks.find((c) => c.name === "distractor-map")?.status).toBe("fail");
  });

  it("is UNVERIFIABLE when neither stem target nor key is mechanically usable", () => {
    const checks = auditMultipleChoice(
      { stem: "Which model is correct?", options: ["Model 1", "Model 2"], correct_index: 0 },
      null,
    );
    expect(verdictOf(checks)).toBe("UNVERIFIABLE");
  });
});

// ---------------------------------------------------------------------------
// NUMERIC_ENTRY audit
// ---------------------------------------------------------------------------

describe("auditNumericEntry", () => {
  it("verifies a plain-numeric answer against stem and key", () => {
    const checks = auditNumericEntry(
      { stem: "What is the missing number? 500 + 30 + 2 = ___", correct_answer: "532" },
      { raw_answer: "532", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "answer-format")?.status).toBe("pass");
    expect(checks.find((c) => c.name === "stem-arithmetic")?.status).toBe("pass");
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
    expect(verdictOf(checks)).toBe("CLEAN");
  });

  it("flags non-plain-numeric answers (exact-string-match judging)", () => {
    const checks = auditNumericEntry(
      { stem: "Round 12 345 to the nearest hundred.", correct_answer: "12 300" },
      { raw_answer: "12 300", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "answer-format")?.status).toBe("fail");
    // ... while the key STILL agrees after digit-space stripping.
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
    expect(verdictOf(checks)).toBe("SUSPECT");
  });

  it("accepts a stored answer found inside a worked-solution key", () => {
    const checks = auditNumericEntry(
      { stem: "How many marbles are left?", correct_answer: "28" },
      { raw_answer: "35 - 7 = 28\nThere are 28 marbles left.", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
  });

  it("matches a stacked-fraction key against a slash-fraction answer", () => {
    const checks = auditNumericEntry(
      { stem: "What fraction of the figure is shaded?", correct_answer: "4/9" },
      { raw_answer: "4\n9", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
  });

  it("matches a multi-line equation key without corrupting it into fractions", () => {
    const checks = auditNumericEntry(
      {
        stem: "Write a fact family with these numbers: 1, 2, 3",
        correct_answer: "1 + 2 = 3, 3 – 1 = 2",
      },
      { raw_answer: "1 + 2 = 3\n3 – 1 = 2", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
  });

  it("fails key-agreement on a real mismatch", () => {
    const checks = auditNumericEntry(
      { stem: "What is the greatest 2-digit even number?", correct_answer: "98" },
      { raw_answer: "96", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("fail");
    expect(verdictOf(checks)).toBe("SUSPECT");
  });

  // Synthetic reproduction of the SAM-L3-Q22 class: the key prints a bare
  // 1-based OPTION NUMBER, not a value.
  it("resolves a bare option-number key against the source task's options", () => {
    const checks = auditNumericEntry(
      { stem: "What is the greatest 2-digit even number?", correct_answer: "98" },
      { raw_answer: "3", answer_kind: "VALUE" },
      ["92", "96", "98", "99"], // option 3 (1-based) IS the stored answer
    );
    const key = checks.find((c) => c.name === "key-agreement");
    expect(key?.status).toBe("pass");
    expect(key?.detail).toContain('"3"'); // raw marker kept for transparency
    expect(verdictOf(checks)).toBe("CLEAN");
  });

  it("fails when the key-designated option contradicts the stored answer", () => {
    const checks = auditNumericEntry(
      { stem: "What is the greatest 2-digit even number?", correct_answer: "98" },
      { raw_answer: "3", answer_kind: "VALUE" },
      ["92", "96", "94", "99"],
    );
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("fail");
  });

  it("is UNVERIFIABLE for an option-marker key when no options were captured", () => {
    const checks = auditNumericEntry(
      { stem: "What is the greatest 2-digit even number?", correct_answer: "98" },
      { raw_answer: "3", answer_kind: "VALUE" },
      null,
    );
    const key = checks.find((c) => c.name === "key-agreement");
    expect(key?.status).toBe("skip");
    expect(key?.detail).toContain('"3"');
    expect(verdictOf(checks)).toBe("UNVERIFIABLE");
  });

  // Synthetic reproduction of the SAM-L4-Q15 class: the parsed key only
  // captured a worked-solution line converting a quantity GIVEN in the stem.
  it("is UNVERIFIABLE when the key is an intermediate working line", () => {
    const checks = auditNumericEntry(
      {
        stem: "When Casey had walked 2 km 400 m, she had walked 3 times as far as Dana. How far had Dana walked?",
        correct_answer: "0 km 800 m",
      },
      { raw_answer: "2 km 400 m = 2400 m", answer_kind: "VALUE" },
    );
    const key = checks.find((c) => c.name === "key-agreement");
    expect(key?.status).toBe("skip");
    expect(key?.detail).toContain("2 km 400 m = 2400 m"); // raw key kept
    expect(verdictOf(checks)).toBe("SUSPECT"); // answer-format still fails
  });

  it("matches the final value of a worked-solution equation chain", () => {
    const checks = auditNumericEntry(
      {
        stem: "When Casey had walked 2 km 400 m, she had walked 3 times as far as Dana. How far had Dana walked?",
        correct_answer: "0 km 800 m",
      },
      { raw_answer: "2400 ÷ 3 = 800 m\n800 m = 0 km 800 m", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
  });

  it("fails against a confidently extracted worked-solution final value", () => {
    const checks = auditNumericEntry(
      { stem: "Share 63 sweets equally among 9 children. How many each?", correct_answer: "8" },
      { raw_answer: "63 ÷ 9 = 7", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("fail");
  });

  it("matches stored vs key across P1 formatting noise (case/spacing/units)", () => {
    const checks = auditNumericEntry(
      { stem: "How far is it?", correct_answer: "1 km 750 m" },
      { raw_answer: "1KM 750  m", answer_kind: "VALUE" },
    );
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
  });

  it("fails stem-arithmetic when the stored answer misses the computed target", () => {
    const checks = auditNumericEntry(
      { stem: "What is 100 more than 504?", correct_answer: "504" },
      null,
    );
    expect(checks.find((c) => c.name === "stem-arithmetic")?.status).toBe("fail");
  });

  it("fails structure when correct_answer is missing", () => {
    const checks = auditNumericEntry({ stem: "How many?" }, null);
    expect(checks[0]).toMatchObject({ name: "structure", status: "fail" });
  });
});

// ---------------------------------------------------------------------------
// DRAG_DROP audit
// ---------------------------------------------------------------------------

describe("auditDragDrop", () => {
  const content = {
    stem: "Arrange the numbers. Begin with the greatest. 12, 71, 29",
    items: ["12", "71", "29"],
    correct_order: ["71", "29", "12"],
  };

  it("passes when correct_order matches the key sequence", () => {
    const checks = auditDragDrop(content, { raw_answer: "71, 29, 12", answer_kind: "VALUE" });
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("pass");
    expect(verdictOf(checks)).toBe("CLEAN");
  });

  it("fails structure when items/correct_order differ as multisets", () => {
    const checks = auditDragDrop({ ...content, items: ["12", "71", "30"] }, null);
    expect(checks[0]).toMatchObject({ name: "structure", status: "fail" });
  });

  it("fails structure with fewer than 2 entries", () => {
    const checks = auditDragDrop({ items: ["a"], correct_order: ["a"] }, null);
    expect(checks[0]).toMatchObject({ name: "structure", status: "fail" });
  });

  it("is UNVERIFIABLE (not suspect) when key holds the same tokens in another order", () => {
    const checks = auditDragDrop(content, { raw_answer: "12, 29, 71", answer_kind: "VALUE" });
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("skip");
    expect(verdictOf(checks)).toBe("UNVERIFIABLE");
  });

  it("fails key-agreement when the key tokens differ", () => {
    const checks = auditDragDrop(content, { raw_answer: "71, 29, 13", answer_kind: "VALUE" });
    expect(checks.find((c) => c.name === "key-agreement")?.status).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// SQL VALUES parsing
// ---------------------------------------------------------------------------

const SYNTHETIC_SQL = `
with t as (select id from tenants where slug = 'x')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active)
select t.id, external_id, strand::strand, level::half_grade_level,
       difficulty, format::question_format,
       content::jsonb, misconception_tags,
       word_count, operation_type::operation_type, num_operations,
       representation::representation_kind,
       true
from t,
  (values
    -- a comment line between tuples
    ('SYN-Q01', 'number_sense', '1A', -1.9, 'MULTIPLE_CHOICE',
       '{"stem":"What''s the missing number? 4 and ___ make 10.",'
       '"options":["6","0","9"],"correct_index":0}',
       array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
       9, 'ADDITION', 1, 'SYMBOLIC'),

    ('SYN-Q02', 'number_sense', '2A', -1.2, 'NUMERIC_ENTRY',
       '{"stem":"What is 1 more than 8?","correct_answer":"9"}',
       array[]::text[],
       7, 'ADDITION', 1, 'SYMBOLIC')
  ) as v(external_id, strand, level, difficulty, format,
         content, misconception_tags,
         word_count, operation_type, num_operations, representation)
on conflict (tenant_id, external_id) do nothing;
`;

describe("parseSqlValuesTuples / parseQuestionInserts", () => {
  it("parses tuples with adjacent string literals, '' escapes, arrays, comments", () => {
    const inner = SYNTHETIC_SQL.slice(
      SYNTHETIC_SQL.indexOf("(values") + "(values".length,
      SYNTHETIC_SQL.indexOf(") as v("),
    );
    const tuples = parseSqlValuesTuples(inner);
    expect(tuples).toHaveLength(2);
    expect(tuples[0][0]).toBe("SYN-Q01");
    expect(tuples[0][3]).toBe(-1.9);
    // Adjacent literals concatenated + '' unescaped into a parseable JSON doc.
    const content = JSON.parse(tuples[0][5] as string) as { stem: string; options: string[] };
    expect(content.stem).toBe("What's the missing number? 4 and ___ make 10.");
    expect(content.options).toEqual(["6", "0", "9"]);
    expect(tuples[0][6]).toEqual(["NS_PLACE_VALUE_CONFUSION", "NS_ZERO_VALUE"]);
    expect(tuples[1][6]).toEqual([]);
  });

  it("maps tuples to BankRows via the as v(...) column list", () => {
    const rows = parseQuestionInserts(SYNTHETIC_SQL, "hand-seeded");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      external_id: "SYN-Q01",
      strand: "number_sense",
      level: "1A",
      format: "MULTIPLE_CHOICE",
      word_count: 9,
      is_active: true, // no per-row is_active column → hand block default
      content_key: null,
      origin: "hand-seeded",
    });
    expect(rows[1].content).toEqual({
      stem: "What is 1 more than 8?",
      correct_answer: "9",
    });
  });
});

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

describe("verdictOf / parseExternalId / formatAuditLogLine", () => {
  it("verdict: any fail → SUSPECT; verifying pass → CLEAN; else UNVERIFIABLE", () => {
    const pass = (name: string): CheckResult => ({ name, status: "pass", detail: "" });
    const fail = (name: string): CheckResult => ({ name, status: "fail", detail: "" });
    expect(verdictOf([pass("structure"), fail("key-agreement")])).toBe("SUSPECT");
    expect(verdictOf([pass("structure"), pass("key-agreement")])).toBe("CLEAN");
    expect(verdictOf([pass("structure"), pass("misconception-codes")])).toBe("UNVERIFIABLE");
  });

  it("parses SAM external ids", () => {
    expect(parseExternalId("SAM-L3-Q11")).toEqual({ level: 3, task: 11 });
    expect(parseExternalId("PLACEHOLDER-Q-IMG-GRID-001")).toBeNull();
  });

  it("formats the conversion.log audit line", () => {
    expect(
      formatAuditLogLine(
        { group: "Synthetic.pdf", checked: 10, clean: 7, suspect: 2, unverifiable: 1 },
        "2026-06-10T00:00:00.000Z",
      ),
    ).toBe(
      "2026-06-10T00:00:00.000Z | audit | Synthetic.pdf | checked=10 clean=7 suspect=2 unverifiable=1",
    );
  });
});
