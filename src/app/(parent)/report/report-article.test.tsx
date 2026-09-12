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
  // The secondary "Questions? Talk to us" mailto is now a tracked client
  // component too; render its children so the link text still asserts.
  TrackedMailtoLink: ({ children }: { children?: React.ReactNode }) => children,
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

describe("ReportArticle — short reports never show a placement to parents", () => {
  // This withholding is a deliberate protection: a ten-item short check does
  // not yield a placement, and showing one would present a
  // comprehensive-shaped claim off a sample. The staff-only block added on the
  // instructor/admin student-detail page must NOT change this — these assert
  // the parent surface stays byte-identical in this respect, in BOTH the parent
  // view and the staffView rendering of the same component.
  // The MEASURED placement is deliberately set to a different level than the
  // readiness label. A short report legitimately says "appears ready for S.A.M
  // Level 4" (READINESS_COPY.readyLine — founder-approved, and it names the
  // child's CURRENT booklet, not a measurement). So asserting on the bare
  // string "S.A.M Level" would be wrong; what must never appear is the
  // PLACEMENT — here "S.A.M Level 6" / "L6".
  const SHORT_PLACED_ELSEWHERE: ReportContent = {
    ...SHORT,
    placement: {
      ...SHORT.placement,
      sam_level: "S.A.M Level 6",
      canonical_level: "L6",
    },
  };

  for (const staffView of [false, true]) {
    it(`short report withholds the measured placement (staffView=${staffView})`, () => {
      const html = render(
        <ReportArticle
          reportContent={SHORT_PLACED_ELSEWHERE}
          narrationProse={PROSE}
          childId="c1"
          schoolFieldEnabled={false}
          staffView={staffView}
        />,
      );

      // The placement itself — never on a parent surface for a short test.
      expect(html).not.toContain("S.A.M Level 6");
      expect(html).not.toContain("Placement recommendation");
      // The canonical contract value must never reach a parent surface.
      expect(html).not.toContain("L6");
      expect(html).not.toContain("iClassPro");
      expect(html).not.toContain("Placement for enrollment");

      // …while the readiness line and the rest of the report still render, so
      // this is not passing merely because nothing rendered.
      expect(html).toContain("S.A.M Level 4"); // readiness, not placement
      expect(html).toContain("Strand Performance");
    });
  }

  it("comprehensive still DOES show the placement (unchanged)", () => {
    const html = render(
      <ReportArticle
        reportContent={COMPREHENSIVE}
        narrationProse={PROSE}
        childId="c1"
        schoolFieldEnabled={false}
      />,
    );

    expect(html).toContain(COMPREHENSIVE.placement.sam_level);
  });
});

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
