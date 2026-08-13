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
//   (d) ELSE pick the next question (Layer 1.5 picker), write
//       question_access_log, attach next_question to response body.
//       If the picker reports strand-exhausted, run (c1)+(c2) with a
//       'bank-exhausted' termination reason and return placement
//       instead of next_question.
//
// Pragmatic, NOT transactional. Partial-failure modes (NOTE: the (b)→(d)
// and (c1)→(c2) recovery-on-retry described below was the pre-Lane-1
// idempotent-retry behaviour; Lane 1's served-question gate now rejects an
// already-answered submit instead of replaying, so these crashed-mid-write
// states recover via the out-of-band path, not a client retry — see the
// "Served-question gate" section and step 3.6):
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
//   * Failure between (b) and (d): response is in DB; current_estimate
//     is fresh; no next_question was picked or logged. Idempotent retry
//     finds the existing response, sees no outstanding audit-log entry,
//     re-runs the picker, and writes a fresh log row. Audit log stays
//     accurate (one row per actual serve).
//
// =============================================================================
// Served-question gate + idempotency (security — external audit Lane 1)
// =============================================================================
//
// Before any scoring, a submit must clear two service-role checks (step 3.6):
//
//   (1) question_access_log has a row for (tenant, session, question) — the
//       question was actually SERVED to this session. A valid-but-unserved
//       (forged/guessed/probed) question_id is rejected `question_not_served`
//       (403) with no question load / judge / classifier call.
//   (2) responses has NO row for (session, question) — not already answered.
//       An already-answered submit returns the prior result deterministically
//       (Lane 2: idempotent, no re-insert, no re-scoring) — see below.
//
// SECURITY-OVER-IDEMPOTENCY DELTA (Lane 1 → Lane 2): Lane 1 removed the prior
// silent idempotent return (which masked replays of a never-served question)
// and hard-rejected an already-answered (session, question) with
// `already_answered` (409). Lane 2 restores the deterministic idempotent
// return — but ONLY behind the served-question gate (1), and now backed by a
// DB constraint. A duplicate submit of a SERVED, already-answered question no
// longer errors: it replays engine state and returns the SAME wire shape the
// original successful submit produced (next_question / placement), with NO
// re-insert and NO re-scoring (the classifier/LLM is never re-run on a known
// duplicate). The `already_answered` 409 is gone; `question_not_served` (403)
// is unchanged — an unserved question still cannot be replayed.
//
// =============================================================================
// Concurrency
// =============================================================================
//
// Two truly-concurrent submits for the same (session, question) can both
// pass the pre-insert existence check (step 3.6) before either INSERTs.
// UNIQUE(session_id, question_id) — migration 20260612090000 (Lane 2) — is
// the final arbiter: the losing INSERT fails with SQLSTATE 23505 and the
// handler routes it into the SAME deterministic idempotent return as a
// sequential duplicate (see duplicateResult below). Exactly one response
// row persists; both callers get the identical wire result. The pre-insert
// SELECT still short-circuits the common (sequential) duplicate without
// reaching the INSERT, avoiding the classifier call; the 23505 path covers
// only the rare true race.

import "server-only";

import { after } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emit } from "@/lib/analytics/emit";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  comprehensiveBudget,
  comprehensiveNextQuestionRequest,
  comprehensiveShouldTerminate,
  type ComprehensiveBudget,
} from "@/lib/engine/comprehensive";
import {
  applyResponse,
  nextQuestionRequest,
  placementEstimate,
  shouldTerminate,
} from "@/lib/engine/engine";
import {
  SHORT_TEST_CONFIG,
  shortTestNextQuestionRequest,
  shortTestShouldTerminate,
} from "@/lib/engine/shortTest";
import { STRANDS } from "@/lib/engine/levels";
import type {
  EngineQuestion,
  EngineResponse,
  EngineState,
  NextQuestionRequest,
  PlacementEstimate,
  Strand,
  TerminationDecision,
} from "@/lib/engine/types";
import { deriveTier } from "@/lib/tier/derive";
import { hasValidConsent } from "@/lib/consent/verify";
import { classify } from "@/lib/misconceptionClassifier/classifier";
import { attemptNarration } from "@/lib/report/narration/trigger";
import { logQuestionServe } from "@/lib/questionAccessLog/log";
import {
  discoverEmptyBankStrands,
  discoverShortEligibleCounts,
} from "@/lib/questionPicker/picker";
import {
  discoverServedSubStrands,
  discoverSubStrandByContentId,
} from "@/lib/questionPicker/subStrandCoverage";
import {
  anchorBookletForChild,
  BOOKLET_LEVELS,
  bookletOrdinalForHalfGrade,
  shortTestLevelBand,
} from "@/lib/questionPicker/levelBand";
import { serveQuestion } from "@/lib/questionPicker/serveQuestion";
import {
  pickForSession,
  type SessionPickParams,
} from "@/lib/questionPicker/pickForSession";
import {
  deriveShortTestOutcome,
  type OutcomeResponse,
} from "@/lib/shortTest/outcome";
import type { PickedQuestionRow } from "@/lib/questionPicker/types";
import { findOutstandingQuestion } from "@/lib/sessionShared/findOutstanding";
import { notifyAssessmentCompleted } from "@/lib/staffAlerts/notify";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  aggregateSessionFlags,
  flagResponseTime,
  toSessionSummaryJson,
  type FlagResult,
  type ItemNormTags,
} from "@/lib/timeFlagging";

import { clampPlacementToServedCeiling } from "./clampPlacement";
import { judgeAnswer } from "./correctness";
import { replayEngineState, replayStrandCounts } from "./replay";
import {
  toNextRequestJson,
  toPlacementEstimateJson,
  type SubmitErrorCode,
  type SubmitHandlerResult,
  type SubmitRequest,
  type SubmitResponseBody,
  type TerminationReasonWire,
} from "./types";

