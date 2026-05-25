/**
 * Atlas Assessment Report — "Aiden, Grade 3" narration golden fixture
 *
 * Sibling to `aiden-grade-3.ts` (the ReportContent fixture). Joins by
 * session_id, which is identical across both files. Status `ok`; all four
 * prose fields populated with realistic, warm, parent-readable placeholder
 * copy.
 *
 * The fixture demonstrates the joined-but-separate shape: the report
 * renderer reads ReportContent for data and overlays ReportNarration's
 * optional prose per surface. A missing or partial narration degrades each
 * surface to data-only — no special handling required.
 *
 * Spec reference: report-system-spec §7 (planned narration layer).
 */

import type { ReportNarration } from "@/lib/report/types";

export const aidenGrade3Narration: ReportNarration = {
  session_id: "00000000-0000-4000-8000-00000a1de003",
  tenant_id: "00000000-0000-4000-8000-0000000a71a5",
  generated_at: "2026-05-19T15:45:00.000Z",
  model: "claude-sonnet-4-6",
  status: "ok",

  placement_line:
    "Aiden's responses point to a clean fit at S.A.M. Level 3 — confident " +
    "with whole-number work and ready to build on what's already in place.",

  strand_lede:
    "Here's how Aiden's responses spread across the five mathematics strands " +
    "the assessment covered, alongside the expected proficiency range for " +
    "his grade band.",

  misconceptions_lede:
    "Two specific patterns came up across Aiden's responses. These aren't " +
    "deficits — they're the most useful signals for where to focus next.",

  recommendations_lede:
    "A short, ordered plan built around Aiden's placement and the two " +
    "patterns above. Start at the top and work down.",
};
