// Core logic for the short-test follow-up lead capture — extracted from the
// server action so it is unit-testable with fake Supabase clients + an injected
// notifier (mirrors lib/analytics/satisfaction submitSatisfactionCore). The
// thin "use server" wrapper lives in the report route.
//
// Flow: validate → resolve the caller's parent + verify the session is THEIRS
// (RLS ownership check, closing the dual-role bypass) → persist the lead via the
// service client → fire the (fail-soft) notifier. The notifier never blocks
// success. Only Tier 1/2 lead data (parent contact + zip + child's school) is
// stored; no diagnostic result. An explicit parent opt-in is mandatory — the
// lead never persists unless `optedIn === true` (re-checked server-side).

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
   *  (LEAD_SCHOOL_FIELD_LIVE). Never required even when on. */
  schoolName?: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  /** Required parent zip/location (free text — manual triage, no geocoding). */
  zip: string;
  /** Explicit parent consent to be contacted. MUST be true or the submit is
   *  rejected (the form cannot submit it unchecked). */
  optedIn: boolean;
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
  /** LEAD_SCHOOL_FIELD_LIVE (default ON — counsel-cleared, coppa-disclosure-v1).
   *  School is OPTIONAL: collected + persisted when on, dropped entirely when
   *  off (any client-sent value ignored). NEVER required either way. Re-checked
   *  server-side — never trust the client. */
  schoolFieldEnabled: boolean;
  input: FollowUpLeadInput;
}): Promise<FollowUpLeadResult> {
  const { rlsClient, serviceClient, notify, schoolFieldEnabled, input } = args;

  // ---- validate (required fields; explicit consent)
  if (!UUID_RE.test(input.sessionId)) return { ok: false, error: "bad_session" };
  // Explicit opt-in is mandatory — the lead never persists without it. The form
  // can't submit it unchecked; this is the server-side backstop.
  if (input.optedIn !== true) return { ok: false, error: "opt_in_required" };
  // School is OPTIONAL: dropped entirely when the flag is off, and never a
  // required field when on (no missing-fields guard). A blank entry persists
  // NULL, not "" (mirrors the optional phone below).
  const schoolName = schoolFieldEnabled ? clean(input.schoolName) || null : null;
  const parentName = clean(input.parentName);
  const parentEmail = clean(input.parentEmail);
  const parentPhone = clean(input.parentPhone);
  const zip = clean(input.zip);
  if (!parentName || !zip) return { ok: false, error: "missing_fields" };
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
  // best_time_to_reach is no longer collected (field retired); the column
  // remains but is left unwritten (NULLs on new rows).
  const { error: insertErr } = await serviceClient.from("follow_up_leads").insert({
    tenant_id: parent.tenant_id,
    child_id: session.child_id,
    session_id: session.id,
    school_name: schoolName,
    parent_name: parentName,
    parent_email: parentEmail,
    parent_phone: parentPhone || null,
    zip,
    opted_in: true,
  });
  if (insertErr) return { ok: false, error: "persist_failed" };

  // ---- notify the pilot center (fail-soft; never blocks success)
  await notify({
    schoolName,
    parentName,
    parentEmail,
    parentPhone: parentPhone || null,
    zip,
  });

  return { ok: true };
}
