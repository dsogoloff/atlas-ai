// Mascot pose + motion policy for the child assessment flow.
//
// Pose follows the FSM phase: waving greets on the start/loading beat,
// thinking accompanies questions, celebrating closes the session. Error
// states render no mascot — a playful character next to a failure message
// reads as mixed signals.
//
// Motion is tier-gated: only K_4 gets the lively (animated) treatment,
// and only when the OS does not ask for reduced motion. G5_8 is always
// still — the older-grade chrome is deliberately more measured.
//
// Pure logic, no React — co-located tests in mascot.test.ts.

import type { Tier } from "@/lib/tier/derive";
import type { ViewState } from "./reducer";

export type MascotPose = "waving" | "thinking" | "celebrating";

/** Wired pose art — transparent (RGBA) cutouts under public/mascot/. Referenced
 *  by URL (not static import) since they live in public/. Square-ish source;
 *  the renderer uses object-contain so any aspect ratio stays graceful. */
export const MASCOT_SRC: Record<MascotPose, string> = {
  waving: "/mascot/waving.png",
  thinking: "/mascot/thinking.png",
  celebrating: "/mascot/celebrating.png",
};

/** Footer (per-question) mascot pose: the calm thinking idle, or the brief
 *  celebrating swap fired on each answer submit. Pure mapping — the transient
 *  flag is owned by the footer component. */
export function footerMascotPose(isCelebrating: boolean): MascotPose {
  return isCelebrating ? "celebrating" : "thinking";
}

const POSE_BY_PHASE = {
  starting: "waving",
  running: "thinking",
  completed: "celebrating",
  error: null,
} as const satisfies Record<ViewState["kind"], MascotPose | null>;

export function mascotPoseFor<K extends ViewState["kind"]>(
  kind: K,
): (typeof POSE_BY_PHASE)[K] {
  return POSE_BY_PHASE[kind];
}

/** `reduceMotion` accepts null because framer-motion's useReducedMotion
 *  reports null before hydration; treat that as "motion allowed". */
export function mascotIsLively(
  tier: Tier,
  reduceMotion: boolean | null,
): boolean {
  return tier === "K_4" && reduceMotion !== true;
}
