"use client";

// GA4 tag.
//
// COOKIE DOMAIN. `cookie_domain: "auto"` makes gtag walk up from the current
// hostname and write `_ga` on the highest domain that accepts it — i.e. the
// registrable domain samnewyork.com, NOT app.samnewyork.com. That is what makes
// a visitor who starts on www.samnewyork.com and continues into the app one
// stitched session. Do NOT pin cookie_domain to the app subdomain.
//
// COPPA. This property must not touch advertising identifiers:
//   allow_google_signals: false            — no Signals / cross-device
//   allow_ad_personalization_signals: false — no ads personalization
// Basic measurement + pageviews + our two conversion events, nothing else.
// (The on-page flags are the code-side half; Google Signals must ALSO be left
// off in GA4 Admin -> Data Settings for the property.)
//
// PAGE CONTEXT REDACTION (COPPA — the reason config lives in an effect).
//
// GA4 sends `dl` / `dp` / `dr` (page_location / page_path / page_referrer) on
// EVERY hit, read from the document. The report route is /report?child=<uuid>,
// so those parameters were handing Google a child identifier — straight past the
// event-payload allowlist, which cannot see them. Confirmed on live prod.
//
// The fix is `gtag('set', ...)` with redacted values BEFORE `gtag('config', ...)`.
// Two things were verified against the live tag rather than assumed:
//   • `set` applies globally, so the automatic page_view AND every later event
//     inherit the redacted context — no per-event plumbing, and no way for a new
//     call site to forget it.
//   • a SECOND `gtag('config', ..., {page_location})` does NOT take effect once
//     the tag is already configured. `set` is the working API here; config-only
//     would have silently left the leak in place.
// This is why the config is built in typed code that can import redact.ts,
// rather than in an inline <Script> string that cannot.

import Script from "next/script";
import { useEffect } from "react";

import { ga4MeasurementId } from "@/lib/marketing/config";
import { drainGa4Queue } from "@/lib/marketing/ga4-queue";
import { ga4PageContext } from "@/lib/marketing/redact";

interface Ga4Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

/** Module scope, not a ref: the tag is configured once per DOCUMENT. A route
 *  change unmounts and remounts this island, and re-running `config` would
 *  double-count the pageview. */
let configured = false;

/** Test seam — resetting module state between cases. */
export function __resetGa4ConfiguredForTest(): void {
  configured = false;
}

export function Ga4Script() {
  const measurementId = ga4MeasurementId();

  useEffect(() => {
    if (!measurementId) return;
    const w = window as unknown as Ga4Window;

    // The canonical gtag stub: queues commands until gtag.js arrives, so the
    // ordering below holds whether or not the loader has landed yet.
    if (!Array.isArray(w.dataLayer)) w.dataLayer = [];
    if (typeof w.gtag !== "function") {
      w.gtag = function gtagStub() {
        // gtag.js expects the raw `arguments` object, not an array copy.
        // eslint-disable-next-line prefer-rest-params
        (w.dataLayer as unknown[]).push(arguments);
      };
    }
    const gtag = w.gtag;

    if (!configured) {
      configured = true;
      // MUST precede `config` — this is what redacts the automatic page_view.
      gtag("set", ga4PageContext(window.location.href, document.referrer));
      gtag("js", new Date());
      gtag("config", measurementId, {
        cookie_domain: "auto",
        cookie_flags: "SameSite=Lax;Secure",
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }

    // Replay anything raised before the tag existed (see ga4-queue.ts).
    drainGa4Queue(
      (event) => gtag("event", event.name, event.payload),
      Date.now(),
    );
  }, [measurementId]);

  if (!measurementId) return null;

  return (
    <Script
      id="ga4-loader"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        measurementId,
      )}`}
    />
  );
}
