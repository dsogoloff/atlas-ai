// Token-hash email-confirm route (/auth/confirm).
//
// verifyOtp success -> ALWAYS a clean /login?confirmed=1 (never /signup, no
// session assumption), with the confirmed email for prefill when available and
// the same-origin-guarded next carried for the post-login redirect. Any failure
// (bad/missing token, verifyOtp error) -> /signup?error=verify_failed. Mirrors
// /auth/callback's audit writes. No device-bound verifier cookie needed.

import { afterEach, describe, expect, it, vi } from "vitest";

const mockVerifyOtp = vi.fn();
const mockMaybeSingle = vi.fn();
const mockAuditInsert = vi.fn<
  (rows: Array<{ event_type: string }>) => Promise<{ error: null }>
>(async () => ({ error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: mockVerifyOtp } }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === "parents") {
        return { select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) };
      }
      if (table === "vpc_audit_log") {
        return { insert: mockAuditInsert };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => null }),
}));

import type { NextRequest } from "next/server";

import { GET } from "./route";

const ORIGIN = "https://app.samnewyork.com";

function req(query: string): NextRequest {
  return { url: `${ORIGIN}/auth/confirm${query}` } as unknown as NextRequest;
}

function location(res: Response): string {
  return res.headers.get("location") ?? "";
}

afterEach(() => {
  mockVerifyOtp.mockReset();
  mockMaybeSingle.mockReset();
  mockAuditInsert.mockClear();
});

describe("GET /auth/confirm — token-hash verification", () => {
  it("verifyOtp success -> clean /login?confirmed=1 (NOT /signup) and writes the audit trail", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({
      data: { id: "p1", tenant_id: "t1", home_center_id: "c1" },
    });

    const res = await GET(req("?token_hash=abc&type=email"));

    expect(mockVerifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
    const u = new URL(location(res));
    expect(u.origin + u.pathname).toBe(`${ORIGIN}/login`);
    expect(u.searchParams.get("confirmed")).toBe("1");
    expect(u.searchParams.get("next")).toBe("/coppa");
    expect(location(res)).not.toContain("/signup");
    // Both VPC audit rows written.
    const rows = mockAuditInsert.mock.calls[0][0];
    expect(rows.map((r) => r.event_type)).toEqual([
      "verification_clicked",
      "verification_succeeded",
    ]);
  });

  it("includes the confirmed email for prefill when verifyOtp returns one", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: "u1", email: "parent@example.com" } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: null });

    const u = new URL(location(await GET(req("?token_hash=abc&type=email"))));
    expect(u.searchParams.get("confirmed")).toBe("1");
    expect(u.searchParams.get("email")).toBe("parent@example.com");
  });

  it("omits email when verifyOtp returns none (does not fail on it)", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null });

    const u = new URL(location(await GET(req("?token_hash=abc&type=email"))));
    expect(u.searchParams.get("confirmed")).toBe("1");
    expect(u.searchParams.has("email")).toBe(false);
  });

  it("carries a same-origin next through to login for the post-login redirect", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null });

    const u = new URL(location(await GET(req("?token_hash=abc&type=email&next=/coppa/step-2"))));
    expect(u.pathname).toBe("/login");
    expect(u.searchParams.get("next")).toBe("/coppa/step-2");
  });

  it("rejects an off-origin next, falling back to /coppa (open-redirect guard)", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null });

    const res = await GET(req("?token_hash=abc&type=email&next=//evil.example.com"));

    const u = new URL(location(res));
    expect(u.origin).toBe(ORIGIN);
    expect(u.pathname).toBe("/login");
    expect(u.searchParams.get("next")).toBe("/coppa");
    expect(location(res)).not.toContain("evil.example.com");
  });

  it("verifyOtp failure -> /signup?error=verify_failed", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });

    const res = await GET(req("?token_hash=bad&type=email"));

    expect(location(res)).toBe(`${ORIGIN}/signup?error=verify_failed`);
    expect(mockAuditInsert).not.toHaveBeenCalled();
  });

  it("missing token_hash -> /signup?error=verify_failed without calling verifyOtp", async () => {
    const res = await GET(req("?type=email"));

    expect(location(res)).toBe(`${ORIGIN}/signup?error=verify_failed`);
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("invalid type -> /signup?error=verify_failed", async () => {
    const res = await GET(req("?token_hash=abc&type=not_a_type"));

    expect(location(res)).toBe(`${ORIGIN}/signup?error=verify_failed`);
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
