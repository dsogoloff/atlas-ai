// Atlas Assessment — Layer 1.5 deterministic question picker.
//
// What this is and is not:
//
//   * Layer 1 (src/lib/engine/) maintains the per-strand posterior and
//     emits a NextQuestionRequest = { strand, target_difficulty, width }.
//     The engine never reads the bank.
//   * Layer 1.5 (this file) turns that request into a concrete row from
//     the questions table. Pure DB query + deterministic sort. No LLM.
//   * Layer 2 (future cycle, per architecture.md and engine.ts header)
//     will plug in via the `chooser` callback to pick among misconception-
//     informed candidates. Layer 2 NEVER overrides the math — Layer 1
//     already chose the strand and difficulty band; the chooser only
//     selects within a Layer-1-approved set.
//
// =============================================================================
// Cold-start placement note (Item #10 Phase 3 — engine asks grade-appropriate)
// =============================================================================
//
// Pre-Item-#10: every child started on NUMBER_SENSE 5A (uniform priors →
// max-variance loop picks STRANDS[0]; meanLevelIndex = 8.5 → levelAt(9) =
// "5A"). Post-Item-#10 Phase 3: the engine seeds posteriors from the
// child's grade via priors-v1.json; first question is now grade-appropriate.
//
// The picker is unchanged — it still serves whatever the engine asks for.
//
// Remaining concern — bank coverage: the placeholder bank (seed.sql, 5
// items) doesn't cover most (strand, difficulty) cells the grade-aware
// engine will request. bank_unservable: 422 from pickQuestion on uncovered
// strands is honest evidence the engine wants grade-appropriate content.
// Resolves when Item #11 lands real S.A.M. content.
//
// =============================================================================
// Width is advisory in v1
// =============================================================================
//
// The engine's `width` field describes the band Layer 2 may pick within.
// With v1's tiny seed bank (and even with the eventual ~10/strand/level
// real bank), strict ±width filtering would frequently exclude the only
// reasonable candidate. The picker therefore picks the closest unserved
// item in the requested strand, ignoring width as a hard filter. Width
// stays in the wire contract for diagnostics and for the Layer-2 chooser
// to weight against. See picker.test.ts for the "width-is-advisory"
// assertion.
//
// =============================================================================
// Sort cost
// =============================================================================
//
// Selection ordering: (abs(difficulty - target) ASC, external_id ASC NULLS
// LAST, id ASC). Ordering by `abs()` requires a per-row computation;
// pushing it into Postgres needs an expression index that's pointless at
// v1 bank sizes. We fetch all (tenant, strand, is_active) rows and sort
// in TS — at ≤100 items per strand this is microseconds. Reconsider if
// banks grow past ~10K items per strand: at that point either an
// expression index on `(strand, abs(difficulty - <fixed centers>))` or a
// different selection strategy (e.g., bucket-by-level then nearest) is
// warranted.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  Chooser,
  PickedQuestionRow,
  PickerContext,
  PickerRequest,
  PickerResult,
} from "./types";

const DEFAULT_CANDIDATE_LIMIT = 1;

const defaultChooser: Chooser = (candidates) => candidates[0] ?? null;

export async function pickQuestion(
  serviceClient: SupabaseClient<Database>,
  request: PickerRequest,
  ctx: PickerContext,
  chooser: Chooser = defaultChooser,
): Promise<PickerResult> {
  // Single string literal — Supabase's type inference is fragile against
  // concatenation (TS2339 has bitten us on questions.* before; see
  // src/lib/responseSubmit/handler.ts comment around the same select).
  const { data, error } = await serviceClient
    .from("questions")
    .select(`id, external_id, strand, level, difficulty, format, content`)
    .eq("tenant_id", ctx.tenantId)
    .eq("strand", request.strand)
    .eq("is_active", true);

  if (error) {
    throw new Error(`[picker] questions read failed: ${error.message}`);
  }

  const rows: PickedQuestionRow[] = data ?? [];

  // Exclude served. A Set lookup is O(1); a small array would do too,
  // but a Set is robust against the upper bound rising past the v1 cap
  // of ~25 served items per session.
  const served = new Set(ctx.servedQuestionIds);
  const eligible = rows.filter((r) => !served.has(r.id));

  if (eligible.length === 0) {
    return { ok: false, reason: "strand-exhausted" };
  }

  // Deterministic sort: distance from target, then external_id, then id.
  // external_id can be null (placeholder content during the licensing
  // interim per architecture.md #5) — null sorts last so real S.A.M.
  // items take precedence over placeholders within the same difficulty
  // tier once both coexist.
  eligible.sort(compareCandidates(request.targetDifficulty));

  const limit = ctx.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
  const candidates = eligible.slice(0, limit);

  const chosen = chooser(candidates);
  if (chosen === null) {
    // The chooser declined to pick — Layer 2 may do this if no candidate
    // is appropriate given the misconception history. For v1's default
    // chooser this only happens when the candidate set is empty, which
    // is already caught above; this branch exists for the Layer-2 future.
    return { ok: false, reason: "strand-exhausted" };
  }

  return { ok: true, question: chosen };
}

function compareCandidates(target: number) {
  return (a: PickedQuestionRow, b: PickedQuestionRow): number => {
    const da = Math.abs(a.difficulty - target);
    const db = Math.abs(b.difficulty - target);
    if (da !== db) return da - db;

    // external_id: null sorts last (matches the SQL NULLS LAST semantics
    // documented above). When both are non-null, lexicographic compare.
    const aExt = a.external_id;
    const bExt = b.external_id;
    if (aExt === null && bExt !== null) return 1;
    if (aExt !== null && bExt === null) return -1;
    if (aExt !== null && bExt !== null && aExt !== bExt) {
      return aExt < bExt ? -1 : 1;
    }

    // Final tiebreak on UUID — guarantees total ordering even when
    // two placeholder rows share external_id (or both are null).
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return 0;
  };
}
