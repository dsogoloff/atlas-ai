import "server-only";

// Dedicated Supabase client for the TWO calls that MINT an email-delivered
// auth token: auth.signUp() (src/app/(auth)/signup/actions.ts) and
// auth.resetPasswordForEmail() (src/app/(auth)/forgot-password/actions.ts).
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — do not delete, do not fold back into the shared client.
//
// @supabase/ssr's createServerClient/createBrowserClient hardcode
// `flowType: "pkce"` AFTER spreading the caller's own `auth` options, which
// makes it IMPOSSIBLE to override by passing options through — confirmed by
// reading node_modules/@supabase/ssr/dist/module/createServerClient.js
// directly (not assumed from docs). Both /auth/confirm and /auth/reset are
// built on the TOKEN-HASH flow (verifyOtp({ token_hash })), which needs a
// plain-hash token — a `pkce_`-prefixed one is structurally rejected.
//
// From 2026-04-26 (the very first commit that wired up Supabase, bfabe14)
// until this fix, both signUp() and resetPasswordForEmail() ran through the
// shared @supabase/ssr client (src/lib/supabase/server.ts), so EVERY
// confirmation link and EVERY password-reset link minted a `pkce_`-prefixed
// token_hash that verifyOtp could never accept. Both flows were broken in
// production the entire time — silently, because neither route logged the
// verifyOtp failure reason (fixed alongside this in confirm/route.ts and
// reset/route.ts).
//
// This client uses the PLAIN @supabase/supabase-js createClient (NOT the
// @supabase/ssr wrapper), whose default flowType is 'implicit' — set
// explicitly below anyway so the intent is never implicit-by-accident, and
// so a regression (someone "helpfully" removing the option, or swapping
// this back to the @supabase/ssr wrapper) is a one-line diff a reviewer can
// catch, backed by token-hash-client.test.ts's guard.
// ---------------------------------------------------------------------------
//
// SCOPE: use this ONLY for calls that mint an emailed token. Every other
// auth call (signInWithPassword, verifyOtp, exchangeCodeForSession,
// updateUser, session reads) MUST keep using the shared cookie-wired client
// from ./server — this client is stateless (no session persistence, no
// cookie plumbing) and is not a substitute for it.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "./database.types";

export function createTokenHashClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        // The whole point of this module — see header comment. Never remove
        // without also fixing the token-hash routes it feeds.
        flowType: "implicit",
        // No session to persist: signUp() (with "Confirm email" on) and
        // resetPasswordForEmail() don't establish a session on this call,
        // and this client isn't reused across requests.
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
