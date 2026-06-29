// Supabase Auth token-hash (verifyOtp) PASSWORD-RECOVERY route.
//
// Mirrors /auth/confirm, for the "Reset Password" email instead of "Confirm
// signup". The recovery link is a token-hash (NOT PKCE) so verification is
// server-side and works regardless of browser/device and survives an email
// scanner pre-fetch (no device-bound code_verifier cookie needed).
//
// The "Reset Password" email template must point here:
//   {{ .SiteURL }}/auth/reset?token_hash={{ .TokenHash }}&type=recovery&next=/login
//
// Flow:
//   1. Read token_hash + type (+ same-origin-guarded next, default /login).
//   2. verifyOtp({ type: 'recovery', token_hash }) — verifies server-side and,
//      because createClient() is wired to the cookie store, ESTABLISHES the
//      recovery session in this browser's cookies.
//   3. On success -> redirect to /reset-password, where the (now-authenticated)
//      recovery session lets the set-new-password form call updateUser().
//   4. Any failure (bad/missing token, wrong type, verifyOtp error) ->
//      /forgot-password?error=reset_failed so the user can request a fresh link.
//
// No vpc_audit_log row: password recovery is not a VPC consent event (the
// vpc_event_type enum has no reset event). /auth/confirm writes the COPPA
// verification trail; there is no consent-semantics-consistent row to write
// here, and reusing a consent event would corrupt that trail.

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextRaw = url.searchParams.get("next") ?? "/login";

  // Only allow same-origin paths in `next` to prevent open-redirect.
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/login";

  // This route handles password recovery only; reject any other OTP type so a
  // recovery link can't be repurposed to verify a different flow.
  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(
      `${url.origin}/forgot-password?error=reset_failed`,
    );
  }

  const auth = await createClient();
  const { data: verified, error: verifyErr } = await auth.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });

  if (verifyErr || !verified.user) {
    return NextResponse.redirect(
      `${url.origin}/forgot-password?error=reset_failed`,
    );
  }

  // Recovery session is now set in cookies. Send the user to the
  // set-new-password page; `next` rides along for the post-reset destination
  // (the reset-password action lands them on /login?reset=1 itself, but we
  // keep the guarded next available for parity with /auth/confirm).
  const target = new URL(`${url.origin}/reset-password`);
  target.searchParams.set("next", next);
  return NextResponse.redirect(target.toString());
}
