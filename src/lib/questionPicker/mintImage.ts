// Atlas Assessment — question image signed-URL minter.
//
// Per Item #13a Phase 2 (founder direction 2026-05-12):
//   * Storage location:    Supabase Storage private bucket `question-images`
//                          (provisioned in 20260512000000_add_question_images_bucket.sql)
//   * URL flavor:          short-TTL signed URLs minted server-side via
//                          service_role; client never calls the storage API
//                          directly
//   * TTL:                 300 seconds (5 minutes). Long enough for typical
//                          child pacing on one question; short enough to
//                          bound leakage via screenshot or browser history
//   * Audit:               relies on the existing question_access_log
//                          (Phase 2 decision A — image URL mint is 1:1
//                          with question serve, no separate log needed)
//
// Resume invariant — URLs are NEVER stale at serve time. Every call to
// /api/assess/start (which is also the resume entry point) runs through
// the question-serving handler, which calls serveQuestion → mintQuestionImage,
// which mints a FRESH signed URL on every serve. A child who pauses for
// longer than the TTL (300s) and then resumes hits /api/assess/start
// again, gets a fresh URL with a fresh TTL, and the image renders
// correctly. No special-case "refresh URL" code path needed.
//
// LLM-discipline (per architecture.md): this module is pure deterministic
// TypeScript + a Supabase Storage call. No LLM, no AI generation.
// Image-asset determinism is required for IRT calibration validity
// (see project memory: no-ai-generated-assessment-images).

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

import type { ClientQuestionImage } from "./types";

export const QUESTION_IMAGE_BUCKET = "question-images";
export const SIGNED_URL_TTL_SECONDS = 300;

/**
 * Mints a signed URL for the image referenced by `content.image_path`,
 * returning the client-bound envelope. Returns `undefined` when the
 * content has no `image_path` (decorative or text-only question).
 *
 * Throws when:
 *   * `image_path` is set but `image_alt` is missing or empty —
 *     enforced at the API layer per the Phase 1 schema validation rule.
 *   * Supabase Storage `createSignedUrl` returns an error or empty URL.
 *
 * Per the calling-convention in src/lib/questionPicker/correctness.ts
 * and src/lib/questionPicker/serialize.ts, malformed content is treated
 * as a content-authoring bug; the handler maps thrown errors to a 500
 * rather than serving a partial question.
 */
export async function mintQuestionImage(
  serviceClient: SupabaseClient<Database>,
  content: Json,
): Promise<ClientQuestionImage | undefined> {
  if (content === null || typeof content !== "object" || Array.isArray(content)) {
    // Non-object content has no image fields by construction. (The
    // serializer's asObject() will already have thrown on this in the
    // call sequence; defensive recheck so this module is usable in
    // isolation without depending on call order.)
    return undefined;
  }

  const obj = content as Record<string, Json>;
  const imagePath = obj.image_path;

  if (imagePath === undefined || imagePath === null) {
    return undefined;
  }
  if (typeof imagePath !== "string" || imagePath.length === 0) {
    throw new Error(
      "[mintQuestionImage] content.image_path must be a non-empty string when present",
    );
  }

  const imageAlt = obj.image_alt;
  if (typeof imageAlt !== "string" || imageAlt.length === 0) {
    // Phase 1 API-layer validation rule: image_alt is mandatory when
    // image_path is set. Phase 4 authoring pass populates this for
    // every image-essential item; a content row reaching here without
    // alt-text is a content-authoring bug.
    throw new Error(
      "[mintQuestionImage] content.image_alt must be a non-empty string when content.image_path is set",
    );
  }

  // image_required defaults to false (decorative) when absent. Per the
  // Phase 1 jsonb shape doc, the source-JSON flag is boolean; defensive
  // coerce: only an explicit `true` flips required on, anything else
  // (false, null, undefined, missing, non-boolean) lands at false.
  const required = obj.image_required === true;

  const { data, error } = await serviceClient.storage
    .from(QUESTION_IMAGE_BUCKET)
    .createSignedUrl(imagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(
      `[mintQuestionImage] createSignedUrl failed for ${imagePath}: ${
        error?.message ?? "no signedUrl returned"
      }`,
    );
  }

  return { url: data.signedUrl, alt: imageAlt, required };
}
