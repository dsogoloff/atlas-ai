"use client";

// Meta Pixel — PARENT-FACING SURFACES ONLY, and only from a document whose URL
// cannot identify a child.
//
// SURFACE GATE. This component is mounted by the (marketing), (auth) and
// (parent) layouts. It is deliberately NOT mounted by the (child) layout: no
// advertising pixel loads while a child is answering items.
// marketing-analytics.test.ts asserts that placement, so removing the guard
// fails the bar.
//
// URL GATE (COPPA). Unlike GA4, the Meta Pixel offers NO supported way to
// override the URL it reports — it reads the live document URL at send time and
// puts it in `dl` (and the referrer in `rl`). On /report?child=<uuid> that meant
// Meta received a child identifier on both the automatic PageView and our
// conversion event; confirmed on live prod (HTTP 200, delivered).
//
// Since the value cannot be rewritten, the pixel must not SEND from such a
// document at all. So:
//   • the snippet is not injected when the URL (or referrer) carries an
//     identifier — no PageView from the report route;
//   • the queue is not drained there either, so a queued event is never
//     flushed from a leaky URL;
//   • track() independently treats `fbq` as absent on such a document
//     (see track.ts), which covers a client-side navigation INTO the report
//     from a page where the pixel had already initialised.
//
// Cost, stated plainly: Meta's assessment_complete is deferred to the next
// parent surface with a clean URL instead of firing on the report itself, and
// Meta gets no report PageView. GA4 is unaffected — its page context is
// overridable and is redacted in ga4-script.tsx. Removing the deferral needs the
// child id out of the query string, which is a routing change and out of scope
// here; see the PR for that proposal.
//
// The gate is client-side because the URL is not knowable during SSR: the first
// client render matches the server (nothing), then the effect decides.
//
// On load it drains the deferred queue (see lib/marketing/meta-queue.ts), which
// is how `assessment_start` — fired at the handoff on the child route, where the
// pixel is absent — still reaches Meta. The drain polls for the `fbq` stub
// rather than relying on a script callback: the stub is defined synchronously by
// the snippet below and queues calls until fbevents.js arrives, so the moment it
// exists it is safe to send to.
//
// Deliberately NO noscript tracking-image fallback: it would fire wherever this
// tree renders and cannot be conditioned on the queue logic or the URL gate.
//
// Renders nothing when NEXT_PUBLIC_META_PIXEL_ID is unset.

import Script from "next/script";
import { useEffect, useSyncExternalStore } from "react";

import { metaPixelId } from "@/lib/marketing/config";
import { drainMetaQueue } from "@/lib/marketing/meta-queue";
import { documentIsSafeForPixel } from "@/lib/marketing/redact";
import type { FbqFn } from "@/lib/marketing/track";

interface PixelWindow {
  fbq?: FbqFn;
}

/** Poll interval / attempt budget for the queue drain (~10s total). */
const DRAIN_INTERVAL_MS = 500;
const DRAIN_ATTEMPTS = 20;

/** The URL is not knowable during SSR, so the gate needs a distinct server
 *  snapshot. useSyncExternalStore is the supported way to read a browser value
 *  across hydration — a mount effect that called setState would trip
 *  react-hooks/set-state-in-effect and cause a cascading render. The value is
 *  read once per document; `subscribe` has nothing to listen to. */
const NO_SUBSCRIPTION = () => () => {};

/** Server + hydration snapshot: never load the pixel before the URL is checked. */
const UNSAFE_UNTIL_CHECKED = () => false;

function readDocumentSafe(): boolean {
  try {
    return documentIsSafeForPixel(window.location.href, document.referrer);
  } catch {
    return false; // fail closed
  }
}

export function MetaPixelScript() {
  const pixelId = metaPixelId();
  const documentSafe = useSyncExternalStore(
    NO_SUBSCRIPTION,
    readDocumentSafe,
    UNSAFE_UNTIL_CHECKED,
  );

  const enabled = pixelId !== null && documentSafe;

  useEffect(() => {
    if (!enabled) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      let fbq: FbqFn | undefined;
      try {
        fbq = (window as unknown as PixelWindow).fbq;
      } catch {
        fbq = undefined;
      }
      if (typeof fbq === "function") {
        clearInterval(timer);
        const send = fbq;
        drainMetaQueue(
          (event) => send("trackCustom", event.name, event.payload),
          Date.now(),
        );
        return;
      }
      if (attempts >= DRAIN_ATTEMPTS) clearInterval(timer);
    }, DRAIN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  if (!pixelId) return null;
  if (!documentSafe) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');
      `.trim()}
    </Script>
  );
}
