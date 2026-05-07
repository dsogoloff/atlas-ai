// Atlas Assessment — POST /api/assess/submit orchestrator.
//
// Lives outside src/app/ so it's testable without spinning up Next.js.
// The route handler (src/app/api/assess/submit/route.ts) is a thin shell:
// it parses the JSON body via SubmitRequestSchema, builds the two Supabase
// clients, and calls submitResponseHandler.
//
// =============================================================================
// Auth and tenant scoping
// =============================================================================
//
// rlsClient is the user-scoped Supabase client (RLS enforced). We use it
// for the strict auth + ownership chain:
//
//   1. auth.getUser()                              ← server-validated session
//   2. SELECT from `parents` WHERE auth_user_id=$1 ← exactly the calling parent
//   3. SELECT id FROM `children` WHERE parent_id=$1 ← Set of owned child IDs
//   4. SELECT from `assessment_sessions` WHERE id=$1 ← session row + child_id
//   5. Verify session.child_id ∈ owned-children Set → otherwise 403
//
// Why the explicit ownership check (step 5) on top of RLS:
//
//   The `parents`, `children`, and `assessment_sessions` tables all have
//   OR-policies — `*_parent_*` is OR'd with `*_instructor_*`. A user who
//   is BOTH a parent AND an active instructor at a center where another
//   parent's child is enrolled would otherwise see (via the instructor
//   policy) sessions for kids they do not parent. Submitting answers to
//   such a session would corrupt another family's placement.
//
//   The explicit `eq("auth_user_id", uid)` on parents (step 2) narrows
//   that read to one row. The explicit children Set check (step 5) closes
//   the assessment_sessions side of the same risk. compliance.md §2 and
//   features.md §7 require strict center-scoped access; this is the v1
//   enforcement.
//
// serviceClient is the service-role client (RLS bypassed). Everything else
// uses it: questions reads (compliance.md §8 — service-role only), response
// reads (replay + idempotency check + aggregation re-read), and all writes
// (responses INSERT, assessment_sessions UPDATEs).
//
// =============================================================================
// Write order at session close (per approved plan, addition #2)
// =============================================================================
//
//   (a) INSERT into responses                                     ← always first
//   (b) UPDATE assessment_sessions.current_estimate
//   (c) If shouldTerminate(postState).done:
//       (c1) UPDATE assessment_sessions.status='COMPLETED' + completed_at
//       (c2) Re-read responses, aggregateSessionFlags, UPDATE
//            assessment_sessions.session_time_flag + time_flag_summary
//
// Pragmatic, NOT transactional. Partial-failure modes:
//
//   * Failure between (a) and (b): response is in DB; current_estimate is
//     stale. Acceptable — current_estimate is a cached projection of the
//     responses (the authoritative source). The next successful submit
//     refreshes it. A reader that needs the freshest estimate can derive
//     it by replaying state via lib/responseSubmit/replay.ts.
//
//   * Failure between (c1) and (c2): session is COMPLETED but
//     time_flag_summary is NULL. This is a known state — the eventual
//     parent-report layer must render the placement with a "summary
//     unavailable" caveat rather than refusing to display. An out-of-band
//     job can recompute later. We surface the (c2) failure to the client
//     as a 500; on retry the idempotency path re-attempts (c2) (which is
//     why we don't gate it on session.status — see the existing-response
//     handling below).
//
// =============================================================================
// Concurrency
// =============================================================================
//
// Two truly-concurrent submits for the same (session, question) can both
// pass the existence check before either inserts, producing two rows that
// replay into a double-counted response. There is no UNIQUE constraint on
// (session_id, question_id) in the schema today. v1 posture: rely on the
// client UI to disable submit while in-flight. Add the constraint when
// the symptom is observed.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applyResponse,
  nextQuestionRequest,
  placementEstimate,
  shouldTerminate,
} from "@/lib/engine/engine";
import type {
  EngineQuestion,
  EngineResponse,
} from "@/lib/engine/types";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  aggregateSessionFlags,
  flagResponseTime,
  toSessionSummaryJson,
  type FlagResult,
  type ItemNormTags,
} from "@/lib/timeFlagging";

import { judgeAnswer } from "./correctness";
import { replayEngineState } from "./replay";
import {
  toNextRequestJson,
  toPlacementEstimateJson,
  type SubmitErrorCode,
  type SubmitHandlerResult,
  type SubmitRequest,
  type SubmitResponseBody,
} from "./types";

interface HandlerInput {
  request: SubmitRequest;
  rlsClient: SupabaseClient<Database>;
  serviceClient: SupabaseClient<Database>;
}

