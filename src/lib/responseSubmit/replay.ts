// Atlas Assessment — engine-state replay.
//
// Design decision (Ambiguity #1 in the response-submit plan):
//
//   We reconstitute the per-session EngineState from the `responses` table
//   on every submit instead of persisting it as a column. The engine is
//   pure and JSON-serialisable, applyResponse over ≤25 rows is microseconds,
//   and skipping a dedicated `engine_state jsonb` column means one fewer
//   migration and one fewer source of truth to keep in sync with
//   assessment_sessions.current_estimate.
//
//   `current_estimate` (Migration 001) still holds the PlacementEstimate
//   summary that parent dashboards / instructor views read; replay rebuilds
//   only the variance-bearing posteriors the engine itself needs.
//
//   Reconsider this when ANY of:
//     * MAX_QUESTIONS rises significantly above 25 (replay cost is linear).
//     * EngineState grows beyond posteriors + counters (e.g., per-strand
//       history, learned-misconception cache) — the replay query would
//       have to widen and the cost-of-recompute argument weakens.
//     * The questions table cannot be cheaply read alongside responses
//       (e.g., split DBs, cross-region reads).
//
// We use two sequential queries (responses, then questions.in(ids)) rather
// than a relational embed. The hand-written database.types.ts declares
// `Relationships: []`, so an embed comes back untyped; two queries stay
// well-typed and the extra round-trip is irrelevant at this row count.
//
// The supabase client passed in MUST bypass RLS (service role) — questions
// are service-role-only per compliance.md §8.

import type { SupabaseClient } from "@supabase/supabase-js";

import { applyResponse, createEngineState } from "@/lib/engine/engine";
import type {
  EngineQuestion,
  EngineResponse,
  EngineState,
} from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";

export async function replayEngineState(
  supabase: SupabaseClient<Database>,
  sessionId: string,
): Promise<EngineState> {
  const { data: responseRows, error: respErr } = await supabase
    .from("responses")
    .select("question_id, is_correct, time_taken_seconds, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (respErr) {
    throw new Error(`[replay] responses read failed: ${respErr.message}`);
  }

  const responses = responseRows ?? [];
  if (responses.length === 0) {
    return createEngineState();
  }

  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const { data: questionRows, error: qErr } = await supabase
    .from("questions")
    .select("id, strand, level, difficulty, format")
    .in("id", questionIds);

  if (qErr) {
    throw new Error(`[replay] questions read failed: ${qErr.message}`);
  }

  const questionsById = new Map(
    (questionRows ?? []).map((q) => [q.id, q] as const),
  );

  let state = createEngineState();
  for (const row of responses) {
    const q = questionsById.get(row.question_id);
    if (!q) {
      // Referential integrity is enforced by FK on responses.question_id,
      // so this is a "should never happen" branch — but if it does, fail
      // loudly rather than silently corrupting the posterior.
      throw new Error(
        `[replay] response references missing question ${row.question_id}`,
      );
    }
    const question: EngineQuestion = {
      id: q.id,
      strand: q.strand,
      level: q.level,
      difficulty: q.difficulty,
      format: q.format,
    };
    const response: EngineResponse = {
      questionId: row.question_id,
      strand: q.strand,
      isCorrect: row.is_correct,
      takenSeconds: Number(row.time_taken_seconds),
    };
    state = applyResponse(state, question, response);
  }

  return state;
}
