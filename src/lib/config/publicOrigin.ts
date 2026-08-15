// ATLAS-011 — the canonical public origin for this deployment.
//
// THE FINDING
// -----------
// Security-sensitive auth emails built their redirect URL from REQUEST HEADERS:
//
//   const origin = h.get("origin") ?? h.get("referer") ?? "";
//   emailRedirectTo: `${origin}/auth/confirm?next=/coppa`
//
// `Origin` and `Referer` are set by the caller. A request forged with
// `Origin: https://evil.example` makes Supabase mint a confirmation or password
// -reset link pointing at the attacker's domain, and mail it to the victim. The
// victim clicks a link in a genuine email from us and hands their token to the
// attacker — account takeover, with no phishing page required.
//
// Same class as Host / X-Forwarded-Host / Forwarded. None of them may ever
// decide where an auth email points.
//
// THE RULE
// --------
// Auth-email URLs come from APP_PUBLIC_ORIGIN and nothing else. There is no
// header fallback and no inference, because a fallback is what turns a
// misconfiguration into a vulnerability: it would quietly resume trusting the
// attacker the moment the variable went missing.
//
// SERVER-ONLY BY CONSTRUCTION
// ---------------------------
// The name has no NEXT_PUBLIC_ prefix, so Next never inlines it into a client
// bundle and it is simply `undefined` in the browser. It is read at runtime on
// the server, so no rebuild is needed for a value change — though Vercel binds
// env vars per deployment, so a REDEPLOY is required for a new value to take.
//
// This module deliberately does NOT `import "server-only"`: the validator below
// is meant to be reusable from a plain preflight script (ATLAS-020), and that
// import breaks under tsx. Server-only-ness comes from the variable name.
//
// EXPECTED VALUES
//   production  https://app.samnewyork.com
//   preview     the preview deployment's own origin
//   development http://localhost:3000  (or http://127.0.0.1:3000)

/** The variable name, exported so preflight tooling reports it consistently. */
export const APP_PUBLIC_ORIGIN_VAR = "APP_PUBLIC_ORIGIN";

export type OriginValidation =
  | { ok: true; origin: string }
  | { ok: false; reason: string };

/** Loopback hosts, the only ones allowed to be plain http. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Validate a candidate origin. PURE — takes the raw string, touches no
 * environment — so ATLAS-020's preflight can call it against whatever it reads
 * without importing app runtime code.
 *
 * Accepts only a bare origin: scheme + host + optional port. A value carrying a
 * path, query or fragment is rejected rather than silently trimmed, because
 * `https://app.samnewyork.com/app` would otherwise produce a plausible-looking
 * but wrong callback URL.
 */
export function validatePublicOrigin(raw: string | undefined | null): OriginValidation {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return { ok: false, reason: `${APP_PUBLIC_ORIGIN_VAR} is not set` };
  }

  const value = raw.trim();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      ok: false,
      reason: `${APP_PUBLIC_ORIGIN_VAR} is not a valid absolute URL: ${value}`,
    };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      ok: false,
      reason: `${APP_PUBLIC_ORIGIN_VAR} must be http or https, got ${url.protocol}`,
    };
  }

  const isLocal = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol === "http:" && !isLocal) {
    return {
      ok: false,
      reason:
        `${APP_PUBLIC_ORIGIN_VAR} must use https for a non-local host ` +
        `(got ${value}). An auth link over http is interceptable.`,
    };
  }

  // Reject anything beyond an origin. `url.pathname` is "/" for a bare origin.
  if (url.pathname !== "/" || url.search !== "" || url.hash !== "") {
    return {
      ok: false,
      reason:
        `${APP_PUBLIC_ORIGIN_VAR} must be a bare origin with no path, query or ` +
        `fragment (got ${value})`,
    };
  }

  if (url.username !== "" || url.password !== "") {
    return {
      ok: false,
      reason: `${APP_PUBLIC_ORIGIN_VAR} must not contain credentials`,
    };
  }

  return { ok: true, origin: url.origin };
}

/**
 * Preflight entry point (ATLAS-020 reuses this). Throws with an actionable
 * message when the deployment is not configured to send auth email safely.
 */
export function assertPublicOriginConfigured(
  raw: string | undefined = process.env[APP_PUBLIC_ORIGIN_VAR],
): string {
  const result = validatePublicOrigin(raw);
  if (!result.ok) {
    throw new Error(
      `[config] ${result.reason}. Auth emails cannot be sent safely without a ` +
        `canonical origin — set ${APP_PUBLIC_ORIGIN_VAR} (production: ` +
        `https://app.samnewyork.com) in the deployment environment.`,
    );
  }
  return result.origin;
}

/**
 * The canonical origin for this deployment, e.g. `https://app.samnewyork.com`.
 * Never derived from a request. Throws if unset or malformed — refusing to send
 * is the safe failure here, and sending a header-derived link is not.
 */
export function getAppPublicOrigin(): string {
  return assertPublicOriginConfigured();
}

/**
 * Build an absolute URL on the canonical origin, for auth-email redirects and
 * for links we put in outbound email.
 *
 * `path` must be root-relative. A caller passing an absolute URL is a bug —
 * that is exactly the "somebody reintroduced a derived origin" case — so it
 * throws rather than passing the foreign origin through.
 */
export function canonicalUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(
      `[config] canonicalUrl expects a root-relative path, got: ${path}`,
    );
  }
  return `${getAppPublicOrigin()}${path}`;
}
