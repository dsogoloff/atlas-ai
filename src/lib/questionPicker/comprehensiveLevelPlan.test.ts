import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import type { ShortTestOutcome } from "@/lib/shortTest/outcome";

import {
  loadComprehensiveOutcomeContext,
  planComprehensiveLevel,
  type ComprehensiveOutcomeContext,
} from "./comprehensiveLevelPlan";

// anchorOrdinal 6 == BOOKLET_LEVELS index of "4".
const NEUTRAL: ComprehensiveOutcomeContext = {
  anchorOrdinal: 6,
  passBand: null,
  strandMap: {},
};

describe("planComprehensiveLevel", () => {
  it("maps the chosen offset to a target±1 booklet band + difficulty", () => {
    // clean, empty draw, budget 30 → M (offset 0) has the largest target.
    const plan = planComprehensiveLevel({
      strand: "number_sense",
      ctx: { ...NEUTRAL, passBand: "clean" },
      servedByOffset: new Map(),
      budget: 30,
    });
    expect(plan).not.toBeNull();
    expect(plan!.offset).toBe(0);
    // target booklet 6 ("4") ±1 → booklets 5/6/7 = 3A/3B,4A/4B,5A/5B.
    expect(plan!.levelBand.sort()).toEqual([
      "3A", "3B", "4A", "4B", "5A", "5B",
    ]);
    expect(typeof plan!.targetDifficulty).toBe("number");
  });

  it("targets below-level once M is ahead of its share", () => {
    const plan = planComprehensiveLevel({
      strand: "number_sense",
      ctx: { ...NEUTRAL, passBand: "clean" },
      servedByOffset: new Map([[0, 15]]), // M already met its target (15)
      budget: 30,
    });
    // M-1 (offset -1, target booklet "3") is now the largest deficit; band ±1.
    expect(plan!.offset).toBe(-1);
    expect(plan!.levelBand.sort()).toEqual([
      "2A", "2B", "3A", "3B", "4A", "4B",
    ]);
  });

  it("a struggling strand leans lower than a strong strand at the same state", () => {
    const struggling = planComprehensiveLevel({
      strand: "number_sense",
      ctx: {
        ...NEUTRAL,
        passBand: "clean",
        strandMap: { number_sense: { correct: 0, seen: 4, ratio: 0 } },
      },
      servedByOffset: new Map([[0, 8]]),
      budget: 30,
    });
    const strong = planComprehensiveLevel({
      strand: "number_sense",
      ctx: {
        ...NEUTRAL,
        passBand: "clean",
        strandMap: { number_sense: { correct: 4, seen: 4, ratio: 1 } },
      },
      servedByOffset: new Map([[0, 8]]),
      budget: 30,
    });
    expect(struggling!.offset).toBeLessThanOrEqual(strong!.offset);
  });

  it("never plans an offset off the axis (ceiling clamp at booklet 8)", () => {
    // anchor at the top booklet (ordinal 10 == "8"); +1 is off-axis.
    const plan = planComprehensiveLevel({
      strand: "geometry",
      ctx: { anchorOrdinal: 10, passBand: "clean", strandMap: {} },
      servedByOffset: new Map(),
      budget: 30,
    });
    expect(plan).not.toBeNull();
    expect(plan!.offset).toBeLessThanOrEqual(0);
  });
});

function makeClient(outcome: ShortTestOutcome | null): SupabaseClient<Database> {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.maybeSingle = () =>
    Promise.resolve({
      data: outcome ? { short_test_outcome: outcome } : null,
      error: null,
    });
  return { from: () => chain } as unknown as SupabaseClient<Database>;
}

describe("loadComprehensiveOutcomeContext", () => {
  it("anchors on the MEASURED level + carries pass_band, strand_map, seen ids", async () => {
    const outcome: ShortTestOutcome = {
      measured_level: "3", // booklet "3" → ordinal 5
      intake_level: "5",
      pass_band: "mixed",
      clean_pass_ratio: 0.6,
      strand_map: { number_sense: { correct: 1, seen: 2, ratio: 0.5 } },
      seen_item_ids: ["q1", "q2"],
    };
    const loaded = await loadComprehensiveOutcomeContext({
      serviceClient: makeClient(outcome),
      childId: "child-1",
      gradeAnchorOrdinal: 7, // grade booklet "5" — should be overridden by measured
    });
    expect(loaded.ctx.anchorOrdinal).toBe(5);
    expect(loaded.ctx.passBand).toBe("mixed");
    expect(loaded.ctx.strandMap.number_sense.ratio).toBe(0.5);
    expect(loaded.seenItemIds).toEqual(["q1", "q2"]);
  });

  it("falls back to a neutral grade-anchored context when there's no outcome", async () => {
    const loaded = await loadComprehensiveOutcomeContext({
      serviceClient: makeClient(null),
      childId: "child-1",
      gradeAnchorOrdinal: 7,
    });
    expect(loaded.ctx).toEqual({
      anchorOrdinal: 7,
      passBand: null,
      strandMap: {},
    });
    expect(loaded.seenItemIds).toEqual([]);
  });
});
