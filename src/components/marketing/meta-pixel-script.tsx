"use client";

// Meta Pixel — PARENT-FACING SURFACES ONLY.
//
// This component is mounted by the (marketing), (auth) and (parent) layouts.
// It is deliberately NOT mounted by the (child) layout: no advertising pixel
// loads while a child is answering items. marketing-analytics.test.tsx asserts
// that placement, so removing the guard fails the bar.
//
// On load it drains the deferred queue (see lib/marketing/meta-queue.ts), which
// is how `assessment_start` — fired at the handoff on the child route, where
// the pixel is absent — still reaches Meta. The drain polls for the `fbq` stub
// rather than relying on a script callback: the stub is defined synchronously
// by the snippet below and queues calls until fbevents.js arrives, so the
// moment it exists it is safe to send to.
//
// Deliberately NO noscript tracking-image fallback: it would fire wherever
// this tree renders and cannot be conditioned on the queue logic.
//
// Renders nothing when NEXT_PUBLIC_META_PIXEL_ID is unset.

import Script from "next/script";
import { useEffect } from "react";

import { metaPixelId } from "@/lib/marketing/config";
import { drainMetaQueue } from "@/lib/marketing/meta-queue";
import type { FbqFn } from "@/lib/marketing/track";

interface PixelWindow {
  fbq?: FbqFn;
}

/** Poll interval / attempt budget for the queue drain (~10s total). */
const DRAIN_INTERVAL_MS = 500;
const DRAIN_ATTEMPTS = 20;

export function MetaPixelScript() {
  const pixelId = metaPixelId();
  const enabled = pixelId !== null;

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
