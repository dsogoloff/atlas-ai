// Token-hash email-confirm route (/auth/confirm).
//
// verifyOtp success -> ALWAYS a clean /login?confirmed=1 (never /signup, no
// session assumption), with the confirmed email for prefill when available and
// the same-origin-guarded next carried for the post-login redirect. Any failure
// (bad/missing token, verifyOtp error) -> /signup?error=verify_failed. Mirrors
// /auth/callback's audit writes. No device-bound verifier cookie needed.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockVerifyOtp = vi.fn();
const mockMaybeSingle = vi.fn();
const mockAuditInsert = vi.fn<
  (rows: Array<{ event_type: string }>) => Promise<{ error: null }>
>(async () => ({ error: null }));
/** Prior verification_succeeded rows for this parent (the once-per-account
 *  guard). Default: none — i.e. this IS the first confirmation. */
const mockPriorConfirms = vi.fn<() => Promise<{ data: Array<{ id: string }> }>>(
  async () => ({ data: [] }),
);
const mockNotifyAccountCreated = vi.fn(async () => undefined);
const mockSyncHubSpotContact = vi.fn(async () => undefined);

vi.mock("@/lib/staffAlerts/notify", () => ({
  notifyAccountCreated: (...args: unknown[]) =>
    mockNotifyAccountCreated(...(args as [])),
}));

vi.mock("@/lib/hubspot/syncContact", () => ({
  syncHubSpotContact: (...args: unknown[]) =>
    mockSyncHubSpotContact(...(args as [])),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: mockVerifyOtp } }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === "parents") {
        return { select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) };
      }
      if (table === "vpc_audit_log") {
        return {
          insert: mockAuditInsert,
          select: () => ({
            eq: () => ({ eq: () => ({ limit: mockPriorConfirms }) }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => null }),
}));

// Run the fire-and-forget staff alert synchronously so each test can assert on
// it; outside a request context the real `after` would throw.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (cb: () => unknown) => {
    Promise.resolve(cb()).catch(() => undefined);
  },
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

