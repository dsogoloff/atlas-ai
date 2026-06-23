// Dev-only preview of the parent report LAYOUT, rendered from synthetic data
// (no auth, no DB). Gated by isReportPreviewEnabled(): always available in
// local dev/test; in a production build it 404s unless
// ENABLE_REPORT_PREVIEW === 'true' (so a Vercel preview can be flipped on for
// review). Reach it at /dev/report-preview.
//
// It renders the SAME <ReportArticle> the live /report route uses, so the
// section order — including the comprehensive "See the full picture" CTA now
// sitting BELOW the strand + narrative content — and the multi-strand bar map
// are exactly what production shows. The data below is a synthetic L4 short
// test that exercises the strand-aggregation fix: it includes Measurement, a
// sub-strand the child was served (from the L3 sampling band) but which is NOT
// applicable at the measured L4 level — the case the old report silently
// dropped. Whole Numbers + Data Representation carry data too; the remaining
// L4-applicable sub-strands show as no_data.

import { notFound } from "next/navigation";

import type { NarrationProse } from "@/lib/report/narration/resolve";
import type { ReportContent } from "@/lib/report/types";
import { isReportPreviewEnabled } from "@/lib/env";

import { ReportArticle } from "@/app/(parent)/report/report-article";

export const metadata = {
  title: "Report layout — dev preview",
};

const PREVIEW_CONTENT: ReportContent = {
  session_id: "preview-session-l4",
  tenant_id: "preview-tenant",
  generated_at: "2026-06-23T15:30:00.000Z",
  child: {
    display_name: "Preview Learner",
    grade_label: "4th Grade",
  },
  metadata: {
    assessed_date_display: "June 23, 2026",
    duration_display: "3 minutes",
    report_id: "A-PREVIEW-L4",
  },
  time_flag: "normal",
  placement: {
    sam_level: "S.A.M Level 4",
    overall_percentage: 75,
    tier: "K_4",
  },
  // Sub-strands in display_order. Whole Numbers (applicable at L4) + Data
  // Representation carry data; MEASUREMENT is the assessed-but-not-applicable-
  // at-L4 strand the fix now surfaces (was dropped before); the rest are
  // applicable-but-unassessed → no_data.
  strand_mastery: [
    { strand: "whole_numbers", correct: 6, total: 8, percentage: 75, band: "mastery" },
    { strand: "fractions", correct: 0, total: 0, percentage: 0, band: "no_data" },
    { strand: "decimals", correct: 0, total: 0, percentage: 0, band: "no_data" },
    { strand: "measurement", correct: 1, total: 3, percentage: 33, band: "area_of_focus" },
    { strand: "geometry", correct: 0, total: 0, percentage: 0, band: "no_data" },
    { strand: "area_volume", correct: 0, total: 0, percentage: 0, band: "no_data" },
    { strand: "data_representation", correct: 1, total: 1, percentage: 100, band: "mastery" },
  ],
  misconceptions: [],
  recommendations: [],
  // Short-test readiness → the comprehensive CTA renders (now at the bottom).
  readiness: { ready: true, currentLevelLabel: "4" },
};

const PREVIEW_PROSE: NarrationProse = {
  placement_line:
    "Preview Learner showed solid command of whole-number work at this level.",
  strand_lede:
    "Here is how Preview Learner did across the strands we sampled. (Synthetic preview data.)",
  key_findings: {
    strengths: [
      "Whole Numbers — confident with the operations sampled at this level.",
    ],
    growth_areas: [
      "Measurement — a few items to revisit with your instructor.",
      "Data Representation — worth confirming with a fuller check.",
    ],
  },
  recommendations_lede:
    "Suggested focus areas to confirm with a S.A.M instructor. (Synthetic preview data.)",
};

export default function ReportPreviewPage() {
  if (!isReportPreviewEnabled()) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <p className="bg-sam-navy px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white print:hidden">
        Dev preview · synthetic data · not a production route
      </p>
      <ReportArticle
        reportContent={PREVIEW_CONTENT}
        narrationProse={PREVIEW_PROSE}
        childId="preview-child-l4"
        schoolFieldEnabled={false}
      />
    </div>
  );
}
