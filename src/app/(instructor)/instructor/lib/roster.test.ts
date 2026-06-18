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
    expect(roster[0].completedAtDisplay).toBe("May 20, 2026");
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
});
