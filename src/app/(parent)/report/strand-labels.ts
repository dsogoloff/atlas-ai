// Parent-facing display labels for each strand.
//
// Single source of truth, shared across:
//   * strand-map.tsx   — bar labels + a11y captions
//   * recommendations-card.tsx — strand eyebrow per rec item
//   * strand-radar.tsx — SVG aria summary (full names) + axis labels (short)
//
// "Logic &" prefix dropped from WORD_PROBLEMS at Item #8 port time
// (Stitch source had "Logic & Word Problems"; renders plain "Word
// Problems" everywhere). MEASUREMENT_DATA renders as "Measurement &
// Data" rather than the schema's enum-shape "MEASUREMENT_DATA".

import type { Strand } from "@/lib/engine/types";

export const STRAND_LABELS: Record<Strand, string> = {
  NUMBER_SENSE: "Number Sense",
  OPERATIONS: "Operations",
  WORD_PROBLEMS: "Word Problems",
  FRACTIONS_DECIMALS: "Fractions & Decimals",
  GEOMETRY: "Geometry",
  MEASUREMENT_DATA: "Measurement & Data",
};

// Short labels for tight visual surfaces — radar axes today, future
// chart legends. Single-word where natural ("Numbers" not "Number
// Sense"); WORD_PROBLEMS stays two words because no good single-word
// abbreviation exists ("Words" reads ambiguous, "Reasoning" is a
// stretch). Keep both maps in sync when the strand enum grows.
export const SHORT_STRAND_LABELS: Record<Strand, string> = {
  NUMBER_SENSE: "Numbers",
  OPERATIONS: "Operations",
  WORD_PROBLEMS: "Word Problems",
  FRACTIONS_DECIMALS: "Fractions",
  GEOMETRY: "Geometry",
  MEASUREMENT_DATA: "Measurement",
};
