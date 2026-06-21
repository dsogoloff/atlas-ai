"use client";

// Beta welcome screen — shown at the very start of the assessment flow, BEFORE
// the parent intro (#73), on EVERY session (gated by BETA_WELCOME_LIVE,
// default-ON for the pilot; AssessmentClient holds the gate per-mount so it
// re-shows each session, never once-per-family).
//
// This is a temporary pilot-only screen: it sets expectations that this is an
// early beta and asks for feedback after the report. Removed at v1.0 by
// flipping BETA_WELCOME_LIVE='false' (no code change) or deleting this unit.
//
// Plain and calm by design — NO mascot here (the mascot splash is a separate
// upcoming screen). Visual chrome matches the parent intro / instructions
// screen (cream backdrop, white rounded card, tier-tinted heading, the same
// pill Start/Continue button). Tier drives only the heading accent colour.
//
// Copy is founder-approved and lives inline as BETA_WELCOME_COPY so the whole
// screen is a single self-contained, removable unit.

import type { Tier } from "@/lib/tier/derive";

/** Founder-approved beta welcome copy (pilot-only; removed at v1.0). */
export const BETA_WELCOME_COPY = {
  heading: "Welcome to Atlas Assessment (Beta)",
  body: [
    "Thank you for taking part in the beta. This early version of the assessment is designed to give Seriously Addictive Mathematics instructors a high-level picture of your child's comfort with certain mathematical concepts.",
    "The beta is offered to a limited number of families ahead of our public launch. Because it's still in testing, you may run into a few quirks — or the occasional problem. After your child finishes and you've reviewed the report, we'd be very grateful for your feedback through the short form we'll provide.",
    "Thank you for helping us make Atlas more robust and useful for every family.",
  ],
  continueButton: "Continue",
} as const;

interface Props {
  tier: Tier;
  /** Fired when the parent taps Continue — advances to the next pre-start
   *  screen (parent intro, or the child Welcome when the intro is off). */
  onContinue: () => void;
}

export function BetaWelcome({ tier, onContinue }: Props) {
  const accent = tier === "K_4" ? "text-sam-red" : "text-sam-navy";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sam-cream p-6">
      <div className="w-full max-w-xl rounded-3xl border border-sam-gray-light bg-white p-8 shadow-sm">
        <h1 className={`font-display-child text-2xl font-bold ${accent}`}>
          {BETA_WELCOME_COPY.heading}
        </h1>

        <div className="mt-6 flex flex-col gap-4">
          {BETA_WELCOME_COPY.body.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-sam-gray-dark">
              {paragraph}
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 w-full rounded-full bg-sam-red px-6 py-4 font-display-child text-lg font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none"
        >
          {BETA_WELCOME_COPY.continueButton}
        </button>
      </div>
    </div>
  );
}
