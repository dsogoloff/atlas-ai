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

// Per-table service-client stub. select/eq/insert/update chain and resolve to
// the shape each call site consumes (maybeSingle / single / awaited list /
// insert / update). `onInsert`/`onUpdate` (used by the parents stub) capture
// the exact payload so tests can assert on it. `update` resolves through the
// same `list` slot `insert` (awaited bare, e.g. vpc_audit_log) uses — a given
// stub instance's call sites never use both, so they don't collide.
function tableStub(handlers: {
  single?: unknown;
  maybeSingle?: unknown;
  list?: unknown;
  onInsert?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
  /** When set, awaiting the builder (the insert/update-without-.single() form)
   *  rejects with this instead of resolving `list` — simulates a thrown
   *  network/client error rather than a returned `{ error }`. */
  throwsOnAwait?: Error;
}) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) b[m] = () => b;
  b.insert = (payload: Record<string, unknown>) => {
    handlers.onInsert?.(payload);
    return b;
  };
  b.update = (payload: Record<string, unknown>) => {
    handlers.onUpdate?.(payload);
    return b;
  };
  b.single = async () => handlers.single ?? { data: null, error: null };
  b.maybeSingle = async () => handlers.maybeSingle ?? { data: null, error: null };
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    handlers.throwsOnAwait
      ? Promise.reject(handlers.throwsOnAwait).then(res, rej)
      : Promise.resolve(handlers.list ?? { data: null, error: null }).then(res, rej);
  return b;
}

let parentInsertResult: { data: unknown; error: unknown } = {
  data: { id: "p1" },
  error: null,
};
let parentUpdateResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};
let capturedParentInsert: Record<string, unknown> | undefined;
let capturedParentUpdate: Record<string, unknown> | undefined;
let parentUpdateThrows: Error | undefined;

const mockGetAttribution = vi.fn<() => Promise<Record<string, string>>>(
  async () => ({}),
);

vi.mock("@/lib/marketing/server", () => ({
  getAttribution: () => mockGetAttribution(),
}));

vi.mock("@/lib/supabase/tokenHashClient", () => ({
  createTokenHashClient: () => ({ auth: { signUp: mockSignUp } }),
}));

vi.mock("@/lib/supabase/server", () => ({
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
          return tableStub({
            single: parentInsertResult,
            list: parentUpdateResult,
            throwsOnAwait: parentUpdateThrows,
            onInsert: (payload) => {
              capturedParentInsert = payload;
            },
            onUpdate: (payload) => {
              capturedParentUpdate = payload;
            },
          });
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
  parentUpdateResult = { data: null, error: null };
  capturedParentInsert = undefined;
  capturedParentUpdate = undefined;
  parentUpdateThrows = undefined;
  mockGetAttribution.mockReset();
  mockGetAttribution.mockResolvedValue({});
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

// ---------------------------------------------------------------------------
// HubSpot Contract A capture — src/lib/marketing/server's getAttribution()
// is written as a SEPARATE best-effort UPDATE, after the parent row is
// confirmed created, never on the creation INSERT itself. Attribution is
// marketing data; it must never be able to fail (or even appear on) the
// transaction that creates a parent's account.
// ---------------------------------------------------------------------------
describe("signupAction — attribution capture is a decoupled, best-effort UPDATE", () => {
  it("never includes `attribution` on the parents creation INSERT", async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockGetAttribution.mockResolvedValue({
      utm_source: "facebook",
      utm_medium: "paid_social",
    });

    await signupAction(INPUT);

    expect(capturedParentInsert).not.toHaveProperty("attribution");
  });

  it("writes getAttribution()'s result via a best-effort UPDATE after the parent row is created", async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockGetAttribution.mockResolvedValue({
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "sam_ny_fall",
      first_seen: "2026-08-03T12:00:00.000Z",
    });

    const res = await signupAction(INPUT);

    expect(res).toEqual({ ok: true, email: "pat@example.com" });
    expect(capturedParentUpdate?.attribution).toEqual({
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "sam_ny_fall",
      first_seen: "2026-08-03T12:00:00.000Z",
    });
  });

  it("skips the attribution UPDATE entirely when the visitor arrived untagged", async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockGetAttribution.mockResolvedValue({});

    await signupAction(INPUT);

    expect(capturedParentUpdate).toBeUndefined();
  });

  // Load-bearing: this test was confirmed to go RED against the pre-fix
  // implementation (attribution bundled into the creation INSERT) before
  // this fix was restored — see PR #238. It is the regression guard for the
  // exact defect a Vercel preview signup hit: an attribution-column write
  // failure (e.g. the migration not yet applied to that database) must never
  // surface as "Could not finish creating your account."
  it("still creates the account when the attribution UPDATE returns an error", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockGetAttribution.mockResolvedValue({ utm_source: "facebook" });
    parentUpdateResult = {
      data: null,
      error: { message: 'column "attribution" of relation "parents" does not exist' },
    };

    const res = await signupAction(INPUT);

    expect(res).toEqual({ ok: true, email: "pat@example.com" });
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("still creates the account when the attribution UPDATE throws (e.g. a network error)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSignUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockGetAttribution.mockResolvedValue({ utm_source: "facebook" });
    parentUpdateThrows = new Error("fetch failed");

    const res = await signupAction(INPUT);

    expect(res).toEqual({ ok: true, email: "pat@example.com" });
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
