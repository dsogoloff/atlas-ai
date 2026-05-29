"use server";

// /coppa consent server action.
//
// M2 readiness audit (2026-05-28): the /coppa screen collected consent via an
// unwired checkbox and never persisted it, so the session-start /
// response-submit gate had no record to check. This action writes the
// enforceable consent_records row the gate reads.
//
// Flow:
//   1. Resolve the calling parent via the authenticated session
//      (signup -> verify -> /coppa, so the session exists by now).
//   2. Idempotency: if the parent already holds an unrevoked consent, succeed
//      without inserting a duplicate (handles back-button / double-submit).
//   3. Insert the consent_records row (service role — consent_records grants
//      parents self-SELECT only; writes are service-role, mirroring how the
//      signup action writes vpc_audit_log).
//
// child_id is NULL: /coppa runs before /add-child, so this is a blanket grant
// covering all of the parent's children (see migration 20260528000000).

import { headers } from "next/headers";

import { createClient, createServiceClient } from "@/lib/supabase/server";

import {
  CONSENT_TEXT,
  CONSENT_TEXT_VERSION,
  CONSENT_TYPE,
  DATA_USES,
  SHARING_PERMISSIONS,
} from "./consent-text";

export type RecordConsentResult =
  | { ok: true }
  | { ok: false; error: string };

export async function recordConsentAction(): Promise<RecordConsentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Please verify your email and sign in before consenting.",
    };
  }

  // Resolve the parent row (RLS restricts selects to the caller's own row).
  const { data: parent, error: parentErr } = await supabase
    .from("parents")
    .select("id, tenant_id")
    .maybeSingle();
  if (parentErr || !parent) {
    console.error("[coppa] parent lookup failed", {
      authUserId: user.id,
      err: parentErr,
    });
    return { ok: false, error: "Account profile not found. Contact support." };
  }

  const admin = createServiceClient();

  // Idempotency — already consented (unrevoked)? Don't write a duplicate.
  const { data: existing, error: existingErr } = await admin
    .from("consent_records")
    .select("id")
    .eq("tenant_id", parent.tenant_id)
    .eq("parent_id", parent.id)
    .eq("revoked", false);
  if (existingErr) {
    console.error("[coppa] existing consent read failed", {
      parentId: parent.id,
      err: existingErr,
    });
    return { ok: false, error: "Could not record consent. Please try again." };
  }
  if ((existing ?? []).length > 0) {
    return { ok: true };
  }

  // Capture request metadata for the audit-grade record (mirrors signup).
  const h = await headers();
  const ipRaw = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  const ip = ipRaw?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  const { error: insertErr } = await admin.from("consent_records").insert({
    tenant_id: parent.tenant_id,
    parent_id: parent.id,
    child_id: null,
    consent_type: CONSENT_TYPE,
    consent_text_version: CONSENT_TEXT_VERSION,
    consent_text: CONSENT_TEXT,
    data_uses: [...DATA_USES],
    sharing_permissions: { ...SHARING_PERMISSIONS },
    ip_address: ip,
    user_agent: userAgent,
  });
  if (insertErr) {
    console.error("[coppa] consent insert failed", {
      parentId: parent.id,
      err: insertErr,
    });
    return { ok: false, error: "Could not record consent. Please try again." };
  }

  return { ok: true };
}
