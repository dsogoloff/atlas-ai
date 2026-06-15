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

describe("toClientQuestion / SELECT_MULTIPLE", () => {
  it("rule=all: stem + select_rule + options only; strips correct", () => {
    const out = toClientQuestion(
      row("SELECT_MULTIPLE", {
        stem: "Pick all even numbers",
        select_rule: "all",
        options: [
          { id: "a", label: "2" },
          { id: "b", label: "3" },
          { id: "c", label: "4" },
        ],
        correct: ["a", "c"],
      }),
    );
    expect(out.content).toEqual({
      stem: "Pick all even numbers",
      select_rule: "all",
      options: [
        { id: "a", label: "2" },
        { id: "b", label: "3" },
        { id: "c", label: "4" },
      ],
    });
    expect(Object.keys(out.content).sort()).toEqual([
      "options",
      "select_rule",
      "stem",
    ]);
    expect(Object.keys(out.content)).not.toContain("correct");
  });

  it("rule=count: keeps render-safe count; never leaks correct", () => {
    const out = toClientQuestion(
      row("SELECT_MULTIPLE", {
        stem: "Pick any 2",
        select_rule: "count",
        count: 2,
        options: [{ id: "a", label: "1" }],
        correct: ["a"],
      }),
    );
    expect(Object.keys(out.content).sort()).toEqual([
      "count",
      "options",
      "select_rule",
      "stem",
    ]);
    expect("correct" in out.content).toBe(false);
  });
});

describe("toClientQuestion / VISUAL_MATCHING", () => {
  it("returns stem + left + right only; strips pairs (the answer)", () => {
    const out = toClientQuestion(
      row("VISUAL_MATCHING", {
        stem: "Match shapes to names",
        left: [
          { id: "l1", label: "▲" },
          { id: "l2", label: "■" },
        ],
        right: [
          { id: "r1", label: "triangle" },
          { id: "r2", label: "square" },
        ],
        pairs: { l1: "r1", l2: "r2" },
      }),
    );
    expect(out.content).toEqual({
      stem: "Match shapes to names",
      left: [
        { id: "l1", label: "▲" },
        { id: "l2", label: "■" },
      ],
      right: [
        { id: "r1", label: "triangle" },
        { id: "r2", label: "square" },
      ],
    });
    expect(Object.keys(out.content).sort()).toEqual(["left", "right", "stem"]);
    expect(Object.keys(out.content)).not.toContain("pairs");
  });
});

describe("toClientQuestion / MULTI_BLANK", () => {
  it("returns stem + tokens only; strips blanks (the answer)", () => {
    const out = toClientQuestion(
      row("MULTI_BLANK", {
        stem: "__ + __ = 8",
        tokens: [
          { t: "blank", id: "a" },
          { t: "text", value: " + " },
          { t: "blank", id: "b", placeholder: "?" },
          { t: "text", value: " = 8" },
        ],
        blanks: {
          a: { value: "6", numeric: true },
          b: { value: "2", numeric: true },
        },
      }),
    );
    expect(out.content).toEqual({
      stem: "__ + __ = 8",
      tokens: [
        { t: "blank", id: "a" },
        { t: "text", value: " + " },
        { t: "blank", id: "b", placeholder: "?" },
        { t: "text", value: " = 8" },
      ],
    });
    expect(Object.keys(out.content).sort()).toEqual(["stem", "tokens"]);
    expect(Object.keys(out.content)).not.toContain("blanks");
  });
});

