// Smoke tests for assembleReportContent. Pure derivation helpers
// (computeStrandMastery, aggregateMisconceptions, pickNearestRecommendation)
// have their own dedicated tests — this file covers the wiring: are the
// queries called against the right clients, and does the assembled
// ReportContent carry every required field?

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import {
  assembleReportContent,
  samLevelLabel,
  type AssembleSession,
} from "./assemble";

// Minimal fake. Each table's .from() returns a thenable that resolves to
// canned rows. select/eq/in are chainable no-ops that ultimately resolve
// to the canned data when awaited. assembleReportContent only does:
// .select(...).eq(...) and .select(...).in(...), never .maybeSingle(),
// so we only need to support those two terminal shapes.
function makeFakeClient(
  responsesByTable: Record<string, unknown[]>,
): SupabaseClient<Database> {
  const fake = {
    from(table: string) {
      const rows = responsesByTable[table] ?? [];
      const builder: Record<string, unknown> = {};
      const terminal = {
        then(
          resolve: (v: { data: unknown[]; error: null }) => void,
        ): void {
          resolve({ data: rows, error: null });
        },
      };
      builder.select = () => builder;
      builder.eq = () => terminal;
      builder.in = () => terminal;
      return builder;
    },
  };
  return fake as unknown as SupabaseClient<Database>;
}

// isPlacementEstimateJson requires confidence as a number (not the string
// "medium" the spec uses for display). 0.6 is a reasonable middle value.
const VALID_PLACEMENT_JSON = {
  overall_level: "3A",
  strand_levels: {
    number_sense: "3A",
    operations_algorithms: "3A",
    fractions_decimals: "3A",
    measurement: "3A",
    geometry: "3A",
    data_statistics: "3A",
  },
  confidence: 0.6,
};

const SESSION: AssembleSession = {
  id: "00000000-0000-4000-8000-00000a1de003",
  tenant_id: "00000000-0000-4000-8000-0000000a71a5",
  started_at: "2026-05-19T15:30:00.000Z",
  completed_at: "2026-05-19T15:44:00.000Z",
  current_estimate: VALID_PLACEMENT_JSON as never,
  session_time_flag: "normal",
  test_type: "short",
};

const CHILD = {
  name: "Aiden Park",
  birth_year: 2017,
  grade_level: "3",
};

// Three l3 sub-strands for testing — a subset of the 7 the spec lists
// for l3, enough to exercise the applicable-strand filter without
// reproducing the whole taxonomy table in tests.
const L3_TAX_SUB_STRANDS = [
  {
    id: "ss-whole-numbers",
    code: "whole_numbers",
    applies_to_level_codes: ["l1", "l2", "l3", "l4"],
    display_order: 1,
  },
  {
    id: "ss-fractions",
    code: "fractions",
    applies_to_level_codes: ["l2", "l3", "l4"],
    display_order: 2,
  },
  {
    id: "ss-geometry",
    code: "geometry",
    applies_to_level_codes: ["l0a", "l1", "l2", "l3"],
    display_order: 10,
  },
];

