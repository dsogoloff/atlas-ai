// Marketing analytics mount point. One line per route-group layout.
//
//   <MarketingAnalytics pixel />        parent-facing: GA4 + UTM + Meta Pixel
//   <MarketingAnalytics />              child-facing:  GA4 + UTM, NO pixel
//
// GA4 goes everywhere in the assessment flow (measurement + pageviews only —
// Signals and ads personalization are off, see ga4-script.tsx). The Meta Pixel
// is opt-in per surface and must stay off the (child) group; the accompanying
// test asserts which layouts pass `pixel`.
//
// Not mounted in the (admin) or (instructor) groups: staff traffic is not
// marketing traffic and should not pollute the property.

import { Ga4Script } from "./ga4-script";
import { MetaPixelScript } from "./meta-pixel-script";
import { UtmCapture } from "./utm-capture";

export function MarketingAnalytics({ pixel = false }: { pixel?: boolean }) {
  return (
    <>
      <Ga4Script />
      <UtmCapture />
      {pixel ? <MetaPixelScript /> : null}
    </>
  );
}
