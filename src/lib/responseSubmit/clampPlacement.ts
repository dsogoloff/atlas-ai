// Placement clamp, extracted from handler.ts so it can be imported OUTSIDE a
// Next.js request context — specifically by the one-time re-clamp backfill in
// scripts/backfill/reclamp-railed-placements.ts. handler.ts imports
// `server-only` and `next/server`, both of which blow up in a plain `tsx`
// script; this module has no such imports, so the backfill runs the EXACT same
// clamp the live finalization path runs rather than a re-implementation.
//
// handler.ts re-exports this, so every existing import site (and
// clamp-placement.test.ts) is unchanged.

import type { SupabaseClient } from "@supabase/supabase-js";

import { levelIndex } from "@/lib/engine/levels";
import type { HalfGradeLevel, PlacementEstimate } from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";

/** Bound a placement's overall level to the highest level actually SERVED this
 *  session. An all-correct, floor-only run (e.g. a Pre-K child served only 0A
 *  items, all correct) leaves the average posterior flat-high with no ceiling
 *  evidence, so placementEstimate's argmax rails to the axis top (8B) — placing
 *  the child at "S.A.M Level 8". A child can't be placed above the hardest level
 *  they were actually shown, so we clamp the placement to the served ceiling AT
 *  THE SOURCE (finalization), so the STORED estimate — and every surface that
 *  reads it: the report, the admin roster's placement column, and the
 *  placement_created analytics event — is floored consistently. Mirrors the
 *  report's display-time clampLevelToServedCeiling (assemble.ts); applying it
 *  here makes that a defensive no-op. No-op for a normal multi-level run where
 *  the served ceiling already meets or exceeds the estimate. Reads questions.level
 *  (classification metadata, not licensed content) via the service client. */
export async function clampPlacementToServedCeiling(
  serviceClient: SupabaseClient<Database>,
  servedQuestionIds: string[],
  placement: PlacementEstimate,
): Promise<PlacementEstimate> {
  if (servedQuestionIds.length === 0) return placement;

  const { data } = await serviceClient
    .from("questions")
    .select("level")
    .in("id", servedQuestionIds);

  let ceiling: HalfGradeLevel | null = null;
  let ceilingIdx = -1;
  for (const q of data ?? []) {
    if (!q.level) continue;
    const idx = levelIndex(q.level);
    if (idx > ceilingIdx) {
      ceilingIdx = idx;
      ceiling = q.level;
    }
  }

  if (ceiling === null || levelIndex(ceiling) >= levelIndex(placement.overallLevel)) {
    return placement;
  }
  return { ...placement, overallLevel: ceiling };
}
