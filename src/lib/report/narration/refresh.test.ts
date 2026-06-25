// Unit tests for the low-level narration self-heal predicates. Pure — no DB,
// no LLM. Covers the #160 stale-cache detection: an "ok" cached row that the
// anti-fabrication guard left strand-suppressed, paired with freshly assembled
// content that now (post-#160 fallback) carries strand data.

import { describe, expect, it } from "vitest";

import { aidenGrade3Report } from "@/lib/report/golden/aiden-grade-3";
import type { ReportContent } from "@/lib/report/types";

import type { ReportNarrationRow } from "./resolve";
import {
  contentHasStrandData,
  narrationRowIsStrandSuppressed,
  narrationToRow,
  shouldRegenerateNarration,
} from "./refresh";

// A row as cached pre-#160 for a young-band session: ok, but the guard
// suppressed strand_lede and emptied strengths. growth_areas + placement +
// recs survive (they aren't strand-mastery claims).
const suppressedRow: ReportNarrationRow = {
  status: "ok",
  placement_line: "You're all set.",
  strand_lede: null,
  findings_strengths: null,
  findings_growth_areas: ["Worth a second look at place value."],
  recommendations_lede: "Keep practising.",
};

// A working-level row: strand prose present.
const fullRow: ReportNarrationRow = {
  status: "ok",
  placement_line: "p",
  strand_lede: "Strong start in Whole Numbers.",
  findings_strengths: ["Whole Numbers: confident."],
  findings_growth_areas: ["g"],
  recommendations_lede: "r",
};

// Young-band content AFTER #160's fallback: Whole Numbers + Geometry assessed,
// the rest not assessed (mirrors the founder's 0A report).
const youngBandContent: ReportContent = {
  ...aidenGrade3Report,
  strand_mastery: [
    { strand: "whole_numbers", correct: 8, total: 10, percentage: 80, band: "mastery" },
    { strand: "geometry", correct: 5, total: 8, percentage: 63, band: "progressing" },
    { strand: "fractions", correct: 0, total: 0, percentage: 0, band: "no_data" },
  ],
};

// Genuinely thin session: every sub-strand no_data, even after fallback.
const thinContent: ReportContent = {
  ...aidenGrade3Report,
  strand_mastery: aidenGrade3Report.strand_mastery.map((s) => ({
    ...s,
    correct: 0,
    total: 0,
    percentage: 0,
    band: "no_data" as const,
  })),
};

describe("contentHasStrandData", () => {
  it("true when any sub-strand has measured responses (total > 0)", () => {
    expect(contentHasStrandData(youngBandContent)).toBe(true);
  });

  it("false when every sub-strand is no_data (total === 0)", () => {
    expect(contentHasStrandData(thinContent)).toBe(false);
  });
});

describe("narrationRowIsStrandSuppressed", () => {
  it("true for an ok row with no strand_lede and no/empty strengths", () => {
    expect(narrationRowIsStrandSuppressed(suppressedRow)).toBe(true);
    expect(
      narrationRowIsStrandSuppressed({ ...suppressedRow, findings_strengths: [] }),
    ).toBe(true);
  });

  it("false when strand_lede is present", () => {
    expect(narrationRowIsStrandSuppressed(fullRow)).toBe(false);
  });

  it("false when strengths are present", () => {
    expect(
      narrationRowIsStrandSuppressed({
        ...suppressedRow,
        findings_strengths: ["Whole Numbers: confident."],
      }),
    ).toBe(false);
  });

  it("false for a null row or a non-ok row", () => {
    expect(narrationRowIsStrandSuppressed(null)).toBe(false);
    expect(
      narrationRowIsStrandSuppressed({ ...suppressedRow, status: "failed" }),
    ).toBe(false);
  });
});

describe("shouldRegenerateNarration", () => {
  it("true: suppressed cached row + content now has strand data (the #160 stale case)", () => {
    expect(shouldRegenerateNarration(suppressedRow, youngBandContent)).toBe(true);
  });

  it("false: working level — cached row already carries strand prose", () => {
    expect(shouldRegenerateNarration(fullRow, youngBandContent)).toBe(false);
  });

  it("false: genuinely thin session — no strand data to narrate", () => {
    expect(shouldRegenerateNarration(suppressedRow, thinContent)).toBe(false);
  });

  it("false: no cached narration row", () => {
    expect(shouldRegenerateNarration(null, youngBandContent)).toBe(false);
  });
});

describe("narrationToRow", () => {
  it("projects a ReportNarration onto the resolve row shape", () => {
    const row = narrationToRow({
      session_id: "s",
      tenant_id: "t",
      generated_at: "2026-01-01T00:00:00.000Z",
      model: "m",
      status: "ok",
      placement_line: "p",
      strand_lede: "Strong in Whole Numbers.",
      key_findings: { strengths: ["Whole Numbers."], growth_areas: ["g"] },
      recommendations_lede: "r",
    });
    expect(row).toEqual({
      status: "ok",
      placement_line: "p",
      strand_lede: "Strong in Whole Numbers.",
      findings_strengths: ["Whole Numbers."],
      findings_growth_areas: ["g"],
      recommendations_lede: "r",
    });
  });

  it("nulls strand prose when key_findings / strand_lede are absent", () => {
    const row = narrationToRow({
      session_id: "s",
      tenant_id: "t",
      generated_at: "2026-01-01T00:00:00.000Z",
      model: "m",
      status: "ok",
    });
    expect(row.strand_lede).toBeNull();
    expect(row.findings_strengths).toBeNull();
    expect(row.findings_growth_areas).toBeNull();
  });
});
