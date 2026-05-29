// Instructor identity resolution for the instructor portal.
//
// Every instructor surface resolves the calling user to an ACTIVE
// instructor row first. The RLS policy `instructors_self_select` already
// scopes this read to `auth_user_id = auth.uid()`, so the query can only
// ever return the caller's own row — but that policy does NOT filter on
// status, so we drop INACTIVE instructors here in code (mirroring the
// `app_current_instructor_id()` DB helper, which only returns ACTIVE ids).
//
// The returned identity carries exactly the three scoping ids the portal
// needs downstream — center_id (roster scope), tenant_id, and the
// instructor id used as the author on pedagogical_notes. No parent PII is
// ever resolved through this path (compliance §6.2 / §10.3 data
// minimisation).

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export interface InstructorIdentity {
  id: string;
  tenant_id: string;
  center_id: string;
  name: string;
}

/** Resolves the ACTIVE instructor row for the authenticated user via the
 *  RLS-scoped client. Returns null when the caller is not an active
 *  instructor (no row, a query error, or status !== ACTIVE) — callers
 *  treat null as "not authorised for the instructor portal". */
export async function resolveInstructor(
  client: SupabaseClient<Database>,
): Promise<InstructorIdentity | null> {
  const { data, error } = await client
    .from("instructors")
    .select("id, tenant_id, center_id, name, status")
    .maybeSingle();

  if (error || !data || data.status !== "ACTIVE") return null;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    center_id: data.center_id,
    name: data.name,
  };
}
