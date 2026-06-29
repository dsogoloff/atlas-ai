// Set-new-password action.
//
// updateUser success -> sign the recovery session out (so the form's
// /login?reset=1 navigation reaches a clean, anonymous login that shows the
// "Password updated" banner) -> { ok: true }. updateUser error or a schema
// failure (mismatch / too short) -> { ok: false } with a message.

import { afterEach, describe, expect, it, vi } from "vitest";

const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { updateUser: mockUpdateUser, signOut: mockSignOut },
  }),
}));

import { resetPassword } from "./actions";

const VALID = "correct horse battery";

afterEach(() => {
  mockUpdateUser.mockReset();
  mockSignOut.mockClear();
});

describe("resetPassword — updateUser + sign-out", () => {
  it("updateUser success -> signs out and returns ok (enables /login?reset=1)", async () => {
    mockUpdateUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const res = await resetPassword({ password: VALID, confirmPassword: VALID });

    expect(res).toEqual({ ok: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: VALID });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("updateUser error -> ok:false, no sign-out", async () => {
    mockUpdateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "session missing" },
    });

    const res = await resetPassword({ password: VALID, confirmPassword: VALID });

    expect(res.ok).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("mismatched confirmation -> ok:false without calling updateUser", async () => {
    const res = await resetPassword({
      password: VALID,
      confirmPassword: "different value here",
    });

    expect(res.ok).toBe(false);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("too-short password -> ok:false without calling updateUser", async () => {
    const res = await resetPassword({ password: "short", confirmPassword: "short" });

    expect(res.ok).toBe(false);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
