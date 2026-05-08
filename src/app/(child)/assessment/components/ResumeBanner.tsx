"use client";

// Brief banner shown on top of the running view when the session was
// resumed (HTTP 409 from /start). Auto-dismisses after ~4s; accessible
// via aria-live="polite" so a screen reader announces it once.

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const VISIBLE_MS = 4000;

export function ResumeBanner() {
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-x-0 top-2 z-30 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-sam-teal/30 bg-white px-5 py-2 shadow-md">
        <span
          className="material-symbols-outlined text-sam-teal"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          check_circle
        </span>
        <span className="font-display-child text-sm font-bold text-sam-navy">
          Welcome back! Picking up where you left off.
        </span>
      </div>
    </motion.div>
  );
}