/**
 * Resolved comprehensive parameterization for a `test_type === "comprehensive"`
 * session (comprehensive-engine lane). Null for short sessions, which keep the
 * unchanged engine.shouldTerminate / engine.nextQuestionRequest behaviour.
 */
interface ComprehensiveContext {
  inScopeStrands: Set<Strand>;
  budget: ComprehensiveBudget;
}

/**
 * Resolved SHORT-test parameterization (Picker Calibration). Null when the band
 * anchor isn't computable (no grade/birth_year) — those sessions fall back to
 * the legacy engine.shouldTerminate / engine.nextQuestionRequest behaviour.
 *
 * `availableByStrand` = count of active short_test_eligible items in the
 * previous-booklet band, per strand — drives stratified coverage routing and
 * the coverage/count stop (src/lib/engine/shortTest.ts).
 */
interface ShortContext {
  availableByStrand: Map<Strand, number>;
  /** Task 3 — V2026 AXIS-B sub-strand coverage governor for the short picker.
   *  `subStrandByContentId` resolves a candidate's questions.content_id to its
   *  sub-strand code (tenant-wide; built once per submit). The picker prefers an
   *  eligible item whose sub-strand isn't yet in the session's served set so the
   *  served set spreads across the sub-strands the parent report measures before
   *  deepening any one. Empty map ⇒ no coverage signal ⇒ nearest-difficulty
   *  fallback (prior behaviour). The session's served sub-strand set is computed
   *  per pick (it grows as items are answered) in buildShortPickContext. */
  subStrandByContentId: ReadonlyMap<string, string>;
}

/** Re-exported from ./clampPlacement — the implementation moved to its own
 *  module (no `server-only` / `next/server` imports) so the one-time re-clamp
 *  backfill script can call the SAME function the live finalization path uses.
 *  Import sites here and in tests are unchanged. */
export { clampPlacementToServedCeiling };

interface HandlerInput {
  request: SubmitRequest;
  rlsClient: SupabaseClient<Database>;
  serviceClient: SupabaseClient<Database>;
  /** Client IP from extractClientIp(); null if no trusted header was
   *  present. Forwarded to question_access_log inserts when a new
   *  question is served. */
  ip: string | null;
  /** Request origin (e.g. https://app.samnewyork.com), used ONLY to build the
   *  absolute staff-record link in the assessment-completed staff alert. Null
   *  degrades that link to a bare path — the alert still sends. */
  origin?: string | null;
}

