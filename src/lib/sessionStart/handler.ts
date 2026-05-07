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
// All of this returns HTTP 409 (NOT 200) so the client can distinguish
// "I created a fresh session" from "I reconnected to an old one".
//
// =============================================================================
// First-pick exhaustion rollback
// =============================================================================
//
// When a brand-new session's first picker call returns strand-exhausted
// (today: any first call into MEASUREMENT_DATA — bank has zero items
// for that strand), we MUST roll back the just-inserted session row
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

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createEngineState,
  nextQuestionRequest,
  shouldTerminate,
} from "@/lib/engine/engine";
import { logQuestionServe } from "@/lib/questionAccessLog/log";
import { pickQuestion } from "@/lib/questionPicker/picker";
import { toClientQuestion } from "@/lib/questionPicker/serialize";
import type { PickedQuestionRow } from "@/lib/questionPicker/types";
import { replayEngineState } from "@/lib/responseSubmit/replay";
import { toNextRequestJson } from "@/lib/responseSubmit/types";
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
}

export async function sessionStartHandler({
  request,
  rlsClient,
  serviceClient,
  ip,
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
  // 2. Child — explicit parent_id eq closes the dual-role-bypass gap.
  // ---------------------------------------------------------------------------
  const { data: child, error: childErr } = await rlsClient
    .from("children")
    .select("id")
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
  // ---------------------------------------------------------------------------
  const state = createEngineState();
  const req = nextQuestionRequest(state);

  const pick = await pickQuestion(serviceClient, req, {
    tenantId: parent.tenant_id,
    servedQuestionIds: state.servedQuestionIds,
  });

  if (!pick.ok) {
    // First-pick exhaustion — roll back the just-inserted session.
    // Best-effort: DELETE failure leaves an orphaned IN_PROGRESS row
    // that the unique index would block future starts on. Log loudly
    // so an out-of-band sweep can find it; still return 422 to the
    // client (a successful DELETE here doesn't change the user-facing
    // outcome — they couldn't be served either way).
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
      `bank exhausted on first pick (strand=${req.strand})`,
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
      questionId: pick.question.id,
      ip,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return fail("internal", 500, msg);
  }

  return {
    ok: true,
    status: 200,
    body: {
      session_id: sessionId,
      question: toClientQuestion(pick.question),
      next_request: toNextRequestJson(req),
    },
  };
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
}

async function resumeExisting(args: ResumeArgs): Promise<StartHandlerResult> {
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
  const term = shouldTerminate(state);
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

  const req = nextQuestionRequest(state);
  let pick;
  try {
    pick = await pickQuestion(args.serviceClient, req, {
      tenantId: args.tenantId,
      servedQuestionIds: state.servedQuestionIds,
    });
  } catch (e) {
    return fail("internal", 500, errorMessage(e));
  }

  if (!pick.ok) {
    // Bank exhausted on resume — close with bank-exhausted, surface 422.
    // Do NOT delete the session row: it has real responses and a
    // current_estimate that the parent dashboard / instructor view
    // should still see.
    await closeSessionWithReason(args.serviceClient, args.sessionId, "bank-exhausted");
    return fail(
      "bank_unservable",
      422,
      `bank exhausted on resume pick (strand=${req.strand})`,
    );
  }

  return logAndRespond({
    ...args,
    question: pick.question,
    precomputedRequest: req,
  });
}

interface LogAndRespondArgs extends ResumeArgs {
  question: PickedQuestionRow;
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

  let req = args.precomputedRequest;
  if (!req && args.computeRequest) {
    try {
      const state = await replayEngineState(args.serviceClient, args.sessionId);
      req = nextQuestionRequest(state);
    } catch (e) {
      return fail("internal", 500, errorMessage(e));
    }
  }

  if (!req) {
    return fail("internal", 500, "next_request not computable");
  }

  return {
    ok: true,
    status: 409,
    body: {
      session_id: args.sessionId,
      question: toClientQuestion(args.question),
      next_request: toNextRequestJson(req),
      error: {
        code: "session_in_progress",
        message: "child already has an active assessment; resumed",
      },
    },
  };
}

// ===========================================================================
// Small helpers
// ===========================================================================

interface ReadSessionResult {
  row: { id: string } | null;
  error: string | null;
}

async function readInProgressSession(
  serviceClient: SupabaseClient<Database>,
  childId: string,
): Promise<ReadSessionResult> {
  const { data, error } = await serviceClient
    .from("assessment_sessions")
    .select("id")
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
