"use client";

// Visual multiple-choice: each option is a selectable card whose face is a stem
// visual primitive (e.g. "which ten-frame shows 7?"). Single-select; we emit
// AnswerValue `{ type:"mc-index", index }` (grade with `mc-index`). The selected
// card carries a house-style highlight (ring-sam-teal / border-sam-navy).
//
// Selection logic lives in an EXPORTED PURE FUNCTION (selectIndexAnswer) so it
// is unit-testable under the node-env vitest runner that cannot click.

import { useState } from "react";

import { VisualPrimitive } from "@/components/visual-primitives";
import type { AnswerValue } from "@/lib/grading/types";
import type { VisualMCSpec } from "./types";

/** Wrap a chosen option index into the structured AnswerValue grade() expects. */
export function selectIndexAnswer(index: number): AnswerValue {
  return { type: "mc-index", index };
}

type Props = VisualMCSpec & {
  onChange?: (v: AnswerValue) => void;
  className?: string;
};

export function VisualMC({ options, ariaLabel, onChange, className }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(index: number) {
    setSelected(index);
    onChange?.(selectIndexAnswer(index));
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? "Choose an answer"}
      className={
        "flex flex-wrap items-stretch justify-center gap-4 " + (className ?? "")
      }
    >
      {options.map((option, index) => {
        const isSelected = selected === index;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.visual.ariaLabel ?? `Option ${index + 1}`}
            onClick={() => handleSelect(index)}
            className={
              "flex items-center justify-center rounded-2xl border-2 bg-white p-4 transition-shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-teal/40 " +
              (isSelected
                ? "border-sam-navy ring-4 ring-sam-teal"
                : "border-sam-gray-light hover:border-sam-navy")
            }
          >
            <VisualPrimitive spec={option.visual} />
          </button>
        );
      })}
    </div>
  );
}
