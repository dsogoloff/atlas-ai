import { describe, expect, it } from "vitest";

import type { Json } from "@/lib/supabase/database.types";

import {
  PROMPT_VERSION,
  buildClassifierPrompt,
  classifierResponseSchema,
} from "./prompt";
import type { ClassifierInput, TaxonomyMap } from "./types";

const TAXONOMY: TaxonomyMap = new Map([
  [
    "OPERATIONS",
    [
      {
        code: "OP_NO_REGROUPING",
        label: "No regrouping (subtraction)",
        description: "Takes the smaller from the larger.",
        strand: "OPERATIONS",
      },
      {
        code: "OP_SUBTRACTION_DIRECTION",
        label: "Subtraction direction error",
        description: "Subtracts in the wrong direction.",
        strand: "OPERATIONS",
      },
    ],
  ],
  [
    "NUMBER_SENSE",
    [
      {
        code: "NS_PLACE_VALUE_CONFUSION",
        label: "Place value confusion",
        description: "Treats digits as independent values.",
        strand: "NUMBER_SENSE",
      },
    ],
  ],
]);

const MC_INPUT: ClassifierInput = {
  format: "MULTIPLE_CHOICE",
  strand: "OPERATIONS",
  content: {
    stem: "47 - 19 = ?",
    options: ["28", "38", "26", "32"],
    correct_index: 0,
  },
  answerGiven: "38",
  isCorrect: false,
};

const NE_INPUT: ClassifierInput = {
  format: "NUMERIC_ENTRY",
  strand: "OPERATIONS",
  content: {
    stem: "What is 47 minus 19?",
    correct_answer: "28",
  },
  answerGiven: "38",
  isCorrect: false,
};

describe("PROMPT_VERSION", () => {
  it("is the locked v1 string", () => {
    expect(PROMPT_VERSION).toBe("v1");
  });
});

describe("classifierResponseSchema", () => {
  it("accepts a single-code response", () => {
    expect(
      classifierResponseSchema.parse({ codes: ["OP_NO_REGROUPING"] }),
    ).toEqual({ codes: ["OP_NO_REGROUPING"] });
  });

  it("accepts an empty-codes response", () => {
    expect(classifierResponseSchema.parse({ codes: [] })).toEqual({
      codes: [],
    });
  });

  it("rejects a multi-code response (max 1 per D1 lock)", () => {
    expect(() =>
      classifierResponseSchema.parse({ codes: ["A", "B"] }),
    ).toThrow();
  });

  it("rejects non-string codes", () => {
    expect(() => classifierResponseSchema.parse({ codes: [42] })).toThrow();
  });
});

describe("buildClassifierPrompt", () => {
  it("includes question stem, correct answer, and child's answer for MC", () => {
    const { system, prompt } = buildClassifierPrompt(MC_INPUT, TAXONOMY);
    expect(prompt).toContain("47 - 19 = ?");
    expect(prompt).toContain("Correct answer: 28");
    expect(prompt).toContain("Child's answer: 38");
    expect(system).toContain("classifier");
    expect(system).toContain("at most ONE code");
  });

  it("includes question stem, correct answer, and child's answer for NE", () => {
    const { prompt } = buildClassifierPrompt(NE_INPUT, TAXONOMY);
    expect(prompt).toContain("What is 47 minus 19?");
    expect(prompt).toContain("Correct answer: 28");
    expect(prompt).toContain("Child's answer: 38");
  });

  it("filters taxonomy to input.strand only", () => {
    const { prompt } = buildClassifierPrompt(MC_INPUT, TAXONOMY);
    // OPERATIONS codes appear
    expect(prompt).toContain("OP_NO_REGROUPING");
    expect(prompt).toContain("OP_SUBTRACTION_DIRECTION");
    // NUMBER_SENSE code does NOT appear
    expect(prompt).not.toContain("NS_PLACE_VALUE_CONFUSION");
  });

  it("produces a valid prompt even when the strand has no taxonomy entries", () => {
    const emptyTaxonomy: TaxonomyMap = new Map();
    const { prompt } = buildClassifierPrompt(MC_INPUT, emptyTaxonomy);
    expect(prompt).toContain("47 - 19 = ?");
    expect(prompt).toContain("(none provided)");
  });

  it("is deterministic for fixed inputs", () => {
    const a = buildClassifierPrompt(MC_INPUT, TAXONOMY);
    const b = buildClassifierPrompt(MC_INPUT, TAXONOMY);
    expect(a).toEqual(b);
  });

  it("does NOT include any persistent identifier (compliance.md §6)", () => {
    // ClassifierInput type structurally excludes child_name / session_id /
    // child_id / parent_id / tenant_id. This is a regression catch in
    // case someone later adds them to the input shape and forgets to
    // strip from the prompt.
    const { system, prompt } = buildClassifierPrompt(MC_INPUT, TAXONOMY);
    for (const banned of [
      "session_id",
      "child_id",
      "parent_id",
      "tenant_id",
      "auth_user_id",
    ]) {
      expect(prompt).not.toContain(banned);
      expect(system).not.toContain(banned);
    }
  });

  it("throws on missing stem", () => {
    const input: ClassifierInput = {
      ...MC_INPUT,
      content: { options: ["A", "B"], correct_index: 0 } as Json,
    };
    expect(() => buildClassifierPrompt(input, TAXONOMY)).toThrow(/stem/);
  });

  it("throws on missing correct_index for MC", () => {
    const input: ClassifierInput = {
      ...MC_INPUT,
      content: { stem: "Q", options: ["A", "B"] } as Json,
    };
    expect(() => buildClassifierPrompt(input, TAXONOMY)).toThrow(
      /MULTIPLE_CHOICE/,
    );
  });

  it("throws on out-of-range correct_index for MC", () => {
    const input: ClassifierInput = {
      ...MC_INPUT,
      content: { stem: "Q", options: ["A", "B"], correct_index: 5 } as Json,
    };
    expect(() => buildClassifierPrompt(input, TAXONOMY)).toThrow(
      /MULTIPLE_CHOICE/,
    );
  });

  it("throws on missing correct_answer for NE", () => {
    const input: ClassifierInput = {
      ...NE_INPUT,
      content: { stem: "Q" } as Json,
    };
    expect(() => buildClassifierPrompt(input, TAXONOMY)).toThrow(
      /NUMERIC_ENTRY/,
    );
  });

  it("throws on DRAG_DROP (router bug catch)", () => {
    const input: ClassifierInput = {
      format: "DRAG_DROP",
      strand: "OPERATIONS",
      content: {
        stem: "Order these",
        items: ["1/4", "1/2"],
        correct_order: ["1/4", "1/2"],
      },
      answerGiven: JSON.stringify(["1/4", "1/2"]),
      isCorrect: false,
    };
    expect(() => buildClassifierPrompt(input, TAXONOMY)).toThrow(/DRAG_DROP/);
  });
});
