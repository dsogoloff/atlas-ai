"use client";

// GA4 tag.
//
// COOKIE DOMAIN. `cookie_domain: 'auto'` makes gtag walk up from the current
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
// Renders nothing when NEXT_PUBLIC_GA4_MEASUREMENT_ID is unset.

import Script from "next/script";

import { ga4MeasurementId } from "@/lib/marketing/config";

export function Ga4Script() {
  const measurementId = ga4MeasurementId();
  if (!measurementId) return null;

  return (
    <>
      <Script
        id="ga4-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
          measurementId,
        )}`}
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
window.gtag('js', new Date());
window.gtag('config', ${JSON.stringify(measurementId)}, {
  cookie_domain: 'auto',
  cookie_flags: 'SameSite=Lax;Secure',
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
        `.trim()}
      </Script>
    </>
  );
}
