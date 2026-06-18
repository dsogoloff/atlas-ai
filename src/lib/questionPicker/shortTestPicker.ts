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
//      LEVEL BELOW the child's grade (previousBookletHalfGrades in levelBand.ts;
//      a 0C child is sampled from 0B, a grade-5 child from grade 4). The caller
//      passes that single-booklet level set as ctx.levelBand. HOLD HARD — an
//      empty in-band set yields strand-exhausted, no widening.
//
// Otherwise it mirrors pickQuestion: tenant + strand + is_active, exclude
// already-served, deterministic nearest-difficulty sort (reusing
// compareCandidates), Layer-2 chooser hook. width stays advisory (see picker.ts).

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
    .select(`id, external_id, strand, level, difficulty, format, content`)
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

  eligible.sort(compareCandidates(request.targetDifficulty));

  const limit = ctx.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
  const chosen = chooser(eligible.slice(0, limit));
  if (chosen === null) {
    return { ok: false, reason: "strand-exhausted" };
  }

  return { ok: true, question: chosen };
}
