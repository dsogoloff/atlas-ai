// Tests for the answer-log humanizers. These turn the raw stored shapes
// (answer_given wire strings + questions.content models) into parent-readable
// strings — resolving tapped/selected tile & option ids to their labels so the
// log never shows raw JSON like {"type":"id-set","ids":["t1"]}.

import { describe, expect, it } from "vitest";

import type { Json } from "@/lib/supabase/database.types";

import { humanizeChildAnswer, humanizeCorrectAnswer } from "./humanize";

describe("humanizeChildAnswer / humanizeCorrectAnswer", () => {
  // -------------------------------------------------------------------------
  // Unchanged formats — MC / numeric / text / drag-drop keep prior output.
  // -------------------------------------------------------------------------
  it("MULTIPLE_CHOICE renders the chosen + correct option text verbatim", () => {
    const content: Json = { stem: "?", options: ["Two", "Four", "Six"], correct_index: 1 };
    expect(humanizeChildAnswer("MULTIPLE_CHOICE", content, "Four")).toBe("Four");
    expect(humanizeCorrectAnswer("MULTIPLE_CHOICE", content)).toBe("Four");
  });

  it("NUMERIC_ENTRY / TEXT_ENTRY render the raw entry + correct_answer", () => {
    const numeric: Json = { stem: "?", correct_answer: "42" };
    expect(humanizeChildAnswer("NUMERIC_ENTRY", numeric, "42")).toBe("42");
    expect(humanizeCorrectAnswer("NUMERIC_ENTRY", numeric)).toBe("42");
    const text: Json = { stem: "?", correct_answer: "cylinder" };
    expect(humanizeChildAnswer("TEXT_ENTRY", text, "Cylinder")).toBe("Cylinder");
    expect(humanizeCorrectAnswer("TEXT_ENTRY", text)).toBe("cylinder");
  });

  it("DRAG_DROP joins the ordered tokens with arrows (unchanged)", () => {
    const content: Json = { stem: "?", correct_order: ["1", "2", "3"] };
    expect(humanizeChildAnswer("DRAG_DROP", content, '["2","1","3"]')).toBe(
      "2 → 1 → 3",
    );
    expect(humanizeCorrectAnswer("DRAG_DROP", content)).toBe("1 → 2 → 3");
  });

  // -------------------------------------------------------------------------
  // CLICK_IMAGE_SINGLE — required case. id-set child answer + select-one model.
  // -------------------------------------------------------------------------
  it("CLICK_IMAGE_SINGLE resolves the tapped + correct tile id to its label", () => {
    const content: Json = {
      stem: "Tap the triangle",
      tiles: [
        { id: "t1", label: "Triangle" },
        { id: "t2", label: "Square" },
      ],
      _authoring: { answer_model: { rule: "select-one", correct: "t1" } },
    };
    // Child tapped the square (wrong).
    expect(
      humanizeChildAnswer("CLICK_IMAGE_SINGLE", content, '{"type":"id-set","ids":["t2"]}'),
    ).toBe("Square");
    expect(humanizeCorrectAnswer("CLICK_IMAGE_SINGLE", content)).toBe("Triangle");
  });

  // -------------------------------------------------------------------------
  // CLICK_IMAGE_MULTI — required id-set MULTI case. Multi-id child + correct.
  // -------------------------------------------------------------------------
  it("CLICK_IMAGE_MULTI joins the selected + correct tile labels readably", () => {
    const content: Json = {
      stem: "Tap all the fruit",
      tiles: [
        { id: "a", label: "Apple" },
        { id: "b", label: "Banana" },
        { id: "c", label: "Chair" },
      ],
      _authoring: { answer_model: { rule: "select-all", correct: ["a", "b"] } },
    };
    expect(
      humanizeChildAnswer("CLICK_IMAGE_MULTI", content, '{"type":"id-set","ids":["a","c"]}'),
    ).toBe("Apple, Chair");
    expect(humanizeCorrectAnswer("CLICK_IMAGE_MULTI", content)).toBe("Apple, Banana");
  });

  it("SELECT_MULTIPLE resolves option ids (rule 'all') to labels", () => {
    const content: Json = {
      stem: "Pick the even numbers",
      select_rule: "all",
      options: [
        { id: "o1", label: "2" },
        { id: "o2", label: "3" },
        { id: "o3", label: "4" },
      ],
      correct: ["o1", "o3"],
    };
    expect(
      humanizeChildAnswer("SELECT_MULTIPLE", content, '{"type":"id-set","ids":["o1","o2"]}'),
    ).toBe("2, 3");
    expect(humanizeCorrectAnswer("SELECT_MULTIPLE", content)).toBe("2, 4");
  });

  it("IMAGE_ORDERING shows the ordered labels with arrows", () => {
    const content: Json = {
      stem: "Order smallest to largest",
      tiles: [
        { id: "s", label: "Small" },
        { id: "m", label: "Medium" },
        { id: "l", label: "Large" },
      ],
      _authoring: { answer_model: { rule: "order-equality", order: ["s", "m", "l"] } },
    };
    expect(
      humanizeChildAnswer("IMAGE_ORDERING", content, '{"type":"ordered-ids","ids":["m","s","l"]}'),
    ).toBe("Medium → Small → Large");
    expect(humanizeCorrectAnswer("IMAGE_ORDERING", content)).toBe(
      "Small → Medium → Large",
    );
  });

  it("VISUAL_MATCHING shows left→right label pairs", () => {
    const content: Json = {
      stem: "Match the sound",
      left: [
        { id: "L1", label: "Cat" },
        { id: "L2", label: "Dog" },
      ],
      right: [
        { id: "R1", label: "Meow" },
        { id: "R2", label: "Woof" },
      ],
      pairs: { L1: "R1", L2: "R2" },
    };
    expect(
      humanizeChildAnswer(
        "VISUAL_MATCHING",
        content,
        '{"type":"pairs","pairs":{"L1":"R2","L2":"R1"}}',
      ),
    ).toBe("Cat → Woof, Dog → Meow");
    expect(humanizeCorrectAnswer("VISUAL_MATCHING", content)).toBe(
      "Cat → Meow, Dog → Woof",
    );
  });

  it("MULTI_BLANK joins the entered + correct blank values in token order", () => {
    const content: Json = {
      stem: "Fill the fact family",
      tokens: [
        { t: "text", value: "3 + 6 = " },
        { t: "blank", id: "b1" },
        { t: "text", value: ", 9 - 3 = " },
        { t: "blank", id: "b2" },
      ],
      blanks: { b1: { value: "9" }, b2: { value: "6" } },
    };
    expect(
      humanizeChildAnswer(
        "MULTI_BLANK",
        content,
        '{"type":"blanks","values":{"b1":"9","b2":"5"}}',
      ),
    ).toBe("9, 5");
    expect(humanizeCorrectAnswer("MULTI_BLANK", content)).toBe("9, 6");
  });

  it("EQUATION_SET renders each number sentence", () => {
    const content: Json = {
      stem: "Write the fact family",
      rows: 2,
      answer_rule: "set-equality",
      canonical: [
        { a: 6, op: "+", b: 2, result: 8 },
        { a: 8, op: "-", b: 2, result: 6 },
      ],
    };
    expect(
      humanizeChildAnswer(
        "EQUATION_SET",
        content,
        '{"type":"equation-set","equations":[{"a":6,"op":"+","b":2,"result":8}]}',
      ),
    ).toBe("6 + 2 = 8");
    expect(humanizeCorrectAnswer("EQUATION_SET", content)).toBe(
      "6 + 2 = 8, 8 - 2 = 6",
    );
  });

  it("uses × and ÷ symbols for multiply/divide equations", () => {
    const content: Json = {
      stem: "?",
      rows: 1,
      answer_rule: "set-equality",
      canonical: [{ a: 3, op: "x", b: 4, result: 12 }],
    };
    expect(humanizeCorrectAnswer("EQUATION_SET", content)).toBe("3 × 4 = 12");
  });

  // -------------------------------------------------------------------------
  // Defensive fallbacks — never dump raw JSON, never throw.
  // -------------------------------------------------------------------------
  it("falls back to a dash, never raw JSON, on an empty or malformed tap answer", () => {
    const content: Json = {
      stem: "?",
      tiles: [{ id: "t1", label: "Triangle" }],
      _authoring: { answer_model: { rule: "select-one", correct: "t1" } },
    };
    expect(
      humanizeChildAnswer("CLICK_IMAGE_SINGLE", content, '{"type":"id-set","ids":[]}'),
    ).toBe("—");
    const out = humanizeChildAnswer("CLICK_IMAGE_SINGLE", content, "not-json");
    expect(out).toBe("—");
    expect(out).not.toContain("{");
  });

  it("falls back to the raw id when a tile id has no matching label", () => {
    const content: Json = {
      stem: "?",
      tiles: [{ id: "t1", label: "Triangle" }],
      _authoring: { answer_model: { rule: "select-one", correct: "t1" } },
    };
    expect(
      humanizeChildAnswer("CLICK_IMAGE_SINGLE", content, '{"type":"id-set","ids":["t9"]}'),
    ).toBe("t9");
  });
});
