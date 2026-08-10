"use client";

// Beta welcome screen — shown ONCE during onboarding, AFTER the COPPA
// disclosure and BEFORE child setup (the add-child form). Gated by
// BETA_WELCOME_LIVE (default-ON for the pilot) and shown a single time per
// browser via a localStorage flag held by the add-child route's gate — it is
// no longer shown before every assessment session.
//
// This is a temporary pilot-only screen: it sets expectations that this is an
// early beta and asks for feedback after the report. Removed at v1.0 by
// flipping BETA_WELCOME_LIVE='false' (no code change) or deleting this unit.
//
// Plain and calm by design — NO mascot here. Visual chrome matches the parent
// intro / instructions screen (cream backdrop, white rounded card, tinted
// heading, the same pill Continue button). `tier` only tints the heading accent
// and defaults to the calm navy used in the parent-facing onboarding context.
//
// Copy is founder-approved and lives inline as BETA_WELCOME_COPY so the whole
// screen is a single self-contained, removable unit.

import { getBranding } from "@/lib/branding";
import type { Tier } from "@/lib/tier/derive";

const branding = getBranding();

/** Founder-approved beta welcome copy (pilot-only; removed at v1.0).
 *  The product name is tenant-resolved; the rest of the wording is unchanged
 *  from the founder-approved original, with the one "Atlas" self-reference
 *  replaced by a plain descriptor. */
export const BETA_WELCOME_COPY = {
  heading: `Welcome to the ${branding.productName} (Beta)`,
  body: [
    "Thank you for taking part in the beta. This early version of the assessment is designed to give Seriously Addictive Mathematics instructors a high-level picture of your child's comfort with certain mathematical concepts.",
    "The beta is offered to a limited number of families ahead of our public launch. Because it's still in testing, you may run into a few quirks — or the occasional problem. After your child finishes and you've reviewed the report, we'd be very grateful for your feedback through the short form we'll provide.",
    "Thank you for helping us make the assessment more robust and useful for every family.",
  ],
  continueButton: "Continue",
} as const;

interface Props {
  /** Tints the heading accent only. Defaults to the calm navy used in the
   *  parent-facing onboarding context (no child tier known there). */
  tier?: Tier;
  /** Fired when the parent taps Continue — dismisses the screen and reveals
   *  the child-setup form. */
  onContinue: () => void;
}

export function BetaWelcome({ tier = "G5_8", onContinue }: Props) {
  const accent = tier === "K_4" ? "text-sam-red" : "text-sam-navy";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sam-cream p-6">
      <div className="w-full max-w-2xl rounded-3xl border border-sam-gray-light bg-white p-8 shadow-sm md:p-10">
        <h1 className={`font-display-child text-3xl font-bold md:text-4xl ${accent}`}>
          {BETA_WELCOME_COPY.heading}
        </h1>

        <div className="mt-6 flex flex-col gap-4">
          {BETA_WELCOME_COPY.body.map((paragraph, i) => (
            <p key={i} className="text-base leading-relaxed text-sam-gray-dark md:text-lg">
              {paragraph}
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 w-full rounded-full bg-sam-red px-6 py-4 font-display-child text-xl font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none"
        >
          {BETA_WELCOME_COPY.continueButton}
        </button>
      </div>
    </div>
  );
}
