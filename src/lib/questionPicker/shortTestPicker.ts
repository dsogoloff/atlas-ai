// Atlas Assessment — SHORT-TEST question picker.
//
// Deliberately SEPARATE from pickQuestion (the comprehensive/default picker):
// the short test draws from a curated, authoritative subset of the bank. Its
// extra constraints:
//
//   1. short_test_eligible = true — an ITEM-LEVEL boolean (default false) that
//      CONVERSION captures from each worksheet's last-page "short test: Yes/No"
//      marking. This is the AUTHORITATIVE short-test item set.
//   2. level ∈ ctx.levelBand — the short test samples the S.A.M. booklet ONE
//      LEVEL BELOW the child's grade AND the child's own (current) booklet
//      (shortTestLevelBand in levelBand.ts; a 0C child draws from {0B, 0C}, a
//      grade-5 child from {grade 4, grade 5}; the 0A floor is {0A} only). The
//      caller passes that two-booklet level set as ctx.levelBand. HOLD HARD — an
//      empty in-band set yields strand-exhausted, no widening.
//
// Otherwise it mirrors pickQuestion: tenant + strand + is_active, exclude
// already-served, deterministic nearest-difficulty sort (reusing
// compareCandidates), Layer-2 chooser hook. width stays advisory (see picker.ts).
//
// =============================================================================
// STRAND COVERAGE is the governing constraint (Task 3)
// =============================================================================
//
// The parent report's radar/bars are keyed by the V2026 AXIS-B sub-strands
// (whole_numbers, fractions, …, geometry, ratio, algebra, data_representation),
// NOT the engine's 6-value AXIS-A `strand` enum. An L6 short test was observed
// concentrating on a handful of sub-strands (Whole Numbers / Fractions /
// Percentage / Rate / Area&Volume) while leaving Geometry / Ratio / Algebra /
// Statistics UNASSESSED even though eligible items existed for them in the band.
//
// Root cause: the AXIS-A coverage-first router (engine/shortTest.ts) spreads
// across the 6 engine strands, but several engine strands fan out to MANY
// AXIS-B sub-strands (e.g. number_sense / operations_algorithms / fractions_
// decimals collectively cover whole_numbers, fractions, decimals, percentage,
// rate, ratio, algebra, …). Within a requested engine strand the picker chose
// purely by nearest difficulty, so it could serve the SAME sub-strand twice and
// never reach an as-yet-uncovered sibling sub-strand. The picker was blind to
// AXIS B (it didn't even fetch content_id).
//
// Fix: make the picker sub-strand-aware. When the caller supplies a sub-strand
// resolver (ctx.subStrandByContentId) and the set of sub-strands already served
// this session (ctx.servedSubStrands), the picker PREFERS an eligible item whose
// sub-strand has not yet been served — breadth-first across AXIS-B — before
// deepening an already-covered sub-strand, keeping the existing nearest-
// difficulty order as the within-group tiebreak. All WITHIN the 10/15 adaptive
// bounds; short_test_eligible and the level band are untouched. A candidate with
// a NULL/unresolvable content_id is treated as already-covered (sorts after
// breadth-extending items) so coverage NEVER gets worse than the prior behaviour
// — with no resolver, or no candidate resolving, the picker degrades exactly to
// the previous nearest-difficulty selection and the AXIS-A router still governs.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { compareCandidates } from "./picker";
import type {
  Chooser,
  PickedQuestionRow,
  PickerContext,
  PickerRequest,
  PickerResult,
} from "./types";

const DEFAULT_CANDIDATE_LIMIT = 1;

const defaultChooser: Chooser = (candidates) => candidates[0] ?? null;

export async function pickShortTestQuestion(
  serviceClient: SupabaseClient<Database>,
  request: PickerRequest,
  ctx: PickerContext,
  chooser: Chooser = defaultChooser,
): Promise<PickerResult> {
  let query = serviceClient
    .from("questions")
    .select(`id, external_id, strand, level, difficulty, format, content, content_id`)
    .eq("tenant_id", ctx.tenantId)
    .eq("strand", request.strand)
    .eq("is_active", true)
    .eq("short_test_eligible", true);

  // Previous-booklet level band (Task 2). HOLD HARD — no widening. The band may
  // contain sub-KA levels (0A/0B/0C) the generated HalfGradeLevel union doesn't
  // carry yet, so the allow-list is typed as strings and cast for .in().
  if (ctx.levelBand) {
    query = query.in(
      "level",
      ctx.levelBand as unknown as Database["public"]["Enums"]["half_grade_level"][],
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[shortTestPicker] questions read failed: ${error.message}`);
  }

  const rows: PickedQuestionRow[] = (data as PickedQuestionRow[] | null) ?? [];

  const served = new Set(ctx.servedQuestionIds);
  const eligible = rows.filter((r) => !served.has(r.id));

  if (eligible.length === 0) {
    return { ok: false, reason: "strand-exhausted" };
  }

  // Order: PRIMARY by sub-strand coverage (breadth-first — items whose AXIS-B
  // sub-strand isn't yet covered this session come first), SECONDARY by the
  // existing deterministic nearest-difficulty order. The nearest-difficulty
  // comparator is the within-group tiebreak, so when coverage is irrelevant
  // (no resolver, or every candidate shares one coverage bucket) the ordering
  // is byte-identical to the prior behaviour.
  const nearest = compareCandidates(request.targetDifficulty);
  const extendsCoverage = coveragePredicate(ctx);
  eligible.sort((a, b) => {
    const ea = extendsCoverage(a) ? 0 : 1;
    const eb = extendsCoverage(b) ? 0 : 1;
    if (ea !== eb) return ea - eb;
    return nearest(a, b);
  });

  const limit = ctx.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
  const chosen = chooser(eligible.slice(0, limit));
  if (chosen === null) {
    return { ok: false, reason: "strand-exhausted" };
  }

  return { ok: true, question: chosen };
}

/**
 * Returns a predicate: does this candidate EXTEND sub-strand coverage — i.e.
 * resolve to a V2026 AXIS-B sub-strand not yet served this session?
 *
 * Resolution: row.content_id → ctx.subStrandByContentId → sub-strand code, then
 * check it against ctx.servedSubStrands. A row that doesn't resolve (NULL
 * content_id, or a content_id absent from the map) is NOT coverage-extending —
 * it sorts after rows that are, so the picker still prefers a known-new
 * sub-strand. When the coverage context is absent the predicate is constant
 * `false`, collapsing the sort to nearest-difficulty (graceful fallback).
 */
function coveragePredicate(
  ctx: PickerContext,
): (row: PickedQuestionRow) => boolean {
  const bySubStrand = ctx.subStrandByContentId;
  const served = ctx.servedSubStrands;
  if (!bySubStrand || !served) return () => false;
  return (row) => {
    if (row.content_id === null) return false;
    const sub = bySubStrand.get(row.content_id);
    if (sub === undefined) return false;
    return !served.has(sub);
  };
}
