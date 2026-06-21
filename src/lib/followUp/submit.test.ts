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
  zip: "94110",
  optedIn: true,
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
      schoolFieldEnabled: true,
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
      zip: "94110",
      opted_in: true,
    });
    // best_time_to_reach is retired — never written on new rows.
    expect(inserts[0]).not.toHaveProperty("best_time_to_reach");
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ schoolName: "Lincoln Elementary", zip: "94110" }),
    );
  });

  it("rejects when the explicit opt-in is false (no insert, no notify)", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const notify = vi.fn();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify,
      schoolFieldEnabled: true,
      input: { ...validInput, optedIn: false },
    });
    expect(result).toEqual({ ok: false, error: "opt_in_required" });
    expect(inserts).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("rejects a missing zip (required) before any DB work", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const notify = vi.fn();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify,
      schoolFieldEnabled: true,
      input: { ...validInput, zip: "  " },
    });
    expect(result).toEqual({ ok: false, error: "missing_fields" });
    expect(inserts).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("succeeds with a blank school even when the flag is ON (school optional)", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify: vi.fn().mockResolvedValue(undefined),
      schoolFieldEnabled: true,
      input: { ...validInput, schoolName: "  " },
    });
    expect(result).toEqual({ ok: true });
    expect(inserts[0]).toMatchObject({ school_name: null, zip: "94110" });
  });

  it("rejects when the session is not the caller's child (no insert, no notify)", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const notify = vi.fn();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient({ ...ownedOk, ownedChild: null }),
      serviceClient,
      notify,
      schoolFieldEnabled: true,
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
      schoolFieldEnabled: true,
      input: { ...validInput, parentEmail: "not-an-email" },
    });
    expect(result).toEqual({ ok: false, error: "bad_email" });
    expect(inserts).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("rejects a missing parent name (required)", async () => {
    const { client: serviceClient } = makeServiceClient();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify: vi.fn(),
      schoolFieldEnabled: true,
      input: { ...validInput, parentName: "  " },
    });
    expect(result).toEqual({ ok: false, error: "missing_fields" });
  });

  it("optional phone persists as null when blank (zip still required + kept)", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify: vi.fn().mockResolvedValue(undefined),
      schoolFieldEnabled: true,
      input: { ...validInput, parentPhone: "" },
    });
    expect(result).toEqual({ ok: true });
    expect(inserts[0]).toMatchObject({ parent_phone: null, zip: "94110" });
  });
});

describe("submitFollowUpLeadCore — school field gated OFF (default)", () => {
  it("succeeds with NO school and persists school_name null (not required)", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const notify = vi.fn().mockResolvedValue(undefined);
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify,
      schoolFieldEnabled: false,
      input: { ...validInput, schoolName: undefined },
    });
    expect(result).toEqual({ ok: true });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ school_name: null, parent_name: "Sam Park" });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ schoolName: null }),
    );
  });

  it("IGNORES a client-sent school value when the flag is off (defense)", async () => {
    const { client: serviceClient, inserts } = makeServiceClient();
    const result = await submitFollowUpLeadCore({
      rlsClient: makeRlsClient(ownedOk),
      serviceClient,
      notify: vi.fn().mockResolvedValue(undefined),
      schoolFieldEnabled: false,
      input: { ...validInput, schoolName: "Sneaky School" },
    });
    expect(result).toEqual({ ok: true });
    expect(inserts[0]).toMatchObject({ school_name: null });
    expect(JSON.stringify(inserts[0])).not.toContain("Sneaky School");
  });
});
