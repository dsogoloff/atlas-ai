// Cookie-refreshing middleware for Supabase Auth in Next.js.
//
// The Supabase auth library stores its session as cookies. They expire and
// must be refreshed on every request that touches a protected resource.
// Middleware is the only place in the App Router lifecycle where we can
// reliably write fresh cookies before route handlers / server components
// read them.
//
// ATLAS-007 also makes this the OUTER staff-MFA gate — see staffPathGate below.

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decideStaffMfaStep, mfaStepPath } from "@/lib/auth/staffMfa";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Path prefixes that are unambiguously staff-only, so the gate can act on the
 * PATH alone without a database round-trip to learn the caller's role. That
 * property is what keeps parent traffic untouched: no parent surface lives
 * under these prefixes, so a parent is never evaluated, let alone prompted.
 */
const STAFF_PATH_PREFIXES = ["/admin", "/instructor"] as const;

/**
 * Paths that must stay reachable while below AAL2, or enrolment is impossible.
 * A staff user at aal1 can reach EXACTLY these and nothing else privileged.
 */
const MFA_EXEMPT_PREFIXES = ["/mfa", "/login", "/auth", "/api/auth"] as const;

function hasPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** True iff this request is for a privileged staff path that the gate covers. */
export function isGatedStaffPath(pathname: string): boolean {
  if (hasPrefix(pathname, MFA_EXEMPT_PREFIXES)) return false;
  return hasPrefix(pathname, STAFF_PATH_PREFIXES);
}

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
  const { data } = await supabase.auth.getUser();

  // -------------------------------------------------------------------------
  // ATLAS-007 — outer staff-MFA gate.
  //
  // Deliberately narrow. It only fires for an AUTHENTICATED request under a
  // staff path prefix; an anonymous visitor falls through so the page's own
  // /login redirect still owns that case (and so this never turns a 404 into an
  // MFA prompt). It does not query instructors/admins — that would put a DB
  // round-trip on every request in the app — so it cannot tell a parent who
  // typed /admin from real staff. That is safe: such a parent is bounced to
  // /mfa/enroll, which itself resolves staff and sends a non-staff user to
  // /dashboard. No privileged data is reachable either way.
  //
  // AAL is read from the local session (documented as microseconds, no network).
  // Any failure to read it denies, matching decideStaffMfaStep's fail-closed
  // contract.
  // -------------------------------------------------------------------------
  const pathname = request.nextUrl.pathname;
  if (data.user && isGatedStaffPath(pathname)) {
    let aal = null as { currentLevel: string | null; nextLevel: string | null } | null;
    try {
      const { data: level, error } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      aal = error || !level
        ? null
        : { currentLevel: level.currentLevel, nextLevel: level.nextLevel };
    } catch {
      aal = null;
    }

    const decision = decideStaffMfaStep({ isStaff: true, aal });
    if (decision !== "allow") {
      const target = request.nextUrl.clone();
      const next = `${pathname}${request.nextUrl.search}`;
      const step = mfaStepPath(decision, next);
      const [path, query] = step.split("?");
      target.pathname = path;
      target.search = query ? `?${query}` : "";
      return NextResponse.redirect(target);
    }
  }

  return response;
}
