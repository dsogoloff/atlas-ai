// Atlas Assessment — RUNTIME-TRUTH minted image-path derivation.
//
// The set of images that MUST exist in the private `question-images` bucket is EXACTLY the
// set the app mints at serve time. That set is defined by the serializer, not by seed text:
//   src/lib/questionPicker/serveQuestion.ts
//     → mintQuestionImage        (top-level content.image_path)
//     → mintMatchingTileImages   (per-tile image_path on left/right or tiles[])
//
// We derive the required set from the DB — every active row's ACTUAL content — rather than
// regex-scanning supabase/seed.sql, so the uploader's required set and the content verifier
// can never drift from what the runtime requests.
//
// WHY (incident 2026-06-29): the old seed-text derivation matched only the inline-JSON form
// `"image_path":"…"`. Five L1 rows (Q04/Q05/Q10/Q12/Q19) get their image_path from a
// `update … set content = content || jsonb_build_object('image_path', v.image_path)` block
// (single-quoted VALUES tuples), which the regex never saw → they were active with an
// image_path but never uploaded → `createSignedUrl` "Object not found" → 500 at serve.
// Deriving from the DB is form-agnostic: it sees the resolved content, however it was set.

// MUST mirror TILE_FIELDS_BY_FORMAT in src/lib/questionPicker/mintImage.ts. Any format with
// per-tile images lists the content field(s) holding its tile array; every other format has
// no per-tile images (top-level image_path only).
const TILE_FIELDS_BY_FORMAT: Record<string, readonly string[]> = {
  VISUAL_MATCHING: ["left", "right"],
  CLICK_IMAGE_SINGLE: ["tiles"],
  CLICK_IMAGE_MULTI: ["tiles"],
  IMAGE_ORDERING: ["tiles"],
};

export interface ActiveItem {
  external_id: string;
  format: string;
  content: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Every bucket key the serializer would mint for one item — top-level `content.image_path`
 * plus per-tile `image_path` on the format's tile fields (VISUAL_MATCHING left/right;
 * CLICK_IMAGE_SINGLE/_MULTI + IMAGE_ORDERING tiles[]). Mirrors mintQuestionImage +
 * mintMatchingTileImages exactly. Empty when the item references no image.
 */
export function extractMintedPaths(format: string, content: unknown): string[] {
  const out: string[] = [];
  if (!isObject(content)) return out;

  const top = content.image_path;
  if (typeof top === "string" && top.length > 0) out.push(top);

  for (const field of TILE_FIELDS_BY_FORMAT[format] ?? []) {
    const items = content[field];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!isObject(item)) continue;
      const p = item.image_path;
      if (typeof p === "string" && p.length > 0) out.push(p);
    }
  }
  return out;
}

/** Deduped, sorted set of every image path the runtime will mint across all given items. */
export function mintedImagePaths(items: ActiveItem[]): string[] {
  const set = new Set<string>();
  for (const it of items) for (const p of extractMintedPaths(it.format, it.content)) set.add(p);
  return [...set].sort();
}
