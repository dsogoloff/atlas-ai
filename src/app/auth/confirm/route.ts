// Supabase Auth token-hash (verifyOtp) email confirmation.
//
// Replaces the PKCE code-exchange flow (/auth/callback) for EMAIL confirmation.
//
// Why: the default confirm link is a PKCE token that lands on /auth/callback and
// needs exchangeCodeForSession(code), which requires the code_verifier cookie
// from the SIGNUP browser. That cookie is absent on a different device — or when
// an email security/spam scanner pre-fetches the one-time link — so the exchange
// fails with verify_failed. The token-hash flow verifies the OTP server-side
// with NO verifier cookie, so it works regardless of browser/device.
//
// The "Confirm signup" email template must point here:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/coppa
//
// Flow mirrors /auth/callback (compliance.md §2 "email plus"):
//   1. Read token_hash + type (+ same-origin-guarded next, default /coppa).
//   2. verifyOtp({ type, token_hash }) — verifies server-side.
//   3. Write verification_clicked + verification_succeeded to vpc_audit_log.
//   4. ALWAYS redirect a confirmed user to a clean /login?confirmed=1 — never
//      assume a session exists in THIS browser (the link may be opened on a
//      different device or pre-fetched by a scanner; cross-device there is no
//      session, so landing on `next` would bounce to /signup and strand them).
//      The guarded `next` rides along so the post-login redirect carries them
//      onward, and the confirmed email (when present) prefills the form. Any
//      failure -> /signup?error=verify_failed.

import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient, createServiceClient } from "@/lib/supabase/server";

// Email-family OTP types Supabase can mint for a token-hash link. We only ever
// issue `email` (signup confirm), but accept the standard email types so the
// route is robust to template/type choices; anything else is rejected.
const ALLOWED_EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && ALLOWED_EMAIL_OTP_TYPES.has(value as EmailOtpType);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextRaw = url.searchParams.get("next") ?? "/coppa";

  // Only allow same-origin paths in `next` to prevent open-redirect.
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/coppa";

  if (!tokenHash || !isEmailOtpType(type)) {
    return NextResponse.redirect(`${url.origin}/signup?error=verify_failed`);
  }

  const auth = await createClient();
  const { data: verified, error: verifyErr } = await auth.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (verifyErr || !verified.user) {
    return NextResponse.redirect(`${url.origin}/signup?error=verify_failed`);
  }

  // Audit rows that complete the VPC trail (mirror /auth/callback). Service
  // role: the parents row + audit log are tenant-scoped and this must succeed
  // even where RLS would otherwise restrict the read.
  const admin = createServiceClient();
  const { data: parent } = await admin
    .from("parents")
    .select("id, tenant_id, home_center_id")
    .eq("auth_user_id", verified.user.id)
    .maybeSingle();

  if (parent) {
    const h = await headers();
    const ipRaw = h.get("x-forwarded-for") ?? h.get("x-real-ip");
    const ip = ipRaw?.split(",")[0]?.trim() ?? null;
    const userAgent = h.get("user-agent") ?? null;

    await admin.from("vpc_audit_log").insert([
      {
        tenant_id: parent.tenant_id,
        parent_id: parent.id,
        event_type: "verification_clicked",
        center_id: parent.home_center_id,
        ip_address: ip,
        user_agent: userAgent,
        metadata: null,
      },
      {
        tenant_id: parent.tenant_id,
        parent_id: parent.id,
        event_type: "verification_succeeded",
        center_id: parent.home_center_id,
        ip_address: ip,
        user_agent: userAgent,
        metadata: null,
      },
    ]);
  }

  // Always land on a clean login with the "email confirmed" banner — no session
  // assumption. Carry the guarded `next` for the post-login redirect, and the
  // confirmed email for prefill when verifyOtp cleanly returned one.
  const target = new URL(`${url.origin}/login`);
  target.searchParams.set("confirmed", "1");
  if (verified.user.email) {
    target.searchParams.set("email", verified.user.email);
  }
  target.searchParams.set("next", next);
  return NextResponse.redirect(target.toString());
}
