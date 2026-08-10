"use client";

// UTM capture island. Renders nothing.
//
// Runs on every parent- and child-facing surface (mounted via
// MarketingAnalytics), so a visitor who lands deep — a tagged link straight to
// /signup, say — is still attributed. First touch wins, so re-running on later
// pages is a no-op once something is stored, and an untagged pageview never
// writes.

import { useEffect, useRef } from "react";

import { resolveFirstTouch } from "@/lib/marketing/attribution";
import { readCookieValue, writeAttributionCookie } from "@/lib/marketing/cookie";
import { ATTRIBUTION_COOKIE } from "@/lib/marketing/attribution";

export function UtmCapture() {
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    try {
      const existing = readCookieValue(document.cookie, ATTRIBUTION_COOKIE);
      const decision = resolveFirstTouch(
        existing,
        window.location.search,
        new Date().toISOString(),
      );
      if (decision.shouldWrite) {
        writeAttributionCookie(decision.attribution);
      }
    } catch {
      // Never break a page over attribution.
    }
  }, []);

  return null;
}
