// Cookie-refreshing middleware for Supabase Auth in Next.js.
//
// The Supabase auth library stores its session as cookies. They expire and
// must be refreshed on every request that touches a protected resource.
// Middleware is the only place in the App Router lifecycle where we can
// reliably write fresh cookies before route handlers / server components
// read them.

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching auth.getUser() refreshes the session cookie. The result is
  // ignored here — route code re-reads via its own server client.
  await supabase.auth.getUser();

  return response;
}
