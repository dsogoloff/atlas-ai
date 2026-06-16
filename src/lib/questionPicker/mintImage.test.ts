import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database, Json } from "@/lib/supabase/database.types";

import {
  mintMatchingTileImages,
  mintQuestionImage,
  QUESTION_IMAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "./mintImage";
import type { PickedQuestionRow } from "./types";

// ---------------------------------------------------------------------------
// Test scaffolding — a minimal serviceClient fake that records storage calls.
// ---------------------------------------------------------------------------

interface StorageCall {
  bucket: string;
  path: string;
  ttl: number;
}

interface FakeOutcome {
  data: { signedUrl: string } | null;
  error: { message: string } | null;
}

function fakeServiceClient(
  outcome: FakeOutcome,
): {
  client: SupabaseClient<Database>;
  calls: StorageCall[];
} {
  const calls: StorageCall[] = [];
  const client = {
    storage: {
      from: vi.fn((bucket: string) => ({
        createSignedUrl: vi.fn(async (path: string, ttl: number) => {
          calls.push({ bucket, path, ttl });
          return outcome;
        }),
      })),
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

function successOutcome(signedUrl: string): FakeOutcome {
  return { data: { signedUrl }, error: null };
}

function errorOutcome(message: string): FakeOutcome {
  return { data: null, error: { message } };
}

// ---------------------------------------------------------------------------
// No-image content paths — must return undefined, must NOT call storage.
// ---------------------------------------------------------------------------

describe("mintQuestionImage / no image path", () => {
  it("returns undefined when content has no image_path", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/fake"),
    );
    const result = await mintQuestionImage(client, {
      stem: "1 + 1 = ?",
      options: ["1", "2", "3"],
    } as Json);
    expect(result).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("returns undefined when content is null", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/fake"),
    );
    const result = await mintQuestionImage(client, null as Json);
    expect(result).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("returns undefined when content is an array", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/fake"),
    );
    const result = await mintQuestionImage(client, ["stem"] as Json);
    expect(result).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("returns undefined when content is a primitive", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/fake"),
    );
    const result = await mintQuestionImage(client, "raw" as Json);
    expect(result).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("returns undefined when image_path is explicitly null", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/fake"),
    );
    const result = await mintQuestionImage(client, {
      stem: "s",
      image_path: null,
    } as Json);
    expect(result).toBeUndefined();
    expect(calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Happy path — image_path + image_alt → envelope, storage called once.
// ---------------------------------------------------------------------------

describe("mintQuestionImage / happy path", () => {
  it("returns { url, alt, required } when image_path + image_alt present", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/signed?token=abc"),
    );
    const result = await mintQuestionImage(client, {
      stem: "How many triangles?",
      options: ["1", "5", "3", "7"],
      image_path: "q-sam-l2-q02-triangles.png",
      image_alt: "A composite figure made of overlapping triangles.",
      image_required: true,
    } as Json);
    expect(result).toEqual({
      url: "https://example.com/signed?token=abc",
      alt: "A composite figure made of overlapping triangles.",
      required: true,
    });
    expect(calls).toEqual([
      {
        bucket: QUESTION_IMAGE_BUCKET,
        path: "q-sam-l2-q02-triangles.png",
        ttl: SIGNED_URL_TTL_SECONDS,
      },
    ]);
  });

  it("uses the 300-second TTL constant", async () => {
    const { calls, client } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    await mintQuestionImage(client, {
      stem: "s",
      image_path: "x.png",
      image_alt: "alt",
    } as Json);
    expect(calls[0]?.ttl).toBe(300);
  });

  it("targets the question-images bucket by name", async () => {
    const { calls, client } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    await mintQuestionImage(client, {
      stem: "s",
      image_path: "x.png",
      image_alt: "alt",
    } as Json);
    expect(calls[0]?.bucket).toBe("question-images");
  });
});

// ---------------------------------------------------------------------------
// image_required propagation — defaults to false, only explicit true flips it.
// ---------------------------------------------------------------------------

describe("mintQuestionImage / image_required propagation", () => {
  it("defaults required=false when image_required is absent", async () => {
    const { client } = fakeServiceClient(successOutcome("https://example.com/x"));
    const result = await mintQuestionImage(client, {
      stem: "s",
      image_path: "x.png",
      image_alt: "alt",
    } as Json);
    expect(result?.required).toBe(false);
  });

  it("returns required=true when image_required is explicitly true", async () => {
    const { client } = fakeServiceClient(successOutcome("https://example.com/x"));
    const result = await mintQuestionImage(client, {
      stem: "s",
      image_path: "x.png",
      image_alt: "alt",
      image_required: true,
    } as Json);
    expect(result?.required).toBe(true);
  });

  it("returns required=false when image_required is explicitly false", async () => {
    const { client } = fakeServiceClient(successOutcome("https://example.com/x"));
    const result = await mintQuestionImage(client, {
      stem: "s",
      image_path: "x.png",
      image_alt: "alt",
      image_required: false,
    } as Json);
    expect(result?.required).toBe(false);
  });

  it("coerces non-boolean image_required to false (strict-true check)", async () => {
    const { client } = fakeServiceClient(successOutcome("https://example.com/x"));
    const result = await mintQuestionImage(client, {
      stem: "s",
      image_path: "x.png",
      image_alt: "alt",
      image_required: "true", // string, not boolean
    } as Json);
    expect(result?.required).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation errors — alt-text invariants and image_path well-formedness.
// ---------------------------------------------------------------------------

describe("mintQuestionImage / validation", () => {
  it("throws when image_path is set but image_alt is missing", async () => {
    const { client } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    await expect(
      mintQuestionImage(client, {
        stem: "s",
        image_path: "x.png",
      } as Json),
    ).rejects.toThrow(/image_alt/);
  });

  it("throws when image_path is set but image_alt is empty string", async () => {
    const { client } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    await expect(
      mintQuestionImage(client, {
        stem: "s",
        image_path: "x.png",
        image_alt: "",
      } as Json),
    ).rejects.toThrow(/image_alt/);
  });

  it("throws when image_path is set but image_alt is not a string", async () => {
    const { client } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    await expect(
      mintQuestionImage(client, {
        stem: "s",
        image_path: "x.png",
        image_alt: 42,
      } as Json),
    ).rejects.toThrow(/image_alt/);
  });

  it("throws when image_path is present but empty", async () => {
    const { client } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    await expect(
      mintQuestionImage(client, {
        stem: "s",
        image_path: "",
        image_alt: "alt",
      } as Json),
    ).rejects.toThrow(/image_path/);
  });

  it("throws when image_path is a non-string non-null value", async () => {
    const { client } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    await expect(
      mintQuestionImage(client, {
        stem: "s",
        image_path: 42,
        image_alt: "alt",
      } as Json),
    ).rejects.toThrow(/image_path/);
  });
});

// ---------------------------------------------------------------------------
// Storage-SDK error path — surface as throw so the handler returns 500.
// ---------------------------------------------------------------------------

describe("mintQuestionImage / storage SDK failures", () => {
  it("throws when createSignedUrl returns an error", async () => {
    const { client } = fakeServiceClient(errorOutcome("bucket not found"));
    await expect(
      mintQuestionImage(client, {
        stem: "s",
        image_path: "x.png",
        image_alt: "alt",
      } as Json),
    ).rejects.toThrow(/createSignedUrl failed.*bucket not found/);
  });

  it("throws when createSignedUrl returns data without signedUrl", async () => {
    const { client } = fakeServiceClient({
      data: { signedUrl: "" },
      error: null,
    });
    await expect(
      mintQuestionImage(client, {
        stem: "s",
        image_path: "x.png",
        image_alt: "alt",
      } as Json),
    ).rejects.toThrow(/createSignedUrl failed/);
  });
});

// ---------------------------------------------------------------------------
// Per-tile matching images — mintMatchingTileImages.
// ---------------------------------------------------------------------------

function matchingRow(content: Json): PickedQuestionRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    external_id: "SAM-L1-Q13",
    strand: "geometry",
    level: "1A",
    difficulty: 0.0,
    format: "VISUAL_MATCHING",
    content,
  };
}

describe("mintMatchingTileImages / non-matching + empty", () => {
  it("returns {} and calls no storage for a non-VISUAL_MATCHING row", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    const row = {
      ...matchingRow({ stem: "s", options: ["a"] }),
      format: "MULTIPLE_CHOICE" as const,
    };
    const result = await mintMatchingTileImages(client, row);
    expect(result).toEqual({});
    expect(calls).toHaveLength(0);
  });

  it("returns {} when content is not an object", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    const result = await mintMatchingTileImages(client, matchingRow(null));
    expect(result).toEqual({});
    expect(calls).toHaveLength(0);
  });

  it("returns {} when no tile carries an image_path (labels-only Q11/Q27)", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    const result = await mintMatchingTileImages(
      client,
      matchingRow({
        stem: "Match the apples",
        left: [{ id: "l1", label: "3 apples" }],
        right: [{ id: "r1", label: "three" }],
        pairs: { l1: "r1" },
      }),
    );
    expect(result).toEqual({});
    expect(calls).toHaveLength(0);
  });
});

describe("mintMatchingTileImages / minting", () => {
  it("mints a signed URL per tile that has image_path; skips tiles without one", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/signed?token=t"),
    );
    const result = await mintMatchingTileImages(
      client,
      matchingRow({
        stem: "Match each shape to its name",
        left: [
          {
            id: "l1",
            label: "Shape A",
            image_path: "l1/sam-l1-q13-rectangle.png",
            image_alt: "A four-sided shape.",
          },
          { id: "l2", label: "Shape B" }, // no image_path → skipped
        ],
        right: [{ id: "r1", label: "rectangle" }], // labels-only → skipped
        pairs: { l1: "r1" },
      }),
    );
    expect(Object.keys(result)).toEqual(["l1"]);
    expect(result.l1).toEqual({
      url: "https://example.com/signed?token=t",
      alt: "A four-sided shape.",
      required: false,
    });
    expect(calls).toEqual([
      {
        bucket: QUESTION_IMAGE_BUCKET,
        path: "l1/sam-l1-q13-rectangle.png",
        ttl: SIGNED_URL_TTL_SECONDS,
      },
    ]);
  });

  it("scans BOTH left and right columns (Q07 scene + candidate tiles)", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/x"),
    );
    const result = await mintMatchingTileImages(
      client,
      matchingRow({
        stem: "Match the scene to the right tile",
        left: [
          {
            id: "scene",
            label: "Scene",
            image_path: "l1/sam-l1-q07-scene.png",
            image_alt: "A classroom scene.",
          },
        ],
        right: [
          {
            id: "a",
            label: "Option A",
            image_path: "l1/sam-l1-q07-option-a.png",
            image_alt: "Candidate A.",
          },
          {
            id: "b",
            label: "Option B",
            image_path: "l1/sam-l1-q07-option-b.png",
            image_alt: "Candidate B.",
          },
        ],
        pairs: { scene: "a" },
      }),
    );
    expect(Object.keys(result).sort()).toEqual(["a", "b", "scene"]);
    expect(calls).toHaveLength(3);
  });

  it("falls back to the tile label for alt when image_alt is absent", async () => {
    const { client } = fakeServiceClient(successOutcome("https://example.com/x"));
    const result = await mintMatchingTileImages(
      client,
      matchingRow({
        stem: "Match the solids",
        left: [
          {
            id: "l1",
            label: "Cone tile", // becomes the alt
            image_path: "l1/sam-l1-q15-cone.png",
          },
        ],
        right: [{ id: "r1", label: "cone" }],
        pairs: { l1: "r1" },
      }),
    );
    expect(result.l1?.alt).toBe("Cone tile");
  });

  it("prefers a tile-specific image_alt over the label when both are present", async () => {
    const { client } = fakeServiceClient(successOutcome("https://example.com/x"));
    const result = await mintMatchingTileImages(
      client,
      matchingRow({
        stem: "s",
        left: [
          {
            id: "l1",
            label: "Shape A",
            image_path: "p.png",
            image_alt: "Answer-safe alt text.",
          },
        ],
        right: [{ id: "r1", label: "x" }],
        pairs: { l1: "r1" },
      }),
    );
    expect(result.l1?.alt).toBe("Answer-safe alt text.");
  });

  it("propagates image_required=true per tile (defaults false otherwise)", async () => {
    const { client } = fakeServiceClient(successOutcome("https://example.com/x"));
    const result = await mintMatchingTileImages(
      client,
      matchingRow({
        stem: "s",
        left: [
          {
            id: "req",
            label: "A",
            image_path: "a.png",
            image_alt: "a",
            image_required: true,
          },
          {
            id: "dec",
            label: "B",
            image_path: "b.png",
            image_alt: "b",
          },
        ],
        right: [{ id: "r1", label: "x" }],
        pairs: { req: "r1" },
      }),
    );
    expect(result.req?.required).toBe(true);
    expect(result.dec?.required).toBe(false);
  });

  it("throws (content-authoring bug → 500) when a tile image_path is empty", async () => {
    const { client } = fakeServiceClient(successOutcome("https://example.com/x"));
    await expect(
      mintMatchingTileImages(
        client,
        matchingRow({
          stem: "s",
          left: [{ id: "l1", label: "A", image_path: "" }],
          right: [{ id: "r1", label: "x" }],
          pairs: { l1: "r1" },
        }),
      ),
    ).rejects.toThrow(/image_path/);
  });
});

