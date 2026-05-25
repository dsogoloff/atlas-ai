// Smoke tests for assembleReportContent. Pure derivation helpers
// (computeStrandMastery, aggregateMisconceptions, pickNearestRecommendation)
// have their own dedicated tests — this file covers the wiring: are the
// queries called against the right clients, and does the assembled
// ReportContent carry every required field?

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { assembleReportContent, type AssembleSession } from "./assemble";

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
    expect(content.placement.sam_level).toBe("S.A.M. Level 3A");
    expect(content.placement.tier).toBe("K_4");
    expect(content.time_flag).toBe("normal");
    expect(content.strand_mastery).toEqual([]);
    expect(content.misconceptions).toEqual([]);
    expect(content.recommendations).toEqual([]);

    expect(new Date(content.generated_at).toISOString()).toBe(
      content.generated_at,
    );
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
