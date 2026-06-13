"use client";

// Equation-fill input: a linear template of fixed text + fillable blanks, e.g.
//   `[blank a] + [blank b] = [blank sum]`
// The child types into each blank; we emit AnswerValue `{ type:"blanks", values }`
// keyed by blank id. House style mirrors NumericInput (sam-* tokens, aria-labels).
//
// Answer-assembly logic lives in EXPORTED PURE FUNCTIONS (buildBlanksAnswer,
// blankIds) so it is unit-testable under the node-env vitest runner that cannot
// simulate DOM events.

import { useState } from "react";

import type { AnswerValue } from "@/lib/grading/types";
import type { EquationFillSpec, FillToken } from "./types";

type BlankToken = Extract<FillToken, { t: "blank" }>;

/** Ids of the blank tokens, in template order. Used for init + tests. */
export function blankIds(spec: EquationFillSpec): string[] {
  return spec.tokens
    .filter((t): t is BlankToken => t.t === "blank")
    .map((t) => t.id);
}

/** Wrap the per-blank entries into the structured AnswerValue grade() expects. */
export function buildBlanksAnswer(
  values: Record<string, string>,
): AnswerValue {
  return { type: "blanks", values };
}

type Props = EquationFillSpec & {
  onChange?: (v: AnswerValue) => void;
  className?: string;
};

export function EquationFill({ tokens, ariaLabel, onChange, className }: Props) {
  const spec: EquationFillSpec = { kind: "equation-fill", tokens, ariaLabel };
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(blankIds(spec).map((id) => [id, ""])),
  );

  function handleChange(id: string, next: string) {
    const updated = { ...values, [id]: next };
    setValues(updated);
    onChange?.(buildBlanksAnswer(updated));
  }

  return (
    <div
      aria-label={ariaLabel ?? "Fill in the blanks"}
      className={
        "flex flex-wrap items-center gap-2 font-display-child text-3xl text-sam-navy " +
        (className ?? "")
      }
    >
      {tokens.map((token, i) => {
        if (token.t === "text") {
          return (
            <span key={`text-${i}`} className="px-1">
              {token.value}
            </span>
          );
        }
        const label = token.placeholder
          ? `Blank ${token.placeholder}`
          : `Blank ${token.id}`;
        return (
          <input
            key={`blank-${token.id}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={values[token.id] ?? ""}
            onChange={(e) => handleChange(token.id, e.target.value)}
            placeholder={token.placeholder ?? "?"}
            aria-label={label}
            className="h-14 w-16 rounded-xl border-2 border-sam-navy bg-sam-cream text-center font-bold text-sam-navy focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-teal/40 placeholder:text-sam-gray-light"
          />
        );
      })}
    </div>
  );
}
