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
// We use sequential queries rather than a relational embed. The hand-written
// database.types.ts declares `Relationships: []`, so an embed comes back
// untyped; sequential queries stay well-typed and the extra round-trips are
// irrelevant at this row count.
//
// The supabase client passed in MUST bypass RLS (service role). Questions
// are service-role-only per compliance.md §8; sessions and children are
// read via the same service-role client for symmetry (authorization was
// enforced upstream by submitResponseHandler / sessionStartHandler before
// they called into replay).
//
// =============================================================================
// Grade-aware seeding (Item #10 Phase 3)
// =============================================================================
//
// Replay reconstitutes the initial engine state from two sources:
//   1. The CONFIG VERSION stamped on assessment_sessions.engine_prior_version
//      at session creation. Immutable per session (compliance.md §12
//      version-on-row pattern) — historical sessions replay under the
//      exact prior config active when they were created. Lookup happens
//      via getPriorConfigByVersion which throws on unknown versions per
//      Item #10 design point (a), surfacing stale-version sessions loudly.
//   2. The CURRENT child.grade_level value, read live from the children
//      table at replay time.
//
// Known limitation — mid-session grade edits: if a parent edits
// children.grade_level between session start and session close, replay
// reconstitutes initial posteriors from the NEW grade against the LOCKED
// config version. The first question was served under the old grade's
// seeded priors; replay reasons about it under the new grade's priors.
// Practical impact is small (grade is a slow-moving attribute — changes
// ~yearly; IRT update from actual responses dominates after Q1), but
// full audit fidelity would require stamping the grade alongside the
// config version. Deferred to v1.x as
// `assessment_sessions.grade_level_at_session_start` if audit needs it.

import type { SupabaseClient } from "@supabase/supabase-js";

import { applyResponse, createEngineState } from "@/lib/engine/engine";
import { getPriorConfigByVersion } from "@/lib/engine/priors";
import type {
  EngineQuestion,
  EngineResponse,
  EngineState,
  GradeKey,
} from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";

export async function replayEngineState(
  supabase: SupabaseClient<Database>,
  sessionId: string,
): Promise<EngineState> {
  // ---------------------------------------------------------------------------
  // 1. Session metadata — prior config version + child_id (Item #10 Phase 3).
  // ---------------------------------------------------------------------------
  const { data: session, error: sessErr } = await supabase
    .from("assessment_sessions")
    .select("engine_prior_version, child_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessErr) {
    throw new Error(`[replay] session read failed: ${sessErr.message}`);
  }
  if (!session) {
    throw new Error(`[replay] session ${sessionId} not found`);
  }

  // ---------------------------------------------------------------------------
  // 2. Child grade — read live. See header re: mid-session grade-edit
  //    limitation. Null grade_level is acceptable (seedPosteriors silent
  //    fall-back to uniform per R3 + Q4 locks).
  // ---------------------------------------------------------------------------
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("grade_level")
    .eq("id", session.child_id)
    .maybeSingle();

  if (childErr) {
    throw new Error(`[replay] child read failed: ${childErr.message}`);
  }
  if (!child) {
    throw new Error(
      `[replay] child ${session.child_id} not found for session ${sessionId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Resolve prior config from stamped version. Propagates [priors] throw
  //    on unknown version per Item #10 design point (a).
  // ---------------------------------------------------------------------------
  const config = getPriorConfigByVersion(session.engine_prior_version);

  // ---------------------------------------------------------------------------
  // 4. Initial state — grade-seeded. Null/unknown grade silently falls back
  //    to uniform inside seedPosteriors (R3 + Q4 locks).
  // ---------------------------------------------------------------------------
  const initialState = createEngineState({
    grade: child.grade_level as GradeKey | null,
    config,
  });

  // ---------------------------------------------------------------------------
  // 5. Fetch responses for this session.
  // ---------------------------------------------------------------------------
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
    return initialState;
  }

  // ---------------------------------------------------------------------------
  // 6. Fetch questions referenced by responses, then apply each in order.
  // ---------------------------------------------------------------------------
  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  // NOTE: no `is_active` filter — these question_ids come from `responses`
  // rows that already exist. Filtering would silently drop responses from
  // the posterior replay if their question was deactivated since the
  // response, producing wrong placement estimates.
  // See Item #11 Phase 3 enumeration.
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

  let state = initialState;
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
