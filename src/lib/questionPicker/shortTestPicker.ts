// Atlas Assessment — SHORT-TEST question picker.
//
// Deliberately SEPARATE from pickQuestion (the comprehensive/default picker):
// the short test draws from a curated, authoritative subset of the bank, not
// the whole active bank. Two extra filters define that subset:
//
//   1. short_test_eligible = true — an ITEM-LEVEL boolean (default false) that
//      CONVERSION captures from each worksheet's last-page "short test: Yes/No"
//      marking. This field is the AUTHORITATIVE short-test item set.
//   2. level ∈ SHORT_TEST_LEVEL_BAND — the grade-band scope (grades 3–7 now).
//
// Otherwise it mirrors pickQuestion: tenant + strand + is_active, exclude
// already-served, deterministic nearest-difficulty sort (reusing
// compareCandidates), Layer-2 chooser hook. width stays advisory (see picker.ts).
//
// =============================================================================
// PENDING DEPENDENCY — short_test_eligible is not on trunk yet (CONVERSION-owned)
// =============================================================================
// As of this lane, the `questions` table has NO short_test_eligible column —
// it is CONVERSION-owned bank metadata sourced from the worksheets, captured in
// a later bank migration. ATLAS only CONSUMES it; this lane does NOT author or
// backfill it.
//
// Until that column lands:
//   * This picker is BUILD-AHEAD and is NOT wired into the live start/submit
//     handlers (wiring a SQL filter on a non-existent column would 500 the live
//     short test). The current short test keeps using pickQuestion.
//   * `ShortTestDatabase` below augments the questions table type LOCALLY so
//     this module compiles without editing the generated database.types.ts
//     (which would advertise a column that doesn't exist and risk a query
//     elsewhere selecting it live). When the column + regenerated types land,
//     delete the `ShortTestDatabase` shim and the cast and use serviceClient
//     directly; then wire this picker into the short-test handler path.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { HalfGradeLevel } from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";

import { compareCandidates } from "./picker";
import type {
  Chooser,
  PickedQuestionRow,
  PickerContext,
  PickerRequest,
  PickerResult,
} from "./types";

/** Grade-band scope for the short test (grades 3–7 now). Single source of
 *  truth — widen/narrow the band by editing this one list. */
export const SHORT_TEST_LEVEL_BAND: readonly HalfGradeLevel[] = [
  "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B", "7A", "7B",
];

const DEFAULT_CANDIDATE_LIMIT = 1;

const defaultChooser: Chooser = (candidates) => candidates[0] ?? null;

// Build-ahead type shim: augment questions with the not-yet-on-trunk
// short_test_eligible column so `.eq("short_test_eligible", …)` type-checks.
// Localized on purpose (see header). Remove when the generated types include it.
type ShortTestDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<Database["public"]["Tables"], "questions"> & {
      questions: Omit<
        Database["public"]["Tables"]["questions"],
        "Row" | "Insert" | "Update"
      > & {
        Row: Database["public"]["Tables"]["questions"]["Row"] & {
          short_test_eligible: boolean;
        };
        Insert: Database["public"]["Tables"]["questions"]["Insert"] & {
          short_test_eligible?: boolean;
        };
        Update: Database["public"]["Tables"]["questions"]["Update"] & {
          short_test_eligible?: boolean;
        };
      };
    };
  };
};

export async function pickShortTestQuestion(
  serviceClient: SupabaseClient<Database>,
  request: PickerRequest,
  ctx: PickerContext,
  chooser: Chooser = defaultChooser,
): Promise<PickerResult> {
  // Cast through the build-ahead shim so the short_test_eligible filter
  // type-checks; the select shape is unchanged (PickedQuestionRow columns).
  const client = serviceClient as unknown as SupabaseClient<ShortTestDatabase>;

  const { data, error } = await client
    .from("questions")
    .select(`id, external_id, strand, level, difficulty, format, content`)
    .eq("tenant_id", ctx.tenantId)
    .eq("strand", request.strand)
    .eq("is_active", true)
    .eq("short_test_eligible", true)
    .in("level", SHORT_TEST_LEVEL_BAND);

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
