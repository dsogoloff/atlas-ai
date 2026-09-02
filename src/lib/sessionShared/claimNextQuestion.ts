import "server-only";

// ATLAS-003 (subset) — claim the single next question for a session.
//
// Replaces the bare logQuestionServe() call on the progression path. The
// difference that matters: the access-log write and the session's "what am I
// waiting on" marker now move together, inside one transaction holding a row
// lock, so two concurrent submits of the same served question cannot each serve
// a DIFFERENT next question.
//
// The caller still runs the picker itself (it is a pure read, and a discarded
// pick costs nothing). What it must not do is assume its pick won — see the
// return value.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type ClaimOutcome =
  /** This caller's pick was recorded and logged. Serve it. */
  | { kind: "claimed"; questionId: string }
  /** Another caller advanced first. Serve THEIR question, not ours. */
  | { kind: "superseded"; questionId: string }
  /** The session completed concurrently. Do not serve anything. */
  | { kind: "completed" };

/**
 * @param answeredQuestionId the question this submit answered — the value the
 *        session must still be expecting for this caller to advance it. Pass
 *        null only where no prior expectation applies.
 */
export async function claimNextQuestion(
  serviceClient: SupabaseClient<Database>,
  input: {
    sessionId: string;
    answeredQuestionId: string | null;
    nextQuestionId: string;
    tenantId: string;
    childId: string;
    ip: string | null;
  },
): Promise<ClaimOutcome> {
  const { data, error } = await serviceClient.rpc("claim_next_question", {
    p_session_id: input.sessionId,
    p_answered_question_id: input.answeredQuestionId,
    p_next_question_id: input.nextQuestionId,
    p_tenant_id: input.tenantId,
    p_child_id: input.childId,
    p_ip: input.ip,
  });

  if (error) {
    // Fail loudly: the caller's alternative would be to serve an unclaimed
    // question, which is the fork this exists to prevent.
    throw new Error(`[claimNextQuestion] ${error.message}`);
  }

  if (data === null || data === undefined) return { kind: "completed" };

  const questionId = String(data);
  return questionId === input.nextQuestionId
    ? { kind: "claimed", questionId }
    : { kind: "superseded", questionId };
}
