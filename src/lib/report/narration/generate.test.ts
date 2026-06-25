// Unit tests for the report narration prompt builder + generator.
//
// prompt.ts is pure (no LLM, no DB) — tested directly. The brief calls out
// three asserts: voice constraints in the system message, child name in the
// prompt body, and the empty-vs-nonempty misconception branch.
//
// generate.ts is tested with callSonnet mocked. The brief: feed the Aiden
// Grade 3 ReportContent golden fixture, hand the mocked call a canned valid
// JSON response containing all four prose fields, and assert the assembled
// ReportNarration is well-formed (session_id and tenant_id copied from the
// input fixture, generated_at a valid ISO8601 string, model set, status
// 'ok', all four prose fields present).

// vi.mock is hoisted; declare before importing the unit under test.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./llmClient", () => ({
  callSonnet: vi.fn(),
}));

import { aidenGrade3Report } from "@/lib/report/golden/aiden-grade-3";
import type { ReportContent } from "@/lib/report/types";

import { generateReportNarration } from "./generate";
import { callSonnet } from "./llmClient";
import { buildNarrationPrompt } from "./prompt";

const mockCallSonnet = vi.mocked(callSonnet);

beforeEach(() => {
  mockCallSonnet.mockReset();
});

describe("buildNarrationPrompt", () => {
  it("stamps the JSON-only + voice constraints into the system message", () => {
    const { system } = buildNarrationPrompt(aidenGrade3Report);

    // Output contract.
    expect(system).toMatch(/JSON only/i);
    expect(system).toContain("placement_line");
    expect(system).toContain("strand_lede");
    expect(system).toContain("key_findings");
    expect(system).toContain("recommendations_lede");

    // Voice hard rules — load-bearing. If any of these disappear from the
    // system message, this test fails so the regression is visible.
    expect(system).toMatch(/NEVER diagnose/);
    expect(system).toMatch(/Flesch-Kincaid/);
    expect(system).toMatch(/never quote/i);
    expect(system).toMatch(/patterns observed in THIS assessment/);
  });

  it("passes only the child's FIRST NAME, and NO school grade (S.A.M-level naming)", () => {
    // Data-minimization (Lane 3): the surname must never reach the model. The
    // golden fixture's display_name is "Aiden Park"; the prompt body must
    // carry "Aiden" and must NOT carry "Aiden Park" or the surname "Park".
    const { prompt } = buildNarrationPrompt(aidenGrade3Report);
    expect(prompt).toContain("Aiden");
    expect(prompt).not.toContain("Aiden Park");
    expect(prompt).not.toMatch(/\bPark\b/);
    // School grade is no longer fed to the narration (founder decision
    // 2026-06-18) — the model receives S.A.M-level framing only.
    expect(prompt).not.toContain("Grade");
  });

  it("uses the single-name display name as-is and trims surrounding whitespace", () => {
    const mononym: ReportContent = {
      ...aidenGrade3Report,
      child: { ...aidenGrade3Report.child, display_name: "Maya" },
    };
    expect(buildNarrationPrompt(mononym).prompt).toContain("Display name: Maya\n");

    const padded: ReportContent = {
      ...aidenGrade3Report,
      child: { ...aidenGrade3Report.child, display_name: "  Maya   Tan  " },
    };
    const { prompt } = buildNarrationPrompt(padded);
    expect(prompt).toContain("Display name: Maya\n");
    expect(prompt).not.toContain("Tan");
  });

  it("takes the non-empty branch when misconceptions are present", () => {
    // Sanity: the Aiden fixture has misconceptions — guards against a fixture
    // edit silently turning this test green via the wrong branch.
    expect(aidenGrade3Report.misconceptions.length).toBeGreaterThan(0);

    const { prompt } = buildNarrationPrompt(aidenGrade3Report);
    expect(prompt).toContain(aidenGrade3Report.misconceptions[0].label);
    expect(prompt).not.toContain("none detected");
  });

  it("takes the fallback branch when misconceptions are empty", () => {
    // Block 2 restructure: empty-misconceptions branch now instructs the
    // model to fall back to lowest-percentage sub-strands for growth_areas
    // (rather than the old positive-signal sentence framing). Test guards
    // that the new fallback instruction is in the prompt body.
    const emptyMcContent: ReportContent = {
      ...aidenGrade3Report,
      misconceptions: [],
    };
    const { prompt } = buildNarrationPrompt(emptyMcContent);

    expect(prompt).toContain("none detected");
    expect(prompt).toMatch(/fall back to lowest-percentage sub-strands/i);
  });
});

