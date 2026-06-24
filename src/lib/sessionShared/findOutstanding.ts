// Atlas Assessment — find the outstanding (served-but-unanswered) question.
//
// Used by:
//   * /api/assess/start  — on resume of an existing IN_PROGRESS session,
//                          re-serve the question the child was looking at
//                          when the page reloaded.
//   * /api/assess/submit — on idempotent retry, return the next question
//                          the original (successful) call already picked,
//                          instead of re-running the picker and writing
//                          a second access-log row. See compliance.md §8:
//                          "every serve is a serve", but a network retry
//                          of the same submit response is not a *new* serve.
//
// Definition of "outstanding": the question_access_log row for this
// session whose question_id has no matching `responses` row, with the
// most recent created_at. If multiple unanswered logs exist (rare —
// would require a serve, the client receiving it, losing connection
// before submitting, and a second serve happening on resume), the most
// recent wins; older unanswered logs are stale.
//
// Interleaved cases the implementation must handle (explicit tests):
//
//   serve A, serve B, answer A           → outstanding = B
//   serve A, serve B, answer A, answer B → null
//
// The "serve A, serve B, answer B" pattern is implausible in practice —
// the client UI shouldn't serve a new question while a prior one is
// unanswered — but the query must remain correct if it ever happens
// (in that case the most-recent unanswered = A).
//
// Implementation: two reads (qal + responses), join in TS, then a third
// read to materialise the full question row. Mirrors replay.ts —
// Supabase's hand-typed Relationships:[] makes a relational embed return
// untyped, so explicit joins stay well-typed.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { PickedQuestionRow } from "@/lib/questionPicker/types";

export async function findOutstandingQuestion(
  serviceClient: SupabaseClient<Database>,
  sessionId: string,
): Promise<PickedQuestionRow | null> {
  // (1) All access-log rows for the session, newest first.
  const { data: logs, error: logErr } = await serviceClient
    .from("question_access_log")
    .select("question_id, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (logErr) {
    throw new Error(
      `[findOutstanding] question_access_log read failed: ${logErr.message}`,
    );
  }

  if (!logs || logs.length === 0) return null;

  // (2) All responses for the session — only the question_id set is needed.
  const { data: responses, error: respErr } = await serviceClient
    .from("responses")
    .select("question_id")
    .eq("session_id", sessionId);

  if (respErr) {
    throw new Error(
      `[findOutstanding] responses read failed: ${respErr.message}`,
    );
  }

  const answered = new Set((responses ?? []).map((r) => r.question_id));

  // (3) Walk logs newest-first; return the first question_id absent from
  //     the answered set. The same question_id may appear multiple times
  //     in the log (resumes write a new row each time per compliance §8);
  //     dedupe via a "seen" set to skip older copies of an already-
  //     considered question.
  const seen = new Set<string>();
  let outstandingId: string | null = null;
  for (const row of logs) {
    if (seen.has(row.question_id)) continue;
    seen.add(row.question_id);
    if (!answered.has(row.question_id)) {
      outstandingId = row.question_id;
      break;
    }
  }

  if (outstandingId === null) return null;

  // (4) Materialise the full question row for the picker contract.
  // NOTE: no `is_active` filter — this loads an already-served question by
  // PK (outstandingId came from question_access_log). Filtering would break
  // resume if the question was deactivated between serve and read.
  // See Item #11 Phase 3 enumeration.
  const { data: question, error: qErr } = await serviceClient
    .from("questions")
    .select(`id, external_id, strand, level, difficulty, format, content, content_id`)
    .eq("id", outstandingId)
    .maybeSingle();

  if (qErr) {
    throw new Error(
      `[findOutstanding] question read failed: ${qErr.message}`,
    );
  }

  if (!question) {
    // FK on question_access_log.question_id → questions.id with
    // ON DELETE CASCADE makes this a "should never happen" branch. If
    // it does, treat the audit row as orphaned rather than crashing
    // the resume — the orchestrator falls back to a fresh pick.
    return null;
  }

  return question;
}
