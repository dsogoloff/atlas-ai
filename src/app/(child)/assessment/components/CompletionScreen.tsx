"use client";

// Celebratory completion splash. Tier-aware:
//
//   * K_4: adapted from sam-placement K4CompletionScreen — `auto_awesome`
//     icon on a sam-yellow rounded square, confetti dot pattern, big
//     "All done, [name]!" headline. Warm and personal.
//
//   * G5_8: adapted from stitch/module-c/09-g58-completion-journey.html —
//     `workspace_premium` (medal-laurel) icon on a sam-teal rounded square,
//     "Mathematical Journey Complete!" headline (per gate decision #7),
//     parent-handoff subtitle keeps the child's name. No Sammy mascot
//     (asset deferred per gate decision #8).
//
// Both tiers receive placement + termination_reason but do NOT render
// numeric placement to the child (parent-facing detail lives elsewhere).
// Termination reason only nudges the subtitle copy.

import { motion, useReducedMotion } from "framer-motion";

import type { TerminationReasonWire } from "@/lib/responseSubmit/types";
import type { Tier } from "@/lib/tier/derive";

interface Props {
  /** First name (or whole `children.name` — schema stores full name; v1
   *  tolerates either). */
  childName: string;
  terminationReason: TerminationReasonWire;
  tier: Tier;
}

function k4Subtitle(reason: TerminationReasonWire): string {
  // bank-exhausted gets gentler copy — "we ran out" shouldn't sound like
  // the child failed to finish. The other two reasons look the same to
  // the child.
  if (reason === "bank-exhausted") {
    return "Great work! Your grown-up will see your report.";
  }
  return "You did an awesome job. Hand the device back to your grown-up to see your report.";
}

function g58Subtitle(reason: TerminationReasonWire, childName: string): string {
  if (reason === "bank-exhausted") {
    return `Great work, ${childName}! Show this to your grown-up.`;
  }
  return `Great work, ${childName}! Hand the device back to your grown-up to see your report.`;
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
          <div className="grid h-48 w-48 place-items-center rounded-[40px] bg-sam-teal/30">
            <span
              className="material-symbols-outlined text-9xl text-sam-navy drop-shadow-md"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              workspace_premium
            </span>
          </div>
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
          {g58Subtitle(terminationReason, childName)}
        </motion.p>
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
        <div className="grid h-48 w-48 place-items-center rounded-[40px] bg-sam-yellow/30">
          <span
            className="material-symbols-outlined text-9xl text-sam-navy drop-shadow-md"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            auto_awesome
          </span>
        </div>
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
    </div>
  );
}
