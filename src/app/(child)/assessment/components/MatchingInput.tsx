"use client";

// VISUAL_MATCHING input. Two columns (left + right). The child taps a left
// item to "arm" it, then taps a right item to pair them; re-tapping a left
// item that is already paired re-arms it so a new right can be chosen.
// Submit emits
//   JSON.stringify({ type: "pairs", pairs: { [leftId]: rightId } })
// (the new structured-input wire convention). Grading is server-side and
// BINARY all-or-nothing — correctness.ts reads content.pairs and grades
// match-pairs.
//
// House style mirrors the other inputs (sam-* tokens, Submit button).
//
// Per-tile images: a left/right item may carry an optional `image` envelope
// (a pre-minted signed URL, same path QuestionImage/mintImage use) — e.g.
// L1 Q13 shapes→names, Q15 3D solids→names, Q07 scene + candidate tiles.
// When present the tile renders the image; when absent (or if the image
// fails to load) it falls back to the text `label`, so a tile is never
// empty. Display-only: the wire answer and grading are unchanged (ids).
//
// Accessibility:
//   * Each item is a real <button> — Tab to focus, Space/Enter to activate.
//   * aria-pressed marks the armed left item.
//   * The button's accessible name stays the answer-safe text `label`
//     (image tiles included), so screen readers and the pairing
//     announcements work identically with or without per-tile images.
//   * An aria-live region announces each pairing for screen readers.
//
// Per-question state reset: caller wraps with key={question.id}.

import { useState } from "react";

import type { AnswerValue } from "@/lib/grading/types";
import type { ClientLabeledItem } from "@/lib/questionPicker/types";

interface Props {
  /** From question.content.left ({id,label}). */
  left: ClientLabeledItem[];
  /** From question.content.right ({id,label}). */
  right: ClientLabeledItem[];
  /** Fired with JSON.stringify({type:"pairs",pairs}) on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function MatchingInput({ left, right, onSubmit, disabled }: Props) {
  const [armedLeft, setArmedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState("");

  const rightLabel = (rightId: string) =>
    right.find((r) => r.id === rightId)?.label ?? rightId;

  const canSubmit = Object.keys(pairs).length === left.length && !disabled;

  function tapLeft(id: string) {
    if (disabled) return;
    setArmedLeft((prev) => (prev === id ? null : id));
  }

  function tapRight(rightId: string) {
    if (disabled || armedLeft === null) return;
    const leftId = armedLeft;
    setPairs((prev) => ({ ...prev, [leftId]: rightId }));
    setArmedLeft(null);
    const leftLabel = left.find((l) => l.id === leftId)?.label ?? leftId;
    setAnnounce(`Matched ${leftLabel} with ${rightLabel(rightId)}.`);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const value: AnswerValue = { type: "pairs", pairs };
    onSubmit(JSON.stringify(value));
  }

  const cardBase =
    "flex min-h-[72px] w-full items-center justify-center rounded-2xl border-2 bg-white p-4 font-display-child text-xl font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-red/30 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid w-full max-w-2xl grid-cols-2 gap-6">
        <ul aria-label="Items to match" className="flex flex-col gap-3">
          {left.map((item) => {
            const isArmed = armedLeft === item.id;
            const matchedRight = pairs[item.id];
            const name = matchedRight
              ? `${item.label}, matched with ${rightLabel(matchedRight)}`
              : item.label;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={isArmed}
                  aria-label={name}
                  disabled={disabled}
                  onClick={() => tapLeft(item.id)}
                  className={
                    cardBase +
                    " " +
                    (isArmed
                      ? "border-4 border-sam-red text-sam-red shadow-lg"
                      : matchedRight
                        ? "border-sam-navy text-sam-navy"
                        : "border-sam-gray-light text-sam-navy hover:border-sam-red")
                  }
                >
                  <TileFace item={item} />
                  {matchedRight && (
                    <span className="ml-2 text-base font-bold text-sam-gray-mid">
                      → {rightLabel(matchedRight)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <ul aria-label="Match targets" className="flex flex-col gap-3">
          {right.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={disabled || armedLeft === null}
                onClick={() => tapRight(item.id)}
                className={
                  cardBase +
                  " border-sam-gray-light text-sam-navy hover:border-sam-red disabled:opacity-60"
                }
              >
                <TileFace item={item} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-sam-red px-12 font-display-child text-2xl font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none disabled:cursor-not-allowed disabled:bg-sam-gray-light disabled:text-sam-gray-mid disabled:shadow-none"
      >
        {disabled ? "Submitting…" : "Submit"}
        {!disabled && (
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">
            chevron_right
          </span>
        )}
      </button>
    </div>
  );
}

// Renders a tile's face: the per-tile image when present, otherwise the
// text label. Falls back to the label on image-load failure too, so a
// tile is never empty. The image's signed URL + answer-safe alt come from
// the pre-minted envelope (ClientLabeledItem.image). Tile-sized (not the
// full-width question image) so it fits the two-column matching grid.
function TileFace({ item }: { item: ClientLabeledItem }) {
  const [imgError, setImgError] = useState(false);

  if (item.image && !imgError) {
    // Plain <img> intentional: signed URLs are short-TTL and not stable,
    // which conflicts with Next <Image> optimization — mirrors the same
    // decision in QuestionImage.tsx.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image.url}
        alt={item.image.alt}
        onError={() => setImgError(true)}
        className="mx-auto block max-h-24 w-auto object-contain"
      />
    );
  }

  return <span>{item.label}</span>;
}