export async function submitResponseHandler({
  request,
  rlsClient,
  serviceClient,
  ip,
  origin = null,
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
    // `name` feeds the assessment-completed staff alert only (see
    // lib/staffAlerts/notify.ts) — it is the sole parent field that leaves the
    // box on that path.
    .select("id, tenant_id, name")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (parentErr) {
    return fail("internal", 500, `parent lookup failed: ${parentErr.message}`);
  }
  if (!parent) {
    return fail("unauthorized", 401, "no parent row for caller");
  }

  // Item #12 Phase 7.5: pre-discover strands the tenant's bank can't
  // serve. Threaded into shouldTerminate (treat as terminal-confident)
  // and pickAndMaybeClose (pre-seed the engine's excluded set). One
  // cheap query per submit; reused across both code paths below.
  let emptyBankStrands: Set<Strand>;
  try {
    emptyBankStrands = await discoverEmptyBankStrands(
      serviceClient,
      parent.tenant_id,
    );
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
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
    .select("id, status, child_id, test_type")
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
  // 3.4 Comprehensive context (comprehensive-engine lane).
  //
  // Only for test_type === "comprehensive": resolve the in-scope strand set
  // (STRANDS minus empty-bank — the in-scope-band approximation documented in
  // comprehensive.ts) and the per-tier item budget. tier needs the child's
  // grade_level/birth_year, which the earlier owned-children read doesn't
  // fetch, so we read them here (service-role; the ownership check above
  // already authorised this session for the caller). null for short sessions —
  // the short path uses the short-test stop + router (shortTestShouldTerminate /
  // shortTestNextQuestionRequest), built from the `short` context below.
  // ---------------------------------------------------------------------------
  // Child grade is needed by BOTH the comprehensive tier budget AND the
  // level-lock band on the next pick (all sessions), so read it once here
  // (service-role; ownership already authorised above).
  const { data: childRow, error: childErr } = await serviceClient
    .from("children")
    .select("grade_level, birth_year")
    .eq("id", session.child_id)
    .maybeSingle();
  if (childErr) {
    return fail("internal", 500, `child read failed: ${childErr.message}`);
  }

  // Session pick params for the level-lock band (pickForSession derives the
  // booklet anchor; a missing grade/birth_year degrades to no band).
  const sessionPick: SessionPickParams = {
    testType: session.test_type,
    gradeLevel: childRow?.grade_level ?? null,
    birthYear: childRow?.birth_year ?? Number.NaN,
  };

  let comprehensive: ComprehensiveContext | null = null;
  if (session.test_type === "comprehensive") {
    if (!childRow) {
      return fail("internal", 500, "child not found for comprehensive session");
    }
    const inScopeStrands = new Set<Strand>(
      STRANDS.filter((s) => !emptyBankStrands.has(s)),
    );
    const budget = comprehensiveBudget(
      deriveTier({
        grade_level: childRow.grade_level,
        birth_year: childRow.birth_year,
      }),
    );
    comprehensive = { inScopeStrands, budget };
  }

  // SHORT-test stratification context (Picker Calibration): per-strand count of
  // active short_test_eligible items in the previous-booklet band. Drives the
  // coverage-first routing + 10–15 coverage/count stop. Null when no usable band
  // anchor (no grade/birth_year) → legacy short behaviour.
  let short: ShortContext | null = null;
  if (session.test_type === "short") {
    const anchor = anchorBookletForChild(
      sessionPick.gradeLevel,
      sessionPick.birthYear,
    );
    if (Number.isFinite(anchor)) {
      const band = shortTestLevelBand(anchor);
      try {
        short = {
          availableByStrand: await discoverShortEligibleCounts(
            serviceClient,
            parent.tenant_id,
            band,
          ),
          // Task 3 — tenant-wide content_id → AXIS-B sub-strand map, built once
          // per submit. Empty when the taxonomy isn't seeded for the tenant;
          // the picker then degrades to nearest-difficulty.
          subStrandByContentId: await discoverSubStrandByContentId(
            serviceClient,
            parent.tenant_id,
          ),
        };
      } catch (e) {
        return fail("internal", 500, errorMessage(e));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3.5 Consent gate (M2 readiness / COPPA Gate-B).
  //
  // Independent of the session-start gate: a session may have started while
  // consent was valid and consent then revoked mid-assessment. We refuse to
  // accept further responses once consent is gone. Per-child (Model B): the
  // gate checks consent for this session's child specifically. Server-side,
  // not bypassable — "consent_required" routes the parent to the consent flow.
  // ---------------------------------------------------------------------------
  let consentOk: boolean;
  try {
    consentOk = await hasValidConsent(serviceClient, {
      tenantId: parent.tenant_id,
      parentId: parent.id,
      childId: session.child_id,
    });
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }
  if (!consentOk) {
    return fail(
      "consent_required",
      403,
      "parental consent required; complete the consent screen",
    );
  }

  // ---------------------------------------------------------------------------
  // 3.6 Served-question gate (security — external audit Lane 1).
  //
  // A submit may proceed ONLY when BOTH hold:
  //   (1) this exact (session, question) was actually SERVED to this session
  //       — i.e. a question_access_log row exists for it. Without this, a
  //       caller who passes the auth/ownership/consent chain (their own
  //       session) could still submit a forged/guessed/probed question_id
  //       that was never picked for them, scoring an arbitrary bank item
  //       (and triggering an LLM/classifier call) on a question they were
  //       never shown.
  //   (2) it has NOT already been answered — no responses row exists for it.
  //
  // Both reads are service-role (question_access_log + responses are not
  // client-readable). Scoped by tenant_id where the table carries it. Run
  // BEFORE loading question content / judging / scoring, so an unserved or
  // already-answered submit does ZERO scoring work and makes no classifier
  // call. Fail closed (500) on a DB error.
  //
  // LANE 2 — DETERMINISTIC IDEMPOTENT RETURN: when (1) holds (the question
  // WAS served) but a responses row already exists, this is a duplicate of a
  // legitimate submit. We do NOT re-insert and do NOT re-score; instead we
  // replay engine state and return the SAME wire shape the original submit
  // produced (duplicateResult). This is the common, sequential duplicate
  // path — caught here, before the classifier call. The rare truly-concurrent
  // race (two submits both clearing this check before either inserts) is
  // caught instead by the UNIQUE(session_id, question_id) constraint at the
  // INSERT (23505 → same duplicateResult). The served-question gate (1) is
  // never bypassed: an UNSERVED question still hard-rejects 403 above and is
  // never replayed.
  // ---------------------------------------------------------------------------
  // Existence check, NOT .maybeSingle(): question_access_log intentionally
  // holds MULTIPLE rows per (tenant, session, question) — every serve writes a
  // new audit row, including resumes and React-Strict-Mode dev double-serves
  // (see questionAccessLog/log.ts: "every serve is a serve … resumes get a NEW
  // log row, not a deduped one"). .maybeSingle() raises PGRST116 on >1 row,
  // which 500'd the FIRST submit whenever the first question had been served
  // twice (the Strict-Mode/resume case). .limit(1) returns a 0-or-1 array and
  // never errors on duplicates; the gate only needs to know a serve EXISTS for
  // this (tenant, session, question), not that exactly one does. Security
  // property is unchanged: ≥1 row ⇒ served; 0 rows ⇒ 403 question_not_served.
  const { data: servedLog, error: servedErr } = await serviceClient
    .from("question_access_log")
    .select("id")
    .eq("tenant_id", parent.tenant_id)
    .eq("session_id", request.session_id)
    .eq("question_id", request.question_id)
    .limit(1);

  if (servedErr) {
    return fail(
      "internal",
      500,
      `served-question check failed: ${servedErr.message}`,
    );
  }
  if (!servedLog || servedLog.length === 0) {
    return fail(
      "question_not_served",
      403,
      "question was not served to this session",
    );
  }

  const { data: existing, error: existingErr } = await serviceClient
    .from("responses")
    .select("id")
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
    // Sequential duplicate of a served, already-answered question. Replay
    // and return the original wire shape (no re-insert, no re-scoring).
    return duplicateResult(
      serviceClient,
      {
        sessionId: request.session_id,
        tenantId: parent.tenant_id,
        childId: session.child_id,
        ip,
        sessionPick,
        subStrandByContentId: short?.subStrandByContentId,
      },
      request.question_id,
      emptyBankStrands,
      comprehensive,
      short,
    );
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
  //
  // NOTE: no `is_active` filter — this loads an already-served question by
  // PK (request.question_id was returned by an earlier pickQuestion call
  // and stamped on question_access_log). Filtering would break submit if
  // the question was deactivated between serve and read.
  // See Item #11 Phase 3 enumeration.
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
  // 10. Misconception classifier (Item #9 Phase 3) — populates the row's
  //     detected_misconceptions[] + audit-version columns. R2 lock: only
  //     runs on incorrect responses (correct → method='none' immediately).
  //     R1 lock: DRAG_DROP returns method='none' (deferred to v1.x).
  //     S2 lock: never throws — internal errors resolve to method='failed'
  //     codes=[] on the row rather than blocking the insert. Stub mode
  //     (default while Anthropic K-8 educational ToS alignment is in
  //     flight per compliance.md §6) returns empty codes for any
  //     haiku-bound input.
  // ---------------------------------------------------------------------------
  const classification = await classify(
    {
      format: question.format,
      strand: question.strand,
      content: question.content,
      answerGiven: request.answer_given,
      isCorrect,
    },
    serviceClient,
    parent.tenant_id,
  );

  // ---------------------------------------------------------------------------
  // 11. Persist (write order documented in the file header).
  // ---------------------------------------------------------------------------

  // (a) INSERT response.
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
    detected_misconceptions: classification.codes,
    misconception_classifier_method: classification.method,
    misconception_classifier_version: classification.version,
  });

  if (insertErr) {
    // Concurrent-race duplicate: a truly-simultaneous submit for the same
    // (session, question) cleared the pre-insert existence check (step 3.6)
    // at the same time as this one, and the OTHER submit's INSERT won. The
    // UNIQUE(session_id, question_id) constraint (migration 20260612090000)
    // makes this INSERT fail with SQLSTATE 23505 instead of landing a
    // duplicate row. We discarded our scoring (the winner's row stands) and
    // return the SAME deterministic wire shape as the sequential duplicate
    // path — exactly one response persists, both callers see one result.
    if (isUniqueViolation(insertErr)) {
      return duplicateResult(
        serviceClient,
        {
          sessionId: request.session_id,
          tenantId: parent.tenant_id,
          childId: session.child_id,
          ip,
          sessionPick,
          subStrandByContentId: short?.subStrandByContentId,
        },
        request.question_id,
        emptyBankStrands,
        comprehensive,
        short,
      );
    }
    return fail("internal", 500, `response insert failed: ${insertErr.message}`);
  }

  // Funnel: a fresh item was answered (this path only runs on a first-time
  // submit — idempotent retries return above without re-inserting).
  // Comprehensive vs short keyed off the session's test_type. Fail-soft.
  after(() =>
    emit(
      serviceClient,
      session.test_type === "comprehensive"
        ? ANALYTICS_EVENTS.COMPREHENSIVE_ITEM_ANSWERED
        : ANALYTICS_EVENTS.SHORT_TEST_ITEM_ANSWERED,
      {
        tenantId: parent.tenant_id,
        childId: session.child_id,
        sessionId: request.session_id,
        props: {
          is_correct: isCorrect,
          question_number: postState.responseCount,
        },
      },
    ),
  );

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

  // (c) Engine-driven termination side-effects. Comprehensive sessions use the
  //     budget/floor/SE rule (reads post-state strand counts from the DB — the
  //     response row from (a) is already persisted, so counts include this
  //     item); short sessions use the short-test coverage+count stop
  //     (shortTestShouldTerminate — soft floor 10, HARD cap 15).
  const term = await decideTermination(
    serviceClient,
    request.session_id,
    postState,
    emptyBankStrands,
    comprehensive,
    short,
  );
  if (term.done) {
    // Floor a railed estimate (all-correct, floor-only run) to the highest level
    // actually served BEFORE the session closes, so the stored current_estimate
    // — and everything that reads it (report, admin roster, placement_created
    // analytics) — agrees on the floored level. No-op for a normal run.
    const finalPlacement = await clampPlacementToServedCeiling(
      serviceClient,
      postState.servedQuestionIds,
      placement,
    );
    if (finalPlacement.overallLevel !== placement.overallLevel) {
      const { error: clampErr } = await serviceClient
        .from("assessment_sessions")
        .update({
          current_estimate: toPlacementEstimateJson(
            finalPlacement,
          ) as unknown as Json,
        })
        .eq("id", request.session_id);
      if (clampErr) {
        return fail(
          "internal",
          500,
          `final estimate clamp failed: ${clampErr.message}`,
        );
      }
    }

    const closeMsg = await closeSession(serviceClient, request.session_id);
    if (closeMsg) return fail("internal", 500, closeMsg);

    emitTestCompleted(
      serviceClient,
      session.test_type,
      parent.tenant_id,
      session.child_id,
      request.session_id,
      postState.responseCount,
      toWireReason(term.reason),
    );
    emitPlacementCreated(
      serviceClient,
      parent.tenant_id,
      session.child_id,
      request.session_id,
      finalPlacement,
      toWireReason(term.reason),
    );
    notifyStaffAssessmentCompleted(
      parent.name,
      session.child_id,
      childRow?.grade_level ?? null,
      origin,
    );

    return success({
      is_correct: isCorrect,
      time_flag: flag.flag,
      done: true,
      response_count: postState.responseCount,
      placement: toPlacementEstimateJson(finalPlacement),
      termination_reason: toWireReason(term.reason),
    });
  }

  // ---------------------------------------------------------------------------
  // (d) Pick next question. If the bank is exhausted in the requested
  //     strand, treat as a 'bank-exhausted' termination: close the
  //     session, return placement, and DO NOT write an audit-log row.
  // ---------------------------------------------------------------------------
  const router = await buildRouter(
    serviceClient,
    request.session_id,
    comprehensive,
    short,
  );
  const pickResult = await pickAndMaybeClose(
    serviceClient,
    {
      sessionId: request.session_id,
      tenantId: parent.tenant_id,
      childId: session.child_id,
      ip,
      sessionPick,
      subStrandByContentId: short?.subStrandByContentId,
    },
    postState,
    emptyBankStrands,
    router,
  );
  if (pickResult.kind === "error") {
    return fail("internal", 500, pickResult.message);
  }
  if (pickResult.kind === "exhausted") {
    emitTestCompleted(
      serviceClient,
      session.test_type,
      parent.tenant_id,
      session.child_id,
      request.session_id,
      postState.responseCount,
      "bank-exhausted",
    );
    emitPlacementCreated(
      serviceClient,
      parent.tenant_id,
      session.child_id,
      request.session_id,
      placement,
      "bank-exhausted",
    );
    notifyStaffAssessmentCompleted(
      parent.name,
      session.child_id,
      childRow?.grade_level ?? null,
      origin,
    );

    return success({
      is_correct: isCorrect,
      time_flag: flag.flag,
      done: true,
      response_count: postState.responseCount,
      placement: toPlacementEstimateJson(placement),
      termination_reason: "bank-exhausted",
    });
  }

  return success({
    is_correct: isCorrect,
    time_flag: flag.flag,
    done: false,
    response_count: postState.responseCount,
    next_request: toNextRequestJson(pickResult.request),
    next_question: await serveQuestion(serviceClient, pickResult.question),
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

/**
 * Read the session's graded responses tagged with their question strand —
 * the input to the ShortTestOutcome. Service-role; no is_active filter (counts
 * reflect what was actually served, same rationale as replayStrandCounts).
 */
async function readOutcomeResponses(
  supabase: SupabaseClient<Database>,
  sessionId: string,
): Promise<OutcomeResponse[]> {
  const { data: respRows, error: rErr } = await supabase
    .from("responses")
    .select("question_id, is_correct")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (rErr) {
    throw new Error(`[short-outcome] responses read failed: ${rErr.message}`);
  }
  const responses = respRows ?? [];
  if (responses.length === 0) return [];

  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const { data: qRows, error: qErr } = await supabase
    .from("questions")
    .select("id, strand")
    .in("id", questionIds);
  if (qErr) {
    throw new Error(`[short-outcome] questions read failed: ${qErr.message}`);
  }
  const strandById = new Map((qRows ?? []).map((q) => [q.id, q.strand] as const));

  const out: OutcomeResponse[] = [];
  for (const r of responses) {
    const strand = strandById.get(r.question_id);
    if (!strand) {
      throw new Error(
        `[short-outcome] response references missing question ${r.question_id}`,
      );
    }
    out.push({ questionId: r.question_id, strand, isCorrect: r.is_correct });
  }
  return out;
}

/**
 * Picker Calibration — compute + persist the ShortTestOutcome on short-test
 * completion (assessment_sessions.short_test_outcome). No-op for comprehensive
 * sessions (gates internally on test_type). Self-contained: re-reads what it
 * needs so closeSession's signature is unchanged. Returns null on success, an
 * error string on failure (caller maps to 500), matching persistSessionSummary.
 *
 *   * measured_level — the engine's placement booklet (placementEstimate's
 *     overall half-grade mapped to the booklet axis). The comprehensive anchor.
 *   * intake_level — the grade-derived booklet (fallback anchor + report label).
 */
async function persistShortTestOutcome(
  supabase: SupabaseClient<Database>,
  sessionId: string,
): Promise<string | null> {
  const { data: sessionRow, error: sErr } = await supabase
    .from("assessment_sessions")
    .select("test_type, child_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (sErr) return `short-outcome session read failed: ${sErr.message}`;
  if (!sessionRow || sessionRow.test_type !== "short") return null;

  const { data: childRow, error: cErr } = await supabase
    .from("children")
    .select("grade_level, birth_year")
    .eq("id", sessionRow.child_id)
    .maybeSingle();
  if (cErr) return `short-outcome child read failed: ${cErr.message}`;

  let state: EngineState;
  try {
    state = await replayEngineState(supabase, sessionId);
  } catch (e) {
    return errorMessage(e);
  }
  const placement = placementEstimate(state);
  const measuredOrd = bookletOrdinalForHalfGrade(placement.overallLevel);

  const anchor = anchorBookletForChild(
    childRow?.grade_level ?? null,
    childRow?.birth_year ?? Number.NaN,
  );
  const intakeLevel = Number.isFinite(anchor) ? BOOKLET_LEVELS[anchor] : undefined;
  const measuredLevel =
    measuredOrd !== null ? BOOKLET_LEVELS[measuredOrd] : undefined;
  // Both fall back to whichever resolved, then to the axis floor — there is
  // always SOME label even for a degenerate (no-grade, empty) session.
  const resolvedIntake = intakeLevel ?? measuredLevel ?? BOOKLET_LEVELS[0];
  const resolvedMeasured = measuredLevel ?? resolvedIntake;

  let responses: OutcomeResponse[];
  try {
    responses = await readOutcomeResponses(supabase, sessionId);
  } catch (e) {
    return errorMessage(e);
  }

  const outcome = deriveShortTestOutcome({
    measuredLevel: resolvedMeasured,
    intakeLevel: resolvedIntake,
    responses,
  });

  const { error: upErr } = await supabase
    .from("assessment_sessions")
    .update({ short_test_outcome: outcome as unknown as Json })
    .eq("id", sessionId);
  if (upErr) return `short-outcome update failed: ${upErr.message}`;
  return null;
}

/**
 * Funnel: emit the test-completed event off the response path. Comprehensive
 * vs short is keyed off the session's test_type. Called only from the two
 * FRESH-submit terminal paths (engine-terminated and bank-exhausted), never
 * the idempotent-retry branches — so one completed event per session.
 * Fail-soft via emit().
 */
function emitTestCompleted(
  serviceClient: SupabaseClient<Database>,
  testType: Database["public"]["Enums"]["assessment_test_type"],
  tenantId: string,
  childId: string,
  sessionId: string,
  questionCount: number,
  reason: TerminationReasonWire,
): void {
  after(() =>
    emit(
      serviceClient,
      testType === "comprehensive"
        ? ANALYTICS_EVENTS.COMPREHENSIVE_TEST_COMPLETED
        : ANALYTICS_EVENTS.SHORT_TEST_COMPLETED,
      {
        tenantId,
        childId,
        sessionId,
        props: { question_count: questionCount, termination_reason: reason },
      },
    ),
  );
}

/**
 * Funnel: emit placement_recommendation_created on session completion,
 * UNCONDITIONAL of test_type — a placement is created on completion either
 * way. Fired once per session from the same two terminal paths as
 * emitTestCompleted. Props are PII-free scalars derived from the placement
 * estimate (the half-grade level the engine settled on + the termination
 * reason); no child free text. Fail-soft via emit().
 */
function emitPlacementCreated(
  serviceClient: SupabaseClient<Database>,
  tenantId: string,
  childId: string,
  sessionId: string,
  placement: PlacementEstimate,
  reason: TerminationReasonWire,
): void {
  after(() =>
    emit(serviceClient, ANALYTICS_EVENTS.PLACEMENT_RECOMMENDATION_CREATED, {
      tenantId,
      childId,
      sessionId,
      props: { sam_level: placement.overallLevel, termination_reason: reason },
    }),
  );
}

/**
 * Staff alert: tell the center a child finished an assessment. Fired from the
 * SAME two fresh-submit terminal paths as emitTestCompleted (engine-terminated
 * and bank-exhausted) and never from the idempotent-retry branches, which is
 * what makes it ONCE PER COMPLETED SESSION:
 *   - a sequential retry after the close is rejected 409 (`session_completed`)
 *     long before either terminal path,
 *   - a concurrent duplicate of the same final answer loses the INSERT on
 *     23505 and returns via duplicateResult(), which deliberately emits
 *     nothing.
 *
 * COPPA: the payload is the explicit allowlist on AssessmentCompletedAlert —
 * parent name, child GRADE, and the staff record link. No score, level, strand
 * mastery, misconception flag, response, narrative, child name or DOB is read
 * here, let alone sent. The child's grade is already in hand from the earlier
 * `children` read; nothing extra is fetched.
 *
 * Non-blocking: wrapped in `after()` so the send happens once the submit
 * response is already on the wire — the child is staring at the end-of-
 * assessment screen and must not wait on Resend. notifyAssessmentCompleted
 * never throws; the trailing catch is belt-and-suspenders.
 */
function notifyStaffAssessmentCompleted(
  parentName: string,
  childId: string,
  childGrade: string | null,
  origin: string | null,
): void {
  const path = `/instructor/student/${childId}`;
  after(() =>
    notifyAssessmentCompleted({
      parentName,
      childGrade,
      studentUrl: origin ? `${origin}${path}` : path,
    }).catch(() => undefined),
  );
}

/**
 * Termination decision for a session — comprehensive- and short-aware.
 *   * Comprehensive sessions use the budget/floor/SE rule (hardCap 26/36).
 *   * Short sessions use `shortTestShouldTerminate` — the coverage+count stop
 *     with the AGREED short-test length: soft floor 10, HARD cap 15. This is the
 *     uniform cap for every level/band; a deep eligible pool never lets a short
 *     test run past 15.
 *   * Only a short session with NO usable band anchor (no grade AND no
 *     birth_year — not reachable in prod, where birth_year is NOT NULL) falls to
 *     the legacy `shouldTerminate`; even there we keep the 15 hard cap so a short
 *     test can never exceed 15.
 * `state` is the post-state (the just-inserted response already applied/replayed).
 */
async function decideTermination(
  serviceClient: SupabaseClient<Database>,
  sessionId: string,
  state: EngineState,
  emptyBankStrands: ReadonlySet<Strand>,
  comprehensive: ComprehensiveContext | null,
  short: ShortContext | null,
): Promise<TerminationDecision> {
  if (comprehensive) {
    const strandCounts = await replayStrandCounts(serviceClient, sessionId);
    return comprehensiveShouldTerminate({
      state,
      strandCounts,
      inScopeStrands: comprehensive.inScopeStrands,
      budget: comprehensive.budget,
    });
  }
  if (short) {
    const strandCounts = await replayStrandCounts(serviceClient, sessionId);
    return shortTestShouldTerminate({
      state,
      strandCounts,
      availableByStrand: short.availableByStrand,
    });
  }
  // No usable band anchor (degenerate short session — not reachable in prod).
  // Still enforce the short-test HARD cap of 15 so a short test can never exceed
  // it; below the cap, defer to the legacy confidence/exhaustion rule.
  if (state.responseCount >= SHORT_TEST_CONFIG.hardCap) {
    return { done: true, reason: "max-questions-reached" };
  }
  return shouldTerminate(state, emptyBankStrands);
}

/**
 * Build the next-question router for the pick loop. Short sessions route via
 * engine.nextQuestionRequest; comprehensive sessions route via the phase-1/
 * phase-2 comprehensive router with the session's post-state strand counts.
 * The strand counts are read once here (the loop only excludes strands, never
 * adds served items, so counts are stable across loop iterations).
 */
async function buildRouter(
  serviceClient: SupabaseClient<Database>,
  sessionId: string,
  comprehensive: ComprehensiveContext | null,
  short: ShortContext | null,
): Promise<
  (state: EngineState, excluded: ReadonlySet<Strand>) => NextQuestionRequest | null
> {
  if (comprehensive) {
    const strandCounts = await replayStrandCounts(serviceClient, sessionId);
    return (state, excluded) =>
      comprehensiveNextQuestionRequest({
        state,
        strandCounts,
        inScopeStrands: comprehensive.inScopeStrands,
        excludedStrands: excluded,
        perStrandFloorN: comprehensive.budget.perStrandFloorN,
      });
  }
  if (short) {
    const strandCounts = await replayStrandCounts(serviceClient, sessionId);
    const availableByStrand = short.availableByStrand;
    return (state, excluded) =>
      shortTestNextQuestionRequest({
        state,
        strandCounts,
        availableByStrand,
        excludedStrands: excluded,
      });
  }
  // No usable band anchor — legacy short behaviour.
  return (state, excluded) => nextQuestionRequest(state, excluded);
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

function isUniqueViolation(err: { code?: string } | unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: string }).code === "23505";
  }
  return false;
}

// ---------------------------------------------------------------------------
// Deterministic idempotent return (Lane 2)
// ---------------------------------------------------------------------------

/**
 * Reconstruct the SAME wire response the original successful submit produced,
 * WITHOUT re-inserting or re-scoring. Reached from two places (step 3.6
 * existence check, and the INSERT 23505 race), so a duplicate submit —
 * sequential OR concurrent — is idempotent on the wire rather than an error.
 *
 * The persisted response row is the source of truth: we re-read its
 * is_correct / time_flag (the body echoes them) and replay engine state from
 * `responses` (which already reflects that row) to recompute done +
 * next_question / placement. This restores the pre-Lane-1 "Option A" idempotent
 * path, but now only reachable AFTER the served-question gate (step 3.6) has
 * proven the question was legitimately served — an unserved question is
 * rejected 403 and never replayed.
 *
 * For the non-terminal case we prefer the OUTSTANDING question (the next
 * question the original call already picked + audit-logged) over re-picking,
 * so a duplicate writes no second question_access_log row (compliance §8: a
 * retry of a successful response is not a new serve). If no outstanding row
 * exists (the original call crashed between (b) and (d) before logging), we
 * fall through to the same pick-and-log path as a fresh non-terminal submit.
 */
async function duplicateResult(
  serviceClient: SupabaseClient<Database>,
  ctx: PickContext,
  questionId: string,
  emptyBankStrands: ReadonlySet<Strand>,
  comprehensive: ComprehensiveContext | null,
  short: ShortContext | null,
): Promise<SubmitHandlerResult> {
  const { data: row, error: rowErr } = await serviceClient
    .from("responses")
    .select("is_correct, time_flag")
    .eq("session_id", ctx.sessionId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (rowErr) {
    return fail("internal", 500, `duplicate read failed: ${rowErr.message}`);
  }
  if (!row) {
    // The persisted row vanished between the conflict and this read — only
    // possible via a concurrent delete, which the app never issues. Fail
    // closed rather than fabricate a result.
    return fail("internal", 500, "duplicate response row not found on replay");
  }

  // Replay reflects the existing row, so the resulting state IS the
  // post-submit state.
  let state: EngineState;
  try {
    state = await replayEngineState(serviceClient, ctx.sessionId);
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }

  let term: TerminationDecision;
  try {
    term = await decideTermination(
      serviceClient,
      ctx.sessionId,
      state,
      emptyBankStrands,
      comprehensive,
      short,
    );
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }

  if (term.done) {
    return success({
      is_correct: row.is_correct,
      time_flag: row.time_flag,
      done: true,
      response_count: state.responseCount,
      placement: toPlacementEstimateJson(placementEstimate(state)),
      termination_reason: toWireReason(term.reason),
    });
  }

  const router = await buildRouter(
    serviceClient,
    ctx.sessionId,
    comprehensive,
    short,
  );

  let outstanding: PickedQuestionRow | null;
  try {
    outstanding = await findOutstandingQuestion(serviceClient, ctx.sessionId);
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }

  if (outstanding) {
    // next_request for the outstanding-question case is the engine's current
    // ask, excluding empty-bank strands. null here would mean every strand is
    // empty AND term.done was false — a contradiction (decideTermination would
    // have fired bank-exhausted). Defensive 500 if it ever does.
    const outstandingReq = router(state, emptyBankStrands);
    if (outstandingReq === null) {
      return fail("internal", 500, "next_request not computable on outstanding");
    }
    return success({
      is_correct: row.is_correct,
      time_flag: row.time_flag,
      done: false,
      response_count: state.responseCount,
      next_request: toNextRequestJson(outstandingReq),
      next_question: await serveQuestion(serviceClient, outstanding),
    });
  }

  // No outstanding row — the original call crashed between (b) and (d).
  // Fall through to the same pick-and-log path as a fresh non-terminal submit.
  const retryPick = await pickAndMaybeClose(
    serviceClient,
    ctx,
    state,
    emptyBankStrands,
    router,
  );
  if (retryPick.kind === "error") {
    return fail("internal", 500, retryPick.message);
  }
  if (retryPick.kind === "exhausted") {
    return success({
      is_correct: row.is_correct,
      time_flag: row.time_flag,
      done: true,
      response_count: state.responseCount,
      placement: toPlacementEstimateJson(placementEstimate(state)),
      termination_reason: "bank-exhausted",
    });
  }
  return success({
    is_correct: row.is_correct,
    time_flag: row.time_flag,
    done: false,
    response_count: state.responseCount,
    next_request: toNextRequestJson(retryPick.request),
    next_question: await serveQuestion(serviceClient, retryPick.question),
  });
}

// ---------------------------------------------------------------------------
// Picker integration helpers
// ---------------------------------------------------------------------------

interface PickContext {
  sessionId: string;
  tenantId: string;
  childId: string;
  ip: string | null;
  /** Drives the level-lock band + picker choice on the next pick. */
  sessionPick: SessionPickParams;
  /** Task 3 — short-test AXIS-B sub-strand coverage map (content_id →
   *  sub-strand code), present only for short sessions with a resolvable band.
   *  pickAndMaybeClose derives the session's served sub-strand set from it and
   *  feeds both to pickForSession so the short picker spreads coverage. */
  subStrandByContentId?: ReadonlyMap<string, string>;
}

type PickAndMaybeCloseResult =
  | {
      kind: "picked";
      question: PickedQuestionRow;
      /** The engine's request that produced this question. Item #12 Phase 7.5:
       *  surfaced because the loop may have advanced past one or more exhausted
       *  strands before finding a servable one — the caller can no longer
       *  re-derive this by calling nextQuestionRequest(state) without the
       *  exhausted-strand context. */
      request: NextQuestionRequest;
    }
  | { kind: "exhausted" }
  | { kind: "error"; message: string };

/**
 * Iterate engine → picker → engine until a strand serves OR every strand
 * is exhausted. Pre-seeded with `initiallyExcluded` (typically the empty-
 * bank strands from discoverEmptyBankStrands) so we don't waste picker
 * round-trips on strands the bank can never serve. Each strand-exhausted
 * result is added to a local working set and the engine re-asked for the
 * next-best strand — bank-exhausted termination fires only when ALL
 * strands have been excluded.
 *
 * Item #12 Phase 7.5: pre-Phase-7.5 this helper made one pick attempt
 * and bank-exhausted on the first empty strand. With the engine collapse
 * from Item #12 reducing populated strands from 3 → 2, that single-shot
 * behaviour terminated sessions at Q2 once fractions_decimals (slot 3
 * in STRAND_ORDER) was requested. The loop here is the fix.
 *
 * Idempotent retry note: if the session is ALREADY COMPLETED (e.g., a
 * prior call hit bank-exhausted), the close UPDATE here re-stamps
 * completed_at to a fresh now(). Acceptable v1 drift; readers shouldn't
 * rely on completed_at being the moment of first-close.
 */
async function pickAndMaybeClose(
  serviceClient: SupabaseClient<Database>,
  ctx: PickContext,
  postState: ReturnType<typeof applyResponse>,
  initiallyExcluded: ReadonlySet<Strand>,
  router: (
    state: EngineState,
    excluded: ReadonlySet<Strand>,
  ) => NextQuestionRequest | null,
): Promise<PickAndMaybeCloseResult> {
  const excludedStrands = new Set<Strand>(initiallyExcluded);

  // Task 3 — short-test AXIS-B coverage. Resolve the session's already-served
  // sub-strands once (the served set is stable across loop iterations: the loop
  // only advances past exhausted engine strands, never answers an item). The
  // short picker prefers a candidate whose sub-strand isn't in this set, so the
  // served set spreads across the report's sub-strands before deepening any one.
  // Absent map (comprehensive, or short with no taxonomy) ⇒ no coverage signal.
  let servedSubStrands: ReadonlySet<string> | undefined;
  if (ctx.subStrandByContentId && ctx.subStrandByContentId.size > 0) {
    try {
      servedSubStrands = await discoverServedSubStrands(
        serviceClient,
        ctx.sessionId,
        ctx.subStrandByContentId,
      );
    } catch (e) {
      return { kind: "error", message: errorMessage(e) };
    }
  }

  // Bounded by STRANDS.length (6 in v1). The loop terminates when either
  // the engine returns null (every strand excluded) or the picker succeeds.
  // `router` is engine.nextQuestionRequest for short sessions and the
  // comprehensive router for comprehensive ones (comprehensive-engine lane).
  while (true) {
    const req = router(postState, excludedStrands);
    if (req === null) {
      // Every strand exhausted — close the session and signal.
      const closeMsg = await closeSession(serviceClient, ctx.sessionId);
      if (closeMsg) return { kind: "error", message: closeMsg };
      return { kind: "exhausted" };
    }

    let pick;
    try {
      pick = await pickForSession(
        serviceClient,
        req,
        {
          tenantId: ctx.tenantId,
          servedQuestionIds: postState.servedQuestionIds,
          subStrandByContentId: ctx.subStrandByContentId,
          servedSubStrands,
        },
        ctx.sessionPick,
      );
    } catch (e) {
      return { kind: "error", message: errorMessage(e) };
    }

    if (!pick.ok) {
      // Strand-exhausted (zero candidates OR all candidates already
      // served) — record and try the next-best strand.
      excludedStrands.add(req.strand);
      continue;
    }

    try {
      await logQuestionServe(serviceClient, {
        tenantId: ctx.tenantId,
        sessionId: ctx.sessionId,
        childId: ctx.childId,
        questionId: pick.question.id,
        ip: ctx.ip,
      });
    } catch (e) {
      return { kind: "error", message: errorMessage(e) };
    }

    return { kind: "picked", question: pick.question, request: req };
  }
}

/**
 * Close the session: (c1) status=COMPLETED + completed_at, (c2) aggregate
 * time-flag summary, (c3) fire the narration trigger fire-and-forget.
 * Returns null on success, an error string on failure (caller maps to 500).
 *
 * (c3) — Item #16 Piece 5 — generates the report narration off the just-
 * completed session and writes it to report_narrations. Fire-and-forget
 * via Next.js `after()` (Next 16's canonical equivalent of `waitUntil` —
 * it registers a callback to keep running past the response). This is
 * essential: the closing submit happens while the CHILD is staring at
 * the assessment-end screen; awaiting Sonnet's 5-15s live generation
 * would freeze that transition. Fire-and-forget makes (c3) zero-latency
 * to the submit response; the narration row lands shortly after.
 *
 * If a parent opens the report before the row lands, the page renders
 * data-only (the Piece 4 resolver treats no-row as no-prose).
 *
 * attemptNarration is fully try/caught internally and never rejects, so
 * the inner promise can't surface as an unhandled rejection. The trailing
 * .catch(() => undefined) is belt-and-suspenders only.
 */
async function closeSession(
  serviceClient: SupabaseClient<Database>,
  sessionId: string,
): Promise<string | null> {
  const { error: closeErr } = await serviceClient
    .from("assessment_sessions")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (closeErr) return `session close failed: ${closeErr.message}`;

  const summaryErr = await persistSessionSummary(serviceClient, sessionId);
  if (summaryErr) return summaryErr;

  // Persist the ShortTestOutcome hand-off surface for short sessions (no-op for
  // comprehensive). Done synchronously before narration so the comprehensive
  // picker can read it as soon as the session is COMPLETED.
  const outcomeErr = await persistShortTestOutcome(serviceClient, sessionId);
  if (outcomeErr) return outcomeErr;

  // (c3) Narration — fire-and-forget. The `after()` callback runs after
  // the response is sent; the runtime keeps the function alive until it
  // resolves.
  after(() =>
    attemptNarration(serviceClient, sessionId).catch(() => undefined),
  );

  return null;
}

function toWireReason(
  r: TerminationDecision["reason"],
): TerminationReasonWire {
  switch (r) {
    case "confidence-threshold-met":
    case "max-questions-reached":
    case "bank-exhausted":
      return r;
    case "in-progress":
      // Defensive: shouldTerminate only returns 'in-progress' alongside
      // done=false. Reaching here means a caller mistakenly mapped a
      // non-terminal state to a wire response.
      throw new Error("[submit] cannot serialize 'in-progress' reason");
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "unknown";
}