describe("assembleReportContent", () => {
  it("returns a ReportContent with every required envelope field populated", async () => {
    // No responses, no taxonomy populated → strand_mastery comes back
    // empty (no applicable sub-strands). Phase 8 drops the "always 6"
    // guarantee — variable length now.
    const readClient = makeFakeClient({
      responses: [],
      tax_sub_strands: [],
      tax_content: [],
      misconceptions: [],
      curriculum_recommendations: [],
    });
    const serviceClient = makeFakeClient({ questions: [] });

    const content = await assembleReportContent({
      readClient,
      serviceClient,
      session: SESSION,
      child: CHILD,
    });

    expect(content.session_id).toBe(SESSION.id);
    expect(content.tenant_id).toBe(SESSION.tenant_id);
    expect(content.child.display_name).toBe("Aiden Park");
    expect(content.child.grade_label).toBe("3rd Grade");
    expect(content.metadata.report_id).toBe(SESSION.id);
    expect(content.metadata.duration_display).toBe("14 minutes");
    // Booklet display — never the half-grade code (3A). Grade 3 → S.A.M Level 3.
    expect(content.placement.sam_level).toBe("S.A.M Level 3");
    expect(content.placement.tier).toBe("K_4");
    expect(content.time_flag).toBe("normal");
    expect(content.strand_mastery).toEqual([]);
    expect(content.misconceptions).toEqual([]);
    expect(content.recommendations).toEqual([]);
    // SHORT session → readiness summary present (wiring lock); no responses
    // means 0% → not a clean pass, but a summary is still returned (drives the
    // comprehensive CTA). currentLevelLabel is the S.A.M booklet level (grade 3
    // → "3"), never a school grade.
    expect(content.readiness).toEqual({
      ready: false,
      currentLevelLabel: "3",
    });

    expect(new Date(content.generated_at).toISOString()).toBe(
      content.generated_at,
    );
  });

  it("reports the ACTUAL number of questions served (adaptive — not a fixed total)", async () => {
    const readClient = makeFakeClient({
      responses: [
        { question_id: "q1", is_correct: true, detected_misconceptions: [], time_flag: "NORMAL" },
        { question_id: "q2", is_correct: false, detected_misconceptions: [], time_flag: "NORMAL" },
        { question_id: "q3", is_correct: true, detected_misconceptions: [], time_flag: "NORMAL" },
      ],
      tax_sub_strands: [],
      tax_content: [],
      misconceptions: [],
      curriculum_recommendations: [],
    });
    const serviceClient = makeFakeClient({
      questions: [
        { id: "q1", content_id: null },
        { id: "q2", content_id: null },
        { id: "q3", content_id: null },
      ],
    });

    const content = await assembleReportContent({
      readClient,
      serviceClient,
      session: SESSION,
      child: CHILD,
    });

    expect(content.metadata.questions_served).toBe(3);
  });

  it("produces strand_mastery rows for the sub-strands applicable at the child's level", async () => {
    // With the level mapping 3A → l3 and three sub-strands whose
    // applies_to_level_codes contains 'l3', strand_mastery has 3 rows
    // in display_order (whole_numbers, fractions, geometry). All
    // no_data since responses is empty.
    const readClient = makeFakeClient({
      responses: [],
      tax_sub_strands: L3_TAX_SUB_STRANDS,
      tax_content: [],
      misconceptions: [],
      curriculum_recommendations: [],
    });
    const serviceClient = makeFakeClient({ questions: [] });

    const content = await assembleReportContent({
      readClient,
      serviceClient,
      session: SESSION,
      child: CHILD,
    });

    expect(content.strand_mastery).toHaveLength(3);
    expect(content.strand_mastery.map((r) => r.strand)).toEqual([
      "whole_numbers",
      "fractions",
      "geometry",
    ]);
    for (const r of content.strand_mastery) {
      expect(r.band).toBe("no_data");
    }
  });

  it("aggregates EVERY assessed sub-strand, even ones not applicable at the measured level", async () => {
    // Regression: the short test samples the PREVIOUS booklet, so a child can
    // be served (and scored on) a sub-strand that isn't in applies_to_level
    // for their MEASURED level. Here the child measured at 4A → l4; the
    // session served one whole_numbers item (applicable at l4) AND one
    // measurement item (L3-only — NOT applicable at l4). The measurement
    // response must NOT be silently dropped: both strands aggregate, with the
    // measured strand carrying its real data.
    const subStrands = [
      {
        id: "ss-whole-numbers",
        code: "whole_numbers",
        applies_to_level_codes: ["l1", "l2", "l3", "l4"],
        display_order: 1,
      },
      {
        id: "ss-measurement",
        code: "measurement",
        applies_to_level_codes: ["l1", "l2", "l3"], // applies at L3, NOT L4
        display_order: 9,
      },
    ];
    const readClient = makeFakeClient({
      responses: [
        {
          question_id: "q-wn",
          is_correct: true,
          detected_misconceptions: [],
          time_flag: "NORMAL",
        },
        {
          question_id: "q-meas",
          is_correct: false,
          detected_misconceptions: [],
          time_flag: "TOO_FAST",
        },
      ],
      tax_sub_strands: subStrands,
      tax_content: [
        { id: "c-wn", sub_strand_id: "ss-whole-numbers", name: "Multiplication" },
        { id: "c-meas", sub_strand_id: "ss-measurement", name: "Length" },
      ],
      misconceptions: [],
      curriculum_recommendations: [],
    });
    const serviceClient = makeFakeClient({
      questions: [
        { id: "q-wn", content_id: "c-wn" },
        { id: "q-meas", content_id: "c-meas" },
      ],
    });

    const content = await assembleReportContent({
      readClient,
      serviceClient,
      session: {
        ...SESSION,
        current_estimate: {
          ...VALID_PLACEMENT_JSON,
          overall_level: "4A",
        } as never,
      },
      child: { ...CHILD, grade_level: "4" },
    });

    const byStrand = new Map(
      content.strand_mastery.map((r) => [r.strand, r]),
    );
    // Measurement was assessed but is NOT applicable at l4 — it must still
    // appear (the bug dropped it entirely).
    expect(byStrand.has("measurement")).toBe(true);
    expect(byStrand.get("measurement")).toMatchObject({ total: 1, correct: 0 });
    // Whole numbers carries its real data.
    expect(byStrand.get("whole_numbers")).toMatchObject({
      total: 1,
      correct: 1,
    });
    // Ordered by display_order (whole_numbers=1 before measurement=9).
    const idxWn = content.strand_mastery.findIndex(
      (r) => r.strand === "whole_numbers",
    );
    const idxMeas = content.strand_mastery.findIndex(
      (r) => r.strand === "measurement",
    );
    expect(idxWn).toBeLessThan(idxMeas);

    // growth_signals (areas-to-confirm enrichment) carry per-sub-strand
    // evidence: served/correct, the missed skill label, and pace.
    const signals = new Map(
      (content.growth_signals ?? []).map((g) => [g.strand, g]),
    );
    expect(signals.get("measurement")).toMatchObject({
      served: 1,
      correct: 0,
      missed_skills: ["Length"],
      pace: "fast",
    });
    expect(signals.get("whole_numbers")).toMatchObject({
      served: 1,
      correct: 1,
      missed_skills: [],
    });
  });

  it("defaults session_time_flag null to 'normal'", async () => {
    const readClient = makeFakeClient({
      responses: [],
      tax_sub_strands: [],
      tax_content: [],
      misconceptions: [],
      curriculum_recommendations: [],
    });
    const serviceClient = makeFakeClient({ questions: [] });

    const content = await assembleReportContent({
      readClient,
      serviceClient,
      session: { ...SESSION, session_time_flag: null },
      child: CHILD,
    });

    expect(content.time_flag).toBe("normal");
  });

  it("throws AssembleError when current_estimate fails the placement guard", async () => {
    const readClient = makeFakeClient({});
    const serviceClient = makeFakeClient({});

    await expect(
      assembleReportContent({
        readClient,
        serviceClient,
        session: { ...SESSION, current_estimate: { garbage: true } as never },
        child: CHILD,
      }),
    ).rejects.toThrow(/PlacementEstimate/);
  });
});

