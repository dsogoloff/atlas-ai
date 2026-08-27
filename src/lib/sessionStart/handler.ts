// Atlas Assessment — POST /api/assess/start orchestrator.
//
// Lives outside src/app/ so it's testable without spinning up Next.js.
// The route handler (src/app/api/assess/start/route.ts) is a thin shell:
// parses JSON via StartRequestSchema, builds the two Supabase clients,
// extracts the client IP from the request headers, and calls
// sessionStartHandler.
//
// =============================================================================
// Auth and ownership chain
// =============================================================================
//
// Mirrors src/lib/responseSubmit/handler.ts. rlsClient is user-scoped:
//
//   1. auth.getUser()                              ← server-validated session
//   2. SELECT parents WHERE auth_user_id = $1     ← exactly the calling parent
//   3. SELECT children WHERE id = $1 AND parent_id = $2
//      (explicit parent_id eq, not RLS alone — same dual-role bypass risk
//      called out in responseSubmit/handler.ts: a parent who is ALSO an
//      active instructor at a center where another parent's child is
//      enrolled would otherwise be allowed to start an assessment for
//      that other child via the OR'd RLS policy. The strict parent_id
//      check closes that gap.)
//
// serviceClient bypasses RLS for: assessment_sessions writes/reads,
// questions reads (compliance §8), responses reads (replay), and
// question_access_log writes (audit).
//
// =============================================================================
// Resume path (existing IN_PROGRESS session)
// =============================================================================
//
// If the child already has an IN_PROGRESS session (per the partial unique
// index added in 20260507000300):
//
//   a. findOutstandingQuestion() returns the most-recent served-but-
//      unanswered question, if any. We re-serve it (writing a NEW
//      access-log row per compliance §8 — see findOutstanding.ts).
//   b. If everything served was also answered (rare half-state — would
//      mean the prior submit's session-close failed between (a) insert
//      and (c1) status update), replay the engine state and pick the
//      next question normally. If termination is reached or the picker
//      exhausts, close the session and surface bank_unservable.
//
// The body shape depends on whether the resumed session has any actual
// progress (≥1 row in `responses` for the session):
//
//   * has-progress  → 200 + body.resumed === true
//     (the client shows a "resumed your previous session" banner).
//   * no-progress   → 200, no body.resumed field
//     (the session row exists from a prior /start whose first question
//     was served but never answered — often React Strict Mode's dev-only
//     double-invocation of the start effect. Showing a resume banner
//     here is visually wrong because nothing was actually attempted.)
//
// HISTORY (P3 session-resume loop): the has-progress case used to be
// HTTP 409 + body.error.code "session_in_progress". Encoding the resume
// as an error status meant any layer keying off the status line treated
// a successful resume as a FAILURE — a child returning mid-assessment
// saw "Something went wrong", and Try again re-fired /start into the
// same live session and the same 409, forever (the partial unique index
// guarantees no fresh session can replace an IN_PROGRESS one, so the
// loop was sterile by construction). Resume is a success: both cases
// now return 200, and "you resumed" travels as data (body.resumed).
//
// The boundary is `responses` count, not session age: a same-millisecond
// resume of a zero-response session reads as "fresh" to the parent, and
// a week-old session with one answered question reads as "resumed".
//
// =============================================================================
// First-pick exhaustion rollback
// =============================================================================
//
// When a brand-new session's first picker call returns strand-exhausted
// (today: any first call into measurement or data_statistics — bank
// has zero items for those strands), we MUST roll back the just-inserted session row
// rather than leaving an orphaned IN_PROGRESS that would block all
// future starts (the unique index forbids a second). Implemented as a
// best-effort DELETE on the service client; if the DELETE fails we
// still return 422 to the client and log a warning so an out-of-band
// sweep can clean up.
//
// =============================================================================
// Concurrency on session insert
// =============================================================================
//
// Two near-simultaneous /start calls for the same child both pass the
// existence check and INSERT; the partial unique index forces one to
// fail with Postgres 23505 (unique_violation). We catch that and treat
// it as the resume path (the other request won the race). This is the
// reason the migration is part of this same change.

