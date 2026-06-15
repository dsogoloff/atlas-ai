# Image-Ordering Lane — Design Spec (PARKED, ready to pick up)

Split out of `lane/answer-input-wiring` (the 4 grading-input types, merged in PR
#63) by founder decision 2026-06-14. This is the image variant of the existing
`DRAG_DROP` ordering input. Unblocks **Q17** (the 4-picture ordering of Tom's
day: Brushing teeth → Walking to school → Studying in class → Sleeping).

## Why it's separate
- **No new grade rule** and **no new enum.** Q17 stays format `DRAG_DROP` with
  `requires_format_swap=false`. The order-equality grading in
  `correctness.ts` (the `DRAG_DROP` case) already handles it — comparison is by
  stable **token** (item id/label), not by image.
- The only genuinely new work is **multi-image-per-question plumbing**: today a
  question carries ONE image (`content.image` → one signed `ClientQuestionImage`).
  Ordering needs **one image per tile** (N signed URLs). That's a different,
  image-heavy change from the four grading-input wirings, hence its own lane.
- **Q17 is also art-blocked (blocker A):** the 4 day-scene images must be curated
  + uploaded to the Supabase Storage bucket (founder; can't be done from the
  build box). So this lane makes the input WORK; activation still waits on art.

## Post-activation content shape (DRAG_DROP, image variant)
Keep `content.items: string[]` as the stable ordering tokens (what
`correct_order` and grading use). Add an OPTIONAL parallel image map:
```
{ stem,
  items: string[],                 // stable tokens (order tokens) — render-safe
  item_images?: [{ token: string, image_path: string, image_alt: string }],
                                    // server-only image_path → minted per tile
  correct_order: string[],         // ANSWER (server-only, already stripped)
  ... }
```
Text-only DRAG_DROP (no `item_images`) is unchanged. When `item_images` is
present, the serializer mints a signed URL per token and the client renders an
image tile instead of a text chip.

## Files to touch
- `src/lib/questionPicker/types.ts` — extend the DRAG_DROP `ClientQuestionContent`
  member with an optional `itemImages?: { token; url; alt }[]` (URLs, not paths).
- `src/lib/questionPicker/serialize.ts` — DRAG_DROP case: pass `items` through
  (as today) + build `itemImages` from minted signed URLs. `correct_order` and
  raw `image_path`s NEVER cross (allowlist, key-by-key).
- Image minting (`mintImage.ts` / `serveQuestion.ts`) — mint N signed URLs (one
  per `item_images` entry) in addition to the existing single `content.image`.
- `src/app/(child)/assessment/components/DragDropInput.tsx` — render an image
  tile when a token has an image; keep full keyboard reorder parity
  (Tab/Space/Enter/Arrows/Escape) and aria-live announcements.
- `correctness.ts` — **no change** (order-by-token equality already correct).
- `serialize.test.ts` — assert `correct_order` and raw `image_path` are absent;
  assert `itemImages` carries only `{token,url,alt}`.

## Compliance
Per-tile `image_path` stays server-side; the wire gets short-TTL signed URLs only
(mirror the existing single-image Phase-2 pattern). `correct_order` stays
server-side (already stripped today).

## Activation (CONVERSION + founder)
Q17 needs BOTH: (a) this image-tile rendering landed, AND (b) the 4 day-scene
images curated/uploaded. It is NOT a format-swap item (no enum add, no
`requires_format_swap` clear) — activation is just `is_active=true` once art +
rendering exist.

## Verify bar
App code → full bar applies: `pnpm test` + `tsc --noEmit` + `pnpm lint` +
`pnpm build`. Add the serializer allowlist tests above.
