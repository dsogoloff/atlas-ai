"use server";

// Add-child server action.
//
// Flow:
//   1. Validate input (zod) — includes the per-child consent literal.
//   2. Resolve the calling parent via supabase.auth.getUser() + parents
//      lookup. The page-level auth gate (page.tsx) catches unauth users
//      before this point; this is defense-in-depth.
//   3. Insert into children with parent_id, tenant_id, and home_center_id
//      copied from the parent's row. RLS policy children_parent_all
//      accepts the insert when parent_id = app_current_parent_id().
//   4. Record the binding PER-CHILD consent (Model B / COPPA Gate-B): a
//      consent_records row keyed to the new child_id. This is the record the
//      assessment gate (src/lib/consent/verify.ts) checks. If it fails we roll
//      back the child (best-effort) so we never leave a child that can never
//      be assessed.
//
// Why createClient() for the child insert (not service role): the parent has
// an authenticated session here (post-verification), and RLS on children
// allows parent-scoped inserts via children_parent_all. The consent_records
// write uses the service role (consent_records grants parents self-SELECT
// only — no client insert policy — mirroring how signup writes vpc_audit_log).

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

  const { data: child, error: childErr } = await supabase
    .from("children")
    .insert({
      tenant_id: parent.tenant_id,
      parent_id: parent.id,
      home_center_id: parent.home_center_id,
      name: data.name,
      birth_year: data.birthYear,
      grade_level: data.gradeLevel ?? null,
    })
    .select("id")
    .single();
  if (childErr || !child) {
    console.error("[add-child] child insert failed", {
      parentId: parent.id,
      err: childErr,
    });
    return {
      ok: false,
      error: "Could not save child. Please try again.",
    };
  }

  // Record the binding per-child consent. Service role: consent_records has no
  // client insert policy. Keyed to the child just created.
  const admin = createServiceClient();
  const h = await headers();
  const ipRaw = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  const ip = ipRaw?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  const { error: consentErr } = await admin.from("consent_records").insert({
    tenant_id: parent.tenant_id,
    parent_id: parent.id,
    child_id: child.id,
    consent_type: CONSENT_TYPE,
    consent_text_version: CONSENT_TEXT_VERSION,
    consent_text: CONSENT_TEXT,
    disclosure_version: DISCLOSURE_VERSION,
    disclosure_content_sha256: DISCLOSURE_CONTENT_SHA256,
    data_uses: [...DATA_USES],
    sharing_permissions: { ...SHARING_PERMISSIONS },
    ip_address: ip,
    user_agent: userAgent,
  });
  if (consentErr) {
    // Don't leave a child that can never be assessed. Best-effort rollback of
    // the just-created child (RLS allows the owning parent to delete it).
    console.error("[add-child] consent insert failed; rolling back child", {
      parentId: parent.id,
      childId: child.id,
      err: consentErr,
    });
    const { error: rollbackErr } = await supabase
      .from("children")
      .delete()
      .eq("id", child.id);
    if (rollbackErr) {
      console.error("[add-child] child rollback failed", {
        childId: child.id,
        err: rollbackErr,
      });
    }
    return {
      ok: false,
      error: "Could not record consent. Please try again.",
    };
  }

  // Funnel instrumentation (fail-soft, off the response path via after()).
  // Both events fire only here — past the consent rollback — so they always
  // reflect a child that actually persisted. No PII: ids + non-identifying
  // scalars only.
  after(() => {
    void emit(admin, ANALYTICS_EVENTS.CHILD_PROFILE_CREATED, {
      tenantId: parent.tenant_id,
      childId: child.id,
      props: { grade_level: data.gradeLevel ?? null },
    });
    void emit(admin, ANALYTICS_EVENTS.PARENT_CONSENT_COMPLETED, {
      tenantId: parent.tenant_id,
      childId: child.id,
      props: {
        consent_type: CONSENT_TYPE,
        consent_text_version: CONSENT_TEXT_VERSION,
      },
    });
  });

  return { ok: true, childId: child.id };
}
