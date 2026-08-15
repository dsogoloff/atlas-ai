// ReportArticle — staffView gating.
//
// The admin "master instructor" view reuses ReportArticle to show the FULL
// parent report, but must suppress the parent-only ACTION widgets (they fire
// parent-side effects: the center-follow-up CTA's analytics opt-in, the
// short-test lead-capture mutation, and the feedback island's
// parent_report_viewed-on-mount + satisfaction submit). staffView renders all
// report CONTENT verbatim while not rendering any of those widgets.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { NarrationProse } from "@/lib/report/narration/resolve";
import type { ReportContent } from "@/lib/report/types";

// Sentinel-stub the three parent-action client islands so their presence is
// unambiguous in the static markup (and so the test doesn't pull their server
// actions). Everything else (radar, strand map, placement, findings) renders
// for real — that's the parent-report content we want to prove is shown.
vi.mock("next/link", () => ({
  default: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock("./center-followup-cta", () => ({
  CenterFollowupCta: () => <span>CENTER_FOLLOWUP_CTA</span>,
}));
vi.mock("./parent-report-feedback", () => ({
  ParentReportFeedback: () => <span>PARENT_FEEDBACK_ISLAND</span>,
}));
vi.mock("./follow-up-cta", () => ({
  FollowUpCta: () => <span>FOLLOWUP_LEAD_FORM</span>,
}));

import { ReportArticle } from "./report-article";

const STRANDS: ReportContent["strand_mastery"] = [
  { strand: "whole_numbers", correct: 6, total: 8, percentage: 75, band: "mastery" },
  { strand: "fractions", correct: 0, total: 0, percentage: 0, band: "no_data" },
  { strand: "measurement", correct: 1, total: 3, percentage: 33, band: "area_of_focus" },
];

function content(readiness: ReportContent["readiness"]): ReportContent {
  return {
    session_id: "sess-1",
    tenant_id: "t1",
    generated_at: "2026-06-23T00:00:00.000Z",
    child: { display_name: "Preview Learner", grade_label: "4th Grade" },
    metadata: {
      assessed_date_display: "June 23, 2026",
      duration_display: "3 minutes",
      report_id: "A-TEST",
    },
    time_flag: "normal",
    placement: {
      sam_level: "S.A.M Level 4",
      canonical_level: "L4",
      overall_percentage: 75,
      tier: "K_4",
    },
    strand_mastery: STRANDS,
    misconceptions: [],
    recommendations: [],
    readiness,
  };
}

const PROSE: NarrationProse = {
  placement_line: "Solid command of whole-number work at this level.",
  strand_lede: "Here is how Preview Learner did across the sampled strands.",
  key_findings: {
    strengths: ["Whole Numbers — confident with the sampled operations."],
    growth_areas: ["Measurement — a few items to revisit."],
  },
  recommendations_lede: "Suggested focus areas to confirm with an instructor.",
};

const COMPREHENSIVE = content(null);
const SHORT = content({ ready: true, currentLevelLabel: "4" });

function render(node: React.ReactElement) {
  return renderToStaticMarkup(node);
}

describe("ReportArticle — staffView gating", () => {
  it("parent view (default) renders the parent-action widgets", () => {
    const html = render(
      <ReportArticle
        reportContent={COMPREHENSIVE}
        narrationProse={PROSE}
        childId="c1"
        schoolFieldEnabled={false}
      />,
    );

    expect(html).toContain("Strand Performance");
    expect(html).toContain("CENTER_FOLLOWUP_CTA");
    expect(html).toContain("PARENT_FEEDBACK_ISLAND");
    expect(html).toContain("Next Steps");
  });

  it("staffView renders the full report CONTENT but no parent-action widgets", () => {
    const html = render(
      <ReportArticle
        reportContent={COMPREHENSIVE}
        narrationProse={PROSE}
        childId="c1"
        schoolFieldEnabled={false}
        staffView
      />,
    );

    // Parent-report content is present, verbatim.
    expect(html).toContain("Strand Performance");
    expect(html).toContain("Strand mastery:"); // StrandRadar aria-label (parent-only)
    expect(html).toContain("Placement recommendation");
    expect(html).toContain(PROSE.strand_lede!);

    // Parent-action widgets are NOT rendered (cannot fire parent-side effects).
    expect(html).not.toContain("CENTER_FOLLOWUP_CTA");
    expect(html).not.toContain("PARENT_FEEDBACK_ISLAND");
    expect(html).not.toContain("Next Steps");
  });

  it("short report parent view renders the lead-capture CTA", () => {
    const html = render(
      <ReportArticle
        reportContent={SHORT}
        narrationProse={PROSE}
        childId="c1"
        schoolFieldEnabled={false}
      />,
    );

    expect(html).toContain("FOLLOWUP_LEAD_FORM");
  });

  it("short report staffView keeps readiness content but suppresses the lead CTA", () => {
    const html = render(
      <ReportArticle
        reportContent={SHORT}
        narrationProse={PROSE}
        childId="c1"
        schoolFieldEnabled={false}
        staffView
      />,
    );

    expect(html).toContain("Strand Performance"); // report content still rendered
    expect(html).not.toContain("FOLLOWUP_LEAD_FORM"); // mutating CTA gone
    expect(html).not.toContain("CENTER_FOLLOWUP_CTA");
    expect(html).not.toContain("PARENT_FEEDBACK_ISLAND");
  });
});
