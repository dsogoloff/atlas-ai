// Page-context redaction for the analytics layer.
//
// WHY THIS EXISTS (COPPA / strategy §2.5, §6.3).
//
// The #208 event layer is rigorous about the event PAYLOAD: buildEventPayload
// allowlist-copies, so no child field can ride along. But analytics tags also
// send page context that no payload allowlist can touch — GA4's `dl`
// (page_location), `dp` (page_path) and `dr` (page_referrer), and Meta's `dl` /
// `rl`. Those are read from the document, not from our payload.
//
// The report route is `/report?child=<uuid>`. So every report pageview was
// handing Google a child identifier in `dl`, straight past the allowlist.
// Confirmed on live prod before this module existed.
//
// Everything here is PURE — no `window`, no `document`. The browser wiring
// lives in ga4-script.tsx / meta-pixel-script.tsx / track.ts, which is what
// makes the redaction rules testable in the repo's node-env vitest setup.
//
// The rule is deliberately BROADER than "strip ?child=": a UUID anywhere in a
// URL is treated as an identifier and removed, whether it sits in a query value
// or a path segment (`/edit-child/<uuid>`). A future route that puts an id
// somewhere new is redacted by default rather than leaking until someone
// notices.

/** Replacement token. Kept URL-safe and obviously-not-an-id on sight. */
export const REDACTED = "redacted";

/**
 * Query keys that carry a child/session identifier. Values are redacted by KEY
 * regardless of shape, so a non-UUID id scheme is still covered.
 */
export const CHILD_PARAM_KEYS: readonly string[] = [
  "child",
  "child_id",
  "childId",
  "children",
  "session",
  "session_id",
  "sessionId",
  "report",
  "report_id",
  "reportId",
];

/** A v1–v5 UUID, anchored. Matches the ids this app mints for children,
 *  sessions and reports. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Unanchored twin, for finding a UUID embedded in a longer string. */
const UUID_ANYWHERE_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** True iff the whole string is a UUID. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** True iff a UUID appears anywhere in the string. */
export function containsUuid(value: string): boolean {
  return new RegExp(UUID_ANYWHERE_RE.source, "i").test(value);
}

/**
 * True iff this URL (or referrer) carries something that identifies a child.
 *
 * Used by the Meta wiring: unlike GA4, the Meta Pixel gives NO supported way to
 * override the URL it reports, so the only way to keep an identifier out of
 * Meta is to not let the pixel send while the document URL carries one.
 *
 * Fail-CLOSED: an unparseable input is treated as identifying. A privacy gate
 * that fails open is not a gate.
 */
export function carriesChildIdentifier(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false; // genuinely empty (e.g. no referrer) — nothing to leak
  const parsed = parse(rawUrl);
  if (!parsed) return true; // unparseable -> assume the worst
  for (const [key, value] of parsed.searchParams) {
    if (CHILD_PARAM_KEYS.includes(key) && value !== "") return true;
    if (containsUuid(value)) return true;
  }
  return containsUuid(parsed.pathname);
}

/**
 * Redact a full URL for analytics: identifier-bearing query values and any
 * UUID path segment are replaced with `REDACTED`. Everything else — origin,
 * route shape, UTMs — is preserved, because that is what makes the hit useful.
 *
 * Fail-CLOSED: anything unparseable collapses to the empty string rather than
 * being passed through.
 */
export function redactUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";
  const parsed = parse(rawUrl);
  if (!parsed) return "";

  for (const key of [...parsed.searchParams.keys()]) {
    const value = parsed.searchParams.get(key) ?? "";
    if (value === "") continue;
    if (CHILD_PARAM_KEYS.includes(key) || containsUuid(value)) {
      parsed.searchParams.set(key, REDACTED);
    }
  }

  parsed.pathname = parsed.pathname
    .split("/")
    .map((segment) => (isUuid(segment) ? REDACTED : scrubEmbedded(segment)))
    .join("/");

  // Fragments are never sent to an analytics endpoint by us, and could carry
  // anything. Drop it rather than reason about it.
  parsed.hash = "";

  return parsed.toString();
}

/** Path + query only, in the shape GA4 wants for `page_path` (`dp`). */
export function redactPath(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";
  const redacted = redactUrl(rawUrl);
  if (redacted === "") return "";
  const parsed = parse(redacted);
  if (!parsed) return "";
  return `${parsed.pathname}${parsed.search}`;
}

/**
 * The page-context parameters to hand GA4. Passed to `gtag('set', ...)` so they
 * apply to the automatic page_view AND to every subsequent event — both inherit
 * page context from global params.
 *
 * A referrer that is absent stays absent: sending an empty string would
 * overwrite GA4's own (correct) "no referrer" with a bogus value.
 */
export interface Ga4PageContext {
  page_location: string;
  page_path: string;
  page_referrer?: string;
}

export function ga4PageContext(
  href: string | null | undefined,
  referrer: string | null | undefined,
): Ga4PageContext {
  const context: Ga4PageContext = {
    page_location: redactUrl(href),
    page_path: redactPath(href),
  };
  const cleanReferrer = redactUrl(referrer);
  if (cleanReferrer !== "") context.page_referrer = cleanReferrer;
  return context;
}

/**
 * True iff the Meta Pixel may load and send from this document.
 *
 * Both the URL and the referrer matter: Meta puts the current URL in `dl` and
 * the referrer in `rl`, and neither can be overridden. Fail-CLOSED — an
 * unreadable URL keeps the pixel off.
 */
export function documentIsSafeForPixel(
  href: string | null | undefined,
  referrer: string | null | undefined,
): boolean {
  if (!href) return false;
  return !carriesChildIdentifier(href) && !carriesChildIdentifier(referrer);
}

// =============================================================================
// Internals
// =============================================================================

function parse(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

/** Replace a UUID embedded inside a longer path segment (e.g. `child-<uuid>`). */
function scrubEmbedded(segment: string): string {
  return segment.replace(new RegExp(UUID_ANYWHERE_RE.source, "gi"), REDACTED);
}
