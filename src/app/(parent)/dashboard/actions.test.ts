// archiveChildAction — parent soft-delete.

import { afterEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "u1" } as { id: string } | null },
  error: null,
}));
const updateSpy = vi.fn();

let parentRow: { id: string } | null = { id: "p1" };
let childResult: { data: { id: string } | null; error: unknown } = {
  data: { id: "c1" },
  error: null,
};

function childrenChain() {
  const b: Record<string, unknown> = {};
  b.update = (payload: unknown) => {
    updateSpy(payload);
    return b;
  };
  b.eq = () => b;
  b.is = () => b;
  b.select = () => b;
  b.maybeSingle = async () => childResult;
  return b;
}

function parentsChain() {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.maybeSingle = async () => ({ data: parentRow, error: null });
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (t: string) => {
      if (t === "parents") return parentsChain();
      if (t === "children") return childrenChain();
      throw new Error(`unexpected table: ${t}`);
    },
  }),
}));

import { archiveChildAction } from "./actions";

const VALID = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  updateSpy.mockReset();
  parentRow = { id: "p1" };
  childResult = { data: { id: "c1" }, error: null };
});

describe("archiveChildAction", () => {
  it("sets archived_at + archived_by for the owning parent", async () => {
    const res = await archiveChildAction(VALID);

    expect(res).toEqual({ ok: true });
    const payload = updateSpy.mock.calls[0][0] as {
      archived_at: string;
      archived_by: string;
    };
    expect(typeof payload.archived_at).toBe("string");
    expect(payload.archived_by).toBe("p1");
  });

  it("rejects a malformed child id without touching the DB", async () => {
    const res = await archiveChildAction("not-a-uuid");

    expect(res.ok).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("fails when not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await archiveChildAction(VALID);

    expect(res.ok).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("reports when nothing was archived (already archived / not owned)", async () => {
    childResult = { data: null, error: null };

    const res = await archiveChildAction(VALID);

    expect(res.ok).toBe(false);
  });
});
