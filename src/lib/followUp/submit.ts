// Core logic for the short-test follow-up lead capture — extracted from the
// server action so it is unit-testable with fake Supabase clients + an injected
// notifier (mirrors lib/analytics/satisfaction submitSatisfactionCore). The
// thin "use server" wrapper lives in the report route.
//
// Flow: validate → resolve the caller's parent + verify the session is THEIRS
// (RLS ownership check, closing the dual-role bypass) → persist the lead via the
// service client → fire the (fail-soft) notifier. The notifier never blocks
// success. Only Tier 1/2 lead data (parent contact + child's school) is stored;
// no diagnostic result.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { FollowUpLeadNotification } from "./notify";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 200;

export interface FollowUpLeadInput {
  sessionId: string;
  /** Optional — omitted/ignored when the school field is gated off
   *  (LEAD_SCHOOL_FIELD_LIVE). */
  schoolName?: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  bestTimeToReach?: string;
}

export type FollowUpLeadResult =
  | { ok: true }
  | { ok: false; error: string };

function clean(s: string | undefined): string {
  return (s ?? "").trim().slice(0, MAX_LEN);
}

export async function submitFollowUpLeadCore(args: {
  rlsClient: SupabaseClient<Database>;
  serviceClient: SupabaseClient<Database>;
  notify: (lead: FollowUpLeadNotification) => Promise<void>;
  /** LEAD_SCHOOL_FIELD_LIVE (default false). When false the child's school is
   *  NOT required and NOT persisted (disclosure-consistent); any client-sent
   *  value is ignored. Re-checked server-side — never trust the client. */
  schoolFieldEnabled: boolean;
  input: FollowUpLeadInput;
}): Promise<FollowUpLeadResult> {
  const { rlsClient, serviceClient, notify, schoolFieldEnabled, input } = args;

  // ---- validate (explicit opt-in submit; required fields)
  if (!UUID_RE.test(input.sessionId)) return { ok: false, error: "bad_session" };
  // School is gated off by default and dropped entirely when off (not required,
  // not persisted) — never an orphan required field.
  const schoolName = schoolFieldEnabled ? clean(input.schoolName) : null;
  const parentName = clean(input.parentName);
  const parentEmail = clean(input.parentEmail);
  const parentPhone = clean(input.parentPhone);
  const bestTimeToReach = clean(input.bestTimeToReach);
  if (!parentName) return { ok: false, error: "missing_fields" };
  if (schoolFieldEnabled && !schoolName) {
    return { ok: false, error: "missing_fields" };
  }
  if (!EMAIL_RE.test(parentEmail)) return { ok: false, error: "bad_email" };

  // ---- resolve caller + verify session ownership (RLS), like the other
  // report server actions. Never trust the client's tenant/child.
  const {
    data: { user },
  } = await rlsClient.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: parent } = await rlsClient
    .from("parents")
    .select("id, tenant_id")
    .maybeSingle();
  if (!parent) return { ok: false, error: "unauthorized" };

  const { data: session } = await rlsClient
    .from("assessment_sessions")
    .select("id, child_id")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "session_not_found" };

  const { data: ownedChild } = await rlsClient
    .from("children")
    .select("id")
    .eq("id", session.child_id)
    .eq("parent_id", parent.id)
    .maybeSingle();
  if (!ownedChild) return { ok: false, error: "forbidden" };

  // ---- persist (service role; RLS on follow_up_leads is service-only)
  const { error: insertErr } = await serviceClient.from("follow_up_leads").insert({
    tenant_id: parent.tenant_id,
    child_id: session.child_id,
    session_id: session.id,
    school_name: schoolName,
    parent_name: parentName,
    parent_email: parentEmail,
    parent_phone: parentPhone || null,
    best_time_to_reach: bestTimeToReach || null,
  });
  if (insertErr) return { ok: false, error: "persist_failed" };

  // ---- notify the pilot center (fail-soft; never blocks success)
  await notify({
    schoolName,
    parentName,
    parentEmail,
    parentPhone: parentPhone || null,
    bestTimeToReach: bestTimeToReach || null,
  });

  return { ok: true };
}
