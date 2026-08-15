// Signup action — orphan rollback.
//
// signUp() creates the auth user, then a separate parents insert. If that
// insert fails the auth user must be DELETED (admin.auth.admin.deleteUser) so
// it isn't left as an orphan that can authenticate with no profile. A delete
// failure is logged but the original error is still surfaced.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignUp = vi.fn();
const mockDeleteUser = vi.fn<
  (id: string) => Promise<{
    data: { user: null };
    error: { message: string } | null;
  }>
>(async () => ({ data: { user: null }, error: null }));

// Per-table service-client stub. select/eq/insert chain and resolve to the
// shape each call site consumes (maybeSingle / single / awaited list / insert).
function tableStub(handlers: {
  single?: unknown;
  maybeSingle?: unknown;
  list?: unknown;
}) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "insert"]) b[m] = () => b;
  b.single = async () => handlers.single ?? { data: null, error: null };
  b.maybeSingle = async () => handlers.maybeSingle ?? { data: null, error: null };
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(handlers.list ?? { data: null, error: null }).then(res, rej);
  return b;
}

let parentInsertResult: { data: unknown; error: unknown } = {
  data: { id: "p1" },
  error: null,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signUp: mockSignUp } }),
  createServiceClient: () => ({
    auth: { admin: { deleteUser: mockDeleteUser } },
    from: (table: string) => {
      switch (table) {
        case "tenants":
          return tableStub({ maybeSingle: { data: { id: "t1" }, error: null } });
        case "centers":
          return tableStub({
            list: {
              data: [{ id: "c1", status: "ACTIVE", tenant_id: "t1" }],
              error: null,
            },
          });
        case "parents":
          return tableStub({ single: parentInsertResult });
        case "vpc_audit_log":
          return tableStub({ list: { data: null, error: null } });
        default:
          throw new Error(`unexpected table: ${table}`);
      }
    },
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => null }),
}));

import { signupAction } from "./actions";

const INPUT = {
  firstName: "Pat",
  lastName: "Parent",
  email: "pat@example.com",
  password: "correct horse battery",
  consent: true as const,
};

// ATLAS-011: emailRedirectTo is built from APP_PUBLIC_ORIGIN rather than from
// the Origin/Referer headers, so the action needs it configured. Its absence is
// a hard failure by design — see lib/config/publicOrigin.test.ts.
beforeEach(() => {
  vi.stubEnv("APP_PUBLIC_ORIGIN", "https://app.samnewyork.com");
});

afterEach(() => {
  mockSignUp.mockReset();
  mockDeleteUser.mockClear();
  parentInsertResult = { data: { id: "p1" }, error: null };
  vi.unstubAllEnvs();
});

describe("signupAction — orphan rollback on parents-insert failure", () => {
  it("deletes the just-created auth user when the parents insert fails", async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    parentInsertResult = { data: null, error: { message: "insert failed" } };

    const res = await signupAction(INPUT);

    expect(res.ok).toBe(false);
    expect(mockDeleteUser).toHaveBeenCalledWith("u1");
  });

  it("stores the name in user_metadata for later self-heal", async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    await signupAction(INPUT);

    const opts = mockSignUp.mock.calls[0][0];
    expect(opts.options.data).toMatchObject({
      full_name: "Pat Parent",
      first_name: "Pat",
      last_name: "Parent",
    });
  });

  it("does NOT delete the auth user on a successful signup", async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const res = await signupAction(INPUT);

    expect(res).toEqual({ ok: true, email: "pat@example.com" });
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("still surfaces the original error when the rollback delete also fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    parentInsertResult = { data: null, error: { message: "insert failed" } };
    mockDeleteUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "delete failed" },
    });

    const res = await signupAction(INPUT);

    expect(res.ok).toBe(false);
    expect(mockDeleteUser).toHaveBeenCalledWith("u1");
    expect(errSpy).toHaveBeenCalled(); // rollback failure logged
    errSpy.mockRestore();
  });
});
