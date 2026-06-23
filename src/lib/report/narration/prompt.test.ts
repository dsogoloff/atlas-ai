import { describe, expect, it } from "vitest";

import type { ReportContent } from "@/lib/report/types";

import { buildNarrationPrompt } from "./prompt";

const BASE: ReportContent = {
  session_id: "s1",
  tenant_id: "t1",
  generated_at: "2026-06-23T00:00:00.000Z",
  child: { display_name: "Aiden Park", grade_label: "4th Grade" },
  metadata: {
    assessed_date_display: "June 23, 2026",
    duration_display: "3 minutes",
    report_id: "A-1",
  },
  time_flag: "normal",
  placement: { sam_level: "S.A.M Level 4", overall_percentage: 70, tier: "K_4" },
  strand_mastery: [
    { strand: "whole_numbers", correct: 6, total: 8, percentage: 75, band: "mastery" },
    { strand: "measurement", correct: 1, total: 3, percentage: 33, band: "area_of_focus" },
  ],
  misconceptions: [],
  recommendations: [],
  readiness: { ready: true, currentLevelLabel: "4" },
};

describe("buildNarrationPrompt — areas-to-confirm enrichment", () => {
  it("emits a SUPPORTING DETAIL block naming the specific missed skills, counts, and pace", () => {
    const { prompt } = buildNarrationPrompt({
      ...BASE,
      growth_signals: [
        {
          strand: "measurement",
          served: 3,
          correct: 1,
          missed_skills: ["Length", "Mass"],
          misconceptions: [],
          pace: "fast",
        },
      ],
    });
    expect(prompt).toContain("AREAS TO CONFIRM — SUPPORTING DETAIL");
    expect(prompt).toContain(
      "Measurement: 1 of 3 correct; skills missed: Length, Mass",
    );
    expect(prompt).toContain("pace: answers came in quickly");
  });

  it("uses the human sub-strand label, never the slug", () => {
    const { prompt } = buildNarrationPrompt({
      ...BASE,
      growth_signals: [
        {
          strand: "data_representation",
          served: 1,
          correct: 0,
          missed_skills: ["Picture Graphs"],
          misconceptions: [],
          pace: "typical",
        },
      ],
    });
    expect(prompt).toContain("Data Representation and Interpretation:");
    expect(prompt).not.toMatch(/\bdata_representation\b/);
  });

  it("falls back to 'none available' when no growth_signals are present", () => {
    const { prompt } = buildNarrationPrompt(BASE);
    expect(prompt).toContain("AREAS TO CONFIRM — SUPPORTING DETAIL");
    expect(prompt).toContain("none available");
  });

  it("ignores signals with zero served items", () => {
    const { prompt } = buildNarrationPrompt({
      ...BASE,
      growth_signals: [
        {
          strand: "fractions",
          served: 0,
          correct: 0,
          missed_skills: [],
          misconceptions: [],
          pace: "typical",
        },
      ],
    });
    expect(prompt).toContain("none available");
  });

  it("system prompt carries the enriched, evidence-scaled, hedged growth-area rules", () => {
    const { system } = buildNarrationPrompt(BASE);
    expect(system).toContain("worth confirming with your instructor");
    expect(system).toContain("SCALE specificity to the evidence");
    // The narrow descriptive/prescriptive exception is documented.
    expect(system).toContain("NARROW EXCEPTION");
    // Hard hedge rule still present.
    expect(system).toContain("NEVER assert a deficiency as fact");
  });
});
