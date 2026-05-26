/**
 * Atlas Assessment Report — "Aiden, Grade 3" golden fixture
 *
 * Canonical example matching docs/atlas-sample-report.html, conformed to the
 * reconciled ReportContent contract (the shipped /report shape).
 *
 * Spec reference: report-system-spec §13.1 (golden test case #1).
 *
 * Identifiers are fixed, readable, fixture-stable values:
 *   - session_id / tenant_id: fixed UUIDs so the golden case is deterministic.
 *   - misconception codes: fixture-stable slugs. Production codes come from
 *     the seeded misconceptions table; the renderer treats them as opaque keys
 *     (only label / description / strand surface to the parent).
 */

import type { ReportContent } from "@/lib/report/types";

export const aidenGrade3Report: ReportContent = {
  session_id: "00000000-0000-4000-8000-00000a1de003",
  tenant_id: "00000000-0000-4000-8000-0000000a71a5",
  generated_at: "2026-05-19T15:42:00.000Z",

  child: {
    display_name: "Aiden Park",
    grade_label: "Grade 3",
  },
  metadata: {
    assessed_date_display: "May 19, 2026",
    duration_display: "14 minutes",
    report_id: "A-2026-051901",
  },

  time_flag: "normal",

  placement: {
    sam_level: "S.A.M Level 3A",
    overall_percentage: 70,
    tier: "K_4",
  },

  // Phase 8: strand_mastery is now keyed by V2026 sub-strands. The 7
  // sub-strands applicable at l3 per the spec's applies_to_level_codes:
  // whole_numbers, fractions, money, measurement, geometry, area_volume,
  // data_representation. Ordering follows tax_sub_strands.display_order.
  strand_mastery: [
    { strand: "whole_numbers", correct: 14, total: 18, percentage: 78, band: "mastery" },
    { strand: "fractions", correct: 5, total: 12, percentage: 42, band: "area_of_focus" },
    { strand: "money", correct: 4, total: 6, percentage: 67, band: "progressing" },
    { strand: "measurement", correct: 6, total: 8, percentage: 75, band: "mastery" },
    { strand: "geometry", correct: 8, total: 12, percentage: 67, band: "progressing" },
    { strand: "area_volume", correct: 3, total: 7, percentage: 43, band: "area_of_focus" },
    { strand: "data_representation", correct: 0, total: 0, percentage: 0, band: "no_data" },
  ],

  misconceptions: [
    {
      code: "fraction_denominator_size",
      label: "Reads fraction size from denominator size",
      description:
        "Chose the fraction with the larger denominator as the larger value " +
        "on 4 of 5 comparison items (e.g., 1/8 over 1/4). Applying whole-number " +
        "logic to the denominator.",
      strand: "fractions_decimals",
      occurrences: 4,
    },
    {
      code: "word_problem_keyword_match",
      label: "Word problems parsed by keyword rather than situation",
      description:
        "Chose the operation based on keywords like \"more\" (add) or \"less\" " +
        "(subtract), including in two cases where the situation called for " +
        "the opposite operation.",
      strand: "operations_algorithms",
      occurrences: 2,
    },
  ],

  // Page-owned band-priority sort: area_of_focus > progressing > mastery >
  // no_data, with STRAND_ORDER as the within-band tiebreaker. data_statistics
  // is omitted (no_data → no per-strand row was produced).
  recommendations: [
    {
      strand: "fractions_decimals",
      level: "3A",
      primary:
        "Build fraction sense before symbolic notation. Start with bar models " +
        "and fraction circles to anchor what the denominator means.",
      supplementary: ["Fraction Foundations unit", "Paper-folding activities"],
      notes: null,
    },
    {
      strand: "measurement",
      level: "3A",
      primary: "Continue with grade-level measurement work.",
      supplementary: [],
      notes: null,
    },
    {
      strand: "geometry",
      level: "3A",
      primary: "Continue with grade-level geometry work.",
      supplementary: [],
      notes: null,
    },
    {
      strand: "number_sense",
      level: "3A",
      primary:
        "Aiden is strong here. Ready for grade-level work in number sense.",
      supplementary: [],
      notes: null,
    },
    {
      strand: "operations_algorithms",
      level: "3A",
      primary:
        "Strong operations. Introduce bar-model word problems to replace " +
        "keyword-driven parsing.",
      supplementary: ["Bar Model Introduction"],
      notes: null,
    },
  ],
};
