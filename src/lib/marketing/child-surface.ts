// THE CHILD-SURFACE BOUNDARY — one definition, used everywhere.
//
// ATLAS-006. The pilot posture is: NO third-party browser analytics anywhere in
// the child assessment experience. Not "loaded but redacted", not "loaded but
// personalization disabled" — not loaded.
//
// Removing the mount from src/app/(child)/layout.tsx is necessary but NOT
// sufficient on its own, and that gap is the whole reason this module exists:
//
//   A parent sits on /dashboard, where GA4 legitimately loads. They click
//   "Start Assessment". If that is a client-side navigation, the DOCUMENT never
//   reloads — gtag.js is still attached, `window.gtag` is still defined, and
//   GA4 Enhanced Measurement ("page changes based on browser history events",
//   ON by default in GA4) fires a page_view for the child route. The child
//   layout mounting nothing changes none of that.
//
// So the boundary is enforced three ways, and this module is the shared
// predicate for the second and third:
//
//   1. src/app/(child)/layout.tsx does not mount the analytics island, so a
//      freshly-loaded child document has no tag at all.
//   2. Entry into /assessment is a HARD navigation (a plain <a>, not
//      next/link), so a child document is always freshly loaded and case (1)
//      actually holds. See the guard in marketing-analytics.test.ts.
//   3. track.ts treats `gtag` as ABSENT on a child path, so even if a tag
//      somehow exists in the document, our own events queue for replay from a
//      parent surface instead of beaconing from a child screen.
//
// Pure — no window, no document — so it is testable in the node-env vitest
// setup, and usable from both client wiring and server code.

/**
 * Path prefixes that make up the child assessment experience.
 *
 * These correspond to the `src/app/(child)` route group. Route groups are
 * erased from the URL, so the boundary has to be stated as paths; the guard
 * test asserts this list still covers every route under that group, so adding
 * a route there without adding it here fails CI.
 */
export const CHILD_SURFACE_PREFIXES: readonly string[] = ["/assessment"];

/**
 * True if `pathname` is part of the child assessment experience.
 *
 * Matches the prefix itself and anything nested under it, but not an unrelated
 * route that merely starts with the same characters (`/assessmentary`).
 */
export function isChildSurfacePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  // Tolerate a full href as well as a bare path so callers do not each have to
  // parse. Anything unparseable falls through to the raw-string check below.
  let path = pathname;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pathname)) {
    try {
      path = new URL(pathname).pathname;
    } catch {
      return true; // unreadable URL -> assume child surface (fail closed)
    }
  }

  return CHILD_SURFACE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
  );
}

/**
 * True if a third-party analytics tag may send from this document.
 *
 * FAILS CLOSED: an href that cannot be read is treated as a child surface, so
 * the uncertain case queues rather than beacons.
 */
export function analyticsMaySendFrom(href: string | null | undefined): boolean {
  if (!href) return false;
  return !isChildSurfacePath(href);
}
