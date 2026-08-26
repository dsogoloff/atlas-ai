import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notifyFollowUpLead, type FollowUpLeadNotification } from "./notify";

const AT = new Date("2026-08-26T12:12:00.000Z");

const LEAD: FollowUpLeadNotification = {
  schoolName: "Maple Elementary",
  parentName: "Jordan Lee",
  parentEmail: "jordan@example.com",
  parentPhone: "555-0100",
  zip: "94110",
  submittedAt: AT,
};

/** Live mode with the Resend env present. NOTE: deliberately does NOT set
 *  LEAD_NOTIFY_TO_EMAIL — the recipient must resolve without it. */
function stubLiveEnv() {
  vi.stubEnv("LEAD_NOTIFY_LIVE", "true");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
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

function sentBody() {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

// ---------------------------------------------------------------------------
// THE REGRESSION THIS PR EXISTS FOR.
//
// getLeadNotifyToEmail() used to be required("LEAD_NOTIFY_TO_EMAIL"), which
// THREW when unset. The throw happened inside the notifier's own try/catch, so
// the lead silently notified nobody. The #211 staff alerts share the same
// RESEND_API_KEY, the same LEAD_NOTIFY_FROM_EMAIL and the same LEAD_NOTIFY_LIVE
// gate but resolve their recipient via a defaulted getter — so staff alerts
// could arrive while every lead alert died.
// ---------------------------------------------------------------------------
describe("recipient resolution — a missing env var must not lose a lead", () => {
  beforeEach(stubLiveEnv);

  it("STILL SENDS with LEAD_NOTIFY_TO_EMAIL unset, defaulting to the pilot inbox", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead(LEAD);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody().to).toBe("parents@samnewyork.com");
    // and it must NOT have dead-lettered
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("honours LEAD_NOTIFY_TO_EMAIL as an override when set", async () => {
    vi.stubEnv("LEAD_NOTIFY_TO_EMAIL", "qa-inbox@example.com");
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead(LEAD);
    expect(sentBody().to).toBe("qa-inbox@example.com");
  });

  it("falls back to the default when the override is whitespace only", async () => {
    vi.stubEnv("LEAD_NOTIFY_TO_EMAIL", "   ");
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead(LEAD);
    expect(sentBody().to).toBe("parents@samnewyork.com");
  });
});

describe("notifyFollowUpLead — gated off (default)", () => {
  it("does not send when LEAD_NOTIFY_LIVE is unset", async () => {
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send when the flag is the literal string 'false'", async () => {
    vi.stubEnv("LEAD_NOTIFY_LIVE", "false");
    await notifyFollowUpLead(LEAD);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Previously this path returned SILENTLY, which is how a lead could reach
  // nobody and leave no trace anywhere.
  it("DEAD-LETTERS rather than returning silently when gated off", async () => {
    await notifyFollowUpLead(LEAD);
    expect(errorSpy).toHaveBeenCalledWith(
      "[followUp] lead NOT notified",
      expect.objectContaining({ reason: expect.stringContaining("LEAD_NOTIFY_LIVE") }),
    );
  });

  it("does not require Resend env to be present when gated off", async () => {
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("notifyFollowUpLead — actionable on a phone", () => {
  beforeEach(stubLiveEnv);

  it("carries every field a director needs to act", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead(LEAD);

    const body = sentBody();
    expect(body.from).toBe("S.A.M New York <noreply@example.com>");
    for (const needed of [
      "Jordan Lee",            // parent name
      "555-0100",              // phone
      "jordan@example.com",    // email
      "94110",                 // zip
      "Maple Elementary",      // school
      "2026-08-26T12:12:00",   // timestamp
    ]) {
      expect(body.text).toContain(needed);
    }
  });

  it("names the parent in the subject so it reads on a lock screen", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead(LEAD);
    expect(sentBody().subject).toBe("Call this parent — Jordan Lee (94110)");
  });

  it("makes the phone and email TAPPABLE via tel: and mailto:", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead(LEAD);

    const body = sentBody();
    expect(body.html).toContain('href="tel:5550100"');
    expect(body.html).toContain('href="mailto:jordan@example.com"');
  });

  it("preserves a leading + on an international number in the tel: href", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead({ ...LEAD, parentPhone: "+1 (212) 555-0100" });
    expect(sentBody().html).toContain('href="tel:+12125550100"');
  });

  it("renders readable placeholders when phone and school are absent", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead({ ...LEAD, parentPhone: null, schoolName: null });

    const body = sentBody();
    expect(body.text).toContain("Phone:    (not provided)");
    expect(body.text).toContain("School:   (not provided)");
    expect(body.text).not.toContain("null");
    expect(body.html).not.toContain("tel:");
    // The subject must stay useful without a school.
    expect(body.subject).toBe("Call this parent — Jordan Lee (94110)");
  });
});

// ---------------------------------------------------------------------------
// COPPA — parent contact only. The allowlist is the typed interface; this is
// the runtime proof.
// ---------------------------------------------------------------------------
describe("COPPA payload discipline", () => {
  beforeEach(stubLiveEnv);

  it("leaks no child name, grade, level or result", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyFollowUpLead({
      ...LEAD,
      childName: "Aiden",
      childGrade: "3",
      overallLevel: "3B",
      score: 12,
      strandMastery: { number_operations: 0.8 },
    } as unknown as FollowUpLeadNotification);

    const serialized = fetchMock.mock.calls[0][1].body as string;
    for (const leak of ["Aiden", "childGrade", "3B", "strandMastery", "number_operations", "score"]) {
      expect(serialized).not.toContain(leak);
    }
  });
});

describe("notifyFollowUpLead — fail-soft (never blocks the lead)", () => {
  beforeEach(stubLiveEnv);

  it("dead-letters with the status when Resend returns a non-OK response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422 });
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "[followUp] lead NOT notified",
      expect.objectContaining({ status: 422 }),
    );
  });

  it("dead-letters when the fetch itself rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "[followUp] lead NOT notified",
      expect.objectContaining({ err: "network down" }),
    );
  });

  it("dead-letters instead of throwing when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(notifyFollowUpLead(LEAD)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
