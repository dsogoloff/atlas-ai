// Cookie plumbing for the attribution cookie.
//
// The domain rule is the whole reason this file exists. The app is served from
// app.samnewyork.com while the marketing site is www.samnewyork.com; a cookie
// written host-only on the app subdomain would be invisible to the rest of the
// property (and to the eventual HubSpot sync point). So we scope the cookie to
// the REGISTRABLE domain — `.samnewyork.com` — exactly as GA4's `cookie_domain:
// 'auto'` resolves it.
//
// Building/parsing is pure and testable; only readCookie/writeCookie touch
// `document`, and both are no-ops when it is absent (SSR).

import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  deserializeAttribution,
  serializeAttribution,
  type Attribution,
} from "./attribution";

// Public suffixes we may realistically be served from where the last two
// labels are NOT a registrable domain. Setting Domain=.vercel.app would be
// rejected by the browser (and would be a cross-tenant cookie if it weren't),
// so preview deploys get a host-only cookie instead.
const HOST_ONLY_SUFFIXES = [".vercel.app", ".localhost"];

// Two-label public suffixes. Not exhaustive (a full PSL is not worth shipping
// for a US-only property) — anything unlisted falls back to last-two-labels.
const MULTIPART_SUFFIXES = [
  "co.uk",
  "org.uk",
  "com.au",
  "com.sg",
  "com.br",
  "co.in",
  "co.jp",
  "co.nz",
];

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * The value for the cookie's `Domain` attribute, or null for a host-only
 * cookie. Null for localhost, bare hostnames, IPs, and public-suffix hosts
 * (*.vercel.app) — all cases where a Domain attribute is invalid or unsafe.
 */
export function resolveCookieDomain(hostname: string): string | null {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (host === "" || host === "localhost" || IPV4.test(host)) return null;
  if (host.startsWith("[")) return null; // IPv6 literal
  if (HOST_ONLY_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;

  const labels = host.split(".");
  if (labels.length < 2) return null;

  const lastTwo = labels.slice(-2).join(".");
  if (MULTIPART_SUFFIXES.includes(lastTwo)) {
    // The suffix itself (`co.uk`) is not a registrable domain — it needs a
    // label in front of it.
    if (labels.length < 3) return null;
    return `.${labels.slice(-3).join(".")}`;
  }

  return `.${lastTwo}`;
}

/** Build the `document.cookie` assignment string. Pure — exported for tests. */
export function buildAttributionCookie(
  attribution: Attribution,
  hostname: string,
  secure: boolean,
): string {
  const domain = resolveCookieDomain(hostname);
  const parts = [
    `${ATTRIBUTION_COOKIE}=${serializeAttribution(attribution)}`,
    "Path=/",
    `Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}`,
    // Lax, not Strict: the visitor arrives from an ad click (a cross-site
    // top-level navigation), which Lax allows and Strict would drop.
    "SameSite=Lax",
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Extract one cookie's raw value from a `document.cookie`-style string. */
export function readCookieValue(
  cookieString: string,
  name: string,
): string | undefined {
  for (const pair of cookieString.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() !== name) continue;
    return pair.slice(eq + 1).trim();
  }
  return undefined;
}

/** Parse an attribution straight out of a cookie header / document.cookie. */
export function attributionFromCookieString(
  cookieString: string,
): Attribution {
  return deserializeAttribution(
    readCookieValue(cookieString, ATTRIBUTION_COOKIE),
  );
}

// =============================================================================
// Browser side effects (no-ops outside the browser)
// =============================================================================

export function readAttributionCookie(): Attribution {
  if (typeof document === "undefined") return {};
  try {
    return attributionFromCookieString(document.cookie);
  } catch {
    return {};
  }
}

export function writeAttributionCookie(attribution: Attribution): void {
  if (typeof document === "undefined" || typeof location === "undefined") {
    return;
  }
  try {
    document.cookie = buildAttributionCookie(
      attribution,
      location.hostname,
      location.protocol === "https:",
    );
  } catch {
    // Cookies blocked. Attribution is a nice-to-have; never break the page.
  }
}
