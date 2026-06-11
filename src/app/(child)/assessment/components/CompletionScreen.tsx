"use client";

// Celebratory completion splash. Tier-aware:
//
//   * K_4: adapted from sam-placement K4CompletionScreen — `auto_awesome`
//     icon on a sam-yellow rounded square, confetti dot pattern, big
//     "All done, [name]!" headline. Warm and personal.
//
//   * G5_8: adapted from stitch/module-c/09-g58-completion-journey.html —
//     "Mathematical Journey Complete!" headline (per gate decision #7),
//     parent-handoff subtitle keeps the child's name.
//
// Both tiers center the celebrating-pose mascot where the placeholder
// material icon used to sit (the asset deferred by gate decision #8 has
// landed — see stitch/mascot/). K_4 gets the idle bounce inside the
// existing entrance spring; G5_8 stays still and slightly smaller.
//
// Both tiers receive placement + termination_reason but do NOT render
// numeric placement to the child (parent-facing detail lives elsewhere).
// Termination reason only nudges the subtitle copy.

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import type { TerminationReasonWire } from "@/lib/responseSubmit/types";
import type { Tier } from "@/lib/tier/derive";

import { mascotPoseFor } from "../lib/mascot";
import { Mascot } from "./Mascot";

interface Props {
  /** First name (or whole `children.name` — schema stores full name; v1
   *  tolerates either). */
  childName: string;
  terminationReason: TerminationReasonWire;
  tier: Tier;
}

function k4Subtitle(reason: TerminationReasonWire): string {
  // bank-exhausted gets a softer praise lead-in ("Great work!" vs the
  // default's "You did an awesome job") to avoid implying the child
  // failed to finish. The hand-back imperative is identical across
  // reasons.
  if (reason === "bank-exhausted") {
    return "Great work! Please hand the screen back to your grown-up.";
  }
  return "You did an awesome job. Please hand the screen back to your grown-up.";
}

function g58Subtitle(childName: string): string {
  return `Great work, ${childName}! Please hand the device back to your parent or guardian.`;
}

export function CompletionScreen({ childName, terminationReason, tier }: Props) {
  const reduceMotion = useReducedMotion();

  if (tier === "G5_8") {
    const accents = [
      { name: "stars", className: "-right-6 -top-4 text-sam-yellow text-5xl" },
      {
        name: "military_tech",
        className: "left-1/2 -top-10 text-sam-teal text-4xl",
      },
      {
        name: "trophy",
        className: "-bottom-2 -right-8 text-sam-orange text-3xl",
      },
    ];

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-sam-cream px-6 py-12">
        {/* Confetti dot pattern — cooler colour mix for 5-8 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(#06a77d 2px, transparent 2px), radial-gradient(#1b3a6b 2px, transparent 2px), radial-gradient(#f4a261 2px, transparent 2px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 20px 20px, 10px 10px",
          }}
        />

        <motion.div
          initial={reduceMotion ? false : { scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 12 }}
          className="relative mb-8"
        >
          <Mascot pose={mascotPoseFor("completed")} tier="G5_8" size={160} />
          {accents.map((s, i) => (
            <motion.span
              key={s.name}
              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.15, duration: 0.4 }}
              className={`material-symbols-outlined absolute ${s.className}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              {s.name}
            </motion.span>
          ))}
        </motion.div>

        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="font-display-child text-4xl font-extrabold text-sam-navy md:text-5xl"
        >
          Mathematical Journey Complete!
        </motion.h1>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 max-w-md text-center text-lg text-sam-gray-dark/80"
        >
          {g58Subtitle(childName)}
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="mt-8"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-sam-teal px-8 py-4 font-headline-adult text-sam-navy transition-all hover:bg-sam-teal hover:text-white active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  // K_4 (default)
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-sam-cream px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(#ffd166 2px, transparent 2px), radial-gradient(#06a77d 2px, transparent 2px), radial-gradient(#e63946 2px, transparent 2px)",
          backgroundSize: "40px 40px",
          backgroundPosition: "0 0, 20px 20px, 10px 10px",
        }}
      />

      <motion.div
        initial={reduceMotion ? false : { scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        className="relative mb-8"
      >
        <Mascot pose={mascotPoseFor("completed")} tier="K_4" size={192} />
        {[
          { name: "star", className: "-right-6 -top-4 text-sam-yellow text-5xl" },
          {
            name: "celebration",
            className: "left-1/2 -top-10 text-sam-teal text-4xl",
          },
          {
            name: "favorite",
            className: "-bottom-2 -right-8 text-sam-red text-3xl",
          },
        ].map((s, i) => (
          <motion.span
            key={s.name}
            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.15, duration: 0.4 }}
            className={`material-symbols-outlined absolute ${s.className}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {s.name}
          </motion.span>
        ))}
      </motion.div>

      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="font-display-child text-4xl font-extrabold text-sam-navy md:text-5xl"
      >
        All done, {childName}!
      </motion.h1>

      <motion.p
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 max-w-md text-center text-lg text-sam-gray-dark/80"
      >
        {k4Subtitle(terminationReason)}
      </motion.p>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="mt-8"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-sam-yellow px-8 py-4 font-headline-adult text-sam-navy transition-all hover:bg-sam-yellow active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to dashboard
        </Link>
      </motion.div>
    </div>
  );
}
