// Unit tests for resolveNarrationProse. Covers the brief's four cases:
// narration absent (null row), status:'failed', time_flag suppression
// (unreliable + mixed), and the happy path with full prose. Plus
// post-Block-2 specifics: key_findings present requires BOTH array
// columns non-null.

import { describe, expect, it } from "vitest";

import { resolveNarrationProse } from "./resolve";

const VALID_ROW = {
  status: "ok",
  placement_line: "Warm placement line.",
  strand_lede: "Strand intro.",
  findings_strengths: ["Strength one.", "Strength two."],
  findings_growth_areas: ["Growth one.", "Growth two."],
  recommendations_lede: "Short plan.",
};

describe("resolveNarrationProse", () => {
  it("returns prose fields when row is valid and time_flag is normal", () => {
    expect(resolveNarrationProse(VALID_ROW, "normal")).toEqual({
      placement_line: "Warm placement line.",
      strand_lede: "Strand intro.",
      key_findings: {
        strengths: ["Strength one.", "Strength two."],
        growth_areas: ["Growth one.", "Growth two."],
      },
      recommendations_lede: "Short plan.",
    });
  });

  it("returns null when no row exists (narration not yet generated)", () => {
    expect(resolveNarrationProse(null, "normal")).toBeNull();
  });

  it("returns null when row.status !== 'ok' (validation failed downstream)", () => {
    expect(
      resolveNarrationProse({ ...VALID_ROW, status: "failed" }, "normal"),
    ).toBeNull();
  });

  it("suppresses prose on time_flag 'unreliable' even with a valid row (lock R5)", () => {
    expect(resolveNarrationProse(VALID_ROW, "unreliable")).toBeNull();
  });

  it("suppresses prose on time_flag 'mixed' even with a valid row (lock R5)", () => {
    expect(resolveNarrationProse(VALID_ROW, "mixed")).toBeNull();
  });

  it("maps null prose fields to undefined when only some fields are populated", () => {
    expect(
      resolveNarrationProse({ ...VALID_ROW, strand_lede: null }, "normal"),
    ).toEqual({
      placement_line: "Warm placement line.",
      strand_lede: undefined,
      key_findings: {
        strengths: ["Strength one.", "Strength two."],
        growth_areas: ["Growth one.", "Growth two."],
      },
      recommendations_lede: "Short plan.",
    });
  });

  it("key_findings resolves to undefined when either array column is null", () => {
    // Partial / legacy write — neither half is meaningful without the other.
    const noStrengths = {
      ...VALID_ROW,
      findings_strengths: null,
    };
    expect(resolveNarrationProse(noStrengths, "normal")?.key_findings).toBeUndefined();

    const noGrowth = {
      ...VALID_ROW,
      findings_growth_areas: null,
    };
    expect(resolveNarrationProse(noGrowth, "normal")?.key_findings).toBeUndefined();
  });

  it("key_findings preserves empty arrays (thin-bank / quiet-classifier valid case)", () => {
    const empty = {
      ...VALID_ROW,
      findings_strengths: [],
      findings_growth_areas: [],
    };
    expect(resolveNarrationProse(empty, "normal")?.key_findings).toEqual({
      strengths: [],
      growth_areas: [],
    });
  });
});
