// Parent-facing display labels for each strand.
//
// Single source of truth, shared across:
//   * strand-map.tsx   — bar labels + a11y captions
//   * recommendations-card.tsx — strand eyebrow per rec item
//   * strand-radar.tsx — SVG aria summary (full names) + axis labels (short)
//
// Display names match docs/taxonomy.md band labels. Keep both maps in
// sync when the strand enum grows.

import type { Strand } from "@/lib/engine/types";

export const STRAND_LABELS: Record<Strand, string> = {
  number_sense: "Number Sense",
  operations_algorithms: "Operations & Algorithms",
  fractions_decimals: "Fractions & Decimals",
  measurement: "Measurement",
  geometry: "Geometry",
  data_statistics: "Data & Statistics",
};

// Short labels for tight visual surfaces — radar axes today, future
// chart legends. Single-word where natural ("Numbers" not "Number
// Sense"); "Operations" compresses "Operations & Algorithms" since the
// "& Algorithms" tail is taxonomy precision that doesn't fit on a chart
// axis.
export const SHORT_STRAND_LABELS: Record<Strand, string> = {
  number_sense: "Numbers",
  operations_algorithms: "Operations",
  fractions_decimals: "Fractions",
  measurement: "Measurement",
  geometry: "Geometry",
  data_statistics: "Data",
};
