// Clients for the integration suite.
//
// These deliberately do NOT use the generated Database types. The whole point
// of an adversarial RLS test is to send payloads the TypeScript layer forbids —
// a parent PATCHing `tenant_id` would not compile against the typed client, and
// a test that cannot express the attack cannot prove it is blocked. The
// database, not the type system, is the control being tested here.

import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[integration] ${name} is not set. These tests need a running Supabase ` +
        `stack — see the 'rls-integration' job in .github/workflows/verify.yml.`,
    );
  }
  return value;
}

export const SUPABASE_URL = () => requireEnv("SUPABASE_URL");
export const ANON_KEY = () => requireEnv("SUPABASE_ANON_KEY");
export const SERVICE_ROLE_KEY = () => requireEnv("SUPABASE_SERVICE_ROLE_KEY");

/** Bypasses RLS. Used only to build fixtures and to READ BACK ground truth. */
export function serviceClient() {
  return createClient(SUPABASE_URL(), SERVICE_ROLE_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Unauthenticated `anon` role. */
export function anonClient() {
  return createClient(SUPABASE_URL(), ANON_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A client carrying a REAL GoTrue JWT for `email`, so PostgREST sees the
 * `authenticated` role and `auth.uid()` resolves. This is what makes the suite
 * a faithful reproduction of the audit's threat model: the literal HTTP request
 * a signed-in parent's browser could issue.
 */
export async function signInAs(email: string, password: string) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`[integration] sign-in failed for ${email}: ${error.message}`);
  }
  return client;
}
