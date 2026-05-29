import "server-only";

// Atlas Assessment — parental-consent enforcement gate.
//
// M2 readiness audit (2026-05-28) found consent was recorded as audit events
// at signup but never enforced: a child assessment could begin with no
// recorded consent (COPPA / Gate-B integrity blocker). This helper is the
// single server-side check both the session-start and response-submit
// handlers call BEFORE creating a session or accepting a response.
//
// Model (see migration 20260528000000_consent_records.sql): consent is
// parent-scoped — the parent is the consenting party under COPPA, and this
// app's VPC trail is already parent-scoped. The caller has already proven the
// child belongs to this parent (explicit parent_id eq), so an unrevoked
// consent row for the parent in the tenant is a valid consent FOR that child.
//
// Reads via the service role (consent_records RLS only grants parents a
// self-select; the gate runs server-side outside any parent session). The
// query uses only .select()/.eq() so it returns a plain array — we never
// .single() it because a parent may legitimately hold more than one consent
// row (e.g. re-consent after a wording change).

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export interface ConsentCheckArgs {
  tenantId: string;
  parentId: string;
}

/**
 * Returns true iff the parent has at least one unrevoked consent record in the
 * tenant. Throws on a database error so callers can map it to a 500 (rather
 * than fail-open and let an assessment proceed on a transient read failure).
 */
export async function hasValidConsent(
  serviceClient: SupabaseClient<Database>,
  { tenantId, parentId }: ConsentCheckArgs,
): Promise<boolean> {
  const { data, error } = await serviceClient
    .from("consent_records")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("parent_id", parentId)
    .eq("revoked", false);

  if (error) {
    throw new Error(`consent lookup failed: ${error.message}`);
  }
  return (data ?? []).length > 0;
}
