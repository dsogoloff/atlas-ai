"use client";

// Per-question timer + format dispatcher.
//
// Lives between AssessmentClient and the format-specific input. Mounted
// fresh for each new question via key={question.id} on the parent; the
// useState initializer captures the mount time as the question's start
// time. Date.now() in the initializer runs at mount, not during render,
// so react-hooks/purity is satisfied.
//
// Why a dedicated component (vs. tracking time in AssessmentClient):
//   * useRef + mutate-in-render for question-change detection trips
//     react-hooks/refs.
//   * useEffect + setState resets trip react-hooks/set-state-in-effect.
//   * Date.now() in a handler defined alongside refs in AssessmentClient's
//     body got flagged by react-hooks/purity (the lint can't tell handler
//     bodies from render code in that context).
// Containing the timer in a small, focused component sidesteps all three:
// no refs, no effect, and the handler context is a clean leaf component.

import { useState } from "react";

import type {
  ClientQuestion,
  ClientQuestionContent,
} from "@/lib/questionPicker/types";
import type { Tier } from "@/lib/tier/derive";

import { MultipleChoiceInput } from "./MultipleChoiceInput";
import { NumericInput } from "./NumericInput";
import { DragDropInput } from "./DragDropInput";

interface Props {
  question: ClientQuestion;
  /** Receives the child's answer plus the elapsed time in ms. */
  onSubmit: (answerGiven: string, timeMs: number) => void;
  /** True while the parent's submit network call is in flight. */
  disabled?: boolean;
  /** Forwarded to MultipleChoiceInput only. NumericInput and DragDropInput
   *  are tier-invariant in v1 (Item #6 plan §3 — keypad and drop-into-target
   *  variants deferred). */
  tier: Tier;
}

export function QuestionTimer({ question, onSubmit, disabled, tier }: Props) {
  // useState initializer runs at mount only — not during render or on
  // re-renders. Captures the wall-clock at the moment React mounted this
  // QuestionTimer instance for the current question.
  const [startedAt] = useState(() => Date.now());

  function handleAnswer(answerGiven: string) {
    const timeMs = Date.now() - startedAt;
    onSubmit(answerGiven, timeMs);
  }

  switch (question.format) {
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoiceInput
          options={getOptions(question.content)}
          onSubmit={handleAnswer}
          disabled={disabled}
          tier={tier}
        />
      );
    case "NUMERIC_ENTRY":
      return <NumericInput onSubmit={handleAnswer} disabled={disabled} />;
    case "DRAG_DROP":
      return (
        <DragDropInput
          items={getItems(question.content)}
          onSubmit={handleAnswer}
          disabled={disabled}
        />
      );
  }
}

// ClientQuestionContent is a union without a discriminator — narrow via
// `in`. The serializer (serialize.ts:46-53) guarantees the per-format
// shape, so the throws here are defensive against an impossible case.
function getOptions(content: ClientQuestionContent): string[] {
  if (!("options" in content)) {
    throw new Error("MULTIPLE_CHOICE content missing options");
  }
  return content.options;
}

function getItems(content: ClientQuestionContent): string[] {
  if (!("items" in content)) {
    throw new Error("DRAG_DROP content missing items");
  }
  return content.items;
}
