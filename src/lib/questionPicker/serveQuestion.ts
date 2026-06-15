// Atlas Assessment — canonical "mint signed URL + serialize" entry point.
//
// Wrapper that handlers call instead of toClientQuestion directly. Two
// reasons to compose mint + serialize behind one helper:
//
//   1. Every question serve produces a fresh signed URL with a fresh TTL.
//      A child who pauses for >300s and resumes via /api/assess/start
//      hits this helper again and gets a working image — no broken-image
//      window mid-session. Threading mint through every call site is the
//      mechanism that makes the resume URL refresh "free" (per Item #13a
//      Phase 2 founder direction).
//
//   2. Coupling Supabase Storage SDK calls to the serializer would force
//      every serialize.test.ts case to mock storage. By keeping
//      toClientQuestion pure and using serveQuestion in handlers, the
//      pure-serialization tests stay storage-free and the storage SDK
//      mocking lives at the handler-test boundary.
//
// Call sites today (6 total): sessionStart/handler.ts (3 — fresh + 2
// resume branches) and responseSubmit/handler.ts (3 — outstanding +
// retry + next-pick branches). All replaced toClientQuestion(row) usages.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { mintMatchingTileImages, mintQuestionImage } from "./mintImage";
import { toClientQuestion } from "./serialize";
import type { ClientQuestion, PickedQuestionRow } from "./types";

/**
 * Mints a signed URL for the question's image (if any) and serializes
 * the row into the client-bound shape. Always call this from handler
 * code instead of toClientQuestion — even for rows that have no image,
 * this is the canonical path (mint returns undefined fast for no-image
 * content, so the overhead is one cheap object inspection).
 *
 * For VISUAL_MATCHING rows whose left/right tiles carry their own
 * `image_path`, this also mints a per-tile signed URL map and threads it
 * into the serializer (mintMatchingTileImages returns an empty map for
 * every other format, so the extra call is a no-op there). Per-tile
 * images are display-only — grading still matches on ids.
 */
export async function serveQuestion(
  serviceClient: SupabaseClient<Database>,
  row: PickedQuestionRow,
): Promise<ClientQuestion> {
  const image = await mintQuestionImage(serviceClient, row.content);
  const tileImages = await mintMatchingTileImages(serviceClient, row);
  return toClientQuestion(row, image, tileImages);
}
