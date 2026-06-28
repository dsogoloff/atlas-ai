// Unit tests for the shared report_narrations upsert mapping. Pure mapping +
// a thin client-call assertion (Supabase client mocked).

import { describe, expect, it, vi } from "vitest";

import type { ReportNarration } from "@/lib/report/types";

import { narrationUpsertPayload, upsertNarration } from "./persist";

const narration: ReportNarration = {
  session_id: "s",
  tenant_id: "t",
  generated_at: "2026-01-01T00:00:00.000Z",
  model: "claude-sonnet-4-6",
  status: "ok",
  placement_line: "p",
  strand_lede: "l",
  key_findings: { strengths: ["a"], growth_areas: ["b"] },
  recommendations_lede: "r",
};

describe("narrationUpsertPayload", () => {
  it("maps narration prose/findings onto the nullable DB columns", () => {
    expect(narrationUpsertPayload(narration)).toEqual({
      session_id: "s",
      tenant_id: "t",
      generated_at: "2026-01-01T00:00:00.000Z",
      model: "claude-sonnet-4-6",
      status: "ok",
      placement_line: "p",
      strand_lede: "l",
      findings_strengths: ["a"],
      findings_growth_areas: ["b"],
      recommendations_lede: "r",
    });
  });

  it("nulls findings + prose columns when those fields are absent", () => {
    const payload = narrationUpsertPayload({
      session_id: "s",
      tenant_id: "t",
      generated_at: "2026-01-01T00:00:00.000Z",
      model: "m",
      status: "failed",
    });
    expect(payload.placement_line).toBeNull();
    expect(payload.strand_lede).toBeNull();
    expect(payload.findings_strengths).toBeNull();
    expect(payload.findings_growth_areas).toBeNull();
    expect(payload.recommendations_lede).toBeNull();
  });
});

describe("upsertNarration", () => {
  it("upserts the payload on the session_id conflict target", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    const client = { from } as unknown as Parameters<typeof upsertNarration>[0];

    await upsertNarration(client, narration);

    expect(from).toHaveBeenCalledWith("report_narrations");
    expect(upsert).toHaveBeenCalledWith(narrationUpsertPayload(narration), {
      onConflict: "session_id",
    });
  });
});
