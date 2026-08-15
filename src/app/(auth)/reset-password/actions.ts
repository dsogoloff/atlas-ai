"use server";

// Set-new-password server action.
//
// Runs with the RECOVERY session established by /auth/reset (verifyOtp wrote
// the session cookie; createClient() reads it). Flow:
//   1. Validate input (zod) — min 12 + confirm match.
//   2. supabase.auth.updateUser({ password }) — updates the password for the
//      recovery-session user.
//   3. On success, supabase.auth.signOut() so the user lands on a CLEAN /login
//      and re-authenticates with the new password (same "don't preserve the
//      session, always log in fresh" principle as the email-confirm flow). The
//      form then navigates to /login?reset=1, which shows the "Password
//      updated" banner. If we did NOT sign out, the upgraded recovery session
//      would trip the login page's anonymous-only gate and bounce the user to
//      /dashboard, skipping the banner.
//   4. On failure (no/expired recovery session, weak password Supabase rejects)
//      return a generic error for the form to surface inline.

import {
  authThrottleMessage,
  guardAuthAttempt,
} from "@/lib/quota/authGuard";
import { createClient } from "@/lib/supabase/server";

import { ResetPasswordSchema, type ResetPasswordInput } from "./schema";

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ResetPasswordResult> {
  const parsed = ResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Form validation failed. Refresh and try again." };
  }

  // ATLAS-004: keyed by IP only — the account is identified by the recovery
  // SESSION, not by anything in the payload, so there is no address to key on
  // and none should be invented.
  const guard = await guardAuthAttempt("password_set", input);
  if (!guard.ok) {
    return { ok: false, error: authThrottleMessage(guard) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    // Most common cause: the recovery session is missing or expired (link
    // opened too late, or page reached without going through /auth/reset).
    return {
      ok: false,
      error:
        "Could not update your password. Your reset link may have expired — request a new one.",
    };
  }

  // Clear the recovery session so /login is reached anonymously and the
  // user signs in fresh with the new password.
  await supabase.auth.signOut();

  return { ok: true };
}
