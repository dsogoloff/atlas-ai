// Supabase client for browser components.
//
// Use in client components ("use client") only. Reads/writes cookies via
// document.cookie. Always runs as the authenticated user (or anon if
// signed out), so RLS enforces per-row access.
//
// For server components, route handlers, server actions, or middleware,
// import from "./server" instead.

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
