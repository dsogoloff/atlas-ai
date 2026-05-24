/**
 * Atlas Assessment — Report data contract
 *
 * Canonical type definitions for the renderer's input. Transcribed from
 * atlas-report-system-spec.md §4.6. The renderer consumes ReportContent; it
 * must be fully parent-readable, with nothing opaque to a non-technical reader.
 */

export interface RadarVisualizationData {
  axes: {
    strand_id: string;
    short_label: string; // truncated label for the radial layout
    value: number; // 0-100
    level: 'solid' | 'approaching' | 'developing';
  }[];
}

export interface StrandRow {
  strand_name: string; // full name
  percentile_display: number;
  level: 'solid' | 'approaching' | 'developing';
  level_label: string; // display string, e.g. "Solid"
}

export interface ReportFinding {
  number: number; // 1, 2, 3 — display order
  title: string; // headline sentence, declarative
  observed: string; // "What we observed"
  suggests: string; // "What it suggests"
  matters: string; // "Why it matters"
  focus: string; // "What we'd focus on"
}

export interface StartingUnit {
  unit_name: string;
  addresses_finding_number: number; // links unit to a finding
  unit_id: string; // refs curriculum
}

export interface ReportContent {
  session_id: string;
  tenant_id: string;
  generated_at: string; // ISO8601

  // Header
  child: {
    // Child's display name as shown in the report header.
    // Demo: full name (e.g. "Aiden Park"). Live treatment TBD — may reduce to
    // first name only, or first name + last initial.
    display_name: string;
    grade_label: string; // e.g. "Grade 3"
  };
  metadata: {
    assessed_date_display: string; // e.g. "May 19, 2026"
    duration_display: string; // e.g. "14 minutes"
    report_id: string; // e.g. "A-2026-051901"
  };

  // Placement block
  placement: {
    level_display: string; // e.g. "S.A.M. Level 3"
  };

  // Strand performance
  strand_performance: {
    lede: string; // 1-2 sentence intro
    radar_data: RadarVisualizationData;
    detail_rows: StrandRow[]; // ordered for display
  };

  // Findings — 2-3 items, max 3
  findings_section: {
    heading: string; // default "What We Noticed"
    lede: string;
    findings: ReportFinding[];
  };

  // Recommendation
  recommendation: {
    lede: string;
    placement_paragraph: string; // contains inline <strong> markup — rendered as raw HTML
    starting_units: StartingUnit[];
  };

  // Next steps
  next_steps: {
    paragraph: string;
    cta_text: string;
    cta_target: string; // URL or app deep link
  };
}
