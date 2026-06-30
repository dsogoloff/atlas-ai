// updateChildAction — parent edits a child's name / grade / birth year.

import { afterEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "u1" } as { id: string } | null },
  error: null,
}));
const updateSpy = vi.fn();

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
