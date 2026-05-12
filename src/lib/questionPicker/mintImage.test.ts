import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database, Json } from "@/lib/supabase/database.types";

import {
  mintQuestionImage,
  QUESTION_IMAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "./mintImage";

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
  it("returns { url, alt } when image_path + image_alt present", async () => {
    const { client, calls } = fakeServiceClient(
      successOutcome("https://example.com/signed?token=abc"),
    );
    const result = await mintQuestionImage(client, {
      stem: "How many triangles?",
      options: ["1", "5", "3", "7"],
      image_path: "q-sam-l2-q02-triangles.png",
      image_alt: "A composite figure made of overlapping triangles.",
    } as Json);
    expect(result).toEqual({
      url: "https://example.com/signed?token=abc",
      alt: "A composite figure made of overlapping triangles.",
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
