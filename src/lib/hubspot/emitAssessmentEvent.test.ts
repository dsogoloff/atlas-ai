import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocked at the BOUNDARY: these are the three seams where data would actually
// leave Atlas, so asserting on their arguments is what proves the compliance
// guarantee rather than merely restating it.
vi.mock("./syncContact", () => ({
  syncHubSpotAssessmentMilestone: vi.fn(async () => undefined),
}));
vi.mock("./assessmentActivity", () => ({
  syncHubSpotAssessmentActivity: vi.fn(async () => undefined),
}));
vi.mock("./childFields", () => ({
  syncHubSpotChildFields: vi.fn(async () => undefined),
}));

import { syncHubSpotAssessmentActivity } from "./assessmentActivity";
import { syncHubSpotChildFields } from "./childFields";
import { emitAssessmentEvent } from "./emitAssessmentEvent";
import { syncHubSpotAssessmentMilestone } from "./syncContact";

const PARENT_ID = "cdc2c196-eae4-4a71-ab72-2cf9cd455425";
const CHILD_ID = "child-1";

const A1_START = "2026-09-11T23:47:15.352Z";
const A1_DONE = "2026-09-11T23:54:00.584Z";
const A3_START = "2026-09-12T02:23:51.467Z";
const A3_DONE = "2026-09-12T02:25:37.822Z";

function estimate(level: string) {
  return { overall_level: level, strand_levels: {}, confidence: 0.9 };
}

// Three RETAINED attempts on one child — the real shape this feature exists for.
const SESSIONS = [
  {
    id: "s1",
    status: "COMPLETED",
    started_at: A1_START,
    completed_at: A1_DONE,
    current_estimate: estimate("1A"),
    test_type: "short",
  },
  {
    id: "s2",
    status: "COMPLETED",
    started_at: "2026-09-12T00:40:00.000Z",
    completed_at: "2026-09-12T00:47:00.000Z",
    current_estimate: estimate("2B"),
    test_type: "short",
  },
  {
    id: "s3",
    status: "COMPLETED",
    started_at: A3_START,
    completed_at: A3_DONE,
    current_estimate: estimate("3A"),
    test_type: "short",
  },
];

const CHILDREN = [
  { name: "Daniel", grade_level: "K", created_at: "2026-09-01T00:00:00.000Z" },
];

/** Minimal Supabase stub: assessment_sessions resolves on the awaited builder,
 *  children resolves after .order(). */
function makeClient(sessions: unknown[] = SESSIONS, children: unknown[] = CHILDREN) {
  return {
    from(table: string) {
      const rows = table === "assessment_sessions" ? sessions : children;
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => Promise.resolve({ data: rows, error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: rows, error: null }),
      };
      return builder;
    },
  } as never;
}

