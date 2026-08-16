import type { NextConfig } from "next";

// ATLAS-012 (partial) — security headers are declared HERE rather than in
// middleware, and the choice is deliberate:
//
//   * headers() is applied by the ROUTING layer, so it covers every response
//     Next serves — pages, /api route handlers, and server-action POSTs (which
//     post to their own page's path). Middleware would have to set them on each
//     return path by hand, and a missed branch loses them silently.
//   * It touches src/proxy.ts not at all, so there is zero risk of disturbing
//     the ATLAS-007 MFA prefix gate or the session refresh it wraps.
//   * It compiles into .next/routes-manifest.json, which makes the shipped
//     rules inspectable rather than something we assert about ourselves.
//
// The one thing headers() cannot cover is a response middleware SHORT-CIRCUITS
// before routing — the ATLAS-007 MFA redirect. That case applies the same set
// from the same module, in lib/supabase/middleware.ts.
//
// A full Content-Security-Policy is NOT here: Bar 2 owns it. The only CSP
// directive present is frame-ancestors, which cannot break a surface. See
// src/lib/security/headers.ts.

import {
  BASE_SECURITY_HEADERS,
  CHILD_ROUTE_SOURCES,
  CHILD_SECURITY_HEADERS,
} from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Catch-all FIRST: every route gets the base set.
      {
        source: "/:path*",
        headers: [...BASE_SECURITY_HEADERS],
      },
      // Child assessment routes SECOND, so the stricter Referrer-Policy
      // overrides the catch-all's value for the same key.
      ...CHILD_ROUTE_SOURCES.map((source) => ({
        source,
        headers: [...CHILD_SECURITY_HEADERS],
      })),
    ];
  },
};

export default nextConfig;
