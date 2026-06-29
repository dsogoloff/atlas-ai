// Orphan self-heal — recoverParentProfile.
//
// Rebuilds a missing parents row from the auth identity, attached to the single
// ACTIVE tenant/center. Returns the row on success, null when it can't safely
// recover (tenant/center unresolved, or insert fails with no existing row).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { User } from "@supabase/supabase-js";

const mockDeleteUser = vi.fn();
let parentInsert: { data: unknown; error: unknown } = {
  data: { id: "p1", name: "Pat Parent" },
  error: null,
};
let existingParent: unknown = null;
let centers: unknown = {
  data: [{ id: "c1", status: "ACTIVE", tenant_id: "t1" }],
  error: null,
};
const insertSpy = vi.fn();

function tableStub(table: string) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.insert = (row: unknown) => {
    if (table === "parents") insertSpy(row);
    return b;
  };
  b.single = async () =>
    table === "parents" ? parentInsert : { data: null, error: null };
  b.maybeSingle = async () => {
    if (table === "tenants") return { data: { id: "t1" }, error: null };
    if (table === "parents") return { data: existingParent, error: null };
    return { data: null, error: null };
  };
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(table === "centers" ? centers : { data: null, error: null }).then(
      res,
      rej,
    );
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    auth: { admin: { deleteUser: mockDeleteUser } },
    from: (table: string) => tableStub(table),
  }),
}));

import { recoverParentProfile } from "./recover-profile";

const USER = {
  id: "u1",
  email: "pat@example.com",
  user_metadata: { full_name: "Pat Parent" },
} as unknown as User;

beforeEach(() => {
  parentInsert = { data: { id: "p1", name: "Pat Parent" }, error: null };
  existingParent = null;
  centers = { data: [{ id: "c1", status: "ACTIVE", tenant_id: "t1" }], error: null };
  insertSpy.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recoverParentProfile", () => {
  it("inserts the parents row from the auth identity and returns it", async () => {
    const res = await recoverParentProfile(USER);

    expect(res).toEqual({ id: "p1", name: "Pat Parent" });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_user_id: "u1",
        tenant_id: "t1",
        home_center_id: "c1",
        email: "pat@example.com",
        name: "Pat Parent",
      }),
    );
  });

  it("falls back to the email local-part when metadata has no name", async () => {
    const noName = {
      id: "u2",
      email: "jordan@example.com",
      user_metadata: {},
    } as unknown as User;

    await recoverParentProfile(noName);

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: "jordan" }),
    );
  });

  it("returns null when no single ACTIVE center can be resolved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    centers = { data: [], error: null };

    expect(await recoverParentProfile(USER)).toBeNull();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("re-reads an existing row when the insert races (unique violation)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    parentInsert = { data: null, error: { message: "duplicate key" } };
    existingParent = { id: "praced", name: "Pat Parent" };

    expect(await recoverParentProfile(USER)).toEqual({
      id: "praced",
      name: "Pat Parent",
    });
  });

  it("returns null when the insert fails and no row exists", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    parentInsert = { data: null, error: { message: "boom" } };
    existingParent = null;

    expect(await recoverParentProfile(USER)).toBeNull();
  });
});
