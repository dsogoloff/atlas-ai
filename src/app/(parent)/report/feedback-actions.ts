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
import { syncHubSpotEnrollmentDeal } from "@/lib/hubspot/syncDeal";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isLeadSchoolFieldEnabled } from "@/lib/env";
import { notifyFollowUpLead } from "@/lib/followUp/notify";
import {
  submitFollowUpLeadCore,
  type FollowUpLeadInput,
  type FollowUpLeadResult,
} from "@/lib/followUp/submit";

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

/** The report's two contact CTAs, as slugs. Stable identifiers — the visible
 *  labels are copy and may change without invalidating recorded history. */
export type ReportCta = "director_conversation" | "questions_talk_to_us";

/**
 * Record that a parent tapped a contact CTA on their report, and advance the
 * family's deal to "In Conversation".
 *
 * WHY THIS EXISTS. Both CTAs are mailto links, so until now a tap produced at
 * best an email and at worst nothing:
 *   - a parent writing from an address other than their account attaches to no
 *     contact (this happened to the first real customer),
 *   - a parent who taps and never sends leaves no trace at all,
 *   - and even a successful send is an email, not a fact we can report on.
 * Recording server-side turns the tap itself into that fact.
 *
 * NO ACCOUNT, NO RECORD. An anonymous or logged-out viewer resolves no parent
 * and returns silently — the same rule as the assessment sync. The caller does
 * not await this, so the mail draft opens regardless.
 *
 * PRIVACY. props carries the CTA slug only. No child name, grade, assessment
 * level, band, score or response — D-0061's boundary, unchanged.
 *
 * Never throws.
 */
export async function recordReportCtaTap(
  sessionId: string,
  cta: ReportCta,
): Promise<void> {
  try {
    if (!UUID_RE.test(sessionId)) return;

    const rls = await createClient();
    const {
      data: { user },
    } = await rls.auth.getUser();
    if (!user) return; // anonymous viewer — record nothing

    const { data: parent } = await rls
      .from("parents")
      .select("id, tenant_id, name")
      .maybeSingle();
    if (!parent) return;

    const { data: session } = await rls
      .from("assessment_sessions")
      .select("id, child_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return;

    // Same dual-role bypass close as recordCenterFollowupOptIn: confirm the
    // session's child is the caller's own before attributing anything.
    const { data: ownedChild } = await rls
      .from("children")
      .select("id")
      .eq("id", session.child_id)
      .eq("parent_id", parent.id)
      .maybeSingle();
    if (!ownedChild) return;

    await emit(createServiceClient(), ANALYTICS_EVENTS.REPORT_CTA_TAPPED, {
      tenantId: parent.tenant_id,
      childId: session.child_id,
      sessionId: session.id,
      props: { cta },
    });

    // Advance the family's deal to "In Conversation" — they are reaching out.
    // Forward-only via the existing rank comparison: a family already at a
    // later stage is never moved backwards, and a repeat tap is a no-op.
    // Reuses the DealEventInput seam and its typed whitelist rather than
    // opening a parallel path to HubSpot.
    await syncHubSpotEnrollmentDeal({
      accountId: parent.id,
      parentFullName: parent.name,
      event: "contact_requested",
    });
  } catch (e) {
    console.error("[analytics] recordReportCtaTap threw", {
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

/**
 * Persist a short-test follow-up lead (parent contact + child's school) and
 * notify the pilot center. Explicit parent opt-in; only Tier 1/2 lead data —
 * no diagnostic result. Notification is fail-soft + flag-gated (no send until
 * the founder configures Resend). See @/lib/followUp.
 */
export async function submitFollowUpLead(
  input: FollowUpLeadInput,
): Promise<FollowUpLeadResult> {
  const rlsClient = await createClient();
  const serviceClient = createServiceClient();
  return submitFollowUpLeadCore({
    rlsClient,
    serviceClient,
    notify: notifyFollowUpLead,
    schoolFieldEnabled: isLeadSchoolFieldEnabled(),
    input,
  });
}
