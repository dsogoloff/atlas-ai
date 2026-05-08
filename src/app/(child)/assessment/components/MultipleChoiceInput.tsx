"use client";

// MULTIPLE_CHOICE input. Adapted from sam-placement MultipleChoice:
//   * Explicit Submit (sam-placement auto-advances 1.5s after click; per
//     Item #5 ambiguity #5 resolution, all formats use explicit Submit).
//   * sam-* tokens.
//   * Submits the option's display text — server reads correct_index and
//     compares against options[correct_index].trim() (correctness.ts:39-46).
//
// Per-question state reset: caller wraps with `<MultipleChoiceInput key={
// question.id} ... />` so React remounts on question change. No internal
// reset effect — that pattern is flagged by react-hooks/set-state-in-effect
// in React 19.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  /** From question.content.options. */
  options: string[];
  /** Fired with the chosen option's text on Submit click. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function MultipleChoiceInput({ options, onSubmit, disabled }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const canSubmit = selectedIndex !== null && !disabled;

  function handleSubmit() {
    if (selectedIndex === null || disabled) return;
    onSubmit(options[selectedIndex]);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div
        role="radiogroup"
        aria-label="Answer options"
        className="grid w-full gap-4 sm:grid-cols-2"
      >
        {options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          const isNumeric = /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(opt);
          return (
            <motion.button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => setSelectedIndex(i)}
              whileHover={disabled || reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={disabled || reduceMotion ? undefined : { scale: 0.97 }}
              className={
                "flex min-h-[88px] items-center justify-center rounded-2xl border-2 p-8 transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-red/30 disabled:cursor-not-allowed " +
                (isSelected
                  ? "border-sam-navy bg-white shadow-[0_8px_24px_rgba(27,58,107,0.12)]"
                  : "border-sam-gray-light bg-white shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-navy")
              }
            >
              <span
                className={
                  "transition-colors " +
                  (isNumeric
                    ? "font-display-child text-4xl font-bold md:text-5xl"
                    : "font-display-child text-xl font-semibold md:text-2xl") +
                  " " +
                  (isSelected ? "text-sam-red" : "text-sam-navy")
                }
              >
                {opt}
              </span>
            </motion.button>
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
