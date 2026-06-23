"use client";

// Per-question footer mascot (ALL tiers). Two behaviours, both transform-only
// and reduced-motion gated:
//
//   * IDLE — the thinking pose with a gentle low-amplitude bob + sway. Runs
//     under every question; deliberately the calmest motion in the flow so it
//     never distracts from a diagnostic item.
//   * CELEBRATE — on each answer submit (driven by `celebrateTick`, bumped in
//     the shared assessment client), a celebrating-pose layer crossfades in
//     over the thinking pose with a quick hop/scale-pop, then fades back out.
//
// The celebrate is driven entirely by framer-motion imperative controls (no
// React state swap) so a submit can't trigger a synchronous setState/cascade
// inside the effect — the thinking layer stays mounted and the celebrating
// layer just animates its opacity on top.
//
// Mounted ONCE in QuestionShell's footer (not per-format), so the beat fires
// exactly once per question across every answer format. Reduced-motion users
// get a still thinking mascot — no bob, no hop. Rendered for EVERY tier (both
// the K-4 and G5-8 QuestionShell footers host it); motion is gated only by the
// reduced-motion preference, never by tier (questionMascotIsLively).

import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";

import { questionMascotIsLively } from "../lib/mascot";
import { MascotImage } from "./Mascot";

interface Props {
  /** Monotonic counter bumped once per answer submit by the assessment client.
   *  A change (not its value) drives the celebrate beat. */
  celebrateTick: number;
  /** Square box edge in px. */
  size: number;
  className?: string;
}

export function QuestionMascot({ celebrateTick, size, className }: Props) {
  const reduceMotion = useReducedMotion();
  // In-question mascot animates for every tier — gated only by reduced motion.
  const lively = questionMascotIsLively(reduceMotion);

  const hop = useAnimationControls(); // outer box: scale-pop + vertical hop
  const flash = useAnimationControls(); // celebrating layer: opacity crossfade
  // Only a CHANGE in celebrateTick triggers a beat — not mount, and not an
  // unrelated re-render (e.g. a reduced-motion toggle).
  const lastTick = useRef(celebrateTick);

  useEffect(() => {
    if (lastTick.current === celebrateTick) return;
    lastTick.current = celebrateTick;
    if (!lively) return; // reduced-motion: no hop, no swap

    void hop.start({
      y: [0, -14, 0],
      scale: [1, 1.18, 1],
      transition: { duration: 0.62, ease: "easeOut", times: [0, 0.4, 1] },
    });
    void flash.start({
      opacity: [0, 1, 1, 0],
      transition: { duration: 0.62, ease: "easeOut", times: [0, 0.15, 0.7, 1] },
    });
  }, [celebrateTick, lively, hop, flash]);

  if (!lively) {
    return (
      <div
        className={`pointer-events-none ${className ?? ""}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <MascotImage pose="thinking" size={size} />
      </div>
    );
  }

  return (
    <motion.div
      animate={hop}
      className={`pointer-events-none ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <motion.div
        className="relative h-full w-full"
        animate={{ y: [0, -3, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Thinking idle base — always visible. */}
        <div className="absolute inset-0">
          <MascotImage pose="thinking" size={size} />
        </div>
        {/* Celebrating layer — crossfades in only during the submit beat. */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={flash}
        >
          <MascotImage pose="celebrating" size={size} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
