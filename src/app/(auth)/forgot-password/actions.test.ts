// Forgot-password action — anti-enumeration.
//
// requestPasswordReset must ALWAYS return the same neutral { ok: true },
// regardless of whether the email maps to an account or the send succeeds,
// fails, or throws. Otherwise an attacker could distinguish registered from
// unregistered emails.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockResetForEmail = vi.fn();

vi.mock("@/lib/supabase/tokenHashClient", () => ({
  createTokenHashClient: () => ({
    auth: { resetPasswordForEmail: mockResetForEmail },
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => "https://app.samnewyork.com" }),
}));

import { requestPasswordReset } from "./actions";

// ATLAS-011: the recovery link's origin now comes from APP_PUBLIC_ORIGIN, not
// from request headers. The expected URL below is unchanged — only its SOURCE
// moved, which is the whole point of the finding.
beforeEach(() => {
  vi.stubEnv("APP_PUBLIC_ORIGIN", "https://app.samnewyork.com");
});

afterEach(() => {
  mockResetForEmail.mockReset();
  vi.unstubAllEnvs();
});

describe("requestPasswordReset — neutral, anti-enumeration", () => {
  it("returns ok and points the recovery redirect at /auth/reset when the send succeeds", async () => {
    mockResetForEmail.mockResolvedValue({ data: {}, error: null });

    const res = await requestPasswordReset({ email: "real@example.com" });

    expect(res).toEqual({ ok: true });
    expect(mockResetForEmail).toHaveBeenCalledWith("real@example.com", {
      redirectTo: "https://app.samnewyork.com/auth/reset?next=/login",
    });
  });

  it("returns the SAME neutral ok when Supabase returns an error (no enumeration)", async () => {
    mockResetForEmail.mockResolvedValue({
      data: {},
      error: { message: "user not found" },
    });

    const res = await requestPasswordReset({ email: "missing@example.com" });

    expect(res).toEqual({ ok: true });
  });

  it("returns the SAME neutral ok when the send throws", async () => {
    mockResetForEmail.mockRejectedValue(new Error("network"));

    const res = await requestPasswordReset({ email: "boom@example.com" });

    expect(res).toEqual({ ok: true });
  });

  it("returns neutral ok on a malformed email without attempting a send", async () => {
    const res = await requestPasswordReset({ email: "not-an-email" });

    expect(res).toEqual({ ok: true });
    expect(mockResetForEmail).not.toHaveBeenCalled();
  });
});
