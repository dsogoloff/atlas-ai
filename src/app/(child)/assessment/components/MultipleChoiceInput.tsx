"use client";

// MULTIPLE_CHOICE input. Tier-aware option-card variants:
//
//   * K_4: rectangular cards (min-h-[88px]), hover-scale, font-display-child
//     for text labels and a larger numeric variant. Adapted from
//     sam-placement MultipleChoice.
//
//   * G5_8: rectangular cards (min-h-[88px]) with a ring-radio dot
//     bottom-right; selected state thickens the border to border-4 and
//     fills the dot with a check icon. font-math-numeral for numeric
//     options. Adapted from stitch/module-c/03-g58-mc-journey.html.
//     2026-05-23: aspect-square dropped after gate finding #4. At
//     sm:grid-cols-2 with the standard ~432px content column width,
//     aspect-square produced ~208px-tall cards and a ~432px-tall
//     2-row grid wall that pushed Submit off the fold on 765-tall
//     laptop viewports. min-h-[88px] matches the K-4 card rhythm
//     and brings the 2-row grid down to ~192px.
//
// Wire format identical across tiers — submits the option's display text;
// the server reads correct_index and compares against options[correct_index]
// (correctness.ts:39-46).
//
// Per-question state reset: caller wraps with `<MultipleChoiceInput key={
// question.id} ... />` so React remounts on question change. No internal
// reset effect — that pattern is flagged by react-hooks/set-state-in-effect
// in React 19.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { Tier } from "@/lib/tier/derive";

interface Props {
  /** From question.content.options. */
  options: string[];
  /** Fired with the chosen option's text on Submit click. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
  /** Drives option-card variant. K_4 vs G5_8. */
  tier: Tier;
}

const NUMERIC_RE = /^\s*-?\d+(?:[.,]\d+)?\s*$/;

export function MultipleChoiceInput({ options, onSubmit, disabled, tier }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const canSubmit = selectedIndex !== null && !disabled;

  function handleSubmit() {
    if (selectedIndex === null || disabled) return;
    onSubmit(options[selectedIndex]);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        role="radiogroup"
        aria-label="Answer options"
        className="grid w-full gap-4 sm:grid-cols-2"
      >
        {options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          const isNumeric = NUMERIC_RE.test(opt);

          if (tier === "G5_8") {
            return (
              <motion.button
                key={i}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => setSelectedIndex(i)}
                whileHover={
                  disabled || reduceMotion ? undefined : { scale: 1.02 }
                }
                whileTap={
                  disabled || reduceMotion ? undefined : { scale: 0.95 }
                }
                className={
                  "relative flex min-h-[88px] items-center justify-center rounded-3xl bg-white p-6 transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-red/30 disabled:cursor-not-allowed " +
                  (isSelected
                    ? "border-4 border-sam-red shadow-lg"
                    : "border-2 border-sam-gray-light shadow-[0_4px_12px_rgba(27,58,107,0.08)] hover:border-sam-red")
                }
              >
                <span
                  className={
                    "transition-colors " +
                    (isNumeric
                      ? "font-math-numeral text-4xl font-semibold md:text-5xl"
                      : "font-display-child text-xl font-semibold md:text-2xl") +
                    " " +
                    (isSelected ? "text-sam-red" : "text-sam-navy")
                  }
                >
                  {opt}
                </span>
                <span
                  aria-hidden="true"
                  className={
                    "absolute bottom-4 right-4 flex h-6 w-6 items-center justify-center rounded-full transition-colors " +
                    (isSelected
                      ? "border-2 border-sam-red bg-sam-red"
                      : "border-2 border-sam-gray-light")
                  }
                >
                  {isSelected ? (
                    <span
                      className="material-symbols-outlined text-sm text-white"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  ) : null}
                </span>
              </motion.button>
            );
          }

          // K_4
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