function callsOf(fn: unknown): Record<string, unknown>[][] {
  return (fn as { mock: { calls: Record<string, unknown>[][] } }).mock.calls;
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe("emitAssessmentEvent", () => {
  it("labels the event with the attempt number derived from history", async () => {
    await emitAssessmentEvent({
      serviceClient: makeClient(),
      parentId: PARENT_ID,
      childId: CHILD_ID,
      sessionId: "s3",
      event: "completed",
    });

    expect(syncHubSpotAssessmentActivity).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 3, event: "completed" }),
    );
  });

  it("uses the attempt's TRUE timestamp from the session row, never now", async () => {
    await emitAssessmentEvent({
      serviceClient: makeClient(),
      parentId: PARENT_ID,
      childId: CHILD_ID,
      sessionId: "s1",
      event: "completed",
    });

    // Attempt 1's own completion instant, even though attempt 3 is the latest.
    expect(syncHubSpotAssessmentActivity).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 1, occurredAt: A1_DONE }),
    );
    expect(syncHubSpotAssessmentMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: A1_DONE }),
    );
  });

  it("uses started_at for a start event and completed_at for a completion", async () => {
    await emitAssessmentEvent({
      serviceClient: makeClient(),
      parentId: PARENT_ID,
      childId: CHILD_ID,
      sessionId: "s3",
      event: "started",
    });

    expect(syncHubSpotAssessmentActivity).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: A3_START }),
    );
  });

  it("does NOT dedup across attempts — each re-take emits its own event", async () => {
    const client = makeClient();
    for (const sessionId of ["s1", "s2", "s3"]) {
      await emitAssessmentEvent({
        serviceClient: client,
        parentId: PARENT_ID,
        childId: CHILD_ID,
        sessionId,
        event: "completed",
      });
    }

    expect(syncHubSpotAssessmentActivity).toHaveBeenCalledTimes(3);
    const attemptNumbers = callsOf(syncHubSpotAssessmentActivity).map(
      (c) => c[0].attemptNumber,
    );
    expect(attemptNumbers).toEqual([1, 2, 3]);
  });

  it("sends first-attempt dates and the attempt count alongside the latest date", async () => {
    await emitAssessmentEvent({
      serviceClient: makeClient(),
      parentId: PARENT_ID,
      childId: CHILD_ID,
      sessionId: "s3",
      event: "completed",
    });

    expect(syncHubSpotAssessmentMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredAt: A3_DONE, // latest-wins property
        attempt: {
          attemptCount: 3,
          firstStartedAt: A1_START,
          firstCompletedAt: A1_DONE, // the earlier attempt is NOT lost
        },
      }),
    );
  });

  it("syncs the child first name and grade", async () => {
    await emitAssessmentEvent({
      serviceClient: makeClient(),
      parentId: PARENT_ID,
      childId: CHILD_ID,
      sessionId: "s1",
      event: "completed",
    });

    expect(syncHubSpotChildFields).toHaveBeenCalledWith({
      accountId: PARENT_ID,
      children: [{ firstName: "Daniel", grade: "K" }],
    });
  });

  it("emits NOTHING when the session is not in the attempt history", async () => {
    await emitAssessmentEvent({
      serviceClient: makeClient(),
      parentId: PARENT_ID,
      childId: CHILD_ID,
      sessionId: "unknown-session",
      event: "completed",
    });

    // A mislabelled attempt number is worse than a missing event.
    expect(syncHubSpotAssessmentActivity).not.toHaveBeenCalled();
    expect(syncHubSpotAssessmentMilestone).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("emits nothing for a completion event on an attempt with no completed_at", async () => {
    const inProgress = [
      { ...SESSIONS[0], id: "s9", completed_at: null, status: "IN_PROGRESS" },
    ];
    await emitAssessmentEvent({
      serviceClient: makeClient(inProgress),
      parentId: PARENT_ID,
      childId: CHILD_ID,
      sessionId: "s9",
      event: "completed",
    });

    expect(syncHubSpotAssessmentActivity).not.toHaveBeenCalled();
  });

  it("COMPLIANCE: no assessed level, band or score reaches ANY HubSpot seam", async () => {
    await emitAssessmentEvent({
      serviceClient: makeClient(),
      parentId: PARENT_ID,
      childId: CHILD_ID,
      sessionId: "s3",
      event: "completed",
    });

    // The history this ran on carries levels 1A/2B/3A. None may appear in any
    // argument handed to a sync.
    const allArgs = JSON.stringify([
      callsOf(syncHubSpotAssessmentMilestone),
      callsOf(syncHubSpotAssessmentActivity),
      callsOf(syncHubSpotChildFields),
    ]);

    for (const forbidden of [
      "1A",
      "2B",
      "3A",
      "overall_level",
      "strand_levels",
      "confidence",
      "samLevel",
      "canonicalLevel",
      "current_estimate",
    ]) {
      expect(allArgs).not.toContain(forbidden);
    }
  });

  it("never throws when the history read fails", async () => {
    const broken = {
      from: () => ({
        select: () => ({ eq: () => Promise.reject(new Error("db down")) }),
      }),
    } as never;

    await expect(
      emitAssessmentEvent({
        serviceClient: broken,
        parentId: PARENT_ID,
        childId: CHILD_ID,
        sessionId: "s1",
        event: "completed",
      }),
    ).resolves.toBeUndefined();
  });
});
