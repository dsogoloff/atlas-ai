// Atlas Assessment — question_access_log writer.
//
// Per compliance.md §8 (S.A.M. licensing Constraint 3), every question
// served from the bank must be audit-logged with:
//   * question_id  * session_id  * child_id (UUID, not name)
//   * tenant_id    * timestamp   * ip_address
//
// Posture: SYNCHRONOUS write before returning the question. If the log
// insert fails, the orchestrator must surface a 500 and NOT serve the
// question. "Every serve is a serve" — including resumes (the same
// question re-served because the client lost connection mid-question
// gets a NEW log row, not a deduped one). Future maintainers: do not
// "optimise" by skipping the log on resume — that would create a
// licensing-audit hole compliance.md §8 explicitly forbids.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export interface LogQuestionServeInput {
  tenantId: string;
  sessionId: string;
  childId: string;
  questionId: string;
  /** Client IP from extractClientIp(); null if no trusted header was
   *  present. Audit retention treats null as "unknown" rather than
   *  failing the serve. */
  ip: string | null;
}

export async function logQuestionServe(
  serviceClient: SupabaseClient<Database>,
  input: LogQuestionServeInput,
): Promise<void> {
  const { error } = await serviceClient.from("question_access_log").insert({
    tenant_id: input.tenantId,
    session_id: input.sessionId,
    child_id: input.childId,
    question_id: input.questionId,
    ip_address: input.ip,
  });

  if (error) {
    throw new Error(`[questionAccessLog] insert failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------
//
// Header priority for v1: x-forwarded-for (first value) → x-real-ip → null.
//
// PRE-PROD VERIFICATION TODO: before any production deploy, confirm the
// trusted-header source for Atlas's actual Vercel project. Vercel sets
// non-spoofable headers (e.g. `x-vercel-forwarded-for`) that should take
// precedence over the generic XFF chain in production — XFF can be
// arbitrarily injected by clients hitting the function directly. v1 dev
// uses XFF / x-real-ip because that's what Next.js dev server exposes.
// Tracked separately; not a v1-feature blocker.

export function extractClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    // XFF is a comma-separated list "client, proxy1, proxy2"; the first
    // entry is the original client. Trim — some proxies add a space
    // after the comma.
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const xri = headers.get("x-real-ip");
  if (xri) return xri.trim();

  return null;
}