describe("toClientQuestion / EQUATION_SET", () => {
  it("set-equality shape: stem + rows + ops only; strips every answer field", () => {
    const out = toClientQuestion(
      row("EQUATION_SET", {
        stem: "Fact family for 6, 2, 8",
        rows: 4,
        ops: ["+", "-"],
        answer_rule: "set-equality",
        canonical: [{ a: 6, op: "+", b: 2, result: 8 }],
        allowCommutative: true,
      }),
    );
    expect(out.content).toEqual({
      stem: "Fact family for 6, 2, 8",
      rows: 4,
      ops: ["+", "-"],
    });
    expect(Object.keys(out.content).sort()).toEqual(["ops", "rows", "stem"]);
    for (const k of [
      "answer_rule",
      "canonical",
      "allowCommutative",
      "allowedNumbers",
      "requireCount",
      "requireDistinct",
      "validityOps",
    ]) {
      expect(Object.keys(out.content)).not.toContain(k);
    }
  });

  it("equation-validity shape: never leaks allowedNumbers/requireCount/etc.", () => {
    const out = toClientQuestion(
      row("EQUATION_SET", {
        stem: "Write 2 true equations",
        rows: 2,
        answer_rule: "equation-validity",
        allowedNumbers: [2, 6, 8],
        requireCount: 2,
        requireDistinct: true,
        validityOps: ["+", "-"],
      }),
    );
    // No ops on the wire here (none authored as a render-safe selector).
    expect(Object.keys(out.content).sort()).toEqual(["rows", "stem"]);
    for (const k of [
      "answer_rule",
      "allowedNumbers",
      "requireCount",
      "requireDistinct",
      "validityOps",
    ]) {
      expect(Object.keys(out.content)).not.toContain(k);
    }
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

describe("toClientQuestion / VISUAL_MATCHING per-tile images", () => {
  const tileEnvelope = (token: string) => ({
    url: `https://example.com/signed?token=${token}`,
    alt: "A shape.",
    required: true,
  });

  // A row whose left tiles carry their own (server-only) image_path +
  // image_alt; right tiles are labels-only. Mirrors L1 Q13 shapes→names.
  const perTileRow = () =>
    row("VISUAL_MATCHING", {
      stem: "Match each shape to its name",
      left: [
        {
          id: "l1",
          label: "Shape A",
          image_path: "l1/sam-l1-q13-rectangle.png",
          image_alt: "A four-sided shape.",
        },
        {
          id: "l2",
          label: "Shape B",
          image_path: "l1/sam-l1-q13-triangle.png",
          image_alt: "A three-sided shape.",
        },
      ],
      right: [
        { id: "r1", label: "rectangle" },
        { id: "r2", label: "triangle" },
      ],
      pairs: { l1: "r1", l2: "r2" },
    });

  it("attaches the minted image envelope to each mapped tile", () => {
    const out = toClientQuestion(perTileRow(), undefined, {
      l1: tileEnvelope("a"),
      l2: tileEnvelope("b"),
    });
    expect(out.content).toEqual({
      stem: "Match each shape to its name",
      left: [
        { id: "l1", label: "Shape A", image: tileEnvelope("a") },
        { id: "l2", label: "Shape B", image: tileEnvelope("b") },
      ],
      right: [
        { id: "r1", label: "rectangle" },
        { id: "r2", label: "triangle" },
      ],
    });
  });

  it("MUST-NOT-REGRESS answer-stripping invariant: envelope present, raw image_path/image_alt + pairs absent", () => {
    // (a) the minted {url,alt,required} envelope IS present on each mapped
    // wire item; (b) the raw server-only image_path / image_alt and the
    // correct `pairs` answer field are ALL absent from the wire payload.
    // A per-tile image must never become a vector that leaks the answer.
    const out = toClientQuestion(perTileRow(), undefined, {
      l1: tileEnvelope("a"),
      l2: tileEnvelope("b"),
    });
    const content = out.content as Extract<
      typeof out.content,
      { left: unknown }
    >;

    // (a) envelope present on every left tile.
    for (const item of content.left) {
      expect(item.image).toEqual({
        url: expect.stringContaining("https://example.com/signed?token="),
        alt: "A shape.",
        required: true,
      });
      // only id, label, image — nothing else.
      expect(Object.keys(item).sort()).toEqual(["id", "image", "label"]);
    }

    // (b) no raw answer-adjacent fields anywhere on the wire.
    expect(Object.keys(out.content).sort()).toEqual(["left", "right", "stem"]);
    expect("pairs" in out.content).toBe(false);
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain("image_path");
    expect(serialized).not.toContain("image_alt");
    expect(serialized).not.toContain("sam-l1-q13-rectangle.png");
    expect(serialized).not.toContain("\"pairs\"");
  });

  it("leaves unmapped tiles as {id,label} (labels-only items unchanged, backward compatible)", () => {
    // Only l1 is in the map; l2 + both right tiles render their labels.
    const out = toClientQuestion(perTileRow(), undefined, {
      l1: tileEnvelope("a"),
    });
    const content = out.content as Extract<
      typeof out.content,
      { left: unknown }
    >;
    expect(content.left[0]).toEqual({
      id: "l1",
      label: "Shape A",
      image: tileEnvelope("a"),
    });
    expect(content.left[1]).toEqual({ id: "l2", label: "Shape B" });
    expect(Object.keys(content.left[1]!)).not.toContain("image");
    expect(content.right).toEqual([
      { id: "r1", label: "rectangle" },
      { id: "r2", label: "triangle" },
    ]);
  });

  it("with no tileImages map, VISUAL_MATCHING wire items stay {id,label} (no image key)", () => {
    const out = toClientQuestion(perTileRow());
    const content = out.content as Extract<
      typeof out.content,
      { left: unknown }
    >;
    for (const item of [...content.left, ...content.right]) {
      expect(Object.keys(item).sort()).toEqual(["id", "label"]);
    }
  });
});

describe("toClientQuestion / image-input formats", () => {
  const imageRow = (format: PickedQuestionRow["format"]): PickedQuestionRow =>
    row(format, {
      stem: "Pick the triangle",
      tiles: [
        { id: "t1", label: "triangle", image_path: "secret/t1.png", image_alt: "shape one" },
        { id: "t2", label: "square" },
      ],
      // Answer-bearing — must NEVER be serialized.
      _authoring: {
        target_interaction: "click-on-image",
        answer_model: { rule: "select-one", correct: "t1" },
        held: true,
        requires_format_swap: true,
      },
    });

  for (const format of [
    "CLICK_IMAGE_SINGLE",
    "CLICK_IMAGE_MULTI",
    "IMAGE_ORDERING",
  ] as const) {
    it(`${format}: returns stem + tiles only, stripping _authoring and per-tile image_path`, () => {
      const out = toClientQuestion(imageRow(format));
      expect(out.content).toEqual({
        stem: "Pick the triangle",
        tiles: [
          { id: "t1", label: "triangle" },
          { id: "t2", label: "square" },
        ],
      });
      expect(Object.keys(out.content).sort()).toEqual(["stem", "tiles"]);
      // The answer model never crosses the wire.
      expect(Object.keys(out.content)).not.toContain("_authoring");
      expect(JSON.stringify(out.content)).not.toContain("answer_model");
      expect(JSON.stringify(out.content)).not.toContain("select-one");
      // Raw per-tile bucket path stays server-side.
      expect(JSON.stringify(out.content)).not.toContain("secret/t1.png");
    });
  }

  it("CLICK_IMAGE_SINGLE: attaches per-tile minted image envelopes from tileImages", () => {
    const out = toClientQuestion(imageRow("CLICK_IMAGE_SINGLE"), undefined, {
      t1: { url: "https://signed/t1", alt: "shape one", required: true },
    });
    const content = out.content as Extract<typeof out.content, { tiles: unknown }>;
    expect(content.tiles[0]).toEqual({
      id: "t1",
      label: "triangle",
      image: { url: "https://signed/t1", alt: "shape one", required: true },
    });
    expect(content.tiles[1]).toEqual({ id: "t2", label: "square" });
  });
});
