import { afterEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

// recordReportViewed builds its clients via @/lib/supabase/server and emits
// via @/lib/analytics/emit. Mock both so we can drive the RLS reads and assert
// which events fire. emit()'s own behaviour is covered in emit.test.ts.

const mockCreateClient = vi.fn();
const mockServiceClient = {} as SupabaseClient<Database>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockServiceClient,
}));

vi.mock("@/lib/analytics/emit", () => ({
  emit: vi.fn().mockResolvedValue(undefined),
}));

import { emit } from "@/lib/analytics/emit";

import { recordReportViewed } from "./feedback-actions";

const mockEmit = vi.mocked(emit);

const SESSION = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  mockEmit.mockClear();
  mockCreateClient.mockReset();
});

function query(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) builder[m] = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => ({ data: result.data, error: result.error ?? null }));
  return builder;
}

/** RLS client returning a parent, a session with the given test_type, and an
 *  owned child. */
function makeRls(testType: "short" | "comprehensive") {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
    from: vi.fn((table: string) => {
      if (table === "parents") return query({ data: { id: "p1", tenant_id: "t1" } });
      if (table === "assessment_sessions")
        return query({ data: { id: SESSION, child_id: "c1", test_type: testType } });
      if (table === "children") return query({ data: { id: "c1" } });
      throw new Error(`unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient<Database>;
}

function eventNames(): string[] {
  return mockEmit.mock.calls.map((c) => c[1] as string);
}

describe("recordReportViewed — short_result_viewed gating", () => {
  it("short session: emits parent_report_viewed AND short_result_viewed", async () => {
    mockCreateClient.mockResolvedValue(makeRls("short"));

    await recordReportViewed(SESSION);

    expect(eventNames()).toContain("parent_report_viewed");
    expect(eventNames()).toContain("short_result_viewed");
  });

  it("comprehensive session: emits parent_report_viewed but NOT short_result_viewed", async () => {
    mockCreateClient.mockResolvedValue(makeRls("comprehensive"));

    await recordReportViewed(SESSION);

    expect(eventNames()).toContain("parent_report_viewed");
    expect(eventNames()).not.toContain("short_result_viewed");
  });
});
