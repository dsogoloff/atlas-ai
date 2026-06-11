"use server";

// Server actions backing the self-contained <ParentReportFeedback> island on
// the report page. Kept out of report/page.tsx so the only change to the
// protected report component is a single additive mount line.
//
//   recordReportViewed  — fires parent_report_viewed once per report view
//                          (the client guards against double-fire).
//   submitSatisfaction   — persists the rating + emits
//                          parent_satisfaction_submitted (core in
//                          src/lib/analytics/satisfaction.ts).

import { emit } from "@/lib/analytics/emit";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  submitSatisfactionCore,
  type SatisfactionInput,
  type SatisfactionResult,
} from "@/lib/analytics/satisfaction";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fire parent_report_viewed for a report view. Best-effort and fail-soft:
 * resolves the tenant/child from the session under the caller's RLS scope,
 * and silently no-ops if the session isn't the caller's. Never throws.
 */
export async function recordReportViewed(sessionId: string): Promise<void> {
  try {
    if (!UUID_RE.test(sessionId)) return;

    const rls = await createClient();
    const {
      data: { user },
    } = await rls.auth.getUser();
    if (!user) return;

    const { data: parent } = await rls
      .from("parents")
      .select("id, tenant_id")
      .maybeSingle();
    if (!parent) return;

    // RLS already scopes this select to the parent's children (or an
    // instructor's center). The explicit parent_id eq below closes the
    // dual-role bypass before we attribute the view.
    const { data: session } = await rls
      .from("assessment_sessions")
      .select("id, child_id, test_type")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return;

    const { data: ownedChild } = await rls
      .from("children")
      .select("id")
      .eq("id", session.child_id)
      .eq("parent_id", parent.id)
      .maybeSingle();
    if (!ownedChild) return;

    const serviceClient = createServiceClient();
    await emit(serviceClient, ANALYTICS_EVENTS.PARENT_REPORT_VIEWED, {
      tenantId: parent.tenant_id,
      childId: session.child_id,
      sessionId: session.id,
    });

    // The parent report doubles as the short-test result surface (no
    // standalone short-result page exists). Fire short_result_viewed only for
    // short-test sessions; comprehensive sessions are tracked separately.
    if (session.test_type === "short") {
      await emit(serviceClient, ANALYTICS_EVENTS.SHORT_RESULT_VIEWED, {
        tenantId: parent.tenant_id,
        childId: session.child_id,
        sessionId: session.id,
      });
    }
  } catch (e) {
    console.error("[analytics] recordReportViewed threw", {
      err: e instanceof Error ? e.message : "unknown",
    });
  }
}

/**
 * Fire center_followup_opted_in when the parent acts on the report's primary
 * "Schedule a conversation with a S.A.M center director" CTA — the funnel
 * signal that the family opted into center follow-up. Same RLS ownership
 * check as recordReportViewed (resolve + verify the session is the caller's
 * before attributing). Best-effort, fail-soft, PII-free; never throws. Does
 * NOT itself share any data with a center — it is an analytics signal only.
 */
export async function recordCenterFollowupOptIn(
  sessionId: string,
): Promise<void> {
  try {
    if (!UUID_RE.test(sessionId)) return;

    const rls = await createClient();
    const {
      data: { user },
    } = await rls.auth.getUser();
    if (!user) return;

    const { data: parent } = await rls
      .from("parents")
      .select("id, tenant_id")
      .maybeSingle();
    if (!parent) return;

    const { data: session } = await rls
      .from("assessment_sessions")
      .select("id, child_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return;

    // Close the dual-role bypass: confirm the session's child is the
    // caller's own before attributing the opt-in.
    const { data: ownedChild } = await rls
      .from("children")
      .select("id")
      .eq("id", session.child_id)
      .eq("parent_id", parent.id)
      .maybeSingle();
    if (!ownedChild) return;

    await emit(
      createServiceClient(),
      ANALYTICS_EVENTS.CENTER_FOLLOWUP_OPTED_IN,
      {
        tenantId: parent.tenant_id,
        childId: session.child_id,
        sessionId: session.id,
      },
    );
  } catch (e) {
    console.error("[analytics] recordCenterFollowupOptIn threw", {
      err: e instanceof Error ? e.message : "unknown",
    });
  }
}

export async function submitSatisfaction(
  input: SatisfactionInput,
): Promise<SatisfactionResult> {
  const rlsClient = await createClient();
  const serviceClient = createServiceClient();
  return submitSatisfactionCore({ rlsClient, serviceClient, input });
}
