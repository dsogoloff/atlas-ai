// ATLAS-012 (partial) — application-owned browser security headers.
//
// OWNED IN-REPO, not in the Vercel dashboard. There is no vercel.json/vercel.ts
// in this project, so before this the app shipped whatever defaults the platform
// happened to apply — invisible in code review, untestable, and silently
// changeable by anyone with dashboard access. These are now a reviewable
// artifact with tests.
//
// SCOPE. This is the PARTIAL: the headers that cannot break a surface. A full
// Content-Security-Policy is deferred to Bar 2, which needs the report-only
// rollout and dependency inventory the audit describes. The ONE CSP directive
// here is `frame-ancestors 'none'` — see FRAMING below for why that is safe to
// enforce today while the rest of CSP is not.
//
// Consumed from two places so a response cannot slip through without them:
//   * next.config.ts headers() — the primary mechanism, covering every route
//     Next serves (pages, /api route handlers, and server-action POSTs, which
//     post to their page's own path);
//   * src/lib/supabase/middleware.ts — for responses middleware SHORT-CIRCUITS
//     (the ATLAS-007 MFA redirect), which never reach the routing layer and so
//     would otherwise miss the config-declared headers.
// One definition, two application points.

export interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * Two years, subdomains included. Deliberately NO `preload`.
 *
 * Preload is a submission to a browser-maintained list; it is slow and awkward
 * to reverse, and `includeSubDomains` + preload would commit EVERY subdomain of
 * samnewyork.com — including the marketing site, which this repo does not own —
 * to HTTPS-only, permanently, from browsers' point of view. That is a founder
 * decision about a domain-wide commitment, not an app-layer default.
 */
const HSTS = "max-age=63072000; includeSubDomains";

/**
 * Deny every powerful feature. Verified against the code: the app calls no
 * getUserMedia, no geolocation, no fullscreen, no Web Audio, no payment or
 * device APIs anywhere — including the assessment player, which is plain DOM.
 * So there is nothing to keep enabled and the empty allowlist costs us nothing.
 *
 * `interest-cohort=()` is legacy FLoC; harmless to keep and still honoured by
 * some builds.
 */
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=()",
  "geolocation=()",
  "gyroscope=()",
  "interest-cohort=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

/**
 * FRAMING — X-Frame-Options for older browsers, CSP frame-ancestors for modern
 * ones. Both say the same thing: this app is never embedded.
 *
 * Verified before denying: `grep` finds no <iframe>, no embed, and nothing that
 * relies on being framed anywhere in src/. The HubSpot Contract B scheduler was
 * specified as a NEW TAB rather than an iframe, so it does not create an
 * exception either. No scoped carve-out was needed.
 *
 * Shipping `frame-ancestors` as an ENFORCING CSP header is safe in a way the
 * rest of CSP is not: unspecified directives are unrestricted, so a policy
 * containing only frame-ancestors constrains framing and nothing else. It
 * cannot block a script, a style, an image or a fetch. This is NOT a general
 * CSP and must not be mistaken for the start of one — Bar 2 owns that.
 */
const CSP_FRAME_ANCESTORS = "frame-ancestors 'none'";

/** Applied to every route in the application. */
export const BASE_SECURITY_HEADERS: readonly SecurityHeader[] = [
  { key: "Strict-Transport-Security", value: HSTS },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: CSP_FRAME_ANCESTORS },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
];

/**
 * Child assessment routes — the strictest set.
 *
 * Identical to the base except the referrer policy, which hardens from
 * `strict-origin-when-cross-origin` to `no-referrer`: a child screen should
 * disclose nothing at all about where the child is, not even our origin. This
 * pairs with ATLAS-006, which removed every third-party tag from these routes —
 * there is no legitimate consumer of a referrer here, so sending one is pure
 * leakage.
 *
 * Everything else is already maximally restrictive in the base set, so the
 * difference is deliberately one header rather than a divergent second policy
 * that could drift.
 */
export const CHILD_SECURITY_HEADERS: readonly SecurityHeader[] =
  BASE_SECURITY_HEADERS.map((header) =>
    header.key === "Referrer-Policy"
      ? { key: header.key, value: "no-referrer" }
      : header,
  );

/**
 * Route sources for next.config headers(). ORDER MATTERS: Next applies every
 * matching rule in order, and a later rule's value wins for the same key — so
 * the child rule must come AFTER the catch-all to override Referrer-Policy.
 */
export const CHILD_ROUTE_SOURCES = ["/assessment", "/assessment/:path*"] as const;

/** Apply a header set to a Response/NextResponse in place. */
export function applySecurityHeaders(
  headers: Headers,
  set: readonly SecurityHeader[] = BASE_SECURITY_HEADERS,
): void {
  for (const { key, value } of set) headers.set(key, value);
}
