"use client";

// The report's two contact CTAs. Both are mailto links, and BOTH now record
// the tap server-side before the mail draft opens.
//
// ---------------------------------------------------------------------------
// WHY THE CALL IS NOT AWAITED
// ---------------------------------------------------------------------------
// Awaiting a fetch inside a click handler breaks the user-gesture chain on
// iOS, and the mail app may then simply not open. So the record is fired and
// forgotten and navigation is never blocked on it. That ordering is
// deliberate: a lost record is recoverable, a parent who taps and gets nothing
// is not. If the call fails for any reason the mailto still fires and no error
// ever surfaces to the parent.
//
// IDEMPOTENCE. A tap is recorded at most once per browser session per CTA per
// assessment session. sessionStorage is used rather than a useRef so the guard
// survives a remount or a back-navigation; every access is wrapped, because
// sessionStorage throws outright in some privacy modes.
//
// NO ACCOUNT, NO RECORD. The server action resolves the authenticated parent
// and returns silently for an anonymous viewer — the client does not need to
// know, and still opens the draft.

import { useRef } from "react";

import {
  recordCenterFollowupOptIn,
  recordReportCtaTap,
  type ReportCta,
} from "./feedback-actions";

/** At most once per (session, CTA) per browser session. Returns false when the
 *  tap has already been recorded. Fails OPEN — if storage is unavailable we
 *  would rather record twice than lose the signal entirely. */
function claimOnce(sessionId: string, cta: ReportCta): boolean {
  const key = `atlas:cta:${cta}:${sessionId}`;
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

/** Fire-and-forget. Never awaited, never throws into the click handler. */
function record(sessionId: string, cta: ReportCta): void {
  try {
    void recordReportCtaTap(sessionId, cta).catch(() => undefined);
  } catch {
    // A synchronous throw must not stop the navigation either.
  }
}

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
    // The existing funnel signal, unchanged: once per mount, analytics only.
    if (!fired.current) {
      fired.current = true;
      void recordCenterFollowupOptIn(sessionId);
    }
    // New: the server-side record + deal advance to "In Conversation".
    if (claimOnce(sessionId, "director_conversation")) {
      record(sessionId, "director_conversation");
    }
    // Navigation proceeds regardless — nothing above is awaited.
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="flex justify-between items-center px-7 py-5 max-sm:px-6 max-sm:py-4 text-white text-[17px] max-sm:text-base font-medium no-underline hover:opacity-95 transition-opacity"
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

/**
 * The secondary "Questions? Talk to us" mailto, which recorded NOTHING before
 * this change. Same fire-and-forget contract; visual output is byte-identical
 * to the plain <Link> it replaces.
 */
export function TrackedMailtoLink({
  sessionId,
  cta,
  href,
  className,
  children,
}: {
  sessionId: string;
  cta: ReportCta;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  function handleClick() {
    if (claimOnce(sessionId, cta)) record(sessionId, cta);
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
