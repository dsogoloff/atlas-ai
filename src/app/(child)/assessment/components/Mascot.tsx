"use client";

// Decorative mascot for the child assessment flow. Renders one of three
// TRANSPARENT pose cutouts (public/mascot/*.png, RGBA) as a free-floating
// character — no background chip. A soft drop-shadow keeps it anchored at
// small sizes. All motion is transform-only (framer-motion) and tier-gated
// via mascotIsLively — K_4 gets a gentle idle bob + sway (plus an optional
// entrance pop on the greeting beat); G5_8 and reduced-motion users get a
// still image.
//
// Pose art lives at stable public/ URLs (see MASCOT_SRC) — future art swaps
// replace those files in place; nothing here changes. The image is purely
// decorative (empty alt, aria-hidden, pointer-events-none).

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import type { Tier } from "@/lib/tier/derive";
import { MASCOT_SRC, mascotIsLively, type MascotPose } from "../lib/mascot";

// Idle motion per pose: amplitude (px), period (s), and sway (deg). The
// thinking pose sits beside live questions, so it moves the least + slowest.
const IDLE: Record<MascotPose, { bounce: number; period: number; sway: number }> =
  {
    waving: { bounce: 6, period: 2.2, sway: 2.5 },
    thinking: { bounce: 3, period: 3.4, sway: 2 },
    celebrating: { bounce: 6, period: 1.8, sway: 3 },
  };

// Soft drop-shadow (sam-navy tinted) follows the cutout's alpha silhouette,
// so the free-floating mascot still reads as anchored at any size.
const SHADOW = "drop-shadow-[0_3px_4px_rgba(27,58,107,0.18)]";

/** Presentational styled image for a pose. Square box + object-contain keeps
 *  any aspect ratio graceful; shared by the welcome/completion <Mascot> and
 *  the per-question <QuestionMascot>. */
export function MascotImage({
  pose,
  size,
}: {
  pose: MascotPose;
  size: number;
}) {
  return (
    <Image
      src={MASCOT_SRC[pose]}
      alt=""
      width={size}
      height={size}
      className={`h-full w-full object-contain ${SHADOW}`}
      aria-hidden="true"
    />
  );
}

interface Props {
  pose: MascotPose;
  tier: Tier;
  /** Square box edge in px. */
  size: number;
  /** Spring-pop on mount — greeting/loading beat only. */
  entrance?: boolean;
  className?: string;
}

export function Mascot({ pose, tier, size, entrance = false, className }: Props) {
  const reduceMotion = useReducedMotion();
  const lively = mascotIsLively(tier, reduceMotion);
  const { bounce, period, sway } = IDLE[pose];

  if (!lively) {
    return (
      <div
        className={`pointer-events-none ${className ?? ""}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <MascotImage pose={pose} size={size} />
      </div>
    );
  }

  return (
    <motion.div
      initial={entrance ? { scale: 0 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 12 }}
      className={`pointer-events-none ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <motion.div
        className="h-full w-full"
        animate={{ y: [0, -bounce, 0], rotate: [-sway, sway, -sway] }}
        transition={{
          duration: period,
          repeat: Infinity,
          ease: "easeInOut",
          delay: entrance ? 0.5 : 0,
        }}
      >
        <MascotImage pose={pose} size={size} />
      </motion.div>
    </motion.div>
  );
}