// ---------------------------------------------------------------------------
// Per-tile images for the click-image formats (#71) — content.tiles[].
// Same minting pass as VISUAL_MATCHING, reading the `tiles` field instead of
// left/right.
// ---------------------------------------------------------------------------

const IMAGE_TILE_FORMATS = [
  "CLICK_IMAGE_SINGLE",
  "CLICK_IMAGE_MULTI",
  "IMAGE_ORDERING",
] as const;

function tilesRow(
  format: (typeof IMAGE_TILE_FORMATS)[number],
  content: Json,
): PickedQuestionRow {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    external_id: "SAM-L1-Q07",
    strand: "geometry",
    level: "1A",
    difficulty: 0.0,
    format,
    content,
  };
}

describe("mintMatchingTileImages / click-image tile formats", () => {
  for (const format of IMAGE_TILE_FORMATS) {
    it(`${format}: mints a signed URL per content.tiles item with image_path`, async () => {
      const { client, calls } = fakeServiceClient(
        successOutcome("https://example.com/signed?token=t"),
      );
      const result = await mintMatchingTileImages(
        client,
        tilesRow(format, {
          stem: "Tap the triangle",
          tiles: [
            {
              id: "t1",
              label: "triangle",
              image_path: "l1/sam-l1-q07-triangle.png",
              image_alt: "A three-sided shape.",
            },
            { id: "t2", label: "square" }, // no image_path → skipped (label fallback)
          ],
        }),
      );
      expect(Object.keys(result)).toEqual(["t1"]);
      expect(result.t1).toEqual({
        url: "https://example.com/signed?token=t",
        alt: "A three-sided shape.",
        required: false,
      });
      expect(calls).toEqual([
        {
          bucket: QUESTION_IMAGE_BUCKET,
          path: "l1/sam-l1-q07-triangle.png",
          ttl: SIGNED_URL_TTL_SECONDS,
        },
      ]);
    });

    it(`${format}: degrades safely (no throw, {}) when no tile has image_path`, async () => {
      const { client, calls } = fakeServiceClient(
        successOutcome("https://example.com/x"),
      );
      const result = await mintMatchingTileImages(
        client,
        tilesRow(format, {
          stem: "Pick one",
          tiles: [
            { id: "t1", label: "two" },
            { id: "t2", label: "three" },
          ],
        }),
      );
      expect(result).toEqual({});
      expect(calls).toHaveLength(0);
    });

    it(`${format}: falls back to the tile label for alt and honors image_required`, async () => {
      const { client } = fakeServiceClient(
        successOutcome("https://example.com/x"),
      );
      const result = await mintMatchingTileImages(
        client,
        tilesRow(format, {
          stem: "s",
          tiles: [
            { id: "t1", label: "Cone tile", image_path: "a.png", image_required: true },
          ],
        }),
      );
      expect(result.t1?.alt).toBe("Cone tile");
      expect(result.t1?.required).toBe(true);
    });
  }
});
