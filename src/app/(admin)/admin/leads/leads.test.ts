import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { FOLLOW_UP_LEAD_COLUMNS, ageLabel, fetchFollowUpLeads } from "./leads";

function makeClient(result: { data: unknown; error: { message: string } | null }) {
  const calls: { select?: string; eq?: [string, string]; order?: [string, unknown] } = {};
  const builder = {
    select(cols: string) {
      calls.select = cols;
      return builder;
    },
    eq(col: string, val: string) {
      calls.eq = [col, val];
      return builder;
    },
    order(col: string, opts: unknown) {
      calls.order = [col, opts];
      return Promise.resolve(result);
    },
  };
  const client = { from: () => builder } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("fetchFollowUpLeads", () => {
  it("scopes to the tenant and orders newest first", async () => {
    const { client, calls } = makeClient({ data: [], error: null });
    await fetchFollowUpLeads(client, "tenant-1");
    expect(calls.eq).toEqual(["tenant_id", "tenant-1"]);
    expect(calls.order).toEqual(["created_at", { ascending: false }]);
  });

  it("COMPLIANCE: projects parent contact columns only — no child or session field", () => {
    const cols = FOLLOW_UP_LEAD_COLUMNS.split(",").map((c) => c.trim());
    expect(cols).toEqual([
      "id",
      "created_at",
      "parent_name",
      "parent_email",
      "parent_phone",
      "zip",
      "school_name",
      "opted_in",
    ]);
    for (const banned of ["child_id", "session_id", "best_time_to_reach"]) {
      expect(cols).not.toContain(banned);
    }
  });

  it("maps rows to camelCase and passes the projection to select()", async () => {
    const { client, calls } = makeClient({
      data: [
        {
          id: "l1",
          created_at: "2026-08-26T12:12:00Z",
          parent_name: "Pat Parent",
          parent_email: "pat@example.com",
          parent_phone: null,
          zip: "07030",
          school_name: "PS 1",
          opted_in: true,
        },
      ],
      error: null,
    });
    const res = await fetchFollowUpLeads(client, "t");
    expect(calls.select).toBe(FOLLOW_UP_LEAD_COLUMNS);
    expect(res).toEqual({
      ok: true,
      rows: [
        {
          id: "l1",
          createdAt: "2026-08-26T12:12:00Z",
          parentName: "Pat Parent",
          parentEmail: "pat@example.com",
          parentPhone: null,
          zip: "07030",
          schoolName: "PS 1",
          optedIn: true,
        },
      ],
    });
  });

  it("returns the database error instead of an empty list", async () => {
    const { client } = makeClient({ data: null, error: { message: "boom" } });
    expect(await fetchFollowUpLeads(client, "t")).toEqual({ ok: false, error: "boom" });
  });
});

describe("ageLabel", () => {
  const now = Date.parse("2026-08-26T12:00:00Z");
  it("labels today, one day and many days", () => {
    expect(ageLabel("2026-08-26T01:00:00Z", now)).toBe("today");
    expect(ageLabel("2026-08-25T01:00:00Z", now)).toBe("1 day ago");
    expect(ageLabel("2026-06-30T12:00:00Z", now)).toBe("57 days ago");
  });
});
