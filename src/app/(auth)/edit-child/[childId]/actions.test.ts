// updateChildAction — parent edits a child's name / grade / birth year.

import { afterEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "u1" } as { id: string } | null },
  error: null,
}));
const updateSpy = vi.fn();

// revalidatePath needs a Next request/static-generation store, which a unit
// test has no way to provide. Mocked so the action is callable here AND so the
// dashboard invalidation can be asserted: it is load-bearing, not incidental —
// without it the form has to fall back to a client router.refresh(), which is
// exactly what used to cancel the post-save navigation.
const revalidateSpy = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidateSpy(path),
}));

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

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (t: string) => {
      if (t === "children") return childrenChain();
      throw new Error(`unexpected table: ${t}`);
    },
  }),
}));

import { updateChildAction } from "./actions";

const VALID = "11111111-1111-4111-8111-111111111111";
const INPUT = { name: "Alex", birthYear: 2017, gradeLevel: "3" };

afterEach(() => {
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  updateSpy.mockReset();
  revalidateSpy.mockReset();
  childResult = { data: { id: "c1" }, error: null };
});

describe("updateChildAction", () => {
  it("updates name / birth_year / grade_level for the owning parent", async () => {
    const res = await updateChildAction(VALID, INPUT);

    expect(res).toEqual({ ok: true });
    expect(updateSpy).toHaveBeenCalledWith({
      name: "Alex",
      birth_year: 2017,
      grade_level: "3",
    });
  });

  it("revalidates /dashboard on success so the form can navigate with a plain push", async () => {
    // Regression guard for the "Saving..." hang: if this invalidation is
    // dropped, the dashboard serves a stale name and the form is pushed back
    // toward a client-side router.refresh() — the thing that cancelled the
    // navigation in the first place.
    await updateChildAction(VALID, INPUT);

    expect(revalidateSpy).toHaveBeenCalledWith("/dashboard");
  });

  it("does NOT revalidate when the update failed", async () => {
    childResult = { data: null, error: null };

    const res = await updateChildAction(VALID, INPUT);

    expect(res.ok).toBe(false);
    expect(revalidateSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid input without updating", async () => {
    const res = await updateChildAction(VALID, {
      ...INPUT,
      name: "",
    });

    expect(res.ok).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("rejects a malformed child id", async () => {
    const res = await updateChildAction("nope", INPUT);

    expect(res.ok).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("reports when no row was updated (archived / not owned)", async () => {
    childResult = { data: null, error: null };

    const res = await updateChildAction(VALID, INPUT);

    expect(res.ok).toBe(false);
  });
});
