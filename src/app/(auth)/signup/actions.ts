"use server";

// Signup server action.
//
// Flow:
//   1. Validate input (zod).
//   2. Resolve the single ACTIVE center in the v1 tenant server-side
//      (day-1 single-center; the form no longer collects a center).
//   3. Create Supabase auth user via signUp() — this also queues a
//      verification email (compliance.md §2 "email plus" step 2).
//   4. Insert parents row tied to the new auth_user_id.
//   5. Write vpc_audit_log entries for `consent_initiated` and
//      `verification_sent` (compliance.md §2 audit trail).
//
// Steps 2, 4, 5 use the service-role client because at this point we
// don't have an authenticated session yet (Supabase delays the session
// until the email is confirmed when "Confirm email" is enabled, which
// is exactly what we want for VPC).

import { headers } from "next/headers";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { SignupSchema, type SignupInput } from "./schema";

const TENANT_SLUG = "inspirea_singapore_math";

export type SignupResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export async function signupAction(input: SignupInput): Promise<SignupResult> {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Form validation failed. Refresh and try again." };
  }
  const data = parsed.data;

  const admin = createServiceClient();

  // Resolve tenant + verify center.
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", TENANT_SLUG)
    .maybeSingle();
  if (tenantErr || !tenant) {
    return { ok: false, error: "Tenant unavailable. Try again in a moment." };
  }

  // Single-center attach (day-1 pilot). Resolve the one ACTIVE center in
  // the v1 tenant ourselves — the signup form no longer asks the parent to
  // choose. GUARD: if more than one ACTIVE center ever exists we fail
  // LOUDLY rather than silently pick one, because "which center?" becomes a
  // real decision the moment multi-center is live. This keeps it safe to
  // reintroduce a selector (and the schema `centerId` field) when we go
  // multi-tenant (ENABLE_MULTI_TENANT) — until then a second ACTIVE center
  // is a misconfiguration we must not paper over.
  const { data: activeCenters, error: centerErr } = await admin
    .from("centers")
    .select("id, status, tenant_id")
    .eq("tenant_id", tenant.id)
    .eq("status", "ACTIVE");
  if (centerErr) {
    return { ok: false, error: "Center unavailable. Try again in a moment." };
  }
  if (!activeCenters || activeCenters.length === 0) {
    return {
      ok: false,
      error: "Signups are temporarily unavailable. Please try again later.",
    };
  }
  if (activeCenters.length > 1) {
    // Loud failure — see guard note above. Surfaces as a 500 + server log
    // so the misconfiguration is impossible to miss; do NOT downgrade this
    // to silently attaching activeCenters[0].
    throw new Error(
      `[signup] expected exactly one ACTIVE center for tenant ${tenant.id}, ` +
        `found ${activeCenters.length}. Single-center auto-attach is unsafe ` +
        `with multiple active centers — reintroduce the center selector ` +
        `before enabling multi-center signup.`,
    );
  }
  const center = activeCenters[0];

  // Read request headers once — used for both the email redirect URL
  // and the audit-log entries below.
  const h = await headers();
  const origin = h.get("origin") ?? h.get("referer") ?? "";

  const fullName = `${data.firstName} ${data.lastName}`.trim();

  // Create auth user (queues verification email — see compliance.md §2).
  const auth = await createClient();
  const { data: signup, error: signupErr } = await auth.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      // Persist the name on the auth identity too (not just the parents row).
      // This is display/recovery metadata only — NEVER an authorization source
      // (user_metadata is user-editable). It lets the dashboard self-heal an
      // orphaned auth user (parents-insert failure) by rebuilding the profile
      // from the auth identity. See dashboard/recover-profile.ts.
      data: {
        full_name: fullName,
        first_name: data.firstName,
        last_name: data.lastName,
      },
      // Email confirmation uses the token-hash (verifyOtp) flow, NOT PKCE: the
      // "Confirm signup" template links to
      //   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/coppa
      // which verifies server-side with no device-bound code_verifier cookie
      // (the PKCE /auth/callback exchange failed cross-device and on link
      // pre-fetch with verify_failed). emailRedirectTo is kept aligned with that
      // /auth/confirm destination; the template controls the actual link + next.
      emailRedirectTo: origin
        ? `${origin}/auth/confirm?next=/coppa`
        : undefined,
    },
  });
  if (signupErr || !signup.user) {
    return {
      ok: false,
      error:
        signupErr?.message?.includes("already registered") ||
        signupErr?.code === "user_already_exists"
          ? "An account with that email already exists. Try logging in."
          : "Could not create account. Please try again.",
    };
  }

  // Insert parents row (service role — RLS would block; no session yet).
  const { data: parent, error: parentErr } = await admin
    .from("parents")
    .insert({
      auth_user_id: signup.user.id,
      tenant_id: tenant.id,
      home_center_id: center.id,
      email: data.email,
      name: fullName,
    })
    .select("id")
    .single();
  if (parentErr || !parent) {
    // ROLL BACK the just-created auth user. Without this the account is an
    // orphan: it can authenticate but has no parents row, so it dead-ends
    // forever ("Account profile not found") and the email can't even be
    // reused to sign up again. Deleting the auth user makes a retry clean.
    const { error: rollbackErr } = await admin.auth.admin.deleteUser(
      signup.user.id,
    );
    if (rollbackErr) {
      // Delete failed — the orphan persists. Log loudly (the dashboard
      // self-heal in recover-profile.ts is the backstop) but still surface
      // the ORIGINAL failure to the user; do not mask it with the cleanup error.
      console.error("[signup] orphan rollback failed — auth user persists", {
        authUserId: signup.user.id,
        rollbackErr,
        parentErr,
      });
    }
    return {
      ok: false,
      error: "Could not finish creating your account. Please try again.",
    };
  }

  // Audit trail (compliance.md §2). All three events fire here: the parent
  // initiated consent (clicked the box and submitted), they were attached
  // to the single active center, and Supabase queued a verification email.
  // The `center_selected` event name is retained (enum value) even though
  // the center is now auto-attached rather than picked.
  const ipRaw = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  const ip = ipRaw?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  await admin.from("vpc_audit_log").insert([
    {
      tenant_id: tenant.id,
      parent_id: parent.id,
      event_type: "consent_initiated",
      center_id: center.id,
      ip_address: ip,
      user_agent: userAgent,
      metadata: { center_name_at_consent_time: null },
    },
    {
      tenant_id: tenant.id,
      parent_id: parent.id,
      event_type: "center_selected",
      center_id: center.id,
      ip_address: ip,
      user_agent: userAgent,
      metadata: null,
    },
    {
      tenant_id: tenant.id,
      parent_id: parent.id,
      event_type: "verification_sent",
      center_id: center.id,
      ip_address: ip,
      user_agent: userAgent,
      metadata: null,
    },
  ]);

  return { ok: true, email: data.email };
}
