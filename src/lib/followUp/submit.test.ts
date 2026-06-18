import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { submitFollowUpLeadCore, type FollowUpLeadInput } from "./submit";

const SESSION_ID = "00000000-0000-4000-8000-00000a1de003";
const CHILD_ID = "00000000-0000-4000-8000-00000c41d000";
const PARENT_ID = "00000000-0000-4000-8000-0000000a71a5";
const TENANT_ID = "00000000-0000-4000-8000-0000000aabbb";

// Configurable RLS client: each table's maybeSingle() returns a staged row.
function makeRlsClient(opts: {
  user?: unknown;
  parent?: unknown;
  session?: unknown;
  ownedChild?: unknown;
}): SupabaseClient<Database> {
  const table = (row: unknown) => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.maybeSingle = () => Promise.resolve({ data: row ?? null, error: null });
    return b;
  };
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: opts.user ?? null } }) },
    from: (t: string) =>
      t === "parents"
        ? table(opts.parent)
        : t === "assessment_sessions"
          ? table(opts.session)
          : table(opts.ownedChild),
  } as unknown as SupabaseClient<Database>;
}

function makeServiceClient(insertResult: { error: unknown } = { error: null }) {
  const inserts: unknown[] = [];
  const client = {
    from: () => ({
      insert: (row: unknown) => {
        inserts.push(row);
        return Promise.resolve(insertResult);
      },
    }),
  } as unknown as SupabaseClient<Database>;
  return { client, inserts };
}

const validInput: FollowUpLeadInput = {
  sessionId: SESSION_ID,
  schoolName: "Lincoln Elementary",
  parentName: "Sam Park",
  parentEmail: "sam@example.com",
  parentPhone: "555-1234",
  bestTimeToReach: "evenings",
};

const ownedOk = {
  user: { id: "u1" },
  parent: { id: PARENT_ID, tenant_id: TENANT_ID },
  session: { id: SESSION_ID, child_id: CHILD_ID },
  ownedChild: { id: CHILD_ID },
};

describe("submitFollowUpLeadCore", () => {
  it("persists the lead and fires the (mocked) notify on the happy path", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const notify = vi.fn().mockResolvedValue(undefined);

    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify,
      input: validInput,
    });

    expect(result).toEqual({ ok: true });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      tenant_id: TENANT_ID,
      child_id: CHILD_ID,
      session_id: SESSION_ID,
      school_name: "Lincoln Elementary",
      parent_name: "Sam Park",
      parent_email: "sam@example.com",
      parent_phone: "555-1234",
      best_time_to_reach: "evenings",
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ schoolName: "Lincoln Elementary" }),
    );
  });

  it("rejects when the session is not the caller's child (no insert, no notify)", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const notify = vi.fn();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient({ ...ownedOk, ownedChild: null }),
      serviceClient,
      notify,
      input: validInput,
    });
    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(inserts).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("rejects a malformed email before any DB work", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const notify = vi.fn();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify,
      input: { ...validInput, parentEmail: "not-an-email" },
    });
    expect(result).toEqual({ ok: false, error: "bad_email" });
    expect(inserts).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("rejects missing required fields", async () => {
    const { client: serviceClient } = makeServiceClient();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify: vi.fn(),
      input: { ...validInput, schoolName: "  " },
    });
    expect(result).toEqual({ ok: false, error: "missing_fields" });
  });

  it("optional phone/time persist as null when blank", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify: vi.fn().mockResolvedValue(undefined),
      input: { ...validInput, parentPhone: "", bestTimeToReach: "" },
    });
    expect(result).toEqual({ ok: true });
    expect(inserts[0]).toMatchObject({
      parent_phone: null,
      best_time_to_reach: null,
    });
  });
});
