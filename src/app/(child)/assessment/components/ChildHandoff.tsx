"use client";

// Production pre-start handoff — the parent-facing "pass the screen to your
// child" screen shown in place of the DEV test-type chooser whenever
// ENABLE_COMPREHENSIVE_PILOT is off (i.e. always, in production / beta).
//
// In production the parent never picks a test type: the SHORT test is the only
// path, so this screen's sole job is to hand the device to the child and
// continue. Tapping Continue advances to the child Welcome screen, which is
// still the sole releaser of the actual start (see AssessmentClient's
// `startConfirmed` comment) — so the session begins on the child's tap, not
// here. When the pilot flag IS on, AssessmentClient renders DevTestModeChooser
// at this gate instead, so the comprehensive run stays reachable for QA.
//
// Tier drives cosmetic chrome only (cheerful K-4 vs measured G5-8), matching
// the rest of the assessment UI.

import type { Tier } from "@/lib/tier/derive";

interface Props {
  tier: Tier;
  /** Fired when the parent taps Continue — advances to the child Welcome. */
  onContinue: () => void;
}

export function ChildHandoff({ tier, onContinue }: Props) {
  const accent = tier === "K_4" ? "text-sam-red" : "text-sam-navy";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sam-cream p-6">
      <div className="w-full max-w-md rounded-3xl border border-sam-gray-light bg-white p-8 text-center shadow-sm">
        <span
          className="material-symbols-outlined text-5xl text-sam-teal"
          aria-hidden="true"
        >
          devices
        </span>

        <h1 className={`mt-3 font-display-child text-2xl font-bold ${accent}`}>
          Pass the screen to your child
        </h1>

        <p className="mt-3 text-base text-sam-gray-dark">
          Hand the device to your child to begin. They&rsquo;ll work through a
          short set of questions on their own — there&rsquo;s nothing more for
          you to set up.
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 w-full rounded-full bg-sam-red px-6 py-4 font-display-child text-lg font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none"
        >
          Hand it over
        </button>
      </div>
    </div>
  );
}
