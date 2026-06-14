"use client";

// EQUATION_SET input. Live wrapper around the shared answer-input EquationSet
// (src/components/answer-inputs/EquationSet.tsx). EquationSet renders N
// editable number sentences and emits an AnswerValue
// `{ type:"equation-set", equations }` via onChange; this wrapper holds the
// latest value and, on Submit, emits
//   JSON.stringify(answerValue)
// (the new structured-input wire convention). Grading is server-side:
// correctness.ts reads content.answer_rule and grades set-equality or
// equation-validity.
//
// Per-question state reset: caller wraps with key={question.id}.

import { useState } from "react";

import { EquationSet } from "@/components/answer-inputs";
import type { AnswerValue, Op } from "@/lib/grading/types";

const VALID_OPS: ReadonlySet<string> = new Set(["+", "-", "x", "/"]);

interface Props {
  /** From question.content.rows. */
  rows: number;
  /** From question.content.ops (selectable operators), if present. */
  ops?: string[];
  /** Fired with JSON.stringify(answerValue) on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function EquationSetInput({ rows, ops, onSubmit, disabled }: Props) {
  // Narrow the wire `string[]` ops to the typed Op[] the shared component
  // expects (unknown operators are dropped; an empty/absent list lets the
  // shared component fall back to its own default).
  const typedOps = ops?.filter((op): op is Op => VALID_OPS.has(op));

  const [value, setValue] = useState<AnswerValue>(() => ({
    type: "equation-set",
    equations: [],
  }));

  function handleSubmit() {
    if (disabled) return;
    onSubmit(JSON.stringify(value));
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <EquationSet
        kind="equation-set"
        rows={rows}
        ops={typedOps && typedOps.length > 0 ? typedOps : undefined}
        onChange={setValue}
      />

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
