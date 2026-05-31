"use client";

// Client wrapper for the report's primary "Schedule a conversation with a
// S.A.M center director" CTA. Exists only to fire center_followup_opted_in on
// the parent's click (the funnel opt-in signal) — the visual chrome is
// unchanged from the prior server-rendered anchor, and the href stays the
// CTA_LINKS placeholder until real scheduling is wired (DECISIONS 2026-05-30).
//
// Fail-soft: the emit is fire-and-forget via the recordCenterFollowupOptIn
// server action (itself never throws); navigation proceeds regardless. A ref
// guards against double-counting if the parent clicks more than once.

import { useRef } from "react";

import { recordCenterFollowupOptIn } from "./feedback-actions";

export function CenterFollowupCta({
  sessionId,
  label,
  href,
}: {
  sessionId: string;
  label: string;
  href: string;
}) {
  const fired = useRef(false);

  function handleClick() {
    if (fired.current) return;
    fired.current = true;
    void recordCenterFollowupOptIn(sessionId);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="flex justify-between items-center px-7 py-5 max-sm:px-6 max-sm:py-4 text-white text-[15px] max-sm:text-sm font-medium no-underline hover:opacity-95 transition-opacity"
      style={{
        backgroundColor: "var(--color-report-navy)",
        fontFamily: "var(--font-report-sans)",
      }}
    >
      <span>{label}</span>
      <span
        className="text-2xl ml-4 shrink-0"
        style={{ fontFamily: "var(--font-report-serif)" }}
        aria-hidden="true"
      >
        &rarr;
      </span>
    </a>
  );
}
