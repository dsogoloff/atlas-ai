"use server";

// Forgot-password (reset request) server action.
//
// Flow:
//   1. Validate input (zod).
//   2. Call supabase.auth.resetPasswordForEmail(email, { redirectTo }) where
//      redirectTo points at our token-hash recovery route:
//        `${origin}/auth/reset?next=/login`
//      The "Reset Password" email template links to /auth/reset with a
//      token_hash (mirrors /auth/confirm) so verification is server-side and
//      device-independent (no PKCE code_verifier cookie needed).
//   3. ALWAYS return a neutral { ok: true } — NEVER reveal whether the email
//      maps to an account (anti-enumeration; same principle as Supabase's
//      repeat-signup behaviour and the generic login error). The send result
//      does not gate the outcome: a Supabase error, a non-existent address, or
//      a transient failure all return the same neutral success so an attacker
//      cannot distinguish registered from unregistered emails.
//
// No vpc_audit_log row: password reset is not a VPC consent event (the
// vpc_event_type enum has no reset event), so there is nothing consistent to
// write — unlike /auth/confirm, which completes the COPPA verification trail.

import { guardAuthAttempt } from "@/lib/quota/authGuard";
import { canonicalUrl } from "@/lib/config/publicOrigin";
import { createClient } from "@/lib/supabase/server";

import { ForgotPasswordSchema, type ForgotPasswordInput } from "./schema";

export type ForgotPasswordResult = { ok: true };

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<ForgotPasswordResult> {
  const parsed = ForgotPasswordSchema.safeParse(input);
  // Even on a malformed payload we return the neutral success: the form
  // already validates client-side, and surfacing a distinct error here would
  // leak nothing useful while breaking the single-state anti-enumeration UX.
  if (!parsed.success) {
    return { ok: true };
  }

  // ATLAS-004: reset mail is the classic amplification vector — cheap to
  // request, lands in someone else's inbox. Limited tightly per email.
  //
  // NOTE the deliberate silence: this action returns the SAME neutral ok:true
  // whatever happens, to avoid leaking whether an address is registered. A
  // throttled response that said "too many attempts" would reintroduce exactly
  // that oracle, so a blocked request simply stops doing work and returns ok.
  const guard = await guardAuthAttempt("reset", input, parsed.data.email);
  if (!guard.ok) {
    return { ok: true };
  }

  try {
    // ATLAS-011: the recovery link's origin comes from APP_PUBLIC_ORIGIN, never
    // from `Origin` / `Referer`. This is the highest-value target of the whole
    // finding — a password-reset link pointed at an attacker's domain is a
    // direct account takeover, delivered inside a genuine email from us.
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: canonicalUrl("/auth/reset?next=/login"),
    });
  } catch {
    // Swallow — the outcome must not depend on the send result (see header).
  }

  return { ok: true };
}
