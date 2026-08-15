// fetchRoster tests.
//
// Real cross-center scoping is enforced by RLS at the database, which a
// unit test can't exercise. What we CAN pin down is the function's
// contract: it derives the roster solely from what the RLS-scoped client
// returns, never widening the set (e.g. it must not invent a roster row
// from a session whose child the client didn't return), and it derives
// status / placement correctly per child.

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { fetchRoster } from "./roster";

const VALID_PLACEMENT_3A = {
  overall_level: "3A",
  strand_levels: {
    number_sense: "3A",
    operations_algorithms: "3A",
    fractions_decimals: "3A",
    measurement: "3A",
    geometry: "3A",
    data_statistics: "3A",
  },
  confidence: 0.6,
};

// Fake RLS-scoped client. children resolves via .order(); sessions via
// .in(). The closure captures the rows for the table named in from().
function makeClient(tables: {
  children?: unknown[];
  assessment_sessions?: unknown[];
  centers?: unknown[];
}): SupabaseClient<Database> {
  const fake = {
    from(table: string) {
      const rows = (tables as Record<string, unknown[]>)[table] ?? [];
      const result = { data: rows, error: null };
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.order = () => Promise.resolve(result);
      builder.in = () => Promise.resolve(result);
      return builder;
    },
  };
  return fake as unknown as SupabaseClient<Database>;
}

