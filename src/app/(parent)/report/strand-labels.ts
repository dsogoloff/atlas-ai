// Parent-facing display labels for strand axes across the report.
//
// Phase 8 split the report-side strand vocabulary into three sets:
//
//   * STRAND_LABELS  — the V2026 12 sub-strands (used by strand-map for
//                      the variable-length bar list).
//   * PARENT_STRAND_LABELS / SHORT_PARENT_STRAND_LABELS — the 3 V2026
//                      parent strands (used by strand-radar for the
//                      3 fixed axes; SHORT_ variant for the SVG axis
//                      labels, full variant for the aria summary).
//   * ENGINE_STRAND_LABELS — the legacy engine 6-value enum, retained for
//                      curriculum_recommendations + misconceptions which
//                      are still keyed by the engine enum in the DB.
//                      Used by recommendations-card (strand eyebrow).
//
// Display names match docs/sam-v2026-taxonomy.md §2/§3 (parents and sub-
// strands). The engine labels track the original 6-band display names.

import type { Strand as EngineStrand } from "@/lib/engine/types";

import type { ParentStrand, Strand } from "@/lib/report/types";

/** V2026 12 sub-strand display names. */
export const STRAND_LABELS: Record<Strand, string> = {
  whole_numbers: "Whole Numbers",
  fractions: "Fractions",
  decimals: "Decimals",
  money: "Money",
  percentage: "Percentage",
  rate: "Rate",
  ratio: "Ratio",
  algebra: "Algebra",
  measurement: "Measurement",
  geometry: "Geometry",
  area_volume: "Area and Volume",
  data_representation: "Data Representation and Interpretation",
};

/** V2026 3 parent-strand display names (full). Used for radar aria. */
export const PARENT_STRAND_LABELS: Record<ParentStrand, string> = {
  number_algebra: "Number and Algebra",
  measurement_geometry: "Measurement and Geometry",
  statistics: "Statistics",
};

/** Short parent labels for tight visual surfaces — the radar's SVG axis
 *  labels in particular. Single-word where possible so 3-axis labels fit
 *  without clipping the 460-unit-wide viewBox at small viewports. */
export const SHORT_PARENT_STRAND_LABELS: Record<ParentStrand, string> = {
  number_algebra: "Number",
  measurement_geometry: "Measure",
  statistics: "Statistics",
};

/** Legacy engine-enum labels — used by recommendations-card.tsx (and any
 *  future code that renders an engine-strand badge for a misconception or
 *  curriculum recommendation row). NOT used by strand-map or strand-radar
 *  any more. */
export const ENGINE_STRAND_LABELS: Record<EngineStrand, string> = {
  number_sense: "Number Sense",
  operations_algorithms: "Operations & Algorithms",
  fractions_decimals: "Fractions & Decimals",
  measurement: "Measurement",
  geometry: "Geometry",
  data_statistics: "Data & Statistics",
};
