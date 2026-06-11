"use client";

// Decorative mascot for the child assessment flow. Renders one of three
// static pose PNGs; all motion is transform-only (framer-motion) and
// tier-gated via mascotIsLively — K_4 gets a gentle idle bounce (plus an
// optional entrance pop on the greeting beat), G5_8 and reduced-motion
// users get a still image.
//
// Pose art lives at stable paths under stitch/mascot/ — future art swaps
// replace those files in place; nothing here changes. The image is purely
// decorative (empty alt, aria-hidden, pointer-events-none) and is given a
// fixed square box up front so it never shifts layout or intercepts taps.

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import type { Tier } from "@/lib/tier/derive";
import { mascotIsLively, type MascotPose } from "../lib/mascot";

import waving from "../../../../../stitch/mascot/mascot1.png";
import thinking from "../../../../../stitch/mascot/mascot2.png";
import celebrating from "../../../../../stitch/mascot/mascot3.png";

// Idle-bounce amplitude (px) and period (s) per pose: the thinking pose
// sits beside live questions, so it moves the least and the slowest.
const POSES: Record<
  MascotPose,
  { art: typeof waving; bounce: number; period: number }
> = {
  waving: { art: waving, bounce: 6, period: 2.2 },
  thinking: { art: thinking, bounce: 3, period: 3.4 },
  celebrating: { art: celebrating, bounce: 6, period: 1.8 },
};

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
  const { art, bounce, period } = POSES[pose];

  // The PNGs are opaque (cream studio background), so they render as a
  // soft rounded chip rather than a free-floating cutout.
  const image = (
    <Image
      src={art}
      alt=""
      width={size}
      height={size}
      className="h-full w-full rounded-[22%] object-cover shadow-sm ring-1 ring-sam-gray-light"
      aria-hidden="true"
    />
  );

  if (!lively) {
    return (
      <div
        className={`pointer-events-none ${className ?? ""}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {image}
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
        animate={{ y: [0, -bounce, 0] }}
        transition={{
          duration: period,
          repeat: Infinity,
          ease: "easeInOut",
          delay: entrance ? 0.5 : 0,
        }}
      >
        {image}
      </motion.div>
    </motion.div>
  );
}
