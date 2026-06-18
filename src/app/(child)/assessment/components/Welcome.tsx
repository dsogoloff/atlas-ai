"use client";

// Atlas Assessment — first child-facing screen.
//
// A STATIC welcome: big playful "Welcome!" lettering + the waving mascot, and
// the child taps once to start. It replaces the old auto-advancing loading
// screen, so the test only begins on the child's tap (AssessmentClient holds
// the start effect behind this gate — see its `startConfirmed` comment). Tier
// drives cosmetic chrome only (cheerful, larger K-4 vs measured G5-8), matching
// the rest of the assessment UI; the mascot's own motion policy (lively K-4,
// still G5-8/reduced-motion) is handled inside <Mascot>.

import type { Tier } from "@/lib/tier/derive";

import { mascotPoseFor } from "../lib/mascot";
import { Mascot } from "./Mascot";

interface Props {
  /** Child's display name; first word is used for a friendly greeting. */
  childName: string;
  tier: Tier;
  /** Fired when the child taps Start — releases the held start. */
  onStart: () => void;
}

export function Welcome({ childName, tier, onStart }: Props) {
  const isK4 = tier === "K_4";
  const firstName = childName.trim().split(/\s+/)[0] || "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-sam-cream p-6 text-center">
      <Mascot
        pose={mascotPoseFor("starting")}
        tier={tier}
        size={isK4 ? 168 : 112}
        entrance
      />

      <div className="flex flex-col items-center gap-2">
        <h1
          className={`font-display-child font-black tracking-tight text-sam-navy ${
            isK4 ? "text-6xl" : "text-5xl"
          }`}
        >
          Welcome!
        </h1>
        {firstName && (
          <p
            className={`font-display-child font-bold ${
              isK4 ? "text-2xl text-sam-red" : "text-xl text-sam-navy"
            }`}
          >
            Ready, {firstName}?
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="rounded-full bg-sam-red px-10 py-4 font-display-child text-xl font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none"
      >
        Let&rsquo;s go!
      </button>
    </div>
  );
}
