"use server";

// Login server action.
//
// Flow:
//   1. Validate input (zod).
//   2. Call supabase.auth.signInWithPassword(). On success this writes
//      the auth cookie (createClient() wires the cookie store), and the
//      middleware will keep it fresh on subsequent requests.
//   3. Return ok / not-ok. The form decides where to navigate (it owns
//      the `?next=` searchParam — Phase 3 D6).
//
// Error message strategy (Phase 3 D3): always generic on auth failure.
// Supabase distinguishes "Invalid login credentials" from "Email not
// confirmed", but we collapse both to "Email or password is incorrect."
// This avoids disclosing whether an email is registered (mild security
// win) and keeps the UI single-state. If the unverified-email path
// becomes a real pilot pain point, split it out as a separate UX item.
//
// Schema-parse failure returns its own message (matching Phase 2's
// addChildAction pattern) — keeps debugging clarity in the rare case
// the client-side RHF + zod check is bypassed.
//
// No audit row written (Phase 3 D4): compliance.md §2 audit trail
// covers VPC events only; login is out of scope.

import {
  authThrottleMessage,
  guardAuthAttempt,
} from "@/lib/quota/authGuard";
import { createClient } from "@/lib/supabase/server";

import { LoginSchema, type LoginInput } from "./schema";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

const GENERIC_ERROR = "Email or password is incorrect.";

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Form validation failed. Refresh and try again.",
    };
  }
  const data = parsed.data;

  // ATLAS-004: size cap + rate limit before any GoTrue round-trip. Keyed by IP
  // (generous) and by the account being signed into (tight), so shared NAT does
  // not collectively lock out a household. Message is deliberately generic.
  const guard = await guardAuthAttempt("login", input, data.email);
  if (!guard.ok) {
    return { ok: false, error: authThrottleMessage(guard) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true };
}
