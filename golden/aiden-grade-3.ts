/**
 * Atlas Assessment Report — "Aiden, Grade 3" golden fixture
 *
 * The canonical example matching docs/atlas-sample-report.html. Rendering this
 * fixture through the finished renderer must reproduce that sample report.
 *
 * Spec references: report-system-spec §4.6 (schema), §13.1 (golden test case #1).
 *
 * Identifiers are fixed, readable, fixture-stable values:
 *   - session_id / tenant_id: fixed UUIDs so the golden case is deterministic.
 *   - strand_id / unit_id: readable slugs. In production these reference real
 *     rows (UUIDs); the renderer treats them as opaque pass-through keys —
 *     only short_label / strand_name / unit_name are displayed.
 */

import type { ReportContent } from '@/lib/report/types';

export const aidenGrade3Report: ReportContent = {
  session_id: '00000000-0000-4000-8000-00000a1de003',
  tenant_id: '00000000-0000-4000-8000-0000000a71a5',
  generated_at: '2026-05-19T15:42:00.000Z',

  child: {
    display_name: 'Aiden Park',
    grade_label: 'Grade 3',
  },
  metadata: {
    assessed_date_display: 'May 19, 2026',
    duration_display: '14 minutes',
    report_id: 'A-2026-051901',
  },

  placement: {
    level_display: 'S.A.M. Level 3',
  },

  strand_performance: {
    lede:
      `Aiden's responses across the five mathematics strands the assessment ` +
      `covered. Performance is reported relative to expected proficiency for ` +
      `his grade band.`,
    radar_data: {
      axes: [
        { strand_id: 'number_sense', short_label: 'Number Sense', value: 78, level: 'solid' },
        { strand_id: 'whole_number_ops', short_label: 'Whole Number Ops', value: 82, level: 'solid' },
        { strand_id: 'fractions', short_label: 'Fractions', value: 42, level: 'developing' },
        { strand_id: 'measurement_geometry', short_label: 'Measurement', value: 72, level: 'solid' },
        { strand_id: 'word_problems', short_label: 'Word Problems', value: 55, level: 'approaching' },
      ],
    },
    detail_rows: [
      {
        strand_name: 'Number Sense & Place Value',
        percentile_display: 78,
        level: 'solid',
        level_label: 'Solid',
      },
      {
        strand_name: 'Whole Number Operations',
        percentile_display: 82,
        level: 'solid',
        level_label: 'Solid',
      },
      {
        strand_name: 'Fractions',
        percentile_display: 42,
        level: 'developing',
        level_label: 'Developing',
      },
      {
        strand_name: 'Measurement & Geometry',
        percentile_display: 72,
        level: 'solid',
        level_label: 'Solid',
      },
      {
        strand_name: 'Word Problems & Heuristics',
        percentile_display: 55,
        level: 'approaching',
        level_label: 'Approaching',
      },
    ],
  },

  findings_section: {
    heading: 'What We Noticed',
    lede:
      `Beyond the strand scores, two specific patterns emerged in how Aiden ` +
      `approached the problems. These are the most actionable findings from ` +
      `this assessment.`,
    findings: [
      {
        number: 1,
        title: 'Fraction size is being read from the size of the denominator',
        observed:
          `On 4 of 5 fraction comparison items, Aiden chose the fraction with ` +
          `the larger denominator as the larger value — for example, selecting ` +
          `1/8 over 1/4, and 3/10 over 3/5.`,
        suggests:
          `Aiden appears to be applying whole-number logic to the denominator: ` +
          `bigger number, bigger value. This is a common pattern in children ` +
          `who are encountering fraction notation before they have fully ` +
          `internalised what the denominator represents.`,
        matters:
          `This misconception is foundational. Until it is resolved, work on ` +
          `equivalent fractions, fraction operations, and ratio reasoning tends ` +
          `to compound the confusion rather than build on a stable base.`,
        focus:
          `Concrete fraction models — bar models, fraction circles, paper ` +
          `folding — anchoring the denominator to "how many equal parts the ` +
          `whole is divided into" before returning to symbolic notation.`,
      },
      {
        number: 2,
        title: 'Word problems are being parsed by keyword rather than by situation',
        observed:
          `On word problems, Aiden's chosen operation tracked specific words in ` +
          `the problem rather than the situation described. Problems containing ` +
          `"more" were solved by adding, and "less" by subtracting — including ` +
          `in two cases where the situation called for the opposite operation.`,
        suggests:
          `Aiden is using a keyword-matching shortcut rather than building a ` +
          `mental model of the problem. This strategy works on simple, ` +
          `well-worded problems and fails on multi-step ones or ones that use ` +
          `those keywords in unexpected ways.`,
        matters:
          `Singapore Math's distinctive strength is structured problem ` +
          `representation — particularly the bar model — which builds the habit ` +
          `of drawing the situation before choosing the operation. ` +
          `Keyword-driven parsing is precisely the strategy the S.A.M. ` +
          `curriculum is designed to replace.`,
        focus:
          `Bar model representation from the ground up, beginning with ` +
          `single-step problems. The goal is building the habit of drawing the ` +
          `situation first — the operation choice tends to follow naturally ` +
          `once the structure is visible.`,
      },
    ],
  },

  recommendation: {
    lede:
      `Based on Aiden's overall performance and the two findings above, we ` +
      `recommend the following placement and starting points within the ` +
      `S.A.M. curriculum.`,
    placement_paragraph:
      `Place Aiden at <strong>S.A.M. Level 3</strong>, with a focused start ` +
      `on two units that directly address what the assessment surfaced:`,
    starting_units: [
      {
        unit_name: 'Fraction Foundations',
        addresses_finding_number: 1,
        unit_id: 'unit_fraction_foundations',
      },
      {
        unit_name: 'Bar Model Introduction',
        addresses_finding_number: 2,
        unit_id: 'unit_bar_model_introduction',
      },
    ],
  },

  next_steps: {
    paragraph:
      `A S.A.M. center director will reach out within two business days to ` +
      `discuss the findings and answer any questions. If you would like to ` +
      `move faster, you can schedule a conversation directly.`,
    cta_text: 'Schedule a conversation with a S.A.M. centre director',
    // Placeholder scheduling target — replace with the real scheduling URL /
    // app deep link once that surface exists.
    cta_target: 'https://atlas.example.com/schedule/A-2026-051901',
  },
};