describe("samLevelLabel — S.A.M booklet naming (no school grade, no half-grade code)", () => {
  it("renders the booklet level, never the half-grade code", () => {
    expect(samLevelLabel("3A")).toBe("S.A.M Level 3");
    expect(samLevelLabel("3B")).toBe("S.A.M Level 3");
    expect(samLevelLabel("0A")).toBe("S.A.M Level 0A");
    expect(samLevelLabel("0C")).toBe("S.A.M Level 0C");
    // 7/8 shown as-is (D2)
    expect(samLevelLabel("7A")).toBe("S.A.M Level 7");
    expect(samLevelLabel("8B")).toBe("S.A.M Level 8");
  });

  it("the 'no level K / Kindergarten' symptom is gone — KA/KB → S.A.M Level 0C", () => {
    expect(samLevelLabel("KA")).toBe("S.A.M Level 0C");
    expect(samLevelLabel("KB")).toBe("S.A.M Level 0C");
    expect(samLevelLabel("KA")).not.toContain("Kindergarten");
    expect(samLevelLabel("KA")).not.toContain("KA");
  });

  it("uses no trailing dot (matches the locked narration prompt) (D4)", () => {
    expect(samLevelLabel("3A").startsWith("S.A.M Level")).toBe(true);
    expect(samLevelLabel("3A")).not.toContain("S.A.M. Level");
  });
});
