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

import { headers } from "next/headers";

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

  try {
    const h = await headers();
    const origin = h.get("origin") ?? h.get("referer") ?? "";

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: origin ? `${origin}/auth/reset?next=/login` : undefined,
    });
  } catch {
    // Swallow — the outcome must not depend on the send result (see header).
  }

  return { ok: true };
}