import "server-only";

import { after } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emit } from "@/lib/analytics/emit";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { isComprehensivePilotEnabled } from "@/lib/env";
import {
  comprehensiveNextQuestionRequest,
  comprehensiveBudget,
} from "@/lib/engine/comprehensive";
import {
  MAX_QUESTIONS,
  createEngineState,
  nextQuestionRequest,
  shouldTerminate,
} from "@/lib/engine/engine";
import { SHORT_TEST_CONFIG } from "@/lib/engine/shortTest";
import { STRANDS } from "@/lib/engine/levels";
import { ACTIVE_PRIOR_VERSION, PRIORS_V1 } from "@/lib/engine/priors";
import type {
  GradeKey,
  NextQuestionRequest,
  Strand,
} from "@/lib/engine/types";
import { deriveTier } from "@/lib/tier/derive";
import { logQuestionServe } from "@/lib/questionAccessLog/log";
import {
  discoverEmptyBankStrands,
  discoverShortEligibleCounts,
} from "@/lib/questionPicker/picker";
import {
  anchorBookletForChild,
  shortTestLevelBand,
} from "@/lib/questionPicker/levelBand";
import { serveQuestion } from "@/lib/questionPicker/serveQuestion";
import {
  pickForSession,
  type SessionTestType,
} from "@/lib/questionPicker/pickForSession";
import type { PickedQuestionRow } from "@/lib/questionPicker/types";
import { hasValidConsent } from "@/lib/consent/verify";
import { replayEngineState } from "@/lib/responseSubmit/replay";
import { toNextRequestJson } from "@/lib/responseSubmit/types";
import { syncHubSpotAssessmentMilestone } from "@/lib/hubspot/syncContact";
import { notifyAssessmentStarted } from "@/lib/staffAlerts/notify";
import type { Database } from "@/lib/supabase/database.types";
import { findOutstandingQuestion } from "@/lib/sessionShared/findOutstanding";

import {
  type StartErrorCode,
  type StartHandlerResult,
  type StartRequest,
} from "./types";

interface HandlerInput {
  request: StartRequest;
  rlsClient: SupabaseClient<Database>;
  serviceClient: SupabaseClient<Database>;
  /** Client IP from extractClientIp(); null if no trusted header was
   *  present. Forwarded to question_access_log inserts. */
  ip: string | null;
  /** Canonical origin (e.g. https://app.samnewyork.com), used ONLY to build the
   *  absolute staff-record link in the assessment-STARTED staff alert. Null
   *  degrades that link to a bare path — the alert still sends. Same contract
   *  as responseSubmit/handler.ts, and the same reason the handler stays
   *  origin-agnostic: the trust decision belongs at the route boundary. */
  origin?: string | null;
}

