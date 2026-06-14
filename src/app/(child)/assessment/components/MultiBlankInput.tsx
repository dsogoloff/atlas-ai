"use client";

// MULTI_BLANK input. Live wrapper around the shared answer-input EquationFill
// (src/components/answer-inputs/EquationFill.tsx). EquationFill renders the
// template (text + fillable blanks) and emits an AnswerValue
// `{ type:"blanks", values }` via onChange; this wrapper holds the latest
// value and, on Submit, emits
//   JSON.stringify(answerValue)
// (the new structured-input wire convention). Grading is server-side:
// correctness.ts reads content.blanks and grades per-blank.
//
// Per-question state reset: caller wraps with key={question.id}.

import { useState } from "react";

import { EquationFill } from "@/components/answer-inputs";
import type { AnswerValue } from "@/lib/grading/types";
import type { ClientFillToken } from "@/lib/questionPicker/types";

interface Props {
  /** From question.content.tokens (render-safe template). */
  tokens: ClientFillToken[];
  /** Fired with JSON.stringify(answerValue) on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function MultiBlankInput({ tokens, onSubmit, disabled }: Props) {
  // Start from an empty blanks value so a Submit before any keystroke still
  // yields a clean structured value (graded wrong, never a throw).
  const [value, setValue] = useState<AnswerValue>(() => ({
    type: "blanks",
    values: {},
  }));

  function handleSubmit() {
    if (disabled) return;
    onSubmit(JSON.stringify(value));
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <EquationFill kind="equation-fill" tokens={tokens} onChange={setValue} />

      <button
        type="button"
        disabled={disabled}
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
