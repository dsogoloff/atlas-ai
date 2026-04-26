// Supabase clients for server contexts.
//
// `createClient()` runs as the authenticated user (RLS-enforced) and
// reads / writes the session cookie via Next.js's `cookies()`.
// `createServiceClient()` uses the SERVICE ROLE key and bypasses RLS;
// reserve it for admin / job code (e.g., serving questions one-at-a-time
// per compliance.md §8, writing audit log rows).

import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env, getServiceRoleKey } from "@/lib/env";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
            );
          } catch {
            // Called from a Server Component — set() is a no-op there.
            // Middleware refreshes the session cookie, so this is safe.
          }
        },
      },
    },
  );
}

// Service role client. RLS is bypassed. Never use in code reachable from
// client components or unauthenticated routes.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    getServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