describe("generateReportNarration", () => {
  it("assembles a well-formed ReportNarration from a canned Sonnet response", async () => {
    const canned = {
      placement_line: "Canned placement.",
      strand_lede: "Canned strand lede.",
      key_findings: {
        strengths: ["Strength one.", "Strength two."],
        growth_areas: ["Growth one.", "Growth two."],
      },
      recommendations_lede: "Canned recommendations lede.",
    };
    mockCallSonnet.mockResolvedValue({
      text: JSON.stringify(canned),
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 50 },
      elapsedMs: 1234,
    });

    const result = await generateReportNarration(aidenGrade3Report);

    expect(result.session_id).toBe(aidenGrade3Report.session_id);
    expect(result.tenant_id).toBe(aidenGrade3Report.tenant_id);
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.status).toBe("ok");
    expect(result.placement_line).toBe(canned.placement_line);
    expect(result.strand_lede).toBe(canned.strand_lede);
    expect(result.key_findings).toEqual(canned.key_findings);
    expect(result.recommendations_lede).toBe(canned.recommendations_lede);

    // Valid ISO8601 — cheapest robust check is a Date round-trip.
    expect(new Date(result.generated_at).toISOString()).toBe(
      result.generated_at,
    );
  });

  it("suppresses strand_lede and strengths when there is no measured strand data (anti-fabrication guard)", async () => {
    // Thin / no-data session: every applicable sub-strand has total === 0
    // (band 'no_data'). The voice-locked prompt still demands strand_lede name
    // specific sub-strands, so a model can only fabricate them here. The guard
    // (BUSINESS_RULES "Claims & language" / §2.4) must strip the
    // data-dependent fields deterministically, regardless of what the model
    // returned — strand_lede absent, strengths empty — while keeping
    // placement_line, recommendations_lede, and (misconception-derived)
    // growth_areas.
    const noStrandData: ReportContent = {
      ...aidenGrade3Report,
      strand_mastery: aidenGrade3Report.strand_mastery.map((s) => ({
        ...s,
        correct: 0,
        total: 0,
        percentage: 0,
        band: "no_data" as const,
      })),
    };

    // Canned response simulates a model that DID fabricate strand prose.
    const cannedWithFabrication = {
      placement_line: "Canned placement.",
      strand_lede: "Strong in Fractions; focus on Geometry.", // fabricated
      key_findings: {
        strengths: ["Fractions: confident.", "Whole Numbers: solid."], // fabricated
        growth_areas: ["Carrying error: regrouping slips."], // misconception-derived
      },
      recommendations_lede: "Canned recommendations lede.",
    };
    mockCallSonnet.mockResolvedValue({
      text: JSON.stringify(cannedWithFabrication),
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 50 },
      elapsedMs: 1234,
    });

    const result = await generateReportNarration(noStrandData);

    expect(result.status).toBe("ok");
    expect(result.strand_lede).toBeUndefined();
    expect(result.key_findings?.strengths).toEqual([]);
    // growth_areas (misconception patterns, not strand claims) are preserved.
    expect(result.key_findings?.growth_areas).toEqual(
      cannedWithFabrication.key_findings.growth_areas,
    );
    // Non-strand prose is untouched.
    expect(result.placement_line).toBe(cannedWithFabrication.placement_line);
    expect(result.recommendations_lede).toBe(
      cannedWithFabrication.recommendations_lede,
    );
  });

  // Regression for the blank low-level narrative (#160 follow-up). A populated
  // young-band session (0A/0B/L1/L2) assembles real strand_mastery via #160's
  // engine-strand fallback — Whole Numbers / Geometry assessed, the rest not.
  // Because at least one sub-strand has total > 0, the anti-fabrication guard
  // must NOT suppress: the narrative generates strand_lede + strengths the same
  // way it does for working levels (0C/L3-L6), not the generic data-only
  // fallback. (This proves the narration INPUT honours the fallback; the live
  // blank-narrative symptom was a stale cached row, healed at report-view.)
  function youngBandFallbackContent(samLevel: string): ReportContent {
    return {
      ...aidenGrade3Report,
      placement: { ...aidenGrade3Report.placement, sam_level: samLevel },
      strand_mastery: [
        { strand: "whole_numbers", correct: 8, total: 10, percentage: 80, band: "mastery" },
        { strand: "geometry", correct: 5, total: 8, percentage: 63, band: "progressing" },
        { strand: "fractions", correct: 0, total: 0, percentage: 0, band: "no_data" },
        { strand: "measurement", correct: 0, total: 0, percentage: 0, band: "no_data" },
        { strand: "data_representation", correct: 0, total: 0, percentage: 0, band: "no_data" },
      ],
    };
  }

  it.each([
    ["S.A.M Level 0A"],
    ["S.A.M Level 1"],
  ])(
    "narrates a populated young-band session (%s) — strand_lede + strengths survive, not the generic fallback",
    async (samLevel) => {
      const canned = {
        placement_line: "A solid start.",
        strand_lede: "Whole Numbers is a clear strength so far.",
        key_findings: {
          strengths: ["Whole Numbers: confident and accurate."],
          growth_areas: ["Geometry: a few shape questions to revisit."],
        },
        recommendations_lede: "Here's where to go next.",
      };
      mockCallSonnet.mockResolvedValue({
        text: JSON.stringify(canned),
        model: "claude-sonnet-4-6",
        tokens: { input: 100, output: 50 },
        elapsedMs: 1234,
      });

      const result = await generateReportNarration(
        youngBandFallbackContent(samLevel),
      );

      expect(result.status).toBe("ok");
      // Strand prose is NOT suppressed — the guard sees total > 0.
      expect(result.strand_lede).toBe(canned.strand_lede);
      expect(result.key_findings?.strengths.length).toBeGreaterThan(0);
      // At least one strength OR area present (non-empty "What We Noticed").
      expect(
        (result.key_findings?.strengths.length ?? 0) +
          (result.key_findings?.growth_areas.length ?? 0),
      ).toBeGreaterThan(0);
    },
  );

  it("SALVAGES the valid fields when one field is invalid (no longer all-or-nothing)", async () => {
    // Regression guard for "report renders with NO narrative". One missing
    // field (recommendations_lede) used to discard the ENTIRE narration; now
    // the other three surfaces survive and only the bad field is dropped.
    const partial = {
      placement_line: "Has placement.",
      strand_lede: "Has strand lede.",
      key_findings: {
        strengths: ["Strength."],
        growth_areas: ["Growth."],
      },
      // recommendations_lede missing
    };
    mockCallSonnet.mockResolvedValue({
      text: JSON.stringify(partial),
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 50 },
      elapsedMs: 1234,
    });

    const result = await generateReportNarration(aidenGrade3Report);

    expect(result.status).toBe("ok");
    expect(result.placement_line).toBe("Has placement.");
    expect(result.strand_lede).toBe("Has strand lede.");
    expect(result.key_findings?.growth_areas).toEqual(["Growth."]);
    // Only the invalid field is dropped.
    expect(result.recommendations_lede).toBeUndefined();
  });

  it("clamps an over-count / over-long findings list and keeps the rest of the narrative", async () => {
    // The #151 enrichment made growth_areas richer; a model that returns a 4th
    // item or one over-length item must NOT erase the whole narrative. The
    // list is clamped to the first 3 valid items; empty / over-long items are
    // dropped; every other field survives.
    const overproduced = {
      placement_line: "Has placement.",
      strand_lede: "Has strand lede.",
      key_findings: {
        strengths: ["S1.", "  ", "S3."], // blank middle item dropped
        growth_areas: ["G1.", "G2.", "G3.", "G4.", "x".repeat(700)], // >3 + over-long
      },
      recommendations_lede: "Has recs.",
    };
    mockCallSonnet.mockResolvedValue({
      text: JSON.stringify(overproduced),
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 50 },
      elapsedMs: 1234,
    });

    const result = await generateReportNarration(aidenGrade3Report);

    expect(result.status).toBe("ok");
    expect(result.placement_line).toBe("Has placement.");
    expect(result.recommendations_lede).toBe("Has recs.");
    expect(result.key_findings?.strengths).toEqual(["S1.", "S3."]);
    expect(result.key_findings?.growth_areas).toEqual(["G1.", "G2.", "G3."]);
    expect(result.key_findings?.growth_areas.length).toBeLessThanOrEqual(3);
  });

  it("resolves to status:'failed' only when NOTHING is salvageable", async () => {
    // Output that isn't even a JSON object → no fields to keep → status
    // 'failed', prose absent, audit row still stamped.
    mockCallSonnet.mockResolvedValue({
      text: JSON.stringify("not an object"),
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 50 },
      elapsedMs: 1234,
    });

    const result = await generateReportNarration(aidenGrade3Report);

    expect(result.status).toBe("failed");
    expect(result.placement_line).toBeUndefined();
    expect(result.key_findings).toBeUndefined();
    expect(new Date(result.generated_at).toISOString()).toBe(
      result.generated_at,
    );
  });

  it("resolves to status:'failed' when the model output is not valid JSON", async () => {
    mockCallSonnet.mockResolvedValue({
      text: "Sorry, I can't help with that.",
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 50 },
      elapsedMs: 1234,
    });

    const result = await generateReportNarration(aidenGrade3Report);
    expect(result.status).toBe("failed");
  });
});
