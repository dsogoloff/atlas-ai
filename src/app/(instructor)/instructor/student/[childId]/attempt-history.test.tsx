// Shared student detail — attempt-history table.
//
// Re-takes are retained events (founder decision 2026-09-12), so the LOAD-BEARING
// behaviour is that every attempt renders, in chronological order, with its own
// number, dates and assessed level — and that an unfinished attempt is visibly
// unfinished rather than silently dated. The component is purely presentational,
// so these render it directly with the domain shape fetchAttemptHistory returns.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AssessmentAttempt } from "@/lib/assessmentHistory/attempts";

import { AttemptHistory } from "./attempt-history";

function attempt(over: Partial<AssessmentAttempt> = {}): AssessmentAttempt {
  return {
    attemptNumber: 1,
    sessionId: "sess-1",
    testType: "comprehensive",
    status: "COMPLETED",
    startedAt: "2026-03-02T09:00:00.000Z",
    completedAt: "2026-03-02T09:30:00.000Z",
    samLevel: "S.A.M Level 2",
    canonicalLevel: "L2",
    ...over,
  };
}

/** Index of a substring in the rendered markup; -1 when absent. Used to assert
 *  DOM ORDER, which is what "oldest first" means on this surface. */
function at(html: string, needle: string): number {
  return html.indexOf(needle);
}

describe("AttemptHistory", () => {
  it("renders every attempt oldest-first with its attempt number and level", () => {
    const html = renderToStaticMarkup(
      <AttemptHistory
        attempts={[
          attempt({
            attemptNumber: 1,
            sessionId: "s1",
            startedAt: "2026-01-10T09:00:00.000Z",
            completedAt: "2026-01-10T09:25:00.000Z",
            samLevel: "S.A.M Level 1",
            canonicalLevel: "L1",
          }),
          attempt({
            attemptNumber: 2,
            sessionId: "s2",
            startedAt: "2026-04-10T09:00:00.000Z",
            completedAt: "2026-04-10T09:25:00.000Z",
            samLevel: "S.A.M Level 2",
            canonicalLevel: "L2",
          }),
          attempt({
            attemptNumber: 3,
            sessionId: "s3",
            startedAt: "2026-07-10T09:00:00.000Z",
            completedAt: "2026-07-10T09:25:00.000Z",
            samLevel: "S.A.M Level 3",
            canonicalLevel: "L3",
          }),
        ]}
      />,
    );

    expect(html).toContain("#1");
    expect(html).toContain("#2");
    expect(html).toContain("#3");

    // Chronological top-to-bottom: attempt 1's row precedes 2's, which precedes 3's.
    expect(at(html, "#1")).toBeLessThan(at(html, "#2"));
    expect(at(html, "#2")).toBeLessThan(at(html, "#3"));
    expect(at(html, "Jan 10, 2026")).toBeLessThan(at(html, "Apr 10, 2026"));
    expect(at(html, "Apr 10, 2026")).toBeLessThan(at(html, "Jul 10, 2026"));

    // Each attempt keeps its OWN level — a re-take never overwrites the earlier one.
    expect(html).toContain("S.A.M Level 1");
    expect(html).toContain("S.A.M Level 2");
    expect(html).toContain("S.A.M Level 3");
  });

  it("makes the re-taken case obvious with a count line", () => {
    const html = renderToStaticMarkup(
      <AttemptHistory
        attempts={[
          attempt({ attemptNumber: 1, sessionId: "s1" }),
          attempt({ attemptNumber: 2, sessionId: "s2" }),
          attempt({ attemptNumber: 3, sessionId: "s3" }),
        ]}
      />,
    );

    expect(html).toContain("3 attempts");
    expect(html).toContain("re-taken");
  });

  it("renders an in-progress attempt with no completion date", () => {
    const html = renderToStaticMarkup(
      <AttemptHistory
        attempts={[
          attempt({
            attemptNumber: 1,
            sessionId: "s1",
            startedAt: "2026-01-10T09:00:00.000Z",
            completedAt: "2026-01-10T09:25:00.000Z",
          }),
          attempt({
            attemptNumber: 2,
            sessionId: "s2",
            status: "IN_PROGRESS",
            testType: "short",
            startedAt: "2026-05-04T09:00:00.000Z",
            completedAt: null,
            samLevel: null,
            canonicalLevel: null,
          }),
        ]}
      />,
    );

    expect(html).toContain("In progress");
    expect(html).toContain("May 4, 2026"); // the start date is still shown
    expect(html).toContain("Not placed"); // no level yet, shown as absent
    expect(html).toContain("Short check");
    // The finished attempt's completion date is untouched by the open one.
    expect(html).toContain("Jan 10, 2026");
  });

  it("renders a single-attempt child normally", () => {
    const html = renderToStaticMarkup(
      <AttemptHistory attempts={[attempt()]} />,
    );

    expect(html).toContain("1 attempt");
    expect(html).not.toContain("re-taken");
    expect(html).toContain("#1");
    expect(html).toContain("Mar 2, 2026");
    expect(html).toContain("S.A.M Level 2");
    expect(html).toContain("Comprehensive");
  });

  it("renders the empty state when there are no attempts", () => {
    const html = renderToStaticMarkup(<AttemptHistory attempts={[]} />);

    expect(html).toContain("No assessment attempts recorded");
    expect(html).not.toContain("#1");
    expect(html).not.toContain("In progress");
  });
});
