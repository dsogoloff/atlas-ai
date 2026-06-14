"use client";

// SELECT_MULTIPLE input. Options are toggleable tap targets; the child taps
// to add/remove a selection, then Submit. We emit
//   JSON.stringify({ type: "id-set", ids })
// (the new structured-input wire convention — see DragDropInput for the
// JSON.stringify(answerValue) precedent). Grading is entirely server-side:
// correctness.ts reads content.select_rule and grades select-all (exact set)
// or select-count ("any N of M"). `select_rule`/`count` here only drive a
// UX hint ("Pick N") — they never decide correctness on the client.
//
// House style mirrors MultipleChoiceInput (sam-* tokens, radiogroup-style
// aria with aria-pressed toggles, Submit button) but multi-select.
//
// Per-question state reset: caller wraps with key={question.id} so React
// remounts on question change. No reset effect (react-hooks/set-state-in-effect).

import { useState } from "react";

import type { AnswerValue } from "@/lib/grading/types";
import type { ClientLabeledItem } from "@/lib/questionPicker/types";

interface Props {
  /** From question.content.options ({id,label}). */
  options: ClientLabeledItem[];
  /** "all" or "count" — drives only the UX hint, not grading. */
  selectRule: string;
  /** Present when selectRule === "count": how many to pick. UX hint only. */
  count?: number;
  /** Fired with JSON.stringify({type:"id-set",ids}) on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function SelectMultipleInput({
  options,
  selectRule,
  count,
  onSubmit,
  disabled,
}: Props) {
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
    const value: AnswerValue = { type: "id-set", ids: Array.from(selected) };
    onSubmit(JSON.stringify(value));
  }

  const hint =
    selectRule === "count" && typeof count === "number"
      ? `Pick ${count}`
      : "Pick all that apply";

  return (
    <div className="flex flex-col items-center gap-6">
      <p
        className="font-display-child text-lg font-bold text-sam-gray-mid"
        aria-hidden="true"
      >
        {hint}
      </p>
      <div
        role="group"
        aria-label="Answer options"
        className="grid w-full gap-4 sm:grid-cols-2"
      >
        {options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => toggle(opt.id)}
              className={
                "flex min-h-[88px] items-center justify-center rounded-2xl border-2 bg-white p-6 font-display-child text-xl font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-red/30 disabled:cursor-not-allowed md:text-2xl " +
                (isSelected
                  ? "border-4 border-sam-red text-sam-red shadow-lg"
                  : "border-sam-gray-light text-sam-navy shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-red")
              }
            >
              {opt.label}
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
