import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  notifyAccountCreated,
  notifyAssessmentCompleted,
  type AccountCreatedAlert,
  type AssessmentCompletedAlert,
} from "./notify";

const ACCOUNT: AccountCreatedAlert = {
  parentName: "Jordan Lee",
  parentEmail: "jordan@example.com",
  adminUrl: "https://app.samnewyork.com/admin",
};

const COMPLETED: AssessmentCompletedAlert = {
  parentName: "Jordan Lee",
  childGrade: "3",
  studentUrl: "https://app.samnewyork.com/instructor/student/child-1",
};

/** Live mode with the shared lead-notify Resend env present. */
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
  vi.stubEnv("LEAD_NOTIFY_FROM_EMAIL", "");
  vi.stubEnv("STAFF_ALERT_TO", "");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

function sentBody(): {
  from: string;
  to: string;
  subject: string;
  text: string;
} {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

describe("staff alerts — gated off (default)", () => {
  it("no-ops without sending when LEAD_NOTIFY_LIVE is unset", async () => {
    await expect(notifyAccountCreated(ACCOUNT)).resolves.toBeUndefined();
    await expect(notifyAssessmentCompleted(COMPLETED)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no-ops when the flag is the literal string 'false'", async () => {
    vi.stubEnv("LEAD_NOTIFY_LIVE", "false");
    await notifyAccountCreated(ACCOUNT);
    await notifyAssessmentCompleted(COMPLETED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not require Resend env to be present when gated off", async () => {
    // No RESEND_API_KEY / FROM address — must not throw on the missing-env
    // getters, since those getters throw by design.
    await expect(notifyAccountCreated(ACCOUNT)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("recipient — code default + STAFF_ALERT_TO override", () => {
  beforeEach(stubLiveEnv);

  it("defaults to the pilot center inbox with NO env var set", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyAccountCreated(ACCOUNT);
    expect(sentBody().to).toBe("parents@samnewyork.com");
  });

  it("honours STAFF_ALERT_TO when set", async () => {
    vi.stubEnv("STAFF_ALERT_TO", "qa-inbox@example.com");
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyAssessmentCompleted(COMPLETED);
    expect(sentBody().to).toBe("qa-inbox@example.com");
  });

  it("falls back to the default when STAFF_ALERT_TO is whitespace only", async () => {
    vi.stubEnv("STAFF_ALERT_TO", "   ");
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyAccountCreated(ACCOUNT);
    expect(sentBody().to).toBe("parents@samnewyork.com");
  });
});

describe("notifyAccountCreated — live", () => {
  beforeEach(stubLiveEnv);

  it("posts to Resend with the shared bearer key and branded sender", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyAccountCreated(ACCOUNT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    // Sender display name is tenant-resolved (src/lib/branding), same rule as
    // the lead notifier: the bare env address is wrapped, not replaced.
    expect(sentBody().from).toBe("S.A.M New York <noreply@example.com>");
  });

  it("uses the agreed subject and carries parent contact + admin link only", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyAccountCreated(ACCOUNT);

    const body = sentBody();
    expect(body.subject).toBe("New S.A.M assessment account: Jordan Lee");
    expect(body.text).toContain("Jordan Lee");
    expect(body.text).toContain("jordan@example.com");
    expect(body.text).toContain("https://app.samnewyork.com/admin");
  });
});

describe("notifyAssessmentCompleted — live", () => {
  beforeEach(stubLiveEnv);

  it("uses the agreed subject with the child's grade", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyAssessmentCompleted(COMPLETED);

    const body = sentBody();
    expect(body.subject).toBe("S.A.M assessment completed: Jordan Lee (grade 3)");
    expect(body.text).toContain("Child grade: 3");
    expect(body.text).toContain(
      "https://app.samnewyork.com/instructor/student/child-1",
    );
  });

  it("renders a readable subject when the child's grade was never captured", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyAssessmentCompleted({ ...COMPLETED, childGrade: null });

    const body = sentBody();
    expect(body.subject).toBe(
      "S.A.M assessment completed: Jordan Lee (grade not provided)",
    );
    expect(body.subject).not.toContain("null");
    expect(body.text).not.toContain("null");
  });
});

// ---------------------------------------------------------------------------
// COPPA — the payload is an allowlist, and this is the test that enforces it.
// ---------------------------------------------------------------------------
describe("COPPA payload discipline", () => {
  beforeEach(stubLiveEnv);

  it("the completion alert leaks no result, no child name and no DOB", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    // Deliberately pass extra properties the way a careless caller would if it
    // spread a whole session/child object in. TypeScript rejects this at the
    // call site (excess-property check); the cast proves the RUNTIME body is
    // built from the allowlist, not from the object handed in.
    await notifyAssessmentCompleted({
      ...COMPLETED,
      childName: "Aiden",
      birthYear: 2016,
      overallLevel: "3B",
      score: 12,
      strandMastery: { number_operations: 0.8 },
      misconceptions: ["MC-014"],
      narrative: "Aiden is doing well with…",
    } as unknown as AssessmentCompletedAlert);

    const serialized = fetchMock.mock.calls[0][1].body as string;
    for (const leak of [
      "Aiden",
      "2016",
      "3B",
      "strandMastery",
      "number_operations",
      "MC-014",
      "narrative",
      "score",
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });

  it("the account alert carries no child fields at all", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await notifyAccountCreated({
      ...ACCOUNT,
      childName: "Aiden",
      childGrade: "3",
    } as unknown as AccountCreatedAlert);

    const serialized = fetchMock.mock.calls[0][1].body as string;
    expect(serialized).not.toContain("Aiden");
    expect(serialized).not.toContain("childGrade");
  });
});

describe("fail-soft — never blocks confirm or finalization", () => {
  beforeEach(stubLiveEnv);

  it("does not throw when Resend returns a non-OK response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422 });
    await expect(notifyAccountCreated(ACCOUNT)).resolves.toBeUndefined();
    await expect(notifyAssessmentCompleted(COMPLETED)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not throw when the fetch itself rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(notifyAccountCreated(ACCOUNT)).resolves.toBeUndefined();
    await expect(notifyAssessmentCompleted(COMPLETED)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not throw when the live gate is on but RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(notifyAccountCreated(ACCOUNT)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
