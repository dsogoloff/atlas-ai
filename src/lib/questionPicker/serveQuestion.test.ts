import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { serveQuestion } from "./serveQuestion";
import type { PickedQuestionRow } from "./types";

// serveQuestion is a thin composition of mintQuestionImage + toClientQuestion.
// mintImage.test.ts covers the mint logic thoroughly. This file proves the
// composition: image is correctly attached to content when present, and
// the storage-SDK call is bypassed entirely when no image_path is set.

function makeServiceClient(signedUrl: string): SupabaseClient<Database> {
  return {
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async () => ({
          data: { signedUrl },
          error: null,
        })),
      })),
    },
  } as unknown as SupabaseClient<Database>;
}

const baseRow: Omit<PickedQuestionRow, "content"> = {
  id: "11111111-1111-1111-1111-111111111111",
  external_id: "PLACEHOLDER-Q-001",
  strand: "geometry",
  level: "1B",
  difficulty: -1.3,
  format: "MULTIPLE_CHOICE",
};

describe("serveQuestion", () => {
  it("attaches signed-URL image envelope when content.image_path is set", async () => {
    const client = makeServiceClient("https://example.com/signed?token=t");
    const row: PickedQuestionRow = {
      ...baseRow,
      content: {
        stem: "How many triangles?",
        options: ["1", "5", "3", "7"],
        correct_index: 1,
        image_path: "q02-triangles.png",
        image_alt: "Composite figure with overlapping triangles.",
        image_required: true,
      },
    };
    const out = await serveQuestion(client, row);
    expect(out.content).toEqual({
      stem: "How many triangles?",
      options: ["1", "5", "3", "7"],
      image: {
        url: "https://example.com/signed?token=t",
        alt: "Composite figure with overlapping triangles.",
        required: true,
      },
    });
  });

  it("omits content.image entirely when no image_path is present", async () => {
    const client = makeServiceClient("https://example.com/should-not-be-used");
    const row: PickedQuestionRow = {
      ...baseRow,
      content: {
        stem: "47 - 19 = ?",
        options: ["28", "38", "26", "32"],
        correct_index: 0,
      },
    };
    const out = await serveQuestion(client, row);
    expect(out.content).toEqual({
      stem: "47 - 19 = ?",
      options: ["28", "38", "26", "32"],
    });
    // image key is absent, not undefined — Object.keys-clean.
    expect(Object.keys(out.content).sort()).toEqual(["options", "stem"]);
  });

  it("never leaks image_path or image_alt onto the client payload", async () => {
    const client = makeServiceClient("https://example.com/signed");
    const row: PickedQuestionRow = {
      ...baseRow,
      content: {
        stem: "s",
        options: ["a"],
        correct_index: 0,
        image_path: "secret-bucket-path.png",
        image_alt: "alt",
      },
    };
    const out = await serveQuestion(client, row);
    const keys = Object.keys(out.content);
    expect(keys).not.toContain("image_path");
    expect(keys).not.toContain("image_alt");
  });
});