export async function submitResponseHandler({
  request,
  rlsClient,
  serviceClient,
}: HandlerInput): Promise<SubmitHandlerResult> {
  // ---------------------------------------------------------------------------
  // 1. Auth — server-validated user, then the calling parent's row.
  // ---------------------------------------------------------------------------
  const { data: userData, error: userErr } = await rlsClient.auth.getUser();
  if (userErr || !userData.user) {
    return fail("unauthorized", 401, "no authenticated user");
  }
  const userId = userData.user.id;

  const { data: parent, error: parentErr } = await rlsClient
    .from("parents")
    .select("id, tenant_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (parentErr) {
    return fail("internal", 500, `parent lookup failed: ${parentErr.message}`);
  }
  if (!parent) {
    return fail("unauthorized", 401, "no parent row for caller");
  }

  // ---------------------------------------------------------------------------
  // 2. Owned children — explicit eq filter narrows past the OR'd RLS.
  // ---------------------------------------------------------------------------
  const { data: childrenRows, error: childrenErr } = await rlsClient
    .from("children")
    .select("id")
    .eq("parent_id", parent.id);

  if (childrenErr) {
    return fail("internal", 500, `children read failed: ${childrenErr.message}`);
  }
  const childIds = new Set((childrenRows ?? []).map((c) => c.id));

  // ---------------------------------------------------------------------------
  // 3. Session — read via RLS, then verify child_id is in owned set.
  //    "Not visible" => 404 (don't leak existence).
  //    "Visible but not in owned children" => 403 (the dual-role bypass).
  // ---------------------------------------------------------------------------
  const { data: session, error: sessionErr } = await rlsClient
    .from("assessment_sessions")
    .select("id, status, child_id")
    .eq("id", request.session_id)
    .maybeSingle();

  if (sessionErr) {
    return fail("internal", 500, `session read failed: ${sessionErr.message}`);
  }
  if (!session) {
    return fail("session_not_found", 404, "session not found");
  }
  if (!childIds.has(session.child_id)) {
    return fail("forbidden", 403, "session not owned by caller");
  }

  // ---------------------------------------------------------------------------
  // 4. Idempotency — has this (session, question) already been submitted?
  //    Checked BEFORE the "session completed" guard so a retry can recover
  //    from the (c1)→(c2) partial-failure mode documented above.
  // ---------------------------------------------------------------------------
  const { data: existing, error: existingErr } = await serviceClient
    .from("responses")
    .select("is_correct, time_flag")
    .eq("session_id", request.session_id)
    .eq("question_id", request.question_id)
    .maybeSingle();

  if (existingErr) {
    return fail(
      "internal",
      500,
      `existing-response check failed: ${existingErr.message}`,
    );
  }

  if (existing) {
    // Replay reflects the existing row, so the resulting state IS the
    // post-submit state. Recompute done + next/placement so a retry
    // returns the same shape as the first call.
    const state = await replayEngineState(serviceClient, request.session_id);
    const term = shouldTerminate(state);
    return success({
      is_correct: existing.is_correct,
      time_flag: existing.time_flag,
      done: term.done,
      ...(term.done
        ? { placement: toPlacementEstimateJson(placementEstimate(state)) }
        : { next_request: toNextRequestJson(nextQuestionRequest(state)) }),
    });
  }

  // ---------------------------------------------------------------------------
  // 5. New submit — refuse if session is already closed.
  // ---------------------------------------------------------------------------
  if (session.status === "COMPLETED") {
    return fail("session_completed", 409, "session is already completed");
  }

  // ---------------------------------------------------------------------------
  // 6. Load question (service-role; questions are not client-readable).
  // ---------------------------------------------------------------------------
  // Single string literal (not concatenation) so Supabase's type parser
  // can infer the row shape — see TS2339 on question.* if you change this.
  const { data: question, error: qErr } = await serviceClient
    .from("questions")
    .select(`
      id, strand, level, difficulty, format, content,
      word_count, operation_type, num_operations, representation
    `)
    .eq("id", request.question_id)
    .maybeSingle();

  if (qErr) {
    return fail("internal", 500, `question read failed: ${qErr.message}`);
  }
  if (!question) {
    return fail("question_not_found", 404, "question not found");
  }

  // ---------------------------------------------------------------------------
  // 7. Replay engine state (BEFORE this response is applied).
  // ---------------------------------------------------------------------------
  const preState = await replayEngineState(serviceClient, request.session_id);

  // ---------------------------------------------------------------------------
  // 8. Judge correctness and compute the time flag.
  // ---------------------------------------------------------------------------
  const isCorrect = judgeAnswer(
    question.format,
    question.content,
    request.answer_given,
  );

  const tags: ItemNormTags = {
    word_count: question.word_count,
    operation_type: question.operation_type,
    num_operations: question.num_operations,
    representation: question.representation,
  };

  let flag: ReturnType<typeof flagResponseTime>;
  try {
    flag = flagResponseTime({
      level: question.level,
      format: question.format,
      tags,
      timeMs: request.time_ms,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[submit] flagResponseTime threw", {
      msg,
      question_id: question.id,
    });
    return fail("flagger_error", 500, `flagger failed: ${msg}`);
  }

  // ---------------------------------------------------------------------------
  // 9. Apply to engine state -> POST state.
  // ---------------------------------------------------------------------------
  const engineQ: EngineQuestion = {
    id: question.id,
    strand: question.strand,
    level: question.level,
    difficulty: question.difficulty,
    format: question.format,
  };
  const engineR: EngineResponse = {
    questionId: question.id,
    strand: question.strand,
    isCorrect,
    takenSeconds: request.time_ms / 1000,
  };
  const postState = applyResponse(preState, engineQ, engineR);

  // ---------------------------------------------------------------------------
  // 10. Persist (write order documented in the file header).
  // ---------------------------------------------------------------------------

  // (a) INSERT response. detected_misconceptions stays empty for v1; the
  //     misconception detector (features.md §3) plugs in here.
  const { error: insertErr } = await serviceClient.from("responses").insert({
    tenant_id: parent.tenant_id,
    session_id: request.session_id,
    question_id: request.question_id,
    answer_given: request.answer_given,
    is_correct: isCorrect,
    time_taken_seconds: request.time_ms / 1000,
    expected_time_sec: flag.expectedTimeSec,
    time_ratio: flag.timeRatio,
    time_flag: flag.flag,
    time_flag_config_version: flag.configVersion,
    used_fallback: flag.usedFallback,
    detected_misconceptions: [],
  });

  if (insertErr) {
    return fail("internal", 500, `response insert failed: ${insertErr.message}`);
  }

  // (b) UPDATE current_estimate.
  const placement = placementEstimate(postState);
  const { error: estErr } = await serviceClient
    .from("assessment_sessions")
    .update({
      current_estimate: toPlacementEstimateJson(placement) as unknown as Json,
    })
    .eq("id", request.session_id);

  if (estErr) {
    return fail("internal", 500, `estimate update failed: ${estErr.message}`);
  }

  // (c) Termination side-effects.
  const term = shouldTerminate(postState);
  if (term.done) {
    // (c1) Mark session closed. CHECK constraint requires status and
    //      completed_at to be set together — do both in one UPDATE.
    const { error: closeErr } = await serviceClient
      .from("assessment_sessions")
      .update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
      })
      .eq("id", request.session_id);

    if (closeErr) {
      return fail("internal", 500, `session close failed: ${closeErr.message}`);
    }

    // (c2) Aggregate + persist summary.
    const summaryErrMsg = await persistSessionSummary(
      serviceClient,
      request.session_id,
    );
    if (summaryErrMsg) {
      return fail("internal", 500, summaryErrMsg);
    }
  }

  // ---------------------------------------------------------------------------
  // 11. Build response body.
  // ---------------------------------------------------------------------------
  return success({
    is_correct: isCorrect,
    time_flag: flag.flag,
    done: term.done,
    ...(term.done
      ? { placement: toPlacementEstimateJson(placement) }
      : { next_request: toNextRequestJson(nextQuestionRequest(postState)) }),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads all responses for the session (with the just-inserted row),
 * aggregates the flags, and persists session_time_flag + time_flag_summary.
 * Returns null on success, an error string on failure (handler maps to 500).
 */
async function persistSessionSummary(
  supabase: SupabaseClient<Database>,
  sessionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("responses")
    .select(
      "expected_time_sec, time_ratio, time_flag, time_flag_config_version, used_fallback",
    )
    .eq("session_id", sessionId);

  if (error) return `summary read failed: ${error.message}`;

  const flagResults: FlagResult[] = (data ?? []).map((r) => ({
    expectedTimeSec: Number(r.expected_time_sec),
    actualTimeSec: 0, // unused at session level
    timeRatio: Number(r.time_ratio),
    flag: r.time_flag,
    configVersion: r.time_flag_config_version,
    components: { tRead: 0, tSolve: 0, tInput: 0 }, // unused
    usedFallback: r.used_fallback,
  }));

  const summary = aggregateSessionFlags(flagResults);

  const { error: updateErr } = await supabase
    .from("assessment_sessions")
    .update({
      session_time_flag: summary.flag,
      time_flag_summary: toSessionSummaryJson(summary) as unknown as Json,
    })
    .eq("id", sessionId);

  if (updateErr) return `summary update failed: ${updateErr.message}`;
  return null;
}

function success(body: SubmitResponseBody): SubmitHandlerResult {
  return { ok: true, body };
}

function fail(
  code: SubmitErrorCode,
  status: number,
  message: string,
): SubmitHandlerResult {
  return { ok: false, error: { code, status, message } };
}
