// Follow-up leads — staff read model.
//
// `follow_up_leads` is RLS-enabled with NO policies (service-role writes only),
// so the portal cannot read it through the caller's RLS client. This read uses
// the service client and is therefore SAFE ONLY BEHIND `requireStaffAal2` plus
// the admin-kind check in the page — same contract as the parent panel on the
// student detail page. Tenant scoping is explicit here (`tenant_id = ?`)
// because the service role bypasses RLS.
//
// DATA SCOPE: parent contact + zip + child's school only. The projection is an
// explicit column list so no child field (child_id, session_id) can reach the
// view by accident, and none may be added — brief 1240: "Parent contact data
// only. No child fields on this view."

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export interface FollowUpLeadRow {
  id: string;
  createdAt: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  zip: string | null;
  schoolName: string | null;
  optedIn: boolean;
}

export const FOLLOW_UP_LEAD_COLUMNS =
  "id, created_at, parent_name, parent_email, parent_phone, zip, school_name, opted_in";

export type FetchFollowUpLeadsResult =
  | { ok: true; rows: FollowUpLeadRow[] }
  | { ok: false; error: string };

/** Newest first, scoped to one tenant. A database error is returned, never
 *  folded into an empty list — "could not read" must not look like "no leads". */
export async function fetchFollowUpLeads(
  service: SupabaseClient<Database>,
  tenantId: string,
): Promise<FetchFollowUpLeadsResult> {
  const { data, error } = await service
    .from("follow_up_leads")
    .select(FOLLOW_UP_LEAD_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    rows: (data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      parentName: r.parent_name,
      parentEmail: r.parent_email,
      parentPhone: r.parent_phone,
      zip: r.zip,
      schoolName: r.school_name,
      optedIn: r.opted_in,
    })),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "today" / "1 day ago" / "N days ago" — so an old, unactioned lead stands out. */
export function ageLabel(iso: string, now: number = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return "today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
