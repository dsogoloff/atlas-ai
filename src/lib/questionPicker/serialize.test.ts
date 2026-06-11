import { describe, expect, it } from "vitest";

import type { Json } from "@/lib/supabase/database.types";

import { toClientQuestion } from "./serialize";
import type { PickedQuestionRow } from "./types";

const baseRow = {
  id: "11111111-1111-1111-1111-111111111111",
  external_id: "PLACEHOLDER-Q-001",
  strand: "operations_algorithms" as const,
  level: "2B" as const,
  difficulty: 0.0,
};

function row(
  format: PickedQuestionRow["format"],
  content: Json,
): PickedQuestionRow {
  return { ...baseRow, format, content };
}

describe("toClientQuestion / MULTIPLE_CHOICE", () => {
  it("returns stem + options only, dropping correct_index and distractor_misconceptions", () => {
    const out = toClientQuestion(
      row("MULTIPLE_CHOICE", {
        stem: "47 - 19 = ?",
        options: ["28", "38", "26", "32"],
        correct_index: 0,
        distractor_misconceptions: { "1": "OP_NO_REGROUPING" },
      }),
    );
    expect(out.content).toEqual({
      stem: "47 - 19 = ?",
      options: ["28", "38", "26", "32"],
    });
    // Belt-and-suspenders: prove the forbidden keys are not present at
    // all, not merely undefined-valued.
    expect(Object.keys(out.content)).toEqual(["stem", "options"]);
  });

  it("propagates id, strand, level, format unchanged", () => {
    const out = toClientQuestion(
      row("MULTIPLE_CHOICE", { stem: "s", options: ["a"] }),
    );
    expect(out.id).toBe(baseRow.id);
    expect(out.strand).toBe("operations_algorithms");
    expect(out.level).toBe("2B");
    expect(out.format).toBe("MULTIPLE_CHOICE");
  });

  it("never exposes external_id (S.A.M. licensing audit field, server-only)", () => {
    const out = toClientQuestion(
      row("MULTIPLE_CHOICE", { stem: "s", options: ["a"] }),
    );
    expect(Object.keys(out)).not.toContain("external_id");
  });
});

describe("toClientQuestion / NUMERIC_ENTRY", () => {
  it("returns stem only, dropping correct_answer", () => {
    const out = toClientQuestion(
      row("NUMERIC_ENTRY", {
        stem: "Maya has 24 stickers, gives 8 away. How many left?",
        correct_answer: "16",
      }),
    );
    expect(out.content).toEqual({
      stem: "Maya has 24 stickers, gives 8 away. How many left?",
    });
    expect(Object.keys(out.content)).toEqual(["stem"]);
  });
});

describe("toClientQuestion / TEXT_ENTRY", () => {
  it("returns stem only, dropping correct_answer", () => {
    const out = toClientQuestion(
      row("TEXT_ENTRY", {
        stem: "Name a 3-dimensional shape that has 2 flat faces and a curved surface.",
        correct_answer: "cylinder",
      }),
    );
    expect(out.content).toEqual({
      stem: "Name a 3-dimensional shape that has 2 flat faces and a curved surface.",
    });
    expect(Object.keys(out.content)).toEqual(["stem"]);
    expect(out.format).toBe("TEXT_ENTRY");
  });
});

describe("toClientQuestion / NUMERIC_ENTRY any-of keys", () => {
  it("never leaks accepted_answers", () => {
    const out = toClientQuestion(
      row("NUMERIC_ENTRY", {
        stem: "Name one number that can divide both 54 and 72.",
        correct_answer: "1, 2, 3, 6, 9 or 18",
        accepted_answers: ["1", "2", "3", "6", "9", "18"],
      }),
    );
    expect(Object.keys(out.content)).toEqual(["stem"]);
  });
});

describe("toClientQuestion / DRAG_DROP", () => {
  it("returns stem + items only, dropping correct_order", () => {
    const out = toClientQuestion(
      row("DRAG_DROP", {
        stem: "Order from smallest to largest",
        items: ["1/2", "1/4", "3/4", "1/3"],
        correct_order: ["1/4", "1/3", "1/2", "3/4"],
      }),
    );
    expect(out.content).toEqual({
      stem: "Order from smallest to largest",
      items: ["1/2", "1/4", "3/4", "1/3"],
    });
    expect(Object.keys(out.content)).toEqual(["stem", "items"]);
  });
});

