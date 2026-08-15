// Token-hash password-recovery route (/auth/reset).
//
// verifyOtp({type:'recovery'}) success -> /reset-password (recovery session set
// in cookies), carrying the same-origin-guarded next. Any failure (bad/missing
// token, wrong type, verifyOtp error) -> /forgot-password?error=reset_failed.
// No vpc_audit_log write (password reset is not a VPC consent event).

import { afterEach, describe, expect, it, vi } from "vitest";

// ATLAS-004: the route consumes an auth-attempt quota before verifying the
// token. Allowed here; the limiter has its own coverage.
vi.mock("@/lib/quota/authLimits", () => ({
  consumeAuthAttempt: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const mockVerifyOtp = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: mockVerifyOtp } }),
}));

import type { NextRequest } from "next/server";

import { GET } from "./route";

const ORIGIN = "https://app.samnewyork.com";

function req(query: string): NextRequest {
  return { url: `${ORIGIN}/auth/reset${query}` } as unknown as NextRequest;
}

function location(res: Response): string {
  return res.headers.get("location") ?? "";
}

afterEach(() => {
  mockVerifyOtp.mockReset();
});

describe("GET /auth/reset — token-hash password recovery", () => {
  it("verifyOtp success -> /reset-password (NOT /forgot-password)", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const res = await GET(req("?token_hash=abc&type=recovery"));

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "abc",
    });
    const u = new URL(location(res));
    expect(u.origin + u.pathname).toBe(`${ORIGIN}/reset-password`);
    expect(u.searchParams.get("next")).toBe("/login");
    expect(location(res)).not.toContain("/forgot-password");
  });

  it("carries a same-origin next through to the reset page", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const u = new URL(
      location(await GET(req("?token_hash=abc&type=recovery&next=/dashboard"))),
    );
    expect(u.pathname).toBe("/reset-password");
    expect(u.searchParams.get("next")).toBe("/dashboard");
  });

  it("rejects an off-origin next, falling back to /login (open-redirect guard)", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const res = await GET(
      req("?token_hash=abc&type=recovery&next=//evil.example.com"),
    );

    const u = new URL(location(res));
    expect(u.origin).toBe(ORIGIN);
    expect(u.pathname).toBe("/reset-password");
    expect(u.searchParams.get("next")).toBe("/login");
    expect(location(res)).not.toContain("evil.example.com");
  });

  it("verifyOtp failure -> /forgot-password?error=reset_failed", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: "expired" },
    });

    const res = await GET(req("?token_hash=bad&type=recovery"));

    expect(location(res)).toBe(`${ORIGIN}/forgot-password?error=reset_failed`);
  });

  it("missing token_hash -> reset_failed without calling verifyOtp", async () => {
    const res = await GET(req("?type=recovery"));

    expect(location(res)).toBe(`${ORIGIN}/forgot-password?error=reset_failed`);
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("non-recovery type -> reset_failed without calling verifyOtp", async () => {
    const res = await GET(req("?token_hash=abc&type=email"));

    expect(location(res)).toBe(`${ORIGIN}/forgot-password?error=reset_failed`);
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
