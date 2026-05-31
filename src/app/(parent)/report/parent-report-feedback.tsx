"use client";

// Self-contained post-report satisfaction island. Mounted by report/page.tsx
// with a single additive line after <NextSteps/>; owns all of its own state
// and talks only to feedback-actions.ts. It does NOT read or alter any report
// content, narration, or consent state.
//
//   • On mount: fires parent_report_viewed exactly once per report view,
//     guarded by sessionStorage so React Strict Mode's double-invoke and
//     in-tab remounts don't double-count.
//   • On submit: persists the rating + optional comment and emits
//     parent_satisfaction_submitted. Non-blocking and forgiving of failure —
//     a logging/persist hiccup never disrupts the report.

import { useEffect, useRef, useState } from "react";

import { recordReportViewed, submitSatisfaction } from "./feedback-actions";

const RATINGS = [1, 2, 3, 4, 5] as const;
const RATING_LABELS: Record<number, string> = {
  1: "Not helpful",
  2: "Slightly helpful",
  3: "Helpful",
  4: "Very helpful",
  5: "Extremely helpful",
};

export function ParentReportFeedback({
  sessionId,
}: {
  sessionId: string;
  // Accepted for call-site symmetry with the rest of the report chrome;
  // ownership/attribution is resolved server-side from the session.
  childId: string;
}) {
  const viewFired = useRef(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fire parent_report_viewed once per report view. The sessionStorage key
  // dedupes across the Strict-Mode double effect and any in-tab remount; the
  // ref dedupes within this component instance.
  useEffect(() => {
    if (viewFired.current) return;
    viewFired.current = true;

    const key = `atlas:report_viewed:${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (private mode etc.) — fire anyway; at
      // worst the view is counted once more than strictly necessary.
    }
    void recordReportViewed(sessionId);
  }, [sessionId]);

  async function handleSubmit() {
    if (rating === null || status === "saving") return;
    setStatus("saving");
    setErrorMsg(null);
    const result = await submitSatisfaction({
      sessionId,
      rating,
      comment,
    });
    if (result.ok) {
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <section
      className="px-12 max-sm:px-6 py-13 max-sm:py-10 border-b print:hidden"
      style={{ borderColor: "var(--color-report-border)" }}
    >
      <h2
        className="text-[28px] max-sm:text-2xl font-medium mb-2.5"
        style={{
          fontFamily: "var(--font-report-serif)",
          color: "var(--color-report-navy)",
          letterSpacing: "-0.005em",
        }}
      >
        Was this report helpful?
      </h2>

      {status === "done" ? (
        <p
          className="text-base leading-[1.7] max-w-[560px]"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-text-secondary)",
          }}
        >
          Thank you — your feedback helps us improve these reports.
        </p>
      ) : (
        <>
          <p
            className="text-[15px] leading-[1.65] mb-7 max-w-[560px]"
            style={{
              fontFamily: "var(--font-report-sans)",
              color: "var(--color-report-text-secondary)",
            }}
          >
            Your rating is shared with the S.A.M team to improve future
            assessments.
          </p>

          <fieldset
            className="flex flex-wrap gap-2.5 mb-6"
            aria-label="Rate this report from 1 to 5"
          >
            {RATINGS.map((value) => {
              const selected = rating === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${value} — ${RATING_LABELS[value]}`}
                  onClick={() => setRating(value)}
                  className="h-12 w-12 text-[17px] font-medium transition-colors"
                  style={{
                    fontFamily: "var(--font-report-sans)",
                    border: "1px solid var(--color-report-border)",
                    backgroundColor: selected
                      ? "var(--color-report-navy)"
                      : "transparent",
                    color: selected
                      ? "#fff"
                      : "var(--color-report-text-secondary)",
                  }}
                >
                  {value}
                </button>
              );
            })}
          </fieldset>

          <label
            htmlFor="satisfaction-comment"
            className="block text-[13px] uppercase tracking-[0.1em] mb-2"
            style={{
              fontFamily: "var(--font-report-sans)",
              color: "var(--color-report-text-light)",
            }}
          >
            Anything you&rsquo;d like to add? (optional)
          </label>
          <textarea
            id="satisfaction-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full max-w-[560px] p-3 text-[15px] mb-6 resize-y"
            style={{
              fontFamily: "var(--font-report-sans)",
              border: "1px solid var(--color-report-border)",
              backgroundColor: "var(--color-report-paper-white)",
              color: "var(--color-report-text)",
            }}
          />

          {status === "error" && errorMsg && (
            <p
              className="text-[14px] mb-4"
              style={{
                fontFamily: "var(--font-report-sans)",
                color: "var(--color-report-navy)",
              }}
              role="alert"
            >
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === null || status === "saving"}
            className="inline-flex items-center px-7 py-4 text-white text-[15px] font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95"
            style={{
              backgroundColor: "var(--color-report-navy)",
              fontFamily: "var(--font-report-sans)",
            }}
          >
            {status === "saving" ? "Saving…" : "Submit feedback"}
          </button>
        </>
      )}
    </section>
  );
}
