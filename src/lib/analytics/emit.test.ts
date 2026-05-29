import { afterEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { emit } from "./emit";
import { ANALYTICS_EVENTS } from "./events";

// emit() is the fail-soft contract: it must NEVER throw or reject, regardless
// of what the Supabase client does. These tests pin that contract — a logging
// failure can never break or block a user flow.

afterEach(() => {
  vi.restoreAllMocks();
});

function clientWithInsert(
  insert: ReturnType<typeof vi.fn>,
): SupabaseClient<Database> {
  return {
    from: vi.fn(() => ({ insert })),
  } as unknown as SupabaseClient<Database>;
}

describe("emit (fail-soft)", () => {
  it("writes the row and does not log on success", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      emit(clientWithInsert(insert), ANALYTICS_EVENTS.SHORT_TEST_STARTED, {
        tenantId: "t1",
        childId: "c1",
        sessionId: "s1",
        props: { foo: 1 },
      }),
    ).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledWith({
      event_name: "short_test_started",
      tenant_id: "t1",
      child_id: "c1",
      session_id: "s1",
      props: { foo: 1 },
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("defaults missing refs to null and props to {}", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await emit(clientWithInsert(insert), ANALYTICS_EVENTS.LANDING_VIEWED);

    expect(insert).toHaveBeenCalledWith({
      event_name: "landing_viewed",
      tenant_id: null,
      child_id: null,
      session_id: null,
      props: {},
    });
  });

  it("does not throw when insert returns an error", async () => {
    const insert = vi
      .fn()
      .mockResolvedValue({ error: { message: "RLS denied" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      emit(clientWithInsert(insert), ANALYTICS_EVENTS.SHORT_TEST_COMPLETED),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("does not throw when insert rejects", async () => {
    const insert = vi.fn().mockRejectedValue(new Error("connection reset"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      emit(clientWithInsert(insert), ANALYTICS_EVENTS.SHORT_TEST_COMPLETED),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("does not throw when the client itself throws synchronously", async () => {
    const badClient = {
      from: vi.fn(() => {
        throw new Error("client unavailable");
      }),
    } as unknown as SupabaseClient<Database>;
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      emit(badClient, ANALYTICS_EVENTS.PARENT_REPORT_VIEWED),
    ).resolves.toBeUndefined();
  });
});
