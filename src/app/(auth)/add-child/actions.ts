"use server";

// Add-child server action.
//
// Flow:
//   1. Validate input (zod) — includes the per-child consent literal.
//   2. Resolve the calling parent via supabase.auth.getUser() + parents
//      lookup. The page-level auth gate (page.tsx) catches unauth users
//      before this point; this is defense-in-depth.
//   3. ONE call to create_child_with_consent(), which writes the child AND the
//      binding per-child consent record (Model B / COPPA Gate-B) in a single
//      transaction.
//
// ATLAS-013. This used to be two round-trips — insert the child on the RLS
// client, then insert consent on the service role — with a best-effort rollback
// DELETE if the second failed. A crash between them, or a rollback that itself
// failed, left a child with no consent record; since the assessment gate
// (src/lib/consent/verify.ts) reads consent, that child could never be
// assessed. A double-click or second tab ran the whole sequence twice and
// created duplicates.
//
// Now: either both rows land or neither does, enforced by the transaction
// rather than by cleanup code. There is no rollback path here any more because
// there is nothing to roll back. The RPC is also idempotent on
// (parent_id, name, birth_year) among non-archived children, so a repeat submit
// returns the SAME child id instead of creating a second child.
//
// Consent CONTENT is still owned by src/lib/consent/text.ts and passed in as
// parameters — the database never holds its own copy of the consent
// instrument, so versioning stays in one place.
//
// The RPC runs SECURITY DEFINER and checks the caller owns p_parent_id itself;
// it does not bypass the ATLAS-002 BEFORE INSERT trigger, which still derives
// tenant_id / home_center_id from the parent row.

import { headers } from "next/headers";
import { after } from "next/server";

import { emit } from "@/lib/analytics/emit";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  CONSENT_TEXT,
  CONSENT_TEXT_VERSION,
  CONSENT_TYPE,
  DATA_USES,
  DISCLOSURE_CONTENT_SHA256,
  DISCLOSURE_VERSION,
  SHARING_PERMISSIONS,
} from "@/lib/consent/text";

import { AddChildSchema, type AddChildInput } from "./schema";

export type AddChildResult =
  | { ok: true; childId: string }
  | { ok: false; error: string };

export async function addChildAction(
  input: AddChildInput,
): Promise<AddChildResult> {
  const parsed = AddChildSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Form validation failed. Refresh and try again.",
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Not signed in. Please sign in and try again.",
    };
  }

  // Resolve the parent row for this auth user. RLS on parents restricts
  // selects to the parent's own row, so this returns at most one row.
  const { data: parent, error: parentErr } = await supabase
    .from("parents")
    .select("id, tenant_id, home_center_id")
    .maybeSingle();
  if (parentErr || !parent) {
    // Orphan auth user — parents-row insert failed at signup time. Real
    // bug class; log server-side so dev catches it. User-facing message
    // stays generic.
    console.error("[add-child] parent lookup failed", {
      authUserId: user.id,
      err: parentErr,
    });
    return {
      ok: false,
      error: "Account profile not found. Contact support.",
    };
  }

  const h = await headers();
  const ipRaw = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  const ip = ipRaw?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  // ATLAS-013: child + consent in ONE transaction. Called on the RLS client so
  // the function sees the parent's JWT — app_current_parent_id() inside it
  // resolves to this caller, which is what both its own ownership check and the
  // ATLAS-002 insert trigger depend on. tenant_id and home_center_id are
  // deliberately NOT passed: the trigger derives them from the parent row.
  const { data: childId, error: rpcErr } = await supabase.rpc(
    "create_child_with_consent",
    {
      p_parent_id: parent.id,
      p_name: data.name,
      p_birth_year: data.birthYear,
      p_grade_level: data.gradeLevel ?? null,
      p_consent_type: CONSENT_TYPE,
      p_consent_text_version: CONSENT_TEXT_VERSION,
      p_consent_text: CONSENT_TEXT,
      p_disclosure_version: DISCLOSURE_VERSION,
      p_disclosure_content_sha256: DISCLOSURE_CONTENT_SHA256,
      p_data_uses: [...DATA_USES],
      p_sharing_permissions: { ...SHARING_PERMISSIONS },
      p_ip_address: ip,
      p_user_agent: userAgent,
    },
  );

  if (rpcErr || !childId) {
    // Nothing to clean up: the transaction rolled back both writes, or neither
    // happened. That is the whole point of ATLAS-013 — there is no orphan state
    // to repair here, so there is no rollback path.
    console.error("[add-child] create_child_with_consent failed", {
      parentId: parent.id,
      err: rpcErr,
    });
    return {
      ok: false,
      error: "Could not save child. Please try again.",
    };
  }

  // Funnel instrumentation (fail-soft, off the response path via after()).
  // Both events fire only past a committed create, so they always reflect a
  // child that actually persisted. No PII: ids + non-identifying scalars only.
  const admin = createServiceClient();
  after(() => {
    void emit(admin, ANALYTICS_EVENTS.CHILD_PROFILE_CREATED, {
      tenantId: parent.tenant_id,
      childId,
      props: { grade_level: data.gradeLevel ?? null },
    });
    void emit(admin, ANALYTICS_EVENTS.PARENT_CONSENT_COMPLETED, {
      tenantId: parent.tenant_id,
      childId,
      props: {
        consent_type: CONSENT_TYPE,
        consent_text_version: CONSENT_TEXT_VERSION,
      },
    });
  });

  return { ok: true, childId };
}
