// UTM capture + first-party persistence (marketing attribution, part B).
//
// Everything in this file is PURE — no `document`, no `window`. The browser
// wiring lives in cookie.ts / the <UtmCapture/> island; the server wiring lives
// in server.ts. Keeping the logic pure is what makes first-touch-wins and the
// cookie-domain rules testable in the repo's node-env vitest setup.
//
// Contract:
//   • Read the five lowercase utm_* params from the landing query string.
//   • Persist them first-party in a cookie scoped to the REGISTRABLE domain
//     (app.samnewyork.com -> .samnewyork.com) so www + app share one value and
//     the eventual HubSpot sync point can read it server-side.
//   • FIRST TOUCH WINS: once a non-empty attribution is stored, a later tagged
//     URL does not overwrite it. Untagged navigation never writes anything, so
//     an untagged first pageview cannot "claim" the visitor as direct.

/** The five params, exact lowercase names. Order is the storage/emit order. */
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];

/** Captured UTMs. A key is absent (not empty-string) when it was not present. */
export type UtmParams = Partial<Record<UtmKey, string>>;

export interface Attribution extends UtmParams {
  /** ISO-8601 timestamp of the first touch. Non-child metadata only. */
  first_seen?: string;
}

/** Cookie name. Read by the client accessor, the server accessor, and (later)
 *  the HubSpot Contract A emit. */
export const ATTRIBUTION_COOKIE = "atlas_attrib";

/** 90 days. Long enough that a click today still attributes a signup weeks
 *  later at the contact-sync point; short enough to stay a session-ish window. */
export const ATTRIBUTION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/** Cap on a single stored value so a hostile query string can't bloat the
 *  cookie jar (browsers cap at ~4KB per cookie). */
const MAX_VALUE_LENGTH = 200;

// =============================================================================
// Parsing
// =============================================================================

/**
 * Pull the five utm_* params out of a query string. Accepts `?a=b`, `a=b`, or
 * a full URL's search. Exact lowercase names only — `UTM_Source` is ignored,
 * matching what ad platforms actually emit and keeping the contract exact.
 */
export function parseUtmParams(search: string): UtmParams {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const raw = params.get(key);
    if (raw === null) continue;
    const value = raw.trim().slice(0, MAX_VALUE_LENGTH);
    if (value === "") continue;
    out[key] = value;
  }
  return out;
}

/** True iff at least one UTM is present. Drives "is this a tagged visit". */
export function hasAnyUtm(utm: UtmParams): boolean {
  return UTM_KEYS.some((key) => {
    const value = utm[key];
    return typeof value === "string" && value !== "";
  });
}

// =============================================================================
// Serialization
// =============================================================================

/** Cookie-safe encoding: URL-encoded JSON. Decodable from any language at the
 *  eventual sync point; no custom format to keep in lockstep. */
export function serializeAttribution(attribution: Attribution): string {
  return encodeURIComponent(JSON.stringify(attribution));
}

/**
 * Inverse of serializeAttribution. Fail-soft: any malformed / truncated /
 * hand-edited cookie yields an empty attribution rather than throwing. A
 * corrupted cookie must degrade to "no attribution", never break a page.
 * Unknown keys are dropped, so the stored shape can never smuggle extra
 * fields into an event payload.
 */
export function deserializeAttribution(raw: string | undefined): Attribution {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  const source = parsed as Record<string, unknown>;
  const out: Attribution = {};
  for (const key of UTM_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value !== "") {
      out[key] = value.slice(0, MAX_VALUE_LENGTH);
    }
  }
  if (typeof source.first_seen === "string" && source.first_seen !== "") {
    out.first_seen = source.first_seen.slice(0, MAX_VALUE_LENGTH);
  }
  return out;
}

// =============================================================================
// First-touch resolution
// =============================================================================

export interface CaptureDecision {
  /** Whether the caller should write the cookie. */
  shouldWrite: boolean;
  /** The attribution that is (or already was) in effect. */
  attribution: Attribution;
}

/**
 * Decide what to persist on a pageview.
 *
 *   existing tagged  -> keep it (first touch wins), no write
 *   existing empty   -> write the incoming UTMs, if the URL is tagged
 *   URL untagged     -> never write
 */
export function resolveFirstTouch(
  existingCookie: string | undefined,
  search: string,
  nowIso: string,
): CaptureDecision {
  const existing = deserializeAttribution(existingCookie);
  if (hasAnyUtm(existing)) {
    return { shouldWrite: false, attribution: existing };
  }
  const incoming = parseUtmParams(search);
  if (!hasAnyUtm(incoming)) {
    return { shouldWrite: false, attribution: existing };
  }
  return {
    shouldWrite: true,
    attribution: { ...incoming, first_seen: nowIso },
  };
}
