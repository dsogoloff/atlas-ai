// Unit tests for the pure mapping / SQL-generation functions of the
// conversion pipeline's Stage 4 loader (scripts/conversion/stage4-load.ts).
//
// Lives under src/ (next to the taxonomy drift tests) because the vitest
// config only discovers src/**/*.test.ts; the script itself stays in
// scripts/conversion/ alongside stages 1–3.
//
// ALL question fixtures below are SYNTHETIC — fabricated math questions
// written for these tests. No real S.A.M. licensed text appears here.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildContentJson,
  buildMigrationFile,
  buildQuestionsInsert,
  buildSeedBlock,
  categorizeSkipReason,
  collectUnknownMisconceptionCodes,
  computeDeltaRows,
  deriveHalfGradeLevel,
  detectFlagContradictions,
  detectOptionsDivergence,
  escapeSqlString,
  formatStage4AuditLine,
  mapSubStrandToStrand,
  mintMigrationFileName,
  normalizeOptionText,
  parseDragDropContent,
  parseGeneratedMigrationExternalIds,
  parseSeedMisconceptionCodes,
  planMigrationWrite,
  renderValuesRow,
  replaceSeedBlock,
  taxLevelNumber,
  validateAndMapRecord,
  KNOWN_MISCONCEPTION_CODES,
  MIGRATION_MARKER,
  SEED_BEGIN_MARKER,
  SEED_END_MARKER,
  type LoadRow,
  type Stage3Question,
  type TaxonomyContent,
  type WorksheetLoadReport,
} from "../../../scripts/conversion/stage4-load";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = resolve(HERE, "../../..", "supabase/seed.sql");

// ---------------------------------------------------------------------------
// Fixtures (synthetic)
// ---------------------------------------------------------------------------

const TAX_CONTENT: TaxonomyContent[] = [
  { key: "l2-whole_numbers-1", level: "l2", sub_strand: "whole_numbers", seq: 1, name: "Numbers to 1000", mvp: true },
  { key: "l2-whole_numbers-4", level: "l2", sub_strand: "whole_numbers", seq: 4, name: "Word Problems Involving the Four Operations", mvp: true },
  { key: "l2-measurement-3", level: "l2", sub_strand: "measurement", seq: 3, name: "Time", mvp: true },
  { key: "l3-money-2", level: "l3", sub_strand: "money", seq: 2, name: "Word Problems", mvp: true },
  { key: "l2-data_representation-1", level: "l2", sub_strand: "data_representation", seq: 1, name: "Picture Graphs", mvp: true },
];

const contentByKey = new Map(TAX_CONTENT.map((c) => [c.key, c]));
const VALID_CODES: ReadonlySet<string> = new Set(KNOWN_MISCONCEPTION_CODES);

