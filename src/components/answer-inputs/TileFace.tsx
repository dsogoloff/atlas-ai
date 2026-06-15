"use client";

// Shared tile face for the click-image answer inputs (ClickImageSingle /
// ClickImageMulti / ImageOrdering): renders the per-tile image when present,
// otherwise the text label, and falls back to the label on image-load
// failure so a tile is never empty. Mirrors the TileFace in the player's
// MatchingInput — kept local to the answer-inputs library so these
// components stay self-contained.
//
// The signed URL + answer-safe alt come from the pre-minted envelope
// (ClientLabeledItem.image). Display-only: the wire answer and grading
// match on tile ids, never on the image.

import { useState } from "react";

import type { ClientLabeledItem } from "@/lib/questionPicker/types";

export function TileFace({ item }: { item: ClientLabeledItem }) {
  const [imgError, setImgError] = useState(false);

  if (item.image && !imgError) {
    // Plain <img> intentional: signed URLs are short-TTL and not stable,
    // which conflicts with Next <Image> optimization — mirrors the same
    // decision in QuestionImage.tsx / MatchingInput.tsx.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image.url}
        alt={item.image.alt}
        onError={() => setImgError(true)}
        className="mx-auto block max-h-28 w-auto object-contain"
      />
    );
  }

  return <span>{item.label}</span>;
}
