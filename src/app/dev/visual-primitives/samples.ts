// Sample params for the dev gallery — one representative spec per primitive and
// answer input. Kept beside the page so it can also be imported by a smoke test.

import type { AnswerInputSpec } from "@/components/answer-inputs";
import type { VisualPrimitiveSpec } from "@/components/visual-primitives";

export interface StemSample {
  title: string;
  spec: VisualPrimitiveSpec;
}

export const STEM_SAMPLES: StemSample[] = [
  {
    title: "Bar model — part/whole (10 = 6 + 4)",
    spec: {
      kind: "bar-model",
      rows: [
        { label: "Total", segments: [{ value: 10, label: "10", color: "navy" }] },
        {
          label: "Parts",
          segments: [
            { value: 6, label: "6", color: "teal" },
            { value: 4, label: "4", color: "orange" },
          ],
        },
      ],
      brace: { row: 0, label: "whole" },
    },
  },
  {
    title: "Number bond — 10 → 6 and 4",
    spec: { kind: "number-bond", whole: 10, parts: [6, 4] },
  },
  {
    title: "Ten frame — 7",
    spec: { kind: "ten-frame", filled: 7, color: "teal" },
  },
  {
    title: "Place-value blocks — 234",
    spec: { kind: "place-value-blocks", hundreds: 2, tens: 3, ones: 4 },
  },
  {
    title: "Number line — jump 3 → 7",
    spec: {
      kind: "number-line",
      min: 0,
      max: 10,
      step: 1,
      marks: [{ value: 3, label: "3", color: "orange" }],
      jumps: [{ from: 3, to: 7, label: "+4" }],
    },
  },
  {
    title: "Array — 3 × 4",
    spec: { kind: "array", rows: 3, cols: 4, marker: "dot", color: "teal" },
  },
  {
    title: "Fraction (bar) — 3/4",
    spec: { kind: "fraction-shape", variant: "bar", denominator: 4, shaded: 3 },
  },
  {
    title: "Fraction (circle) — 2/6",
    spec: {
      kind: "fraction-shape",
      variant: "circle",
      denominator: 6,
      shaded: 2,
      color: "orange",
    },
  },
  {
    title: "Analog clock — 9:25",
    spec: { kind: "analog-clock", hour: 9, minute: 25 },
  },
  {
    title: "Money — $1 + 2×50c + 3×10c",
    spec: {
      kind: "money",
      piles: [
        { cents: 100, count: 1 },
        { cents: 50, count: 2 },
        { cents: 10, count: 3 },
      ],
    },
  },
  {
    title: "2D shapes — triangle + hexagon",
    spec: {
      kind: "shape-2d",
      shapes: [
        { shape: "triangle", label: "triangle", color: "orange" },
        { shape: "hexagon", label: "hexagon", color: "teal" },
      ],
    },
  },
  {
    title: "Pattern sequence — find the next",
    spec: {
      kind: "pattern-sequence",
      items: [
        { type: "shape", shape: "circle", color: "navy" },
        { type: "shape", shape: "square", color: "orange" },
        { type: "shape", shape: "circle", color: "navy" },
        { type: "shape", shape: "square", color: "orange" },
        { type: "blank" },
      ],
    },
  },
];

export interface AnswerSample {
  title: string;
  spec: AnswerInputSpec;
}

export const ANSWER_SAMPLES: AnswerSample[] = [
  {
    title: "Equation fill — __ + __ = __",
    spec: {
      kind: "equation-fill",
      tokens: [
        { t: "blank", id: "a", placeholder: "?" },
        { t: "text", value: "+" },
        { t: "blank", id: "b", placeholder: "?" },
        { t: "text", value: "=" },
        { t: "blank", id: "sum", placeholder: "?" },
      ],
    },
  },
  {
    title: "Fact family — numbers 6, 8, 2 (four sentences)",
    spec: { kind: "equation-set", rows: 4, ops: ["+", "-"] },
  },
  {
    title: "Visual MC — which ten-frame shows 7?",
    spec: {
      kind: "visual-mc",
      ariaLabel: "Which ten-frame shows 7?",
      options: [
        { id: "a", visual: { kind: "ten-frame", filled: 6, color: "teal" } },
        { id: "b", visual: { kind: "ten-frame", filled: 7, color: "teal" } },
        { id: "c", visual: { kind: "ten-frame", filled: 8, color: "teal" } },
      ],
    },
  },
];
