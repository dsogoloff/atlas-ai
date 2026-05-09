import { describe, expect, it } from "vitest";

import type { Json } from "@/lib/supabase/database.types";

import { extractFromContent } from "./distractorMap";

// Mirror of the seed.sql MULTIPLE_CHOICE shape:
//   { stem, options: [...], correct_index, distractor_misconceptions: { "i": "CODE" } }
// Per features.md §1 the MC content carries options + correct_index +
// optional distractor_misconceptions.

describe("extractFromContent", () => {
  it("returns the mapped code when the answer matches a tagged distractor", () => {
    const content: Json = {
      stem: "Q",
      options: ["28", "38", "26", "32"],
      correct_index: 0,
      distractor_misconceptions: {
        "1": "OP_NO_REGROUPING",
        "2": "OP_SUBTRACTION_DIRECTION",
        "3": "OP_NO_REGROUPING",
      },
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "38")).toEqual([
      "OP_NO_REGROUPING",
    ]);
    expect(extractFromContent("MULTIPLE_CHOICE", content, "26")).toEqual([
      "OP_SUBTRACTION_DIRECTION",
    ]);
  });

  it("trims whitespace on answerGiven before matching", () => {
    const content: Json = {
      options: ["A", "B"],
      distractor_misconceptions: { "0": "X" },
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "  A  ")).toEqual([
      "X",
    ]);
  });

  it("returns [] when the answer matches an option not in the map (e.g., the correct option)", () => {
    const content: Json = {
      options: ["28", "38"],
      correct_index: 0,
      distractor_misconceptions: { "1": "OP_NO_REGROUPING" },
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "28")).toEqual([]);
  });

  it("returns [] when the answer is not in the options at all", () => {
    const content: Json = {
      options: ["A", "B"],
      distractor_misconceptions: { "0": "X" },
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "C")).toEqual([]);
  });

  it("returns [] when distractor_misconceptions is missing entirely", () => {
    const content: Json = {
      options: ["A", "B"],
      correct_index: 0,
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "B")).toEqual([]);
  });

  it("returns [] for NUMERIC_ENTRY regardless of content", () => {
    const content: Json = {
      stem: "What is 5+3?",
      correct_answer: "8",
    };
    expect(extractFromContent("NUMERIC_ENTRY", content, "7")).toEqual([]);
  });

  it("returns [] for DRAG_DROP regardless of content", () => {
    const content: Json = {
      items: ["1/4", "1/3", "1/2"],
      correct_order: ["1/4", "1/3", "1/2"],
    };
    expect(
      extractFromContent("DRAG_DROP", content, JSON.stringify(["1/2"])),
    ).toEqual([]);
  });

  it("returns [] when content is null", () => {
    expect(extractFromContent("MULTIPLE_CHOICE", null, "A")).toEqual([]);
  });

  it("returns [] when content is an array (not an object)", () => {
    expect(
      extractFromContent("MULTIPLE_CHOICE", ["A", "B"] as Json, "A"),
    ).toEqual([]);
  });

  it("returns [] when options is not an array", () => {
    const content: Json = {
      options: "not-an-array",
      distractor_misconceptions: { "0": "X" },
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "A")).toEqual([]);
  });

  it("returns [] when distractor_misconceptions value is not a string", () => {
    const content: Json = {
      options: ["A", "B"],
      distractor_misconceptions: { "0": 42 },
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "A")).toEqual([]);
  });

  it("returns [] when the mapped code is an empty string", () => {
    const content: Json = {
      options: ["A", "B"],
      distractor_misconceptions: { "0": "" },
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "A")).toEqual([]);
  });

  it("matches the option whose trimmed text equals the trimmed answer (whitespace tolerant on both sides)", () => {
    const content: Json = {
      options: ["  A  ", "B"],
      distractor_misconceptions: { "0": "X" },
    };
    expect(extractFromContent("MULTIPLE_CHOICE", content, "A")).toEqual(["X"]);
  });

  it("ignores option entries that are non-string", () => {
    const content: Json = {
      // Real seed never has non-string options, but tolerate defensively.
      options: ["A", 42, "B"],
      distractor_misconceptions: { "0": "X", "1": "Y", "2": "Z" },
    };
    // Answer "B" is at index 2 (not 1 — number entries don't match).
    expect(extractFromContent("MULTIPLE_CHOICE", content, "B")).toEqual(["Z"]);
  });
});
