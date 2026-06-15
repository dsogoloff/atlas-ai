"use client";

// CLICK_IMAGE_MULTI input. Each tile is a toggleable image (or text label)
// card; the child taps to add/remove tiles, then Submit. We emit
//   JSON.stringify({ type: "id-set", ids })
// (the structured-input wire convention — see SelectMultipleInput). Grading
// is entirely server-side: correctness.ts reads the authored answer model
// (content._authoring.answer_model, rule "select-all") and grades set-
// equality (order-irrelevant). Nothing on the client decides correctness.
//
// House style mirrors SelectMultipleInput (aria-pressed toggles, Submit)
// with tile faces (image or label) like MatchingInput.
//
// Answer-assembly logic lives in an EXPORTED PURE FUNCTION (selectManyAnswer)
// so it is unit-testable under the node-env vitest runner that cannot click.
//
// Per-question state reset: caller wraps with key={question.id} so React
// remounts on question change. No reset effect (react-hooks/set-state-in-effect).

import { useState } from "react";

import type { AnswerValue } from "@/lib/grading/types";
import type { ClientLabeledItem } from "@/lib/questionPicker/types";

import { TileFace } from "./TileFace";

/** Wrap the selected tile ids into the structured AnswerValue grade() expects.
 *  The server grades it with the "select-all" rule (set-equality). */
export function selectManyAnswer(ids: string[]): AnswerValue {
  return { type: "id-set", ids };
}

interface Props {
  /** From question.content.tiles ({id,label,image?}). */
  tiles: ClientLabeledItem[];
  /** Fired with JSON.stringify({type:"id-set",ids}) on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function ClickImageMulti({ tiles, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const canSubmit = selected.size > 0 && !disabled;

  function toggle(id: string) {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(JSON.stringify(selectManyAnswer(Array.from(selected))));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p
        className="font-display-child text-lg font-bold text-sam-gray-mid"
        aria-hidden="true"
      >
        Pick all that apply
      </p>
      <div
        role="group"
        aria-label="Answer options"
        className="grid w-full gap-4 sm:grid-cols-2"
      >
        {tiles.map((tile) => {
          const isSelected = selected.has(tile.id);
          return (
            <button
              key={tile.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={tile.label}
              disabled={disabled}
              onClick={() => toggle(tile.id)}
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