/** A fully valid synthetic NUMERIC_ENTRY record; tests override fields. */
function baseRecord(overrides: Partial<Stage3Question> = {}): Stage3Question {
  return {
    task_number: 5,
    sam_level: 2,
    sam_topic: "Synthetic Topic",
    content_key: "l2-whole_numbers-1",
    format: "NUMERIC_ENTRY",
    stem: "What is 400 + 50 + 3?",
    options: null,
    correct_index: null,
    correct_answer: "453",
    distractor_misconceptions: null,
    misconception_tags: ["NS_PLACE_VALUE_CONFUSION"],
    operation_type: "ADDITION",
    num_operations: 1,
    representation: "SYMBOLIC",
    difficulty_seed: -1.2,
    image_required: false,
    image_alt: null,
    confidence: "high",
    reasoning: "synthetic fixture",
    review_flags: [],
    external_id: "SAM-TEST-Q05",
    sub_strand: "whole_numbers",
    strand: "number_algebra",
    word_count: 6,
    status: "ok",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Strand mapping
// ---------------------------------------------------------------------------

describe("mapSubStrandToStrand", () => {
  it("maps the bridge-migration anchors 1:1", () => {
    expect(mapSubStrandToStrand("geometry", "SYMBOLIC", "GEOMETRY")).toBe("geometry");
    expect(mapSubStrandToStrand("measurement", "SYMBOLIC", "MEASUREMENT")).toBe("measurement");
    expect(mapSubStrandToStrand("data_representation", "PICTORIAL", "COUNTING")).toBe("data_statistics");
  });

  it("maps the decided sub-strands", () => {
    expect(mapSubStrandToStrand("whole_numbers", "SYMBOLIC", "ADDITION")).toBe("number_sense");
    expect(mapSubStrandToStrand("fractions", "SYMBOLIC", "FRACTION_OP")).toBe("fractions_decimals");
    expect(mapSubStrandToStrand("decimals", "SYMBOLIC", "DECIMAL_OP")).toBe("fractions_decimals");
    expect(mapSubStrandToStrand("percentage", "SYMBOLIC", "PERCENT_OP")).toBe("fractions_decimals");
    expect(mapSubStrandToStrand("money", "SYMBOLIC", "ADDITION")).toBe("measurement");
    expect(mapSubStrandToStrand("area_volume", "SYMBOLIC", "GEOMETRY")).toBe("geometry");
    expect(mapSubStrandToStrand("rate", "SYMBOLIC", "MULTIPLICATION")).toBe("operations_algorithms");
    expect(mapSubStrandToStrand("ratio", "SYMBOLIC", "MULTIPLICATION")).toBe("operations_algorithms");
    expect(mapSubStrandToStrand("algebra", "SYMBOLIC", "ALGEBRA")).toBe("operations_algorithms");
  });

  it("applies the word-problem arithmetic override for whole_numbers and money (SAM-L2-Q11/Q14/Q17 precedent)", () => {
    expect(mapSubStrandToStrand("whole_numbers", "WORD_PROBLEM_SINGLE", "SUBTRACTION")).toBe("operations_algorithms");
    expect(mapSubStrandToStrand("whole_numbers", "WORD_PROBLEM_MULTI", "DIVISION")).toBe("operations_algorithms");
    expect(mapSubStrandToStrand("money", "WORD_PROBLEM_SINGLE", "SUBTRACTION")).toBe("operations_algorithms");
  });

  it("does NOT override symbolic whole-number arithmetic (SAM-L2-Q09/Q19/Q20 precedent)", () => {
    expect(mapSubStrandToStrand("whole_numbers", "SYMBOLIC", "ADDITION")).toBe("number_sense");
    expect(mapSubStrandToStrand("whole_numbers", "SYMBOLIC", "SUBTRACTION")).toBe("number_sense");
  });

  it("does NOT let word-problem representation change other sub-strands", () => {
    expect(mapSubStrandToStrand("measurement", "WORD_PROBLEM_SINGLE", "SUBTRACTION")).toBe("measurement");
    expect(mapSubStrandToStrand("fractions", "WORD_PROBLEM_SINGLE", "FRACTION_OP")).toBe("fractions_decimals");
  });

  it("does NOT override word problems whose operation is not arithmetic", () => {
    expect(mapSubStrandToStrand("whole_numbers", "WORD_PROBLEM_SINGLE", "PATTERN")).toBe("number_sense");
  });

  it("returns null for unknown sub-strands", () => {
    expect(mapSubStrandToStrand("calculus", "SYMBOLIC", "ADDITION")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Level derivation
// ---------------------------------------------------------------------------

describe("taxLevelNumber", () => {
  it("parses kindergarten and numbered levels", () => {
    expect(taxLevelNumber("l0a")).toBe(0);
    expect(taxLevelNumber("l0c")).toBe(0);
    expect(taxLevelNumber("l1")).toBe(1);
    expect(taxLevelNumber("l6")).toBe(6);
    expect(taxLevelNumber("level2")).toBeNull();
  });
});

describe("deriveHalfGradeLevel", () => {
  it("reproduces every hand-seeded SAM-L2 difficulty anchor", () => {
    // seed.sql precedent: 1A -1.9..-1.7, 1B -1.6..-1.5, 2A -1.3..-1.0, 2B -0.9..-0.7.
    expect(deriveHalfGradeLevel("l2", -1.9)).toBe("1A");
    expect(deriveHalfGradeLevel("l2", -1.7)).toBe("1A");
    expect(deriveHalfGradeLevel("l2", -1.6)).toBe("1B");
    expect(deriveHalfGradeLevel("l2", -1.5)).toBe("1B");
    expect(deriveHalfGradeLevel("l2", -1.3)).toBe("2A");
    expect(deriveHalfGradeLevel("l2", -1.1)).toBe("2A");
    expect(deriveHalfGradeLevel("l2", -1.0)).toBe("2A");
    expect(deriveHalfGradeLevel("l2", -0.9)).toBe("2B");
    expect(deriveHalfGradeLevel("l2", -0.7)).toBe("2B");
  });

  it("shifts the band cuts by one grade-span per level", () => {
    // L3 bands are 2A/2B/3A/3B with cuts ≈ (-0.94, -0.69, -0.24).
    expect(deriveHalfGradeLevel("l3", -1.2)).toBe("2A");
    expect(deriveHalfGradeLevel("l3", -0.8)).toBe("2B");
    expect(deriveHalfGradeLevel("l3", -0.5)).toBe("3A");
    expect(deriveHalfGradeLevel("l3", 0.0)).toBe("3B");
    // L1 bands are KA/KB/1A/1B with cuts ≈ (-2.36, -2.11, -1.66).
    expect(deriveHalfGradeLevel("l1", -2.5)).toBe("KA");
    expect(deriveHalfGradeLevel("l1", -2.2)).toBe("KB");
    expect(deriveHalfGradeLevel("l1", -1.8)).toBe("1A");
    expect(deriveHalfGradeLevel("l1", -1.5)).toBe("1B");
  });

  it("clamps kindergarten levels at the bottom of the enum", () => {
    expect(deriveHalfGradeLevel("l0a", -3.5)).toBe("KA");
    expect(deriveHalfGradeLevel("l0c", 0)).toBe("KB");
  });

  it("returns null on unknown level codes or non-finite difficulty", () => {
    expect(deriveHalfGradeLevel("lX", -1)).toBeNull();
    expect(deriveHalfGradeLevel("l2", Number.NaN)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DRAG_DROP parsing
// ---------------------------------------------------------------------------

describe("parseDragDropContent", () => {
  it("recovers items in presentation order from the stem and correct_order from the answer", () => {
    const stem = "Arrange the numbers. Begin with the smallest. 68, 81, 9";
    const parsed = parseDragDropContent(stem, "9, 68, 81");
    expect(parsed).toEqual({
      items: ["68", "81", "9"],
      correct_order: ["9", "68", "81"],
    });
  });

  it("does not match tokens inside larger numbers", () => {
    // "9" must not match inside "968" — only the standalone token.
    const stem = "Order these. 968, 9, 96";
    const parsed = parseDragDropContent(stem, "9, 96, 968");
    expect(parsed).toEqual({
      items: ["968", "9", "96"],
      correct_order: ["9", "96", "968"],
    });
  });

  it("returns null when a token is missing from the stem", () => {
    expect(parseDragDropContent("Order: 1, 2, 3", "1, 2, 4")).toBeNull();
  });

  it("returns null for fewer than two tokens or null answers", () => {
    expect(parseDragDropContent("Order: 1, 2", "12")).toBeNull();
    expect(parseDragDropContent("Order: 1, 2", null)).toBeNull();
  });

  it("returns null on duplicate tokens (ambiguous order)", () => {
    expect(parseDragDropContent("Order: 5, 5, 6", "5, 5, 6")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Content jsonb shaping
// ---------------------------------------------------------------------------

describe("buildContentJson", () => {
  it("shapes MULTIPLE_CHOICE as {stem, options, correct_index, distractor_misconceptions}", () => {
    const built = buildContentJson(
      baseRecord({
        format: "MULTIPLE_CHOICE",
        stem: "Which number is the greatest?",
        options: ["12", "21", "102", "120"],
        correct_index: 3,
        correct_answer: null,
        distractor_misconceptions: { "0": "NS_PLACE_VALUE_CONFUSION" },
      }),
    );
    expect(built).toEqual({
      ok: true,
      content: {
        stem: "Which number is the greatest?",
        options: ["12", "21", "102", "120"],
        correct_index: 3,
        distractor_misconceptions: { "0": "NS_PLACE_VALUE_CONFUSION" },
      },
    });
  });

  it("omits distractor_misconceptions when empty", () => {
    const built = buildContentJson(
      baseRecord({
        format: "MULTIPLE_CHOICE",
        options: ["1", "2"],
        correct_index: 0,
        distractor_misconceptions: {},
      }),
    );
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect("distractor_misconceptions" in built.content).toBe(false);
    }
  });

  it("rejects MULTIPLE_CHOICE with out-of-range correct_index", () => {
    const built = buildContentJson(
      baseRecord({ format: "MULTIPLE_CHOICE", options: ["1", "2"], correct_index: 2 }),
    );
    expect(built.ok).toBe(false);
  });

  it("shapes NUMERIC_ENTRY as {stem, correct_answer}", () => {
    const built = buildContentJson(baseRecord());
    expect(built).toEqual({
      ok: true,
      content: { stem: "What is 400 + 50 + 3?", correct_answer: "453" },
    });
  });

  it("rejects NUMERIC_ENTRY without correct_answer", () => {
    expect(buildContentJson(baseRecord({ correct_answer: null })).ok).toBe(false);
  });

  it("shapes DRAG_DROP as {stem, items, correct_order}", () => {
    const built = buildContentJson(
      baseRecord({
        format: "DRAG_DROP",
        stem: "Arrange from smallest. 40, 4, 14",
        correct_answer: "4, 14, 40",
      }),
    );
    expect(built).toEqual({
      ok: true,
      content: {
        stem: "Arrange from smallest. 40, 4, 14",
        items: ["40", "4", "14"],
        correct_order: ["4", "14", "40"],
      },
    });
  });

  it("carries image_alt + image_required for image-essential records, with no image_path", () => {
    const built = buildContentJson(
      baseRecord({
        image_required: true,
        image_alt: "A clock face showing a time on the hour.",
        stem: "What time does the clock show?",
        correct_answer: "3",
      }),
    );
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.content.image_alt).toBe("A clock face showing a time on the hour.");
      expect(built.content.image_required).toBe(true);
      expect("image_path" in built.content).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Record validation + mapping
// ---------------------------------------------------------------------------

describe("validateAndMapRecord", () => {
  it("maps a valid record to a load row (active, derived strand/level)", () => {
    const result = validateAndMapRecord(baseRecord(), contentByKey, VALID_CODES);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.external_id).toBe("SAM-TEST-Q05");
      expect(result.row.strand).toBe("number_sense");
      expect(result.row.level).toBe("2A"); // l2, difficulty -1.2
      expect(result.row.is_active).toBe(true);
      expect(result.row.content_key).toBe("l2-whole_numbers-1");
    }
  });

  it("marks image-essential records inactive", () => {
    const result = validateAndMapRecord(
      baseRecord({ image_required: true, image_alt: "A picture graph of pets." }),
      contentByKey,
      VALID_CODES,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.row.is_active).toBe(false);
  });

  it("rejects unknown content_key", () => {
    const result = validateAndMapRecord(
      baseRecord({ content_key: "l9-imaginary-1" }),
      contentByKey,
      VALID_CODES,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.join(" ")).toContain("not in taxonomy");
    }
  });

  it("rejects records missing any of the four NOT-NULL norm fields", () => {
    const bad = [
      baseRecord({ word_count: undefined as unknown as number }),
      baseRecord({ operation_type: "" }),
      baseRecord({ num_operations: 0 }),
      baseRecord({ representation: "INTERPRETIVE_DANCE" }),
    ];
    for (const record of bad) {
      expect(validateAndMapRecord(record, contentByKey, VALID_CODES).ok).toBe(false);
    }
  });

  it("rejects format/answer disagreement", () => {
    const result = validateAndMapRecord(
      baseRecord({ format: "MULTIPLE_CHOICE", options: null, correct_index: null }),
      contentByKey,
      VALID_CODES,
    );
    expect(result.ok).toBe(false);
  });

  it("routes unmappable DRAG_DROP to the skip list", () => {
    const result = validateAndMapRecord(
      baseRecord({
        format: "DRAG_DROP",
        stem: "Arrange the shapes by size.",
        correct_answer: "triangle, square, circle",
      }),
      contentByKey,
      VALID_CODES,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.join(" ")).toContain("DRAG_DROP");
    }
  });

  it("applies the word-problem override end-to-end (money word problem → operations_algorithms)", () => {
    const result = validateAndMapRecord(
      baseRecord({
        content_key: "l3-money-2",
        stem: "Ana has $52. She spends $17 on a book. How much is left?",
        correct_answer: "35",
        representation: "WORD_PROBLEM_SINGLE",
        operation_type: "SUBTRACTION",
        difficulty_seed: -0.5,
      }),
      contentByKey,
      VALID_CODES,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.strand).toBe("operations_algorithms");
      expect(result.row.level).toBe("3A"); // l3 cuts ≈ -0.94/-0.69/-0.24
    }
  });
});

// ---------------------------------------------------------------------------
// Misconception vocabulary — seed.sql drift + unknown-code rejection
// ---------------------------------------------------------------------------

describe("misconception vocabulary", () => {
  it("KNOWN_MISCONCEPTION_CODES matches the seeded set in supabase/seed.sql exactly", () => {
    const seedCodes = parseSeedMisconceptionCodes(readFileSync(SEED_PATH, "utf-8"));
    expect([...seedCodes].sort()).toEqual([...KNOWN_MISCONCEPTION_CODES].sort());
    expect(seedCodes.length).toBe(21);
  });

  it("parseSeedMisconceptionCodes throws on SQL without a misconceptions insert", () => {
    expect(() => parseSeedMisconceptionCodes("select 1;")).toThrow(
      /insert into misconceptions/,
    );
  });

  it("collectUnknownMisconceptionCodes finds bad codes in tags and distractor values, deduplicated", () => {
    const q = baseRecord({
      misconception_tags: ["NS_COUNTING_ERROR", "ZZ_MADE_UP", "ZZ_MADE_UP"],
      distractor_misconceptions: { "0": "ZZ_MADE_UP", "1": "QQ_ALSO_FAKE", "2": "GE_PERIMETER_AREA" },
    });
    expect(collectUnknownMisconceptionCodes(q, VALID_CODES)).toEqual([
      "ZZ_MADE_UP",
      "QQ_ALSO_FAKE",
    ]);
  });

  it("collectUnknownMisconceptionCodes returns [] when every code is seeded", () => {
    expect(collectUnknownMisconceptionCodes(baseRecord(), VALID_CODES)).toEqual([]);
  });

  it("validateAndMapRecord routes unknown tag codes to the skip list, naming the code", () => {
    const result = validateAndMapRecord(
      baseRecord({ misconception_tags: ["NS_TOTALLY_INVENTED"] }),
      contentByKey,
      VALID_CODES,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.join(" ")).toContain(
        "unknown misconception code 'NS_TOTALLY_INVENTED'",
      );
    }
  });

  it("validateAndMapRecord routes unknown distractor-map codes to the skip list", () => {
    const result = validateAndMapRecord(
      baseRecord({
        format: "MULTIPLE_CHOICE",
        options: ["1", "2", "3"],
        correct_index: 0,
        correct_answer: null,
        distractor_misconceptions: { "1": "OP_FAKE_CODE" },
      }),
      contentByKey,
      VALID_CODES,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.join(" ")).toContain("unknown misconception code 'OP_FAKE_CODE'");
    }
  });
});

// ---------------------------------------------------------------------------
// Deterministic load gates (root-cause memo leverage #1)
// ---------------------------------------------------------------------------

describe("detectFlagContradictions", () => {
  // The SAM-L3-Q11 review flag VERBATIM (the proven case: the model's flag
  // said "corrected to 0" while the emitted field stayed 1). This is flag
  // metadata authored by the pipeline's model, not licensed question text.
  const Q11_FLAG =
    "correct_index corrected to 0 (option 1 in answer key = 9×2=18); verify answer key '1' maps to option (1) 9×2";

  it("skips the verbatim SAM-L3-Q11 shape: flag says index 0, record emits 1", () => {
    const reasons = detectFlagContradictions(
      baseRecord({
        format: "MULTIPLE_CHOICE",
        options: ["9 × 2", "9 × 3", "9 ÷ 2", "6 ÷ 3"],
        correct_index: 1,
        correct_answer: null,
        review_flags: [Q11_FLAG, "answer key kind=VALUE but format=MULTIPLE_CHOICE"],
      }),
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain("flag contradiction");
    expect(reasons[0]).toContain("correct_index should be 0");
    expect(reasons[0]).toContain("emits 1");
    expect(reasons[0]).toContain(Q11_FLAG);
  });

  it("passes when the stated correction AGREES with the emitted field", () => {
    const reasons = detectFlagContradictions(
      baseRecord({
        format: "MULTIPLE_CHOICE",
        options: ["9 × 2", "9 × 3", "9 ÷ 2", "6 ÷ 3"],
        correct_index: 0,
        correct_answer: null,
        review_flags: [Q11_FLAG],
      }),
    );
    expect(reasons).toEqual([]);
  });

  it("recognizes the 'should be' phrasing", () => {
    const reasons = detectFlagContradictions(
      baseRecord({
        format: "MULTIPLE_CHOICE",
        options: ["1", "2", "3", "4"],
        correct_index: 3,
        correct_answer: null,
        review_flags: ["correct_index should be 2 per the answer key"],
      }),
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain("should be 2");
  });

  it("detects correct_answer corrections that contradict the emitted value", () => {
    const reasons = detectFlagContradictions(
      baseRecord({
        correct_answer: "5250",
        review_flags: ["correct_answer corrected to 1 km 750 m; verify against the key"],
      }),
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('correct_answer should be "1 km 750 m"');
  });

  it("passes correct_answer corrections that agree (up to whitespace/case)", () => {
    const reasons = detectFlagContradictions(
      baseRecord({
        correct_answer: "1 km 750 m",
        review_flags: ["correct_answer corrected to 1 KM  750 M; verify against the key"],
      }),
    );
    expect(reasons).toEqual([]);
  });

  it("ignores ordinary advisory flags", () => {
    const reasons = detectFlagContradictions(
      baseRecord({
        review_flags: [
          "answer key kind=VALUE but format=MULTIPLE_CHOICE",
          "topic inherited via fill-down",
          "image not provided — verify the figure",
        ],
      }),
    );
    expect(reasons).toEqual([]);
  });
});

describe("detectOptionsDivergence", () => {
  it("passes verbatim options (whitespace/case differences are trivial)", () => {
    expect(
      detectOptionsDivergence(["9 × 2", "9 × 3"], ["9  ×  2", "9 × 3"]),
    ).toBeNull();
    expect(detectOptionsDivergence(["Model 1"], ["model 1"])).toBeNull();
  });

  it("flags reconstructed option text (the M4 shape)", () => {
    // Stage 2 parsed mojibake fragments; stage 3 invented plausible
    // fractions — divergence must skip the record.
    const reason = detectOptionsDivergence(
      ["4/12", "6/12", "4/6", "5/6"],
      ['$ #%', '& #%', '& "', "' \""],
    );
    expect(reason).not.toBeNull();
    expect(reason).toContain("options divergence");
    expect(reason).toContain('stage3 "4/12" vs stage2 "$ #%"');
  });

  it("flags value-equivalent rewrites (synthetic Q03 shape)", () => {
    const reason = detectOptionsDivergence(
      ["8", "80", "800", "8000"],
      ["8 ones", "8 tens", "8 hundreds", "8 thousands"],
    );
    expect(reason).not.toBeNull();
    expect(reason).toContain("options divergence");
  });

  it("flags a length mismatch", () => {
    const reason = detectOptionsDivergence(["1", "2", "3"], ["1", "2", "3", "4"]);
    expect(reason).not.toBeNull();
    expect(reason).toContain("3 options");
  });

  it("does not apply without a stage2 options_guess or without stage3 options", () => {
    expect(detectOptionsDivergence(["1", "2"], null)).toBeNull();
    expect(detectOptionsDivergence(["1", "2"], [])).toBeNull();
    expect(detectOptionsDivergence(null, ["1", "2"])).toBeNull();
  });
});

describe("normalizeOptionText", () => {
  it("folds unicode, dashes, whitespace, and case", () => {
    expect(normalizeOptionText("  10  000 ")).toBe("10 000");
    expect(normalizeOptionText("9 − 3")).toBe("9 - 3");
    expect(normalizeOptionText("Model 1")).toBe("model 1");
  });
});

// ---------------------------------------------------------------------------
// Load report (conversion.log audit line)
// ---------------------------------------------------------------------------

describe("categorizeSkipReason", () => {
  it("buckets every reason shape the loader emits", () => {
    expect(categorizeSkipReason("stage3 status=failed: API timeout")).toBe("stage3-failed");
    expect(
      categorizeSkipReason("duplicate external_id (already loaded from an earlier worksheet/record)"),
    ).toBe("duplicate-external-id");
    expect(
      categorizeSkipReason("unknown misconception code 'ZZ' (not in the seeded misconception set)"),
    ).toBe("unknown-misconception-code");
    expect(categorizeSkipReason("content_key 'l9-imaginary-1' not in taxonomy")).toBe(
      "unknown-content-key",
    );
    expect(categorizeSkipReason("NUMERIC_ENTRY without correct_answer")).toBe("invalid-fields");
    expect(categorizeSkipReason("representation 'X' invalid")).toBe("invalid-fields");
  });

  it("buckets the deterministic gate reasons", () => {
    expect(
      categorizeSkipReason(
        'flag contradiction: review flag states correct_index should be 0 but the record emits 1 — flag: "…"',
      ),
    ).toBe("flag-contradiction");
    expect(
      categorizeSkipReason(
        'options divergence: stage3 options are not verbatim from the stage2 extraction — [0] stage3 "4/12" vs stage2 "$ #%"',
      ),
    ).toBe("options-divergence");
  });
});

describe("formatStage4AuditLine", () => {
  const base: WorksheetLoadReport = {
    source: "Synthetic Worksheet.pdf",
    loaded: 18,
    contentIdAssigned: 18,
    reviewFlags: 5,
    imageInactive: 3,
    imagesUploaded: 2,
    imagesDeferred: 1,
    skipped: 0,
    skipReasonCounts: {},
  };

  it("renders the full per-worksheet load report on one greppable line", () => {
    expect(formatStage4AuditLine(base, "2026-06-10T00:00:00.000Z")).toBe(
      "2026-06-10T00:00:00.000Z | stage4 | Synthetic Worksheet.pdf | " +
        "loaded=18 content_id=18 review_flags=5 inactive_image=3 " +
        "images_uploaded=2 images_deferred=1 skipped=0",
    );
  });

  it("appends sorted skip-reason categories when records were skipped", () => {
    const line = formatStage4AuditLine(
      {
        ...base,
        skipped: 3,
        skipReasonCounts: { "unknown-misconception-code": 1, "stage3-failed": 2 },
      },
      "2026-06-10T00:00:00.000Z",
    );
    expect(line).toContain("skipped=3 (stage3-failed=2, unknown-misconception-code=1)");
  });
});

// ---------------------------------------------------------------------------
// SQL generation
// ---------------------------------------------------------------------------

const SAMPLE_ROW: LoadRow = {
  external_id: "SAM-TEST-Q01",
  strand: "number_sense",
  level: "2A",
  difficulty: -1.2,
  format: "NUMERIC_ENTRY",
  content: { stem: "What's 7 more than Tom's 8 marbles?", correct_answer: "15" },
  misconception_tags: ["NS_COUNTING_ERROR", "WP_KEYWORD_TRAP"],
  word_count: 8,
  operation_type: "ADDITION",
  num_operations: 1,
  representation: "WORD_PROBLEM_SINGLE",
  is_active: true,
  content_key: "l2-whole_numbers-1",
};

describe("escapeSqlString", () => {
  it("doubles single quotes", () => {
    expect(escapeSqlString("Tom's marbles aren't lost")).toBe(
      "Tom''s marbles aren''t lost",
    );
    expect(escapeSqlString("no quotes")).toBe("no quotes");
  });
});

describe("renderValuesRow", () => {
  it("emits an SQL-safe values row with escaped apostrophes in the content json", () => {
    const row = renderValuesRow(SAMPLE_ROW);
    expect(row).toContain("('SAM-TEST-Q01', 'number_sense', '2A', -1.2, 'NUMERIC_ENTRY',");
    expect(row).toContain("What''s 7 more than Tom''s 8 marbles?");
    expect(row).toContain("array['NS_COUNTING_ERROR','WP_KEYWORD_TRAP']");
    expect(row).toContain("8, 'ADDITION', 1, 'WORD_PROBLEM_SINGLE', true, 'l2-whole_numbers-1')");
    // The escaped literal must round-trip back to valid JSON once the
    // SQL doubling of single quotes is undone.
    const literal = /'(\{.*\})'/.exec(row);
    expect(literal).not.toBeNull();
    const json = (literal as RegExpExecArray)[1].replace(/''/g, "'");
    expect(JSON.parse(json)).toEqual(SAMPLE_ROW.content);
  });

  it("renders empty misconception_tags as a typed empty array", () => {
    const row = renderValuesRow({ ...SAMPLE_ROW, misconception_tags: [] });
    expect(row).toContain("array[]::text[]");
  });
});

describe("buildQuestionsInsert", () => {
  const sql = buildQuestionsInsert([SAMPLE_ROW]);

  it("uses the established tenant-CTE insert pattern", () => {
    expect(sql).toContain(
      "with t as (select id from tenants where slug = 'inspirea_singapore_math')",
    );
    expect(sql).toContain("insert into questions");
    expect(sql).toContain("on conflict (tenant_id, external_id) do nothing;");
  });

  it("resolves content_id via tax_content.code scoped to the tenant", () => {
    expect(sql).toContain("select tc.id from tax_content tc");
    expect(sql).toContain("where tc.tenant_id = t.id and tc.code = v.content_key");
  });

  it("casts every enum column", () => {
    expect(sql).toContain("v.strand::strand");
    expect(sql).toContain("v.level::half_grade_level");
    expect(sql).toContain("v.format::question_format");
    expect(sql).toContain("v.operation_type::operation_type");
    expect(sql).toContain("v.representation::representation_kind");
    expect(sql).toContain("v.content::jsonb");
  });
});

describe("buildMigrationFile / buildSeedBlock parity", () => {
  it("the INSERT statement is byte-identical between migration and seed block", () => {
    const insert = buildQuestionsInsert([SAMPLE_ROW]);
    const migration = buildMigrationFile([SAMPLE_ROW], "2026-06-10T00:00:00.000Z");
    const seedBlock = buildSeedBlock(
      [SAMPLE_ROW],
      ["20260610000000_load_sam_questions.sql"],
      "2026-06-10T00:00:00.000Z",
    );
    expect(migration).toContain(insert);
    expect(seedBlock).toContain(insert);
    expect(migration).toContain(MIGRATION_MARKER);
    expect(seedBlock.startsWith(SEED_BEGIN_MARKER)).toBe(true);
    expect(seedBlock.endsWith(SEED_END_MARKER)).toBe(true);
  });
});

describe("replaceSeedBlock", () => {
  const existing = [
    "-- hand-written header",
    "insert into tenants (slug) values ('inspirea_singapore_math');",
    "-- hand-written footer",
    "",
  ].join("\n");
  const blockV1 = `${SEED_BEGIN_MARKER}\n-- generated v1\n${SEED_END_MARKER}`;
  const blockV2 = `${SEED_BEGIN_MARKER}\n-- generated v2\n${SEED_END_MARKER}`;

  it("appends the block when no markers exist, leaving existing content untouched", () => {
    const out = replaceSeedBlock(existing, blockV1);
    expect(out.startsWith(existing)).toBe(true);
    expect(out).toContain("-- generated v1");
  });

  it("replaces the existing block instead of duplicating on re-run", () => {
    const once = replaceSeedBlock(existing, blockV1);
    const twice = replaceSeedBlock(once, blockV2);
    expect(twice).toContain("-- generated v2");
    expect(twice).not.toContain("-- generated v1");
    expect(twice.match(new RegExp("BEGIN stage4-generated-questions", "g"))).toHaveLength(1);
    expect(twice.indexOf("-- hand-written header")).toBe(0);
  });

  it("is idempotent: replacing with the same block changes nothing", () => {
    const once = replaceSeedBlock(existing, blockV1);
    expect(replaceSeedBlock(once, blockV1)).toBe(once);
  });
});

// ---------------------------------------------------------------------------
// Delta-migration planning — generated migrations are immutable history
// ---------------------------------------------------------------------------

const SECOND_ROW: LoadRow = {
  ...SAMPLE_ROW,
  external_id: "SAM-TEST-Q02",
  content: { stem: "What is 9 less than 20?", correct_answer: "11" },
};

describe("parseGeneratedMigrationExternalIds", () => {
  it("round-trips the external_ids out of a generated migration file", () => {
    const sql = buildMigrationFile([SAMPLE_ROW, SECOND_ROW], "2026-06-10T00:00:00.000Z");
    expect(parseGeneratedMigrationExternalIds(sql)).toEqual([
      "SAM-TEST-Q01",
      "SAM-TEST-Q02",
    ]);
  });

  it("only reads tuple-opening lines — content json on its own line never matches", () => {
    // A stem that CONTAINS a tuple-looking fragment must not leak an id:
    // the content json renders on a continuation line (no leading "('").
    const trap: LoadRow = {
      ...SAMPLE_ROW,
      external_id: "SAM-TEST-Q03",
      content: {
        stem: "Ben wrote ('SAM-FAKE-Q99', on the board. How many characters is that?",
        correct_answer: "16",
      },
    };
    const sql = buildMigrationFile([trap], "2026-06-10T00:00:00.000Z");
    expect(parseGeneratedMigrationExternalIds(sql)).toEqual(["SAM-TEST-Q03"]);
  });

  it("returns [] when the SQL has no values block", () => {
    expect(parseGeneratedMigrationExternalIds("select 1;")).toEqual([]);
  });
});

describe("computeDeltaRows", () => {
  it("keeps only rows whose external_id is not already in history", () => {
    expect(
      computeDeltaRows([SAMPLE_ROW, SECOND_ROW], new Set(["SAM-TEST-Q01"])),
    ).toEqual([SECOND_ROW]);
  });
});

describe("planMigrationWrite", () => {
  const MINTED = "20260612000000_load_sam_questions.sql";
  const PRIOR = {
    fileName: "20260610151306_load_sam_questions.sql",
    sql: buildMigrationFile([SAMPLE_ROW], "2026-06-10T15:13:06.000Z"),
  };

  it("first run (no prior generated migration): all rows go to the minted file", () => {
    const plan = planMigrationWrite([], [SAMPLE_ROW, SECOND_ROW], MINTED);
    expect(plan).toEqual({
      immutableFileNames: [],
      rowsToWrite: [SAMPLE_ROW, SECOND_ROW],
      newFileName: MINTED,
    });
  });

  it("prior migration exists: only the DELTA rows go to a NEW file; history untouched", () => {
    const plan = planMigrationWrite([PRIOR], [SAMPLE_ROW, SECOND_ROW], MINTED);
    expect(plan.immutableFileNames).toEqual([PRIOR.fileName]);
    expect(plan.rowsToWrite).toEqual([SECOND_ROW]);
    expect(plan.newFileName).toBe(MINTED);
    expect(plan.newFileName).not.toBe(PRIOR.fileName);
  });

  it("zero-delta run: no new migration file at all", () => {
    const plan = planMigrationWrite([PRIOR], [SAMPLE_ROW], MINTED);
    expect(plan.rowsToWrite).toEqual([]);
    expect(plan.newFileName).toBeNull();
    expect(plan.immutableFileNames).toEqual([PRIOR.fileName]);
  });

  it("refuses a minted filename that collides with existing history (immutability)", () => {
    expect(() =>
      planMigrationWrite([PRIOR], [SECOND_ROW], PRIOR.fileName),
    ).toThrow(/immutable/);
  });
});

describe("mintMigrationFileName", () => {
  it("formats the UTC timestamp into the load-migration name", () => {
    expect(mintMigrationFileName(new Date("2026-06-11T01:02:03Z"), new Set())).toBe(
      "20260611010203_load_sam_questions.sql",
    );
  });

  it("bumps one second at a time past taken names", () => {
    const taken = new Set([
      "20260611010203_load_sam_questions.sql",
      "20260611010204_load_sam_questions.sql",
    ]);
    expect(mintMigrationFileName(new Date("2026-06-11T01:02:03Z"), taken)).toBe(
      "20260611010205_load_sam_questions.sql",
    );
  });
});

describe("delta-aware file headers", () => {
  it("buildMigrationFile marks a delta file and names the prior migrations", () => {
    const sql = buildMigrationFile([SECOND_ROW], "2026-06-12T00:00:00.000Z", [
      "20260610151306_load_sam_questions.sql",
    ]);
    expect(sql).toContain(MIGRATION_MARKER);
    expect(sql).toContain("DELTA LOAD");
    expect(sql).toContain("--   * 20260610151306_load_sam_questions.sql");
  });

  it("buildMigrationFile without priors carries no delta header", () => {
    const sql = buildMigrationFile([SAMPLE_ROW], "2026-06-12T00:00:00.000Z");
    expect(sql).not.toContain("DELTA LOAD");
  });

  it("buildSeedBlock lists every generated migration when there are several", () => {
    const block = buildSeedBlock(
      [SAMPLE_ROW, SECOND_ROW],
      ["20260610151306_load_sam_questions.sql", "20260612000000_load_sam_questions.sql"],
      "2026-06-12T00:00:00.000Z",
    );
    expect(block).toContain("cumulative across the generated load migrations");
    expect(block).toContain("--   supabase/migrations/20260610151306_load_sam_questions.sql");
    expect(block).toContain("--   supabase/migrations/20260612000000_load_sam_questions.sql");
  });
});

