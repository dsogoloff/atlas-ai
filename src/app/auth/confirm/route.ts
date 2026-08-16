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
//   3. Write verification_clicked + verification_succeeded to vpc_audit_log,
//      and (first confirmation only) fire the staff "account created" alert.
//      Confirmation — not raw signup — is the account-created moment: an
//      unconfirmed signup is not an account.
//   4. ALWAYS redirect a confirmed user to a clean /login?confirmed=1 — never
//      assume a session exists in THIS browser (the link may be opened on a
//      different device or pre-fetched by a scanner; cross-device there is no
//      session, so landing on `next` would bounce to /signup and strand them).
//      The guarded `next` rides along so the post-login redirect carries them
//      onward, and the confirmed email (when present) prefills the form. Any
//      failure -> /signup?error=verify_failed.

import { headers } from "next/headers";
import { NextResponse, after, type NextRequest } from "next/server";

import type { EmailOtpType } from "@supabase/supabase-js";

import { canonicalUrl } from "@/lib/config/publicOrigin";
import { notifyAccountCreated } from "@/lib/staffAlerts/notify";
import { consumeAuthAttempt } from "@/lib/quota/authLimits";
import { extractClientIp } from "@/lib/questionAccessLog/log";
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

  // ATLAS-004: token verification is cheap and legitimate retries happen (mail
  // scanners pre-fetch these links), so the limit is loose — it exists to stop
  // enumeration hammering, not to police normal use. Keyed by IP only: the
  // token is opaque and there is no account identifier to key on before it is
  // verified. Real HTTP 429 here, since this is a route handler.
  const throttle = await consumeAuthAttempt(
    "confirm",
    extractClientIp(await headers()),
  );
  if (!throttle.allowed) {
    return new NextResponse("Too many attempts. Please try again shortly.", {
      status: 429,
      headers: {
        // Coarse and constant — the precise reset time is internal state.
        "Retry-After": String(throttle.retryAfterSeconds),
      },
    });
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
    // name + email feed the staff account-created alert below; they are the
    // ONLY parent fields that leave the box (see staffAlerts/notify.ts).
    .select("id, tenant_id, home_center_id, name, email")
    .eq("auth_user_id", verified.user.id)
    .maybeSingle();

  if (parent) {
    const h = await headers();
    const ipRaw = h.get("x-forwarded-for") ?? h.get("x-real-ip");
    const ip = ipRaw?.split(",")[0]?.trim() ?? null;
    const userAgent = h.get("user-agent") ?? null;

    // ONCE-PER-ACCOUNT guard for the staff alert. verifyOtp tokens are
    // single-use, but a parent who requests a second confirmation email (or a
    // re-sent link) can land here again with a fresh valid token — so the
    // alert keys off the durable VPC trail rather than off this request:
    // a pre-existing verification_succeeded row means this account was already
    // confirmed once and already announced. Read BEFORE the insert below.
    const { data: priorConfirm } = await admin
      .from("vpc_audit_log")
      .select("id")
      .eq("parent_id", parent.id)
      .eq("event_type", "verification_succeeded")
      .limit(1);
    const firstConfirmation = (priorConfirm ?? []).length === 0;

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

    // Staff alert — non-blocking. `after()` runs the send once the redirect has
    // already been returned, so a slow or failing Resend call costs the parent
    // nothing on the confirm click; notifyAccountCreated never throws, and the
    // trailing catch is belt-and-suspenders. No child data: at confirm time
    // there is usually no child yet, and a result never exists.
    if (firstConfirmation) {
      after(() =>
        notifyAccountCreated({
          parentName: parent.name,
          parentEmail: parent.email,
          // ATLAS-011: canonical origin, NOT url.origin. `request.url` is built
          // from the Host / X-Forwarded-Host header, so a forged host would put
          // an attacker-controlled "admin" link inside an email we send to
          // staff — a phishing vector into the admin panel.
          adminUrl: canonicalUrl("/admin"),
        }).catch(() => undefined),
      );
    }
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
