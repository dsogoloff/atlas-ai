// Shared student detail — per-child ASSESSMENT ATTEMPT HISTORY.
//
// Re-takes are a supported, RETAINED event (founder decision 2026-09-12): every
// assessment_sessions row is one attempt, and no attempt is ever merged over or
// overwritten. This table is the staff-facing read of that history, oldest
// attempt first, so progress across intervals reads top-to-bottom.
//
// ATLAS-ONLY (D-0055 / D-0061): the assessed level per attempt is a staff value
// and lives only on this surface. Nothing here is handed to HubSpot — this
// component imports nothing from src/lib/hubspot/ and takes only the already
// RLS-scoped `AssessmentAttempt[]` the page read.
//
// Purely presentational: no data access, no question content (compliance §8),
// no parent PII (compliance §6.2 / §10.3).

import type { AssessmentAttempt } from "@/lib/assessmentHistory/attempts";

const TEST_TYPE_LABEL: Record<AssessmentAttempt["testType"], string> = {
  short: "Short check",
  comprehensive: "Comprehensive",
};

/** Deterministic short date (fixed locale + UTC so the render is stable across
 *  server timezones) — same idiom as the page's "Account created" date. */
function formatAttemptDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Written as one literal class string so Tailwind's scanner emits it.
const GRID = "md:grid-cols-[0.7fr_1.2fr_1.2fr_1.1fr_1.4fr]";

export function AttemptHistory({ attempts }: { attempts: AssessmentAttempt[] }) {
  return (
    <section aria-labelledby="attempt-history-heading">
      <h2
        id="attempt-history-heading"
        className="font-display-child text-sam-navy text-2xl mt-10 mb-4"
      >
        Assessment attempts
      </h2>

      {attempts.length === 0 ? (
        <p className="text-sm text-sam-gray-mid">
          No assessment attempts recorded for this student yet.
        </p>
      ) : (
        <>
          <p className="text-sm text-sam-gray-mid mb-4">
            <span className="font-bold text-sam-navy">
              {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
            </span>
            {attempts.length > 1
              ? " — this student has re-taken the assessment. Every attempt is kept; a re-take never replaces an earlier one."
              : " on record."}
          </p>

          <div className="bg-white rounded-2xl border border-sam-gray-light/40 overflow-hidden">
            {/* Header row — hidden on mobile where cells stack. */}
            <div
              className={`hidden md:grid ${GRID} gap-4 px-6 py-3 border-b border-sam-gray-light/40 text-[11px] font-bold text-sam-gray-mid uppercase tracking-wider`}
            >
              <span>Attempt</span>
              <span>Started</span>
              <span>Completed</span>
              <span>Test type</span>
              <span>Assessed level</span>
            </div>
            <ul>
              {attempts.map((attempt) => (
                <li
                  key={attempt.sessionId}
                  className={`grid grid-cols-1 ${GRID} gap-1 md:gap-4 px-6 py-4 border-b border-sam-gray-light/30 last:border-b-0`}
                >
                  <span className="font-headline-adult text-sam-navy font-bold tabular-nums">
                    #{attempt.attemptNumber}
                  </span>
                  <span className="text-sm text-sam-navy/70">
                    {formatAttemptDate(attempt.startedAt)}
                  </span>
                  <span className="text-sm text-sam-navy/70">
                    {attempt.completedAt === null ? (
                      <span className="inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-bold bg-sam-orange/15 text-[#b45309]">
                        In progress
                      </span>
                    ) : (
                      formatAttemptDate(attempt.completedAt)
                    )}
                  </span>
                  <span className="text-sm text-sam-navy/70">
                    {TEST_TYPE_LABEL[attempt.testType] ?? attempt.testType}
                  </span>
                  <span className="text-sm font-bold text-sam-navy">
                    {attempt.samLevel ?? (
                      <span className="font-normal text-sam-gray-mid">
                        Not placed
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