describe("toClientQuestion / content errors", () => {
  it("throws when content is null", () => {
    expect(() => toClientQuestion(row("MULTIPLE_CHOICE", null))).toThrow();
  });
  it("throws when content is an array", () => {
    expect(() =>
      toClientQuestion(row("MULTIPLE_CHOICE", ["a"] as Json)),
    ).toThrow();
  });
  it("throws when content is a primitive", () => {
    expect(() =>
      toClientQuestion(row("MULTIPLE_CHOICE", "raw" as Json)),
    ).toThrow();
  });
  it("throws when stem is missing", () => {
    expect(() =>
      toClientQuestion(row("MULTIPLE_CHOICE", { options: ["a"] })),
    ).toThrow();
  });
  it("throws when stem is not a string", () => {
    expect(() =>
      toClientQuestion(row("MULTIPLE_CHOICE", { stem: 42, options: ["a"] })),
    ).toThrow();
  });
  it("throws when options missing on MULTIPLE_CHOICE", () => {
    expect(() => toClientQuestion(row("MULTIPLE_CHOICE", { stem: "s" }))).toThrow();
  });
  it("throws when options is not an array on MULTIPLE_CHOICE", () => {
    expect(() =>
      toClientQuestion(row("MULTIPLE_CHOICE", { stem: "s", options: "a,b" })),
    ).toThrow();
  });
  it("throws when options contains non-strings on MULTIPLE_CHOICE", () => {
    expect(() =>
      toClientQuestion(
        row("MULTIPLE_CHOICE", { stem: "s", options: ["a", 1] }),
      ),
    ).toThrow();
  });
  it("throws when items missing on DRAG_DROP", () => {
    expect(() => toClientQuestion(row("DRAG_DROP", { stem: "s" }))).toThrow();
  });
});

describe("toClientQuestion / allowlist invariants", () => {
  // The serializer must construct from named keys, not spread + delete.
  // If a future content shape adds new answer-leaking fields, the test
  // below catches it: extra keys present on the row content must NOT
  // appear in the client output.
  it("drops unknown content keys silently (allowlist, not denylist)", () => {
    const out = toClientQuestion(
      row("MULTIPLE_CHOICE", {
        stem: "s",
        options: ["a"],
        correct_index: 0,
        distractor_misconceptions: { "1": "X" },
        // Hypothetical future fields — must NOT leak.
        answer_explanation: "because reasons",
        teacher_notes: "watch for regrouping confusion",
      }),
    );
    expect(Object.keys(out.content).sort()).toEqual(["options", "stem"]);
  });

  it("never leaks image_path or image_alt even when present on row content", () => {
    // The server-side image_path/image_alt fields must stay server-only.
    // The client sees them only as content.image.{url,alt} when the
    // caller supplies a pre-minted envelope; the raw bucket path never
    // crosses to the browser.
    const out = toClientQuestion(
      row("MULTIPLE_CHOICE", {
        stem: "s",
        options: ["a"],
        image_path: "secret-bucket-path.png",
        image_alt: "alt",
      }),
    );
    expect(Object.keys(out.content)).not.toContain("image_path");
    expect(Object.keys(out.content)).not.toContain("image_alt");
  });
});

describe("toClientQuestion / image arg propagation", () => {
  const fakeImage = {
    url: "https://example.com/signed?token=t",
    alt: "Some image",
    required: true,
  };

  it("attaches image envelope on MULTIPLE_CHOICE when supplied", () => {
    const out = toClientQuestion(
      row("MULTIPLE_CHOICE", { stem: "s", options: ["a"] }),
      fakeImage,
    );
    expect(out.content).toEqual({
      stem: "s",
      options: ["a"],
      image: fakeImage,
    });
  });

  it("attaches image envelope on NUMERIC_ENTRY when supplied", () => {
    const out = toClientQuestion(
      row("NUMERIC_ENTRY", { stem: "s" }),
      fakeImage,
    );
    expect(out.content).toEqual({ stem: "s", image: fakeImage });
  });

  it("attaches image envelope on DRAG_DROP when supplied", () => {
    const out = toClientQuestion(
      row("DRAG_DROP", { stem: "s", items: ["a"] }),
      fakeImage,
    );
    expect(out.content).toEqual({
      stem: "s",
      items: ["a"],
      image: fakeImage,
    });
  });

  it("omits the image key entirely when image arg is undefined", () => {
    // Conditional-spread design: undefined image must not appear as
    // an undefined-valued key on the output. Object.keys-clean.
    const out = toClientQuestion(
      row("MULTIPLE_CHOICE", { stem: "s", options: ["a"] }),
    );
    expect(Object.keys(out.content)).not.toContain("image");
  });
});