export async function sessionStartHandler({
  request,
  rlsClient,
  serviceClient,
  ip,
  origin = null,
}: HandlerInput): Promise<StartHandlerResult> {
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
    // `name` feeds the assessment-STARTED staff alert only (see
    // lib/staffAlerts/notify.ts) — it is the sole parent field that leaves the
    // box on this path. Mirrors the identical select in responseSubmit/handler.
    .select("id, tenant_id, name")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (parentErr) {
    return fail("internal", 500, `parent lookup failed: ${parentErr.message}`);
  }
  if (!parent) {
    return fail("unauthorized", 401, "no parent row for caller");
  }

  // Item #12 Phase 7.5: pre-discover empty-bank strands once per request.
  // Threaded into the first-pick loop AND through resumeExisting so the
  // engine skips strands the bank cannot serve instead of bank-exhausting
  // on the first empty slot. See pickAndMaybeStartLoop below + the
  // mirror loop in responseSubmit/handler.ts.
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
  // 2. Child — explicit parent_id eq closes the dual-role-bypass gap.
  // ---------------------------------------------------------------------------
  const { data: child, error: childErr } = await rlsClient
    .from("children")
    .select("id, grade_level, birth_year")
    .eq("id", request.child_id)
    .eq("parent_id", parent.id)
    .maybeSingle();

  if (childErr) {
    return fail("internal", 500, `child lookup failed: ${childErr.message}`);
  }
  if (!child) {
    return fail("child_not_found", 404, "child not found for caller");
  }

  // ---------------------------------------------------------------------------
  // 2.5 Consent gate (M2 readiness / COPPA Gate-B).
  //
  // A child assessment may not begin without a valid, unrevoked PER-CHILD
  // parental consent record (Model B): the gate requires consent for THIS
  // specific child — consent for a sibling does not count. Runs server-side
  // and is not bypassable (the route handler is a thin shell). A
  // "consent_required" code routes the parent to the consent flow.
  // ---------------------------------------------------------------------------
  let consentOk: boolean;
  try {
    consentOk = await hasValidConsent(serviceClient, {
      tenantId: parent.tenant_id,
      parentId: parent.id,
      childId: child.id,
    });
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }
  if (!consentOk) {
    return fail(
      "consent_required",
      403,
      "parental consent required before assessment; complete the consent screen",
    );
  }

  // Effective test type. Comprehensive ONLY when the request asked for it AND
  // the pilot flag is on; otherwise fail safe to the short test (even if the
  // request asked for comprehensive while the flag is off).
  const testType: "short" | "comprehensive" =
    request.comprehensive === true && isComprehensivePilotEnabled()
      ? "comprehensive"
      : "short";

  // ---------------------------------------------------------------------------
  // 3. Existing IN_PROGRESS session?
  // ---------------------------------------------------------------------------
  const existing = await readInProgressSession(serviceClient, child.id);
  if (existing.error) {
    return fail("internal", 500, existing.error);
  }

  if (existing.row) {
    return resumeExisting({
      serviceClient,
      tenantId: parent.tenant_id,
      childId: child.id,
      sessionId: existing.row.id,
      ip,
      emptyBankStrands,
      testType: existing.row.test_type,
      gradeLevel: child.grade_level,
      birthYear: child.birth_year,
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Fresh session — insert. Lost-the-race ⇒ resume path.
  // ---------------------------------------------------------------------------
  const { data: inserted, error: insertErr } = await serviceClient
    .from("assessment_sessions")
    .insert({
      tenant_id: parent.tenant_id,
      child_id: child.id,
      status: "IN_PROGRESS",
      engine_prior_version: ACTIVE_PRIOR_VERSION,
      test_type: testType,
    })
    .select("id")
    .single();

  if (insertErr) {
    // Postgres 23505 = unique_violation. The partial index on
    // (child_id) WHERE status='IN_PROGRESS' fires when a concurrent
    // /start won the race. Re-read and resume.
    if (isUniqueViolation(insertErr)) {
      const retry = await readInProgressSession(serviceClient, child.id);
      if (retry.error) return fail("internal", 500, retry.error);
      if (retry.row) {
        return resumeExisting({
          serviceClient,
          tenantId: parent.tenant_id,
          childId: child.id,
          sessionId: retry.row.id,
          ip,
          emptyBankStrands,
          testType: retry.row.test_type,
          gradeLevel: child.grade_level,
          birthYear: child.birth_year,
        });
      }
      // Race winner deleted the session before we re-read — treat as
      // a transient failure rather than infinite-looping. Client retry
      // will create a fresh one.
      return fail(
        "internal",
        500,
        "concurrent start collision; retry the request",
      );
    }
    return fail("internal", 500, `session insert failed: ${insertErr.message}`);
  }

  const sessionId = inserted.id;

  // ---------------------------------------------------------------------------
  // 5. First pick on a fresh session (engine state = empty).
  //
  // Item #12 Phase 7.5: loop instead of single-shot. Pre-seeded with
  // empty-bank strands so the engine doesn't waste a picker round-trip
  // on a strand the bank can never serve. Continues advancing until
  // either (a) the picker serves OR (b) every strand is excluded
  // (truly bank-unservable for this tenant).
  // ---------------------------------------------------------------------------
  // Comprehensive parameterization (comprehensive-engine lane):
  // priors are identical to short (createEngineState below). What differs for
  // a comprehensive session is the FIRST-pick router — short uses the engine's
  // pure max-variance nextQuestionRequest; comprehensive uses the phase-1
  // coverage-floor router (comprehensiveNextQuestionRequest) so the very first
  // item already targets the per-strand floor. The budget / stopping rule
  // reparameterization lives downstream in responseSubmit; this hook only
  // changes which strand the first question comes from.
  const state = createEngineState({
    grade: child.grade_level as GradeKey | null,
    config: PRIORS_V1,
  });

  // In-scope strands for comprehensive routing: every strand minus the
  // empty-bank ones (the in-scope-band approximation documented in
  // comprehensive.ts). For comprehensive, derive the per-strand floor from the
  // child's tier.
  const inScopeStrands =
    testType === "comprehensive"
      ? new Set<Strand>(STRANDS.filter((s) => !emptyBankStrands.has(s)))
      : null;
  const comprehensivePerStrandFloorN =
    testType === "comprehensive"
      ? comprehensiveBudget(
          deriveTier({
            grade_level: child.grade_level,
            birth_year: child.birth_year,
          }),
        ).perStrandFloorN
      : 0;

  const excludedStrands = new Set<Strand>(emptyBankStrands);
  let pickedQuestion: PickedQuestionRow | null = null;
  let pickedRequest: NextQuestionRequest | null = null;
  let lastAttemptedStrand: Strand | null = null;

  while (true) {
    const req =
      testType === "comprehensive" && inScopeStrands !== null
        ? comprehensiveNextQuestionRequest({
            state,
            strandCounts: {},
            inScopeStrands,
            excludedStrands,
            perStrandFloorN: comprehensivePerStrandFloorN,
          })
        : nextQuestionRequest(state, excludedStrands);
    if (req === null) {
      // No strand can serve. Roll back and surface 422.
      break;
    }
    lastAttemptedStrand = req.strand;

    const pick = await pickForSession(
      serviceClient,
      req,
      {
        tenantId: parent.tenant_id,
        servedQuestionIds: state.servedQuestionIds,
      },
      {
        testType,
        gradeLevel: child.grade_level,
        birthYear: child.birth_year,
      },
    );

    if (pick.ok) {
      pickedQuestion = pick.question;
      pickedRequest = req;
      break;
    }

    excludedStrands.add(req.strand);
  }

  if (pickedQuestion === null || pickedRequest === null) {
    // First-pick exhaustion across ALL strands — roll back the just-
    // inserted session. Best-effort DELETE: a failure leaves an
    // orphaned IN_PROGRESS row that the unique index would block
    // future starts on. Log loudly so an out-of-band sweep can find
    // it; still return 422 to the client.
    const { error: delErr } = await serviceClient
      .from("assessment_sessions")
      .delete()
      .eq("id", sessionId);
    if (delErr) {
      console.error("[start] orphan session rollback failed", {
        session_id: sessionId,
        err: delErr.message,
      });
    }
    return fail(
      "bank_unservable",
      422,
      `bank exhausted on first pick (last strand=${lastAttemptedStrand ?? "none"})`,
    );
  }

  // ---------------------------------------------------------------------------
  // 6. Audit log + success.
  // ---------------------------------------------------------------------------
  try {
    await logQuestionServe(serviceClient, {
      tenantId: parent.tenant_id,
      sessionId,
      childId: child.id,
      questionId: pickedQuestion.id,
      ip,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return fail("internal", 500, msg);
  }

  // Funnel: a NEW assessment actually began (fresh session + first question
  // served). Resume paths deliberately don't emit this. Comprehensive vs short
  // is keyed off the session's test_type. Fail-soft, off the response path.
  after(() =>
    emit(
      serviceClient,
      testType === "comprehensive"
        ? ANALYTICS_EVENTS.COMPREHENSIVE_TEST_STARTED
        : ANALYTICS_EVENTS.SHORT_TEST_STARTED,
      {
        tenantId: parent.tenant_id,
        childId: child.id,
        sessionId,
      },
    ),
  );

  // Staff alert: tell the center a child just STARTED an assessment. Fired from
  // the SAME fresh-session seam as the started analytics event above, which is
  // exactly what makes it ONCE PER SESSION — every re-entry route returns long
  // before this line:
  //   - a resume/refresh finds the IN_PROGRESS row at step 3 and returns via
  //     resumeExisting(),
  //   - a concurrent duplicate /start loses the INSERT on 23505 and also
  //     returns via resumeExisting(),
  //   - a first-pick exhaustion rolls the session back and returns 422 above.
  // The partial unique index on (child_id) WHERE status='IN_PROGRESS'
  // guarantees no second fresh session can exist while one is open, so there is
  // no path that reaches here twice for the same session.
  notifyStaffAssessmentStarted(
    parent.name,
    child.id,
    child.grade_level,
    origin,
  );

  // HubSpot Contract A / D-0061: stamp assessment_started_date on the parent's
  // EXISTING contact. Same once-per-session seam as the alert above. Sends a
  // TIMESTAMP and the account id only — no level, band, score or strand data,
  // and the payload type cannot carry any. Update-only: when no contact bears
  // this atlas_account_id the sync logs and returns without creating one, so an
  // account-less session can never produce a CRM record.
  after(() =>
    syncHubSpotAssessmentMilestone({
      accountId: parent.id,
      milestone: "started",
      occurredAt: new Date().toISOString(),
    }).catch(() => undefined),
  );

  // Fresh-session first pick: no responses persisted yet, so the served
  // question is question 1 (response_count + 1 = 1).
  const maxQuestions = await computeMaxQuestions({
    serviceClient,
    tenantId: parent.tenant_id,
    testType,
    gradeLevel: child.grade_level,
    birthYear: child.birth_year,
  });
  return {
    ok: true,
    status: 200,
    body: {
      session_id: sessionId,
      question: await serveQuestion(serviceClient, pickedQuestion),
      next_request: toNextRequestJson(pickedRequest),
      response_count: 0,
      max_questions: maxQuestions,
    },
  };
}

/**
 * Staff alert: tell the center a child STARTED an assessment. Twin of
 * notifyStaffAssessmentCompleted in responseSubmit/handler.ts — same shape,
 * same fail-soft contract, same link target.
 *
 * COPPA: the payload is the explicit allowlist on AssessmentStartedAlert —
 * parent name, child GRADE, and the staff record link. The grade is already in
 * hand from the earlier `children` read; nothing extra is fetched, and no
 * result exists at this point in the session's life.
 *
 * Non-blocking: wrapped in `after()` so the send happens once the start
 * response is already on the wire — a child tapping "begin" must never wait on
 * Resend, and a Resend outage must never stop an assessment from starting.
 *
 * The try/catch is load-bearing, not decoration: a trailing `.catch()` only
 * attaches to a promise that was actually returned, so it covers a REJECTION
 * but not a SYNCHRONOUS throw. notifyAssessmentStarted is `async` and so cannot
 * throw synchronously today — but this seam guards a child's ability to BEGIN
 * an assessment, and that guarantee should not rest on a callee keeping the
 * `async` keyword. Swallowing here makes it unconditional. Identical shape to
 * notifyStaffAssessmentCompleted in responseSubmit/handler.ts — the two
 * triggers are deliberately the same, so copying either one is safe.
 */
function notifyStaffAssessmentStarted(
  parentName: string,
  childId: string,
  childGrade: string | null,
  origin: string | null,
): void {
  const path = `/instructor/student/${childId}`;
  after(async () => {
    try {
      await notifyAssessmentStarted({
        parentName,
        childGrade,
        studentUrl: origin ? `${origin}${path}` : path,
      });
    } catch {
      // Fail-soft by construction. The notifier already logs its own
      // failures on the [staffAlerts] path; nothing to add here.
    }
  });
}

// ===========================================================================
// Resume helpers
// ===========================================================================

interface ResumeArgs {
  serviceClient: SupabaseClient<Database>;
  tenantId: string;
  childId: string;
  sessionId: string;
  ip: string | null;
  /** Item #12 Phase 7.5: strands with zero active questions in the
   *  tenant bank. Pre-seeded into the resume pick loop's excluded set
   *  and threaded into shouldTerminate as exhaustedStrands. */
  emptyBankStrands: ReadonlySet<Strand>;
  /** Existing session's test type + the child's grade — drive the level-lock
   *  band on the resume pick (same as the fresh-pick path). */
  testType: SessionTestType;
  gradeLevel: string | null;
  birthYear: number;
}

async function resumeExisting(args: ResumeArgs): Promise<StartHandlerResult> {
  // Count of answered responses on this session. Drives two decisions:
  //   * `hasProgress = responseCount > 0` selects the no-banner vs
  //     resume-banner (body.resumed) shape — both HTTP 200.
  //   * `responseCount` itself is plumbed to logAndRespond and emitted
  //     on the wire (Item #12 Phase 7.7 progress chrome).
  let responseCount: number;
  try {
    responseCount = await sessionResponseCount(
      args.serviceClient,
      args.sessionId,
    );
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }
  const hasProgress = responseCount > 0;

  // (a) Outstanding question?
  let outstanding: PickedQuestionRow | null = null;
  try {
    outstanding = await findOutstandingQuestion(
      args.serviceClient,
      args.sessionId,
    );
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }

  if (outstanding) {
    return logAndRespond({
      ...args,
      question: outstanding,
      hasProgress,
      responseCount,
      // For the outstanding case we don't have the engine's current
      // request, but the client still needs SOMETHING in next_request
      // for symmetry with the fresh-start response shape. Recompute
      // it from replayed state — it represents what the engine WOULD
      // ask for if the child answered this question right now.
      computeRequest: true,
    });
  }

  // (b) Half-state: every served question is answered but session is
  //     still IN_PROGRESS. Pick the next question normally.
  let state;
  try {
    state = await replayEngineState(args.serviceClient, args.sessionId);
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }

  // If termination is reached, close the session and surface bank_unservable
  // (start has no shape to return placement; the client should fetch the
  // results endpoint instead). We piggy-back the same status code as
  // first-pick exhaustion since the user-facing outcome is the same:
  // "this session can't continue".
  const term = shouldTerminate(state, args.emptyBankStrands);
  if (term.done) {
    await closeSessionWithReason(
      args.serviceClient,
      args.sessionId,
      term.reason === "max-questions-reached"
        ? "max-questions-reached"
        : term.reason === "confidence-threshold-met"
          ? "confidence-threshold-met"
          : "bank-exhausted",
    );
    return fail(
      "bank_unservable",
      422,
      "session already terminated; fetch results instead",
    );
  }

  // Item #12 Phase 7.5: resume pick loop — same shape as the first-pick
  // loop above and the pickAndMaybeClose loop in responseSubmit/handler.ts.
  // Skip empty-bank strands; iterate until a strand serves OR every
  // strand is excluded.
  const resumeExcluded = new Set<Strand>(args.emptyBankStrands);
  let pickedQuestion: PickedQuestionRow | null = null;
  let pickedRequest: NextQuestionRequest | null = null;
  let lastAttemptedStrand: Strand | null = null;

  while (true) {
    const req = nextQuestionRequest(state, resumeExcluded);
    if (req === null) break;
    lastAttemptedStrand = req.strand;

    let pick;
    try {
      pick = await pickForSession(
        args.serviceClient,
        req,
        {
          tenantId: args.tenantId,
          servedQuestionIds: state.servedQuestionIds,
        },
        {
          testType: args.testType,
          gradeLevel: args.gradeLevel,
          birthYear: args.birthYear,
        },
      );
    } catch (e) {
      return fail("internal", 500, errorMessage(e));
    }

    if (pick.ok) {
      pickedQuestion = pick.question;
      pickedRequest = req;
      break;
    }

    resumeExcluded.add(req.strand);
  }

  if (pickedQuestion === null || pickedRequest === null) {
    // Bank exhausted across ALL strands on resume — close with
    // bank-exhausted, surface 422. Do NOT delete the session row: it
    // has real responses and a current_estimate that the parent
    // dashboard / instructor view should still see.
    await closeSessionWithReason(args.serviceClient, args.sessionId, "bank-exhausted");
    return fail(
      "bank_unservable",
      422,
      `bank exhausted on resume pick (last strand=${lastAttemptedStrand ?? "none"})`,
    );
  }

  return logAndRespond({
    ...args,
    question: pickedQuestion,
    hasProgress,
    responseCount,
    precomputedRequest: pickedRequest,
  });
}

interface LogAndRespondArgs extends ResumeArgs {
  question: PickedQuestionRow;
  /** True when the resumed session has ≥1 row in `responses`. Drives
   *  the no-banner vs body.resumed boundary documented in the file
   *  header (both shapes are HTTP 200). */
  hasProgress: boolean;
  /** Count of answered responses on this session. Emitted on the wire
   *  as `response_count` for the Item #12 Phase 7.7 progress chrome.
   *  The served question's displayed number is `responseCount + 1`. */
  responseCount: number;
  computeRequest?: boolean;
  precomputedRequest?: ReturnType<typeof nextQuestionRequest>;
}

async function logAndRespond(
  args: LogAndRespondArgs,
): Promise<StartHandlerResult> {
  try {
    await logQuestionServe(args.serviceClient, {
      tenantId: args.tenantId,
      sessionId: args.sessionId,
      childId: args.childId,
      questionId: args.question.id,
      ip: args.ip,
    });
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }

  let req: NextQuestionRequest | null | undefined = args.precomputedRequest;
  if (!req && args.computeRequest) {
    try {
      const state = await replayEngineState(args.serviceClient, args.sessionId);
      // Item #12 Phase 7.5: exclude empty-bank strands so the
      // informational next_request describes a strand the engine
      // would actually serve from. Returning null here would mean
      // every strand is empty AND the resume path served an
      // outstanding question — a contradiction (we wouldn't have
      // gotten here). Defensive 500 if it does.
      req = nextQuestionRequest(state, args.emptyBankStrands);
    } catch (e) {
      return fail("internal", 500, errorMessage(e));
    }
  }

  if (!req) {
    return fail("internal", 500, "next_request not computable");
  }

  const maxQuestions = await computeMaxQuestions({
    serviceClient: args.serviceClient,
    tenantId: args.tenantId,
    testType: args.testType,
    gradeLevel: args.gradeLevel,
    birthYear: args.birthYear,
  });

  if (!args.hasProgress) {
    // Zero-response resume — looks fresh to the parent. Return 200
    // with the fresh-start shape so the client suppresses the resume
    // banner. See file-header rationale.
    //
    // serveQuestion mints a FRESH signed URL even on resume — the URL
    // from the prior /api/assess/start call may be stale or expired
    // by now (TTL is 300s per Item #13a Phase 2). This is what makes
    // long-pause resume work without broken images.
    return {
      ok: true,
      status: 200,
      body: {
        session_id: args.sessionId,
        question: await serveQuestion(args.serviceClient, args.question),
        next_request: toNextRequestJson(req),
        response_count: args.responseCount,
        max_questions: maxQuestions,
      },
    };
  }

  // Has-progress resume — a SUCCESS, returned as one (P3 fix; see the
  // file header). `resumed: true` is the client's cue for the "resumed
  // your previous session" banner. Previously this was a 409 +
  // body.error envelope, which read as a failure to anything keying
  // off the status line and looped the child on "Try again".
  return {
    ok: true,
    status: 200,
    body: {
      session_id: args.sessionId,
      question: await serveQuestion(args.serviceClient, args.question),
      next_request: toNextRequestJson(req),
      response_count: args.responseCount,
      max_questions: maxQuestions,
      resumed: true,
    },
  };
}

// ===========================================================================
// Progress ceiling (Item #14)
// ===========================================================================

/**
 * The session's progress denominator — the "of up to N" total the child-facing
 * progress bar shows. NOT a fixed 25:
 *
 *   * comprehensive → the engine cap (MAX_QUESTIONS).
 *   * short         → the short-test hard cap, lowered to the eligible-pool
 *     size when the previous-booklet band can't fill it. So a thin band that
 *     can only ever serve 8 items shows "of up to 8" (exhaustion-bound), and a
 *     deep band shows "of up to 15" (cap-bound) — never a misleading 25.
 *
 * Best-effort: any discovery failure falls back to the short-test cap. The
 * denominator is display-only, so it must never block or fail the start path.
 */
async function computeMaxQuestions(args: {
  serviceClient: SupabaseClient<Database>;
  tenantId: string;
  testType: SessionTestType;
  gradeLevel: string | null;
  birthYear: number;
}): Promise<number> {
  if (args.testType === "comprehensive") {
    return MAX_QUESTIONS;
  }
  const band = shortTestLevelBand(
    anchorBookletForChild(args.gradeLevel, args.birthYear),
  );
  try {
    const counts = await discoverShortEligibleCounts(
      args.serviceClient,
      args.tenantId,
      band,
    );
    let totalEligible = 0;
    for (const n of counts.values()) totalEligible += n;
    if (totalEligible <= 0) return SHORT_TEST_CONFIG.hardCap;
    return Math.min(SHORT_TEST_CONFIG.hardCap, totalEligible);
  } catch {
    return SHORT_TEST_CONFIG.hardCap;
  }
}

// ===========================================================================
// Small helpers
// ===========================================================================

interface ReadSessionResult {
  row: { id: string; test_type: SessionTestType } | null;
  error: string | null;
}

async function readInProgressSession(
  serviceClient: SupabaseClient<Database>,
  childId: string,
): Promise<ReadSessionResult> {
  const { data, error } = await serviceClient
    .from("assessment_sessions")
    .select("id, test_type")
    .eq("child_id", childId)
    .eq("status", "IN_PROGRESS")
    .maybeSingle();

  if (error) {
    return { row: null, error: `existing-session read failed: ${error.message}` };
  }
  return { row: data ?? null, error: null };
}

/**
 * Close a session with a termination reason. The reason is informational —
 * v1 doesn't persist a `termination_reason` column on assessment_sessions
 * (responseSubmit also doesn't, by design). The argument is here so a
 * future column migration finds an obvious place to plumb it through.
 */
async function closeSessionWithReason(
  serviceClient: SupabaseClient<Database>,
  sessionId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reason:
    | "confidence-threshold-met"
    | "max-questions-reached"
    | "bank-exhausted",
): Promise<void> {
  const { error } = await serviceClient
    .from("assessment_sessions")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[start] resume close failed", {
      session_id: sessionId,
      err: error.message,
    });
  }
}

/**
 * Returns the count of rows in `responses` for the session. Used to
 * route between the no-progress resume shape (looks fresh to the
 * parent) and the genuine resume of an in-flight session (body.resumed
 * — both HTTP 200). The check is a cheap HEAD-style count; we don't
 * need the row contents.
 */
async function sessionResponseCount(
  serviceClient: SupabaseClient<Database>,
  sessionId: string,
): Promise<number> {
  const { count, error } = await serviceClient
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(`responses count failed: ${error.message}`);
  }
  return count ?? 0;
}

function isUniqueViolation(err: { code?: string } | unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: string }).code === "23505";
  }
  return false;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "unknown";
}

function fail(
  code: StartErrorCode,
  status: number,
  message: string,
): StartHandlerResult {
  return { ok: false, error: { code, status, message } };
}
