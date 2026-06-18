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

  it("resolves to status:'failed' with prose absent when Sonnet returns shape-invalid JSON", async () => {
    // Well-formed JSON but missing a required field — exercises the
    // Piece 3 validation gate. The brief: validation failure must NOT throw;
    // it resolves to a status:'failed' ReportNarration so the report
    // renderer falls back to data-only across all four surfaces.
    const malformed = {
      placement_line: "Has placement.",
      strand_lede: "Has strand lede.",
      key_findings: {
        strengths: ["Strength."],
        growth_areas: ["Growth."],
      },
      // recommendations_lede missing
    };
    mockCallSonnet.mockResolvedValue({
      text: JSON.stringify(malformed),
      model: "claude-sonnet-4-6",
      tokens: { input: 100, output: 50 },
      elapsedMs: 1234,
    });

    const result = await generateReportNarration(aidenGrade3Report);

    expect(result.status).toBe("failed");
    expect(result.session_id).toBe(aidenGrade3Report.session_id);
    expect(result.tenant_id).toBe(aidenGrade3Report.tenant_id);
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.placement_line).toBeUndefined();
    expect(result.strand_lede).toBeUndefined();
    expect(result.key_findings).toBeUndefined();
    expect(result.recommendations_lede).toBeUndefined();
    // generated_at is still stamped on failed rows so the failure has audit.
    expect(new Date(result.generated_at).toISOString()).toBe(
      result.generated_at,
    );
  });
});
