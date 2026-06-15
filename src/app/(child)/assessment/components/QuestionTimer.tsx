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
import { TextEntryInput } from "./TextEntryInput";
import { DragDropInput } from "./DragDropInput";
import { SelectMultipleInput } from "./SelectMultipleInput";
import { MatchingInput } from "./MatchingInput";
import { MultiBlankInput } from "./MultiBlankInput";
import { EquationSetInput } from "./EquationSetInput";
import {
  ClickImageSingle,
  ClickImageMulti,
  ImageOrdering,
} from "@/components/answer-inputs";

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
    case "TEXT_ENTRY":
      return <TextEntryInput onSubmit={handleAnswer} disabled={disabled} />;
    case "DRAG_DROP":
      return (
        <DragDropInput
          items={getItems(question.content)}
          onSubmit={handleAnswer}
          disabled={disabled}
        />
      );
    case "SELECT_MULTIPLE": {
      const c = getSelectMultiple(question.content);
      return (
        <SelectMultipleInput
          options={c.options}
          selectRule={c.select_rule}
          count={c.count}
          onSubmit={handleAnswer}
          disabled={disabled}
        />
      );
    }
    case "VISUAL_MATCHING": {
      const c = getMatching(question.content);
      return (
        <MatchingInput
          left={c.left}
          right={c.right}
          onSubmit={handleAnswer}
          disabled={disabled}
        />
      );
    }
    case "MULTI_BLANK":
      return (
        <MultiBlankInput
          tokens={getTokens(question.content)}
          onSubmit={handleAnswer}
          disabled={disabled}
        />
      );
    case "EQUATION_SET": {
      const c = getEquationSet(question.content);
      return (
        <EquationSetInput
          rows={c.rows}
          ops={c.ops}
          onSubmit={handleAnswer}
          disabled={disabled}
        />
      );
    }
    case "CLICK_IMAGE_SINGLE":
      return (
        <ClickImageSingle
          tiles={getImageTiles(question.content)}
          onSubmit={handleAnswer}
          disabled={disabled}
        />
      );
    case "CLICK_IMAGE_MULTI":
      return (
        <ClickImageMulti
          tiles={getImageTiles(question.content)}
          onSubmit={handleAnswer}
          disabled={disabled}
        />
      );
    case "IMAGE_ORDERING":
      return (
        <ImageOrdering
          tiles={getImageTiles(question.content)}
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
  // Two union members carry `options`: MULTIPLE_CHOICE (string[]) and
  // SELECT_MULTIPLE ({id,label}[]). The latter also carries `select_rule`,
  // so exclude it to land on the MC branch.
  if (!("options" in content) || "select_rule" in content) {
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

function getSelectMultiple(
  content: ClientQuestionContent,
): Extract<ClientQuestionContent, { select_rule: string }> {
  if (!("select_rule" in content)) {
    throw new Error("SELECT_MULTIPLE content missing select_rule");
  }
  return content;
}

function getMatching(
  content: ClientQuestionContent,
): Extract<ClientQuestionContent, { left: unknown }> {
  if (!("left" in content)) {
    throw new Error("VISUAL_MATCHING content missing left/right");
  }
  return content;
}

function getTokens(
  content: ClientQuestionContent,
): Extract<ClientQuestionContent, { tokens: unknown }>["tokens"] {
  if (!("tokens" in content)) {
    throw new Error("MULTI_BLANK content missing tokens");
  }
  return content.tokens;
}

function getEquationSet(
  content: ClientQuestionContent,
): Extract<ClientQuestionContent, { rows: number }> {
  if (!("rows" in content)) {
    throw new Error("EQUATION_SET content missing rows");
  }
  return content;
}

// All three image-input formats (CLICK_IMAGE_SINGLE / CLICK_IMAGE_MULTI /
// IMAGE_ORDERING) share the `tiles` content shape; they differ only by the
// rendered component (selected above on question.format) and the server-side
// grading rule.
function getImageTiles(
  content: ClientQuestionContent,
): Extract<ClientQuestionContent, { tiles: unknown }>["tiles"] {
  if (!("tiles" in content)) {
    throw new Error("image-input content missing tiles");
  }
  return content.tiles;
}
