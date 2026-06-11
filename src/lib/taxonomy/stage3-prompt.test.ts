// Unit tests for the Stage 3 prompt assembly (scripts/conversion/
// stage3-tag.ts buildUserPrompt) — specifically the raw answer-key INPUT
// CONTEXT added by the pipeline-guards lane (root-cause memo leverage #4:
// the model could not see a truncated key entry's continuation lines
// because only Stage 2's parsed entry was ever in the prompt).
//
// The system prompt / voice / model are NOT exercised here — only the
// user-prompt input assembly. All fixtures are SYNTHETIC.

import { describe, expect, it } from "vitest";

import {
  boundAnswerKeyRaw,
  buildUserPrompt,
  MAX_ANSWER_KEY_RAW_CHARS,
  type PromptInput,
  type Stage2Question,
} from "../../../scripts/conversion/stage3-tag";

function question(overrides: Partial<Stage2Question> = {}): Stage2Question {
  return {
    task_number: 15,
    pages: [9],
    page_images: ["page-09.png"],
    raw_text: "15. A synthetic two-step length problem.\nAnswer: _____________",
    stem_guess: "A synthetic two-step length problem.",
    format_guess: "NUMERIC_ENTRY",
    image_likely: false,
    eval_key: null,
    correct_answer: {
      raw_answer: "4 km 600 m = 4600 m",
      answer_kind: "VALUE",
      answer_value: "4600",
      source: "answer_key",
    },
    answer_format_mismatch: false,
    ...overrides,
  };
}

function promptInput(overrides: Partial<PromptInput> = {}): PromptInput {
  return {
    question: question(),
    taxonomyContent: [],
    misconceptions: [],
    testLevelLabel: "Level 9",
    evalResultsRaw: null,
    answerKeyRaw: null,
    ...overrides,
  };
}

describe("boundAnswerKeyRaw", () => {
  it("passes short text through unchanged and null through as null", () => {
    expect(boundAnswerKeyRaw("1. 3\n2. 42")).toBe("1. 3\n2. 42");
    expect(boundAnswerKeyRaw(null)).toBeNull();
  });

  it("truncates pathological text at the bound, with a visible marker", () => {
    const long = "x".repeat(MAX_ANSWER_KEY_RAW_CHARS + 500);
    const bounded = boundAnswerKeyRaw(long) as string;
    expect(bounded.length).toBeLessThan(long.length);
    expect(bounded).toContain(`truncated at ${MAX_ANSWER_KEY_RAW_CHARS} chars`);
    expect(bounded.startsWith("x".repeat(100))).toBe(true);
  });
});

describe("buildUserPrompt — raw answer-key context", () => {
  it("includes the verbatim raw key text and points the model at this task's entry", () => {
    const keyRaw =
      "Task \tAnswer \tTask \tAnswer\n1 \t(2) \t15 \t4 km 600 m = 4600 m\n4600 ÷ 2 = 2300\nTom ran 2 km 300 m.";
    const prompt = buildUserPrompt(promptInput({ answerKeyRaw: keyRaw }));
    expect(prompt).toContain("RAW ANSWER-KEY TEXT");
    expect(prompt).toContain(keyRaw);
    expect(prompt).toContain("locate task 15's entry");
    // The parsed entry stays in the prompt too — the raw text supplements,
    // never replaces, Stage 2's parse.
    expect(prompt).toContain('"raw_answer":"4 km 600 m = 4600 m"');
  });

  it("renders a clear placeholder when no answer key was paired", () => {
    const prompt = buildUserPrompt(promptInput({ answerKeyRaw: null }));
    expect(prompt).toContain("RAW ANSWER-KEY TEXT");
    expect(prompt).toContain("(not available)");
  });

  it("bounds oversized key text inside the prompt", () => {
    const long = "9. 42\n".repeat(3000);
    const prompt = buildUserPrompt(promptInput({ answerKeyRaw: long }));
    expect(prompt).not.toContain(long);
    expect(prompt).toContain(`truncated at ${MAX_ANSWER_KEY_RAW_CHARS} chars`);
  });
});
