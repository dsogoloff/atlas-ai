"use client";

// TEXT_ENTRY input. Mirrors NumericInput (same submission plumbing, same
// sam-* tokens) with the deltas a typed word/phrase answer needs:
//   * inputMode="text" — full keyboard, not the decimal keypad.
//   * autocorrect/autocapitalize off — the server compares against the
//     stored key case-insensitively (normalizeTextAnswer in
//     correctness.ts), but mobile "smart" rewrites of math answers
//     ("smaller than" → "Smaller Than…") are noise we don't want.
//   * Smaller type than the numeric input — answers like
//     "Five hundred and eight" need the width.
//
// Per-question state reset: caller wraps with `<TextEntryInput key={
// question.id} ... />` so React remounts on question change.

import { FormEvent, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  /** Fired with the trimmed string on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function TextEntryInput({ onSubmit, disabled }: Props) {
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
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
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
          "h-24 w-full rounded-3xl border-2 bg-white px-6 text-center font-display-child text-3xl font-bold text-sam-navy shadow-[0_4px_12px_rgba(27,58,107,0.08)] focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-red/30 placeholder:text-sam-gray-light disabled:cursor-not-allowed md:text-4xl " +
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
