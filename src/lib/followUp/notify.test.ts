import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notifyFollowUpLead, type FollowUpLeadNotification } from "./notify";

const LEAD: FollowUpLeadNotification = {
  schoolName: "Maple Elementary",
  parentName: "Jordan Lee",
  parentEmail: "jordan@example.com",
  parentPhone: "555-0100",
  zip: "94110",
};

/** Put the notifier in live mode with all required Resend env present. */
function stubLiveEnv() {
  vi.stubEnv("LEAD_NOTIFY_LIVE", "true");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("LEAD_NOTIFY_TO_EMAIL", "center@example.com");
  vi.stubEnv("LEAD_NOTIFY_FROM_EMAIL", "noreply@example.com");
}

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Explicit empties so a host-set value (e.g. from .env.local) can't flip the
  // gate on during the default-off cases.
  vi.stubEnv("LEAD_NOTIFY_LIVE", "");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("LEAD_NOTIFY_TO_EMAIL", "");
  vi.stubEnv("LEAD_NOTIFY_FROM_EMAIL", "");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

describe("notifyFollowUpLead — gated off (default)", () => {
  it("no-ops without sending when LEAD_NOTIFY_LIVE is unset", async () => {
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no-ops when the flag is the literal string 'false'", async () => {
    vi.stubEnv("LEAD_NOTIFY_LIVE", "false");
    await notifyFollowUpLead(LEAD);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not require Resend env to be present when gated off", async () => {
    // No RESEND_API_KEY etc. — must not throw on the missing-env getters.
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("notifyFollowUpLead — live", () => {
  beforeEach(stubLiveEnv);

  it("posts to the Resend API with the bearer key and lead contact body", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead(LEAD);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");

    const body = JSON.parse(init.body);
    expect(body.from).toBe("noreply@example.com");
    expect(body.to).toBe("center@example.com");
    expect(body.text).toContain("jordan@example.com");
    expect(body.text).toContain("Maple Elementary");
    expect(body.text).toContain("94110");
    // Subject carries the school when present.
    expect(body.subject).toBe("New assessment lead — Maple Elementary");
    // Lead/contact data only — never a diagnostic result.
    expect(body.text).toContain("no assessment result is included");
  });

  it("subject falls back to the zip when the school is null (no '— null' tail)", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead({ ...LEAD, schoolName: null });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.subject).toBe("New assessment lead — 94110");
    expect(body.subject).not.toContain("null");
  });
});

describe("notifyFollowUpLead — fail-soft (never blocks the lead)", () => {
  beforeEach(stubLiveEnv);

  it("does not throw when Resend returns a non-OK response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422 });
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not throw when the fetch itself rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
