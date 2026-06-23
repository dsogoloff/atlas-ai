"use client";

// Onboarding beta-welcome gate. Shows the BetaWelcome screen ONCE, between the
// COPPA disclosure and child setup: the parent reaches /add-child from /coppa,
// sees the beta welcome a single time, then taps Continue to reveal the
// add-child form. "Once" is held in localStorage (a beta notice, not a legal
// record — no DB column needed), so adding a second child later skips it.
//
// Gated by BETA_WELCOME_LIVE (passed as `enabled` from the server page). When
// off, children render immediately. The localStorage read goes through
// useSyncExternalStore so it is SSR-safe (server snapshot = "unknown") and does
// not need a setState-in-effect. While the value is still unknown on the first
// client paint we render a neutral cream backdrop to avoid a white flash.

import { useState, useSyncExternalStore } from "react";

import { BetaWelcome } from "@/app/(child)/assessment/components/BetaWelcome";

const SEEN_KEY = "atlas_beta_welcome_seen";

// No external mutations to subscribe to — the only writer is this component's
// own Continue handler, which flips local state directly. The subscribe arg is
// required by useSyncExternalStore but is a no-op here.
const subscribe = () => () => {};
const getSnapshot = (): boolean => {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "true";
  } catch {
    // localStorage unavailable (private mode / blocked) — treat as not seen so
    // the welcome shows this time; it just won't be remembered.
    return false;
  }
};
// Server render can't know — returns null so the gate renders a neutral
// placeholder until the client snapshot resolves.
const getServerSnapshot = (): boolean | null => null;

export function BetaWelcomeGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const seen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  if (!enabled) return <>{children}</>;
  // First paint, value not yet known — neutral backdrop, no flash of the form.
  if (seen === null) return <div className="min-h-screen bg-sam-cream" />;
  if (seen || dismissed) return <>{children}</>;

  return (
    <BetaWelcome
      onContinue={() => {
        try {
          window.localStorage.setItem(SEEN_KEY, "true");
        } catch {
          // best-effort persistence; ignore failures
        }
        setDismissed(true);
      }}
    />
  );
}
