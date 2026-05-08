"use client";

// NUMERIC_ENTRY input. Adapted from sam-placement NumericAnswer:
//   * Big tactile numeric input + Submit button.
//   * sam-* tokens.
//   * Server applies numeric coercion ("007" === "7", "7.0" === "7") so
//     we don't normalise client-side beyond a trim. Fraction-aware compare
//     is NOT promised in v1 — see correctness.ts:36-43.
//
// Per-question state reset: caller wraps with `<NumericInput key={
// question.id} ... />` so React remounts on question change.

import { FormEvent, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  /** Fired with the trimmed string on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function NumericInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  // Mount-only autofocus. No setState here — react-hooks/set-state-in-effect
  // forbids the effect-driven reset pattern; the parent's key={question.id}
  // remount handles state reset on question change.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = value.trim();
  const canSubmit = trimmed !== "" && !disabled;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-6"
      aria-label="Type your answer"
    >
      <motion.input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="?"
        animate={
          reduceMotion || trimmed === "" ? { scale: 1 } : { scale: [1, 1.02, 1] }
        }
        transition={{ duration: 0.2 }}
        aria-label="Your answer"
        className={
          "h-32 w-full rounded-3xl border-2 bg-white text-center font-display-child text-7xl font-bold text-sam-navy shadow-[0_4px_12px_rgba(27,58,107,0.08)] focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-red/30 placeholder:text-sam-gray-light disabled:cursor-not-allowed " +
          (trimmed !== ""
            ? "border-sam-navy"
            : "border-sam-gray-light focus:border-sam-navy")
        }
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-sam-red px-12 font-display-child text-2xl font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none disabled:cursor-not-allowed disabled:bg-sam-gray-light disabled:text-sam-gray-mid disabled:shadow-none"
      >
        {disabled ? "Submitting…" : "Submit"}
        {!disabled && (
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">
            chevron_right
          </span>
        )}
      </button>
    </form>
  );
}
