"use server";

// Signup server action.
//
// Flow:
//   1. Validate input (zod).
//   2. Verify the chosen center exists and is ACTIVE in the v1 tenant.
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

  const { data: center, error: centerErr } = await admin
    .from("centers")
    .select("id, status, tenant_id")
    .eq("id", data.centerId)
    .maybeSingle();
  if (centerErr || !center) {
    return { ok: false, error: "Selected center not found." };
  }
  if (center.tenant_id !== tenant.id || center.status !== "ACTIVE") {
    return { ok: false, error: "Selected center is not currently available." };
  }

  // Read request headers once — used for both the email redirect URL
  // and the audit-log entries below.
  const h = await headers();
  const origin = h.get("origin") ?? h.get("referer") ?? "";

  // Create auth user (queues verification email — see compliance.md §2).
  const auth = await createClient();
  const { data: signup, error: signupErr } = await auth.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      // Where Supabase sends the parent after they click the verify link.
      // /coppa is the consent-confirmation surface for now; later cycles
      // will swap this to a /verify-callback handler that writes the
      // verification_succeeded audit row and forwards to /add-child.
      emailRedirectTo: origin ? `${origin}/coppa` : undefined,
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
      name: `${data.firstName} ${data.lastName}`.trim(),
    })
    .select("id")
    .single();
  if (parentErr || !parent) {
    // Best-effort cleanup: the auth user was created but we couldn't
    // attach a parent row. Surface the error; admin can clean up later.
    return {
      ok: false,
      error: "Account created but profile save failed. Contact support.",
    };
  }

  // Audit trail (compliance.md §2). Both events fire here: the parent
  // initiated consent (clicked the box and submitted), they selected a
  // home center, and Supabase queued a verification email.
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