describe("fetchRoster", () => {
  it("returns one row per child the scoped client exposes, in client order", async () => {
    const client = makeClient({
      children: [
        { id: "c-aaaa", name: "Aiden Park", grade_level: "3" },
        { id: "c-bbbb", name: "Bree Lim", grade_level: "2" },
      ],
      assessment_sessions: [],
    });

    const roster = await fetchRoster(client);

    expect(roster.map((r) => r.childId)).toEqual(["c-aaaa", "c-bbbb"]);
    expect(roster[0].name).toBe("Aiden Park");
    expect(roster[0].gradeLabel).toBe("3rd Grade");
    // No sessions → not started, no placement.
    expect(roster[0].status).toBe("not_started");
    expect(roster[0].placementLabel).toBeNull();
    expect(roster[0].completedAtDisplay).toBeNull();
  });

  it("never widens the roster: a session for a child not in the client's children set produces no row", async () => {
    const client = makeClient({
      children: [{ id: "c-aaaa", name: "Aiden Park", grade_level: "3" }],
      assessment_sessions: [
        // This session belongs to a child the scoped client did NOT return
        // (e.g. another center's student). It must not leak a roster row.
        {
          child_id: "c-other-center",
          status: "COMPLETED",
          completed_at: "2026-05-20T10:00:00.000Z",
          current_estimate: VALID_PLACEMENT_3A,
        },
      ],
    });

    const roster = await fetchRoster(client);

    expect(roster).toHaveLength(1);
    expect(roster[0].childId).toBe("c-aaaa");
    // Aiden has no session of his own → still not_started.
    expect(roster[0].status).toBe("not_started");
  });

  it("marks completed status with placement + date from the latest completed session", async () => {
    const client = makeClient({
      children: [{ id: "c-aaaa", name: "Aiden Park", grade_level: "3" }],
      assessment_sessions: [
        {
          child_id: "c-aaaa",
          status: "COMPLETED",
          completed_at: "2026-05-10T10:00:00.000Z",
          current_estimate: { ...VALID_PLACEMENT_3A, overall_level: "2A" },
        },
        {
          child_id: "c-aaaa",
          status: "COMPLETED",
          completed_at: "2026-05-20T10:00:00.000Z",
          current_estimate: VALID_PLACEMENT_3A,
        },
      ],
    });

    const roster = await fetchRoster(client);

    expect(roster[0].status).toBe("completed");
    // Latest by completed_at wins → level 3 (from 3A), not the older 2A.
    // samLevelLabel now renders the S.A.M booklet level (no half-grade); the
    // instructor roster shares this fn (founder decision 2026-06-18; instructor
    // side-effect flagged in the PR).
    expect(roster[0].placementLabel).toBe("S.A.M Level 3");
    // Second producer of a placement string: it goes through the SAME
    // chokepoint as the report, so the roster carries the franchise contract
    // value alongside the parent label instead of a label with no counterpart.
    expect(roster[0].placementCanonical).toBe("L3");
    expect(roster[0].completedAtDisplay).toBe("May 20, 2026");
  });

  it("degrades to a null canonical (keeping the label) for an out-of-contract level", async () => {
    // A stored 8B has no canonical target. The report throws; a read-only staff
    // list must not 500 over one legacy row, so it drops the contract value and
    // keeps the label. Not reachable today — see canonical-level.ts.
    const client = makeClient({
      children: [{ id: "c-aaaa", name: "Aiden Park", grade_level: "3" }],
      assessment_sessions: [
        {
          child_id: "c-aaaa",
          status: "COMPLETED",
          completed_at: "2026-05-20T10:00:00.000Z",
          current_estimate: { ...VALID_PLACEMENT_3A, overall_level: "8B" },
        },
      ],
    });

    const roster = await fetchRoster(client);

    expect(roster[0].placementLabel).toBe("S.A.M Level 8");
    expect(roster[0].placementCanonical).toBeNull();
  });

  it("has no placement strings at all until a session completes", async () => {
    const client = makeClient({
      children: [{ id: "c-aaaa", name: "Aiden Park", grade_level: "3" }],
      assessment_sessions: [],
    });

    const roster = await fetchRoster(client);

    expect(roster[0].placementLabel).toBeNull();
    expect(roster[0].placementCanonical).toBeNull();
  });

  it("marks in_progress when the only session is in progress", async () => {
    const client = makeClient({
      children: [{ id: "c-aaaa", name: "Aiden Park", grade_level: "3" }],
      assessment_sessions: [
        {
          child_id: "c-aaaa",
          status: "IN_PROGRESS",
          completed_at: null,
          current_estimate: null,
        },
      ],
    });

    const roster = await fetchRoster(client);

    expect(roster[0].status).toBe("in_progress");
    expect(roster[0].placementLabel).toBeNull();
  });

  it("keeps completed status but null placement when the estimate is invalid", async () => {
    const client = makeClient({
      children: [{ id: "c-aaaa", name: "Aiden Park", grade_level: "3" }],
      assessment_sessions: [
        {
          child_id: "c-aaaa",
          status: "COMPLETED",
          completed_at: "2026-05-20T10:00:00.000Z",
          current_estimate: { garbage: true },
        },
      ],
    });

    const roster = await fetchRoster(client);

    expect(roster[0].status).toBe("completed");
    expect(roster[0].placementLabel).toBeNull();
  });

  it("returns an empty roster when the client exposes no children", async () => {
    const client = makeClient({ children: [], assessment_sessions: [] });
    expect(await fetchRoster(client)).toEqual([]);
  });

  it("derives lastAssessment from the most recent session (completed_at, else started_at)", async () => {
    const client = makeClient({
      children: [{ id: "c-1", name: "Aiden Park", grade_level: "3" }],
      assessment_sessions: [
        {
          child_id: "c-1",
          status: "COMPLETED",
          completed_at: "2026-05-10T10:00:00.000Z",
          started_at: "2026-05-10T09:00:00.000Z",
          current_estimate: null,
        },
        // A later, still-in-progress session — its start time is the most
        // recent assessment activity (newer than the completed one's finish).
        {
          child_id: "c-1",
          status: "IN_PROGRESS",
          completed_at: null,
          started_at: "2026-05-20T09:00:00.000Z",
          current_estimate: null,
        },
      ],
    });

    const roster = await fetchRoster(client);

    expect(roster[0].lastAssessmentAt).toBe("2026-05-20T09:00:00.000Z");
    expect(roster[0].lastAssessmentDisplay).toBe("May 20, 2026");
  });

  it("sort: 'last_assessment' orders most-recent first, un-assessed children last", async () => {
    const client = makeClient({
      children: [
        { id: "c-old", name: "Older Activity", grade_level: "3" },
        { id: "c-none", name: "Never Assessed", grade_level: "3" },
        { id: "c-new", name: "Newer Activity", grade_level: "3" },
      ],
      assessment_sessions: [
        {
          child_id: "c-old",
          status: "COMPLETED",
          completed_at: "2026-04-01T10:00:00.000Z",
          started_at: "2026-04-01T09:00:00.000Z",
          current_estimate: null,
        },
        {
          child_id: "c-new",
          status: "COMPLETED",
          completed_at: "2026-06-01T10:00:00.000Z",
          started_at: "2026-06-01T09:00:00.000Z",
          current_estimate: null,
        },
      ],
    });

    const roster = await fetchRoster(client, { sort: "last_assessment" });

    expect(roster.map((r) => r.childId)).toEqual(["c-new", "c-old", "c-none"]);
    expect(roster[2].lastAssessmentDisplay).toBeNull(); // un-assessed last
  });

  it("default sort is unchanged (by name) when no sort option is given", async () => {
    const client = makeClient({
      children: [
        { id: "c-z", name: "Zoe Tan", grade_level: "2" },
        { id: "c-a", name: "Aiden Park", grade_level: "3" },
      ],
      assessment_sessions: [],
    });

    const roster = await fetchRoster(client);

    expect(roster.map((r) => r.name)).toEqual(["Aiden Park", "Zoe Tan"]);
  });

  it("attaches centerName and sorts by center then name across every center the client exposes", async () => {
    // Admin scope: the RLS-scoped client returns children across MULTIPLE
    // centers (an instructor's client would return only their own center's —
    // same code, narrower input). fetchRoster must label each row with its
    // center and sort by center, then name, so the admin roster groups by
    // center. Rows are given out of order to prove fetchRoster sorts.
    const client = makeClient({
      children: [
        { id: "c-2", name: "Zoe Tan", grade_level: "2", home_center_id: "ctr-brooklyn" },
        { id: "c-1", name: "Aiden Park", grade_level: "3", home_center_id: "ctr-queens" },
        { id: "c-3", name: "Bea Ng", grade_level: "1", home_center_id: "ctr-brooklyn" },
      ],
      assessment_sessions: [],
      centers: [
        { id: "ctr-brooklyn", name: "Brooklyn" },
        { id: "ctr-queens", name: "Queens" },
      ],
    });

    const roster = await fetchRoster(client);

    // Tenant-wide: children from BOTH centers are present (fetchRoster never
    // narrows by center — scoping is RLS's job, not this function's).
    expect(roster).toHaveLength(3);
    // Brooklyn before Queens; within Brooklyn, Bea before Zoe.
    expect(roster.map((r) => r.name)).toEqual([
      "Bea Ng",
      "Zoe Tan",
      "Aiden Park",
    ]);
    expect(roster.map((r) => r.centerName)).toEqual([
      "Brooklyn",
      "Brooklyn",
      "Queens",
    ]);
  });

  it("keeps archived children in the roster and maps archived_at to a display date", async () => {
    // Staff (admin) retain visibility of parent soft-deleted children — they
    // are NOT filtered out here; the view badges them via archivedAtDisplay.
    const client = makeClient({
      children: [
        {
          id: "c-aaaa",
          name: "Aiden Park",
          grade_level: "3",
          archived_at: "2026-05-20T10:00:00.000Z",
        },
        { id: "c-bbbb", name: "Bree Lim", grade_level: "2" },
      ],
      assessment_sessions: [],
    });

    const roster = await fetchRoster(client);

    expect(roster).toHaveLength(2); // archived child still present
    const aiden = roster.find((r) => r.childId === "c-aaaa");
    const bree = roster.find((r) => r.childId === "c-bbbb");
    expect(aiden?.archivedAtDisplay).toBe("May 20, 2026");
    expect(bree?.archivedAtDisplay).toBeNull();
  });

  it("leaves centerName null when the child has no home center", async () => {
    const client = makeClient({
      children: [{ id: "c-aaaa", name: "Aiden Park", grade_level: "3" }],
      assessment_sessions: [],
      centers: [],
    });

    const roster = await fetchRoster(client);

    expect(roster[0].centerName).toBeNull();
  });
});
