"use client";

// Celebratory completion splash. Adapted from sam-placement K4CompletionScreen:
//   * sam-* tokens.
//   * Inline material-symbols spans.
//   * Receives placement + termination_reason but does NOT render numeric
//     placement to the child (parent-facing detail lives on a different
//     screen). Termination reason only nudges the subtitle copy.

import { motion, useReducedMotion } from "framer-motion";

import type { TerminationReasonWire } from "@/lib/responseSubmit/types";

interface Props {
  /** First name (or whole `children.name` — schema stores full name; v1
   *  tolerates either). Goes into "All done, [name]!". */
  childName: string;
  terminationReason: TerminationReasonWire;
}

function subtitleFor(reason: TerminationReasonWire): string {
  // bank-exhausted gets gentler copy — "we ran out" shouldn't sound like
  // the child failed to finish. The other two reasons look the same to
  // the child.
  if (reason === "bank-exhausted") {
    return "Great work! Your grown-up will see your report.";
  }
  return "You did an awesome job. Hand the device back to your grown-up to see your report.";
}

export function CompletionScreen({ childName, terminationReason }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-sam-cream px-6 py-12">
      {/* Confetti dot pattern */}
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
        {subtitleFor(terminationReason)}
      </motion.p>
    </div>
  );
}