// ATLAS-011: the admin link in the staff alert is built from APP_PUBLIC_ORIGIN,
// not from request.url (which derives from the Host header). Set deliberately
// DIFFERENT from the request origin in one test below to prove the link follows
// config rather than the request.
beforeEach(() => {
  vi.stubEnv("APP_PUBLIC_ORIGIN", ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
  mockVerifyOtp.mockReset();
  mockMaybeSingle.mockReset();
  mockAuditInsert.mockClear();
  mockNotifyAccountCreated.mockClear();
  mockSyncHubSpotContact.mockClear();
  mockPriorConfirms.mockReset();
  mockPriorConfirms.mockResolvedValue({ data: [] });
});

describe("GET /auth/confirm — token-hash verification", () => {
  it("verifyOtp success -> clean /login?confirmed=1 (NOT /signup) and writes the audit trail", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "p1",
        tenant_id: "t1",
        home_center_id: "c1",
        name: "Jordan Lee",
        email: "jordan@example.com",
      },
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

  // Regression coverage for the 2026-08-21 outage: this failure branch used
  // to be completely silent, which is why root-causing the real pkce_-token
  // defect required a live production log dig instead of a log grep. The
  // real cause/status distinction (e.g. Supabase's 'otp_expired' for a
  // genuinely expired/used token vs. anything else for a structurally
  // rejected one) must reach the logs, not just "verify_failed".
  it("verifyOtp failure logs the real code/status/message, not just the redirect", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockVerifyOtp.mockResolvedValue({
      data: { user: null },
      error: { code: "otp_expired", status: 403, message: "Token has expired or is invalid" },
    });

    await GET(req("?token_hash=bad&type=email"));

    expect(errSpy).toHaveBeenCalledWith(
      "[auth] confirm verifyOtp failed",
      expect.objectContaining({
        code: "otp_expired",
        status: 403,
        message: "Token has expired or is invalid",
      }),
    );
    errSpy.mockRestore();
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

// ---------------------------------------------------------------------------
// Staff "account created" alert. Confirmation — not raw signup — is the
// account-created moment.
// ---------------------------------------------------------------------------
describe("GET /auth/confirm — staff account-created alert", () => {
  const PARENT = {
    id: "p1",
    tenant_id: "t1",
    home_center_id: "c1",
    name: "Jordan Lee",
    email: "jordan@example.com",
    attribution: { utm_source: "facebook" },
    created_at: "2026-08-20T10:00:00.000Z",
  };

  function confirmedParent() {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: PARENT });
  }

  it("fires once on the FIRST confirmation, with the allowlisted payload only", async () => {
    confirmedParent();

    await GET(req("?token_hash=abc&type=email"));

    expect(mockNotifyAccountCreated).toHaveBeenCalledTimes(1);
    expect(mockNotifyAccountCreated).toHaveBeenCalledWith({
      parentName: "Jordan Lee",
      parentEmail: "jordan@example.com",
      adminUrl: `${ORIGIN}/admin`,
    });
  });

  it("does NOT fire again when the account was already confirmed once", async () => {
    confirmedParent();
    // A prior verification_succeeded row exists — a re-sent confirmation link
    // must not re-announce the same account.
    mockPriorConfirms.mockResolvedValue({ data: [{ id: "audit-1" }] });

    await GET(req("?token_hash=abc&type=email"));

    expect(mockNotifyAccountCreated).not.toHaveBeenCalled();
    // The audit trail is still written — only the alert is suppressed.
    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
  });

  it("the admin link follows APP_PUBLIC_ORIGIN, not the request's host (ATLAS-011)", async () => {
    // The request arrives on a spoofed host; the emailed admin link must still
    // point at the canonical origin. Otherwise a forged Host puts an
    // attacker-controlled "admin" link into an email we send to staff.
    confirmedParent();
    vi.stubEnv("APP_PUBLIC_ORIGIN", ORIGIN);

    const spoofed = {
      url: "https://evil.example/auth/confirm?token_hash=abc&type=email",
    } as unknown as NextRequest;

    await GET(spoofed);

    expect(mockNotifyAccountCreated).toHaveBeenCalledWith(
      expect.objectContaining({ adminUrl: `${ORIGIN}/admin` }),
    );
    expect(mockNotifyAccountCreated).not.toHaveBeenCalledWith(
      expect.objectContaining({
        adminUrl: expect.stringContaining("evil.example"),
      }),
    );
  });

  it("does not fire when verification fails", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: "expired" },
    });

    await GET(req("?token_hash=bad&type=email"));

    expect(mockNotifyAccountCreated).not.toHaveBeenCalled();
  });

  it("does not fire when no parent row exists for the confirmed user", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null });

    await GET(req("?token_hash=abc&type=email"));

    expect(mockNotifyAccountCreated).not.toHaveBeenCalled();
  });

  it("still redirects the parent to /login?confirmed=1 when the alert rejects", async () => {
    confirmedParent();
    mockNotifyAccountCreated.mockRejectedValueOnce(new Error("resend down"));

    const u = new URL(location(await GET(req("?token_hash=abc&type=email"))));
    expect(u.pathname).toBe("/login");
    expect(u.searchParams.get("confirmed")).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// HubSpot Contract A sync — SEPARATE, INDEPENDENT after() call alongside the
// staff alert. Neither must be able to suppress the other.
// ---------------------------------------------------------------------------
describe("GET /auth/confirm — HubSpot Contract A sync", () => {
  const PARENT = {
    id: "p1",
    tenant_id: "t1",
    home_center_id: "c1",
    name: "Jordan Lee",
    email: "jordan@example.com",
    attribution: { utm_source: "facebook" },
    created_at: "2026-08-20T10:00:00.000Z",
  };

  function confirmedParent() {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: PARENT });
  }

  it("fires once on the FIRST confirmation, in the same branch as the staff alert", async () => {
    confirmedParent();

    await GET(req("?token_hash=abc&type=email"));

    expect(mockSyncHubSpotContact).toHaveBeenCalledTimes(1);
    expect(mockNotifyAccountCreated).toHaveBeenCalledTimes(1);
    expect(mockSyncHubSpotContact).toHaveBeenCalledWith({
      email: "jordan@example.com",
      fullName: "Jordan Lee",
      accountId: "p1",
      createdAt: "2026-08-20T10:00:00.000Z",
      attribution: { utm_source: "facebook" },
    });
  });

  it("does NOT fire on a repeat/non-first confirmation", async () => {
    confirmedParent();
    mockPriorConfirms.mockResolvedValue({ data: [{ id: "audit-1" }] });

    await GET(req("?token_hash=abc&type=email"));

    expect(mockSyncHubSpotContact).not.toHaveBeenCalled();
    expect(mockNotifyAccountCreated).not.toHaveBeenCalled();
  });

  it("a rejection from the HubSpot call does not block the staff alert or the redirect", async () => {
    confirmedParent();
    mockSyncHubSpotContact.mockRejectedValueOnce(new Error("hubspot down"));

    const u = new URL(location(await GET(req("?token_hash=abc&type=email"))));

    expect(u.pathname).toBe("/login");
    expect(u.searchParams.get("confirmed")).toBe("1");
    expect(mockNotifyAccountCreated).toHaveBeenCalledTimes(1);
  });

  it("a rejection from the staff alert does not block the HubSpot sync", async () => {
    confirmedParent();
    mockNotifyAccountCreated.mockRejectedValueOnce(new Error("resend down"));

    await GET(req("?token_hash=abc&type=email"));

    expect(mockSyncHubSpotContact).toHaveBeenCalledTimes(1);
  });

  it("does not fire when no parent row exists for the confirmed user", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null });

    await GET(req("?token_hash=abc&type=email"));

    expect(mockSyncHubSpotContact).not.toHaveBeenCalled();
  });
});
