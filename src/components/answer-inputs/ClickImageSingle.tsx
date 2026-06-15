"use client";

// CLICK_IMAGE_SINGLE input. Each tile is a selectable image (or text label)
// card; single-select (radiogroup). The child taps one tile, then Submit. We
// emit
//   JSON.stringify({ type: "id-set", ids: [selectedId] })
// (the structured-input wire convention — see SelectMultipleInput). Grading
// is entirely server-side: correctness.ts reads the authored answer model
// (content._authoring.answer_model, rule "select-one") and grades
// selectedId === correct id. Nothing on the client decides correctness.
//
// House style mirrors VisualMC (radiogroup, sam-* tokens) but with a Submit
// step like the other player inputs, and tile faces (image or label) like
// MatchingInput.
//
// Answer-assembly logic lives in an EXPORTED PURE FUNCTION (selectOneAnswer)
// so it is unit-testable under the node-env vitest runner that cannot click.
//
// Per-question state reset: caller wraps with key={question.id} so React
// remounts on question change. No reset effect (react-hooks/set-state-in-effect).

import { useState } from "react";

import type { AnswerValue } from "@/lib/grading/types";
import type { ClientLabeledItem } from "@/lib/questionPicker/types";

import { TileFace } from "./TileFace";

/** Wrap the chosen tile id into the structured AnswerValue grade() expects.
 *  A single-element id-set; the server grades it with the "select-one" rule. */
export function selectOneAnswer(id: string): AnswerValue {
  return { type: "id-set", ids: [id] };
}

interface Props {
  /** From question.content.tiles ({id,label,image?}). */
  tiles: ClientLabeledItem[];
  /** Fired with JSON.stringify({type:"id-set",ids:[id]}) on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function ClickImageSingle({ tiles, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const canSubmit = selected !== null && !disabled;

  function handleSubmit() {
    if (selected === null || disabled) return;
    onSubmit(JSON.stringify(selectOneAnswer(selected)));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        role="radiogroup"
        aria-label="Choose an answer"
        className="grid w-full gap-4 sm:grid-cols-2"
      >
        {tiles.map((tile) => {
          const isSelected = selected === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={tile.label}
              disabled={disabled}
              onClick={() => !disabled && setSelected(tile.id)}
              className={
                "flex min-h-[120px] items-center justify-center rounded-2xl border-2 bg-white p-4 font-display-child text-xl font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-red/30 disabled:cursor-not-allowed md:text-2xl " +
                (isSelected
                  ? "border-4 border-sam-red text-sam-red shadow-lg"
                  : "border-sam-gray-light text-sam-navy shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-red")
              }
            >
              <TileFace item={tile} />
            </button>
          );
        })}
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
