"use client";

// Fires landing_viewed once per tab session. The sessionStorage guard plus
// the ref keep React Strict Mode's double effect and SPA re-renders from
// double-counting. Renders nothing.

import { useEffect, useRef } from "react";

import { recordLandingView } from "./landing-actions";

export function LandingViewBeacon() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const key = "atlas:landing_viewed";
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable — fire anyway.
    }
    void recordLandingView();
  }, []);

  return null;
}
