import { describe, expect, it } from "vitest";

import {
  attemptNumberForSession,
  buildAttemptHistory,
  toCrmSummary,
  type AttemptSessionRow,
} from "./attempts";

// A completed session's current_estimate, in the shape isPlacementEstimateJson
// accepts. The LEVEL here is the point of several tests below: it must reach
// the staff view and must NOT reach the CRM summary.
function estimate(overallLevel: string) {
  // Shape per isPlacementEstimateJson in src/lib/responseSubmit/types.ts:
  // snake_case, overall_level is a HalfGradeLevel STRING ("1A"/"2B"/...).
  return { overall_level: overallLevel, strand_levels: {}, confidence: 0.82 };
}

function session(
  id: string,
  startedAt: string,
  completedAt: string | null,
  level: string | null = null,
): AttemptSessionRow {
  return {
    id,
    status: completedAt ? "COMPLETED" : "IN_PROGRESS",
    started_at: startedAt,
    completed_at: completedAt,
    current_estimate: level === null ? null : estimate(level),
    test_type: "short",
  } as AttemptSessionRow;
}

// Olga's real shape: three attempts, same child, deliberately out of order on
// input so the sort is doing the work rather than the fixture.
const THREE_ATTEMPTS: AttemptSessionRow[] = [
  session("s2", "2026-09-12T00:40:00.000Z", "2026-09-12T00:47:00.000Z", "2B"),
  session("s1", "2026-09-11T23:47:15.352Z", "2026-09-11T23:54:00.584Z", "1A"),
  session("s3", "2026-09-12T02:23:51.467Z", "2026-09-12T02:25:37.822Z", "3A"),
];

describe("buildAttemptHistory", () => {
  it("numbers attempts chronologically by started_at, oldest first", () => {
    const history = buildAttemptHistory(THREE_ATTEMPTS);
    expect(history.map((a) => [a.attemptNumber, a.sessionId])).toEqual([
      [1, "s1"],
      [2, "s2"],
      [3, "s3"],
    ]);
  });

  it("RETAINS every attempt — a re-take never replaces an earlier one", () => {
    const history = buildAttemptHistory(THREE_ATTEMPTS);
    expect(history).toHaveLength(3);
    // Each attempt keeps its OWN true instants; nothing is rewritten to the
    // latest pass's values.
    expect(history[0].startedAt).toBe("2026-09-11T23:47:15.352Z");
    expect(history[0].completedAt).toBe("2026-09-11T23:54:00.584Z");
    expect(history[2].startedAt).toBe("2026-09-12T02:23:51.467Z");
  });

  it("keeps each attempt's own assessed level (the Atlas-only staff signal)", () => {
    const history = buildAttemptHistory(THREE_ATTEMPTS);
    expect(history.map((a) => a.samLevel)).not.toEqual([null, null, null]);
    // Distinct levels per attempt — this is what progress across intervals is.
    expect(new Set(history.map((a) => a.samLevel)).size).toBe(3);
  });

  it("includes an in-progress attempt and leaves its completedAt null", () => {
    const history = buildAttemptHistory([
      session("s1", "2026-09-11T23:47:15.352Z", "2026-09-11T23:54:00.584Z", "1A"),
      session("s2", "2026-09-12T03:00:00.000Z", null),
    ]);
    expect(history).toHaveLength(2);
    expect(history[1].attemptNumber).toBe(2);
    expect(history[1].completedAt).toBeNull();
  });

  it("is stable for two sessions sharing a started_at (tie-broken by id)", () => {
    const same = "2026-09-12T00:00:00.000Z";
    const a = buildAttemptHistory([session("bbb", same, null), session("aaa", same, null)]);
    const b = buildAttemptHistory([session("aaa", same, null), session("bbb", same, null)]);
    expect(a.map((x) => x.sessionId)).toEqual(["aaa", "bbb"]);
    expect(a.map((x) => x.sessionId)).toEqual(b.map((x) => x.sessionId));
  });

  it("degrades rather than throwing on an unreadable estimate", () => {
    const history = buildAttemptHistory([
      session("s1", "2026-09-11T23:47:15.352Z", "2026-09-11T23:54:00.584Z"),
    ]);
    expect(history[0].samLevel).toBeNull();
    expect(history[0].canonicalLevel).toBeNull();
  });

  it("returns an empty history for a child who has never assessed", () => {
    expect(buildAttemptHistory([])).toEqual([]);
  });
});

describe("attemptNumberForSession", () => {
  it("resolves the attempt number for a known session", () => {
    expect(attemptNumberForSession(THREE_ATTEMPTS, "s3")).toBe(3);
  });

  it("returns undefined for an unknown session — never a guessed 1", () => {
    expect(attemptNumberForSession(THREE_ATTEMPTS, "nope")).toBeUndefined();
  });
});

describe("toCrmSummary", () => {
  const summary = toCrmSummary(buildAttemptHistory(THREE_ATTEMPTS));

  it("carries the FIRST and LATEST attempt instants, not just the latest", () => {
    expect(summary.firstStartedAt).toBe("2026-09-11T23:47:15.352Z");
    expect(summary.firstCompletedAt).toBe("2026-09-11T23:54:00.584Z");
    expect(summary.latestCompletedAt).toBe("2026-09-12T02:25:37.822Z");
  });

  it("counts COMPLETED attempts", () => {
    expect(summary.attemptCount).toBe(3);
  });

  it("does not count an in-progress attempt as completed", () => {
    const s = toCrmSummary(
      buildAttemptHistory([
        session("s1", "2026-09-11T23:47:15.352Z", "2026-09-11T23:54:00.584Z", "1A"),
        session("s2", "2026-09-12T03:00:00.000Z", null),
      ]),
    );
    expect(s.attemptCount).toBe(1);
    expect(s.firstCompletedAt).toBe("2026-09-11T23:54:00.584Z");
    expect(s.latestCompletedAt).toBe("2026-09-11T23:54:00.584Z");
  });

  it("COMPLIANCE: exposes counts and timestamps ONLY — no level, band or score", () => {
    // The structural guarantee, asserted. If someone widens AttemptCrmSummary
    // with a result field, this fails.
    expect(Object.keys(summary).sort()).toEqual(
      [
        "attemptCount",
        "firstCompletedAt",
        "firstStartedAt",
        "latestCompletedAt",
        "latestStartedAt",
      ].sort(),
    );
    const serialized = JSON.stringify(summary);
    for (const forbidden of ["level", "Level", "band", "score", "strand", "estimate"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("is empty-safe for a child with no attempts", () => {
    expect(toCrmSummary([])).toEqual({
      attemptCount: 0,
      firstStartedAt: null,
      firstCompletedAt: null,
      latestStartedAt: null,
      latestCompletedAt: null,
    });
  });
});
