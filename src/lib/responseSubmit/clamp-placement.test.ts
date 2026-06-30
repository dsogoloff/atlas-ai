// clampPlacementToServedCeiling — floor a railed placement to the served ceiling.
//
// The engine's placementEstimate rails an all-correct, floor-only run to the
// axis top (8B) because the posterior has no ceiling evidence. This clamp
// (applied at session finalization) bounds the STORED estimate to the highest
// level actually served, so a Pre-K all-correct run places at its floor instead
// of "S.A.M Level 8". A normal multi-level run is unchanged.

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { STRANDS } from "@/lib/engine/levels";
import type { HalfGradeLevel, PlacementEstimate, Strand } from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";

import { clampPlacementToServedCeiling } from "./handler";

// A service client whose questions.level read returns the given served levels.
function clientWithServedLevels(
  levels: (HalfGradeLevel | null)[],
): SupabaseClient<Database> {
  return {
    from: () => ({
      select: () => ({
        in: async () => ({ data: levels.map((level) => ({ level })), error: null }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

function placement(overall: HalfGradeLevel): PlacementEstimate {
  const strandLevels = STRANDS.reduce(
    (acc, s) => {
      acc[s] = overall;
      return acc;
    },
    {} as Record<Strand, HalfGradeLevel>,
  );
  return { overallLevel: overall, strandLevels, confidence: 0.5 };
}

const IDS = ["q1", "q2", "q3"];

describe("clampPlacementToServedCeiling", () => {
  it("floors an all-correct, floor-only run (served 0A, railed to 8B) to 0A", async () => {
    const client = clientWithServedLevels(["0A", "0A", "0A"]);

    const result = await clampPlacementToServedCeiling(client, IDS, placement("8B"));

    expect(result.overallLevel).toBe("0A");
  });

  it("is a no-op for a normal run where the served ceiling >= the estimate", async () => {
    const client = clientWithServedLevels(["2A", "3A", "4A"]);

    const result = await clampPlacementToServedCeiling(client, IDS, placement("3A"));

    expect(result.overallLevel).toBe("3A"); // 4A ceiling >= 3A estimate → unchanged
  });

  it("never RAISES an estimate that is already below the served ceiling", async () => {
    const client = clientWithServedLevels(["5A", "5B"]);

    const result = await clampPlacementToServedCeiling(client, IDS, placement("2A"));

    expect(result.overallLevel).toBe("2A");
  });

  it("returns the placement unchanged when nothing was served", async () => {
    const client = clientWithServedLevels([]);

    const result = await clampPlacementToServedCeiling(client, [], placement("8B"));

    expect(result.overallLevel).toBe("8B");
  });

  it("preserves strandLevels + confidence (only overallLevel is clamped)", async () => {
    const client = clientWithServedLevels(["0A"]);
    const p = placement("8B");

    const result = await clampPlacementToServedCeiling(client, IDS, p);

    expect(result.strandLevels).toBe(p.strandLevels);
    expect(result.confidence).toBe(0.5);
  });
});
