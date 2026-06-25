"use client";

// Pre-narration interstitial for the parent report.
//
// Shown by page.tsx (Branch 7) when a freshly-completed session has no
// narration row yet (see narration-pending.ts). The narrative is written a few
// seconds after completion, so without this the report would briefly render the
// pre-narration shell (generic strand lede, no Strengths / Areas). This polls
// by re-running the (force-dynamic) server component via router.refresh(); the
// moment the narration row lands — or the page's wait bound elapses — the
// server returns the full report and this component unmounts. It NEVER spins
// forever: the bound lives server-side, so this is only mounted during the
// normal in-flight window, not as a failure state.
//
// Self-contained chrome (report design tokens via inline style, matching the
// rest of the report) so the client bundle doesn't pull in the server-only
// report-article module.

import { useEffect } from "react";

import { useRouter } from "next/navigation";

interface Props {
  childName: string;
  metaLine: string | null;
  /** Poll cadence in ms. Overridable for tests. */
  intervalMs?: number;
}

export function PreparingReport({
  childName,
  metaLine,
  intervalMs = 2500,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <div
      className="flex-grow w-full"
      style={{
        backgroundColor: "var(--color-report-paper)",
        fontFamily: "var(--font-report-sans)",
        color: "var(--color-report-text)",
      }}
    >
      <article
        className="max-w-[850px] mx-auto min-h-screen flex flex-col items-center justify-center px-12 max-sm:px-6 text-center"
        style={{ backgroundColor: "var(--color-report-paper-white)" }}
      >
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center"
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-4"
            style={{
              borderColor: "var(--color-report-border)",
              borderTopColor: "var(--color-report-navy)",
            }}
            aria-hidden="true"
          />
          <h1
            className="mt-7 text-3xl max-sm:text-2xl font-medium"
            style={{
              fontFamily: "var(--font-report-serif)",
              color: "var(--color-report-navy)",
              letterSpacing: "-0.005em",
            }}
          >
            Preparing {childName}&rsquo;s report…
          </h1>
          <p
            className="mt-3 text-[17px] leading-[1.65] max-w-[420px]"
            style={{ color: "var(--color-report-text-secondary)" }}
          >
            This takes just a few seconds. The full report will appear here
            automatically.
          </p>
          {metaLine && (
            <p
              className="mt-7 text-sm"
              style={{ color: "var(--color-report-text-light)" }}
            >
              {metaLine}
            </p>
          )}
        </div>
      </article>
    </div>
  );
}
