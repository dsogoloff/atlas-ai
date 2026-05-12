// Pure helper for matching a (strand, level) placement to a row in
// curriculum_recommendations. Item #12 Phase 7.6.
//
// Why this is its own module: the lookup runs server-side in
// /report/page.tsx, but the policy (nearest-level fallback with a
// higher-level tiebreak) is a parent-UX call that deserves dedicated
// tests independent of the page orchestration. Keeping the logic pure
// (no DB, no React) lets us pin the behavior in vitest at the same
// granularity we'd want unit tests for any engine helper.
//
// Policy (founder-approved Item #12 Phase 7.6):
//   1. Exact (strand, level) match wins.
//   2. Otherwise, pick the closest level in the same strand by
//      |levelIndex(rec) - levelIndex(target)|.
//   3. On equal distance (one below, one above), prefer the HIGHER
//      level. Rationale: parent gets the more aspirational
//      recommendation — "here is what to work toward" beats "here is
//      what to drill on the level below."
//   4. If the strand has zero rows in `candidates`, return null and let
//      the caller decide whether to render an empty state per strand
//      or skip it.
//
// Pre-Phase-7.6 behavior was strict exact-match — see page.tsx commit
// history. That produced an empty recommendations list on assessment #1
// for the seeded Dev Child because every seeded row sits at level 2B
// while the engine places strands at varying levels per child.

import { LEVELS, levelIndex } from "@/lib/engine/levels";
import type { HalfGradeLevel, Strand } from "@/lib/engine/types";

export interface RecommendationCandidate {
  strand: Strand;
  level: HalfGradeLevel;
  primary_recommendation: string;
  supplementary: string[];
  notes: string | null;
}

export function pickNearestRecommendation(
  strand: Strand,
  targetLevel: HalfGradeLevel,
  candidates: ReadonlyArray<RecommendationCandidate>,
): RecommendationCandidate | null {
  const strandCandidates = candidates.filter((c) => c.strand === strand);
  if (strandCandidates.length === 0) return null;

  const targetIdx = levelIndex(targetLevel);

  // Sort by |distance| ASC, then level index DESC (higher level wins ties).
  const sorted = [...strandCandidates].sort((a, b) => {
    const da = Math.abs(LEVELS.indexOf(a.level) - targetIdx);
    const db = Math.abs(LEVELS.indexOf(b.level) - targetIdx);
    if (da !== db) return da - db;
    // Equal distance → prefer the higher level (aspirational over
    // remedial). Documented Phase 7.6 tiebreak — keep this ordering
    // unless the policy changes.
    return LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level);
  });

  return sorted[0]!;
}
