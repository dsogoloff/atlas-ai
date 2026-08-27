import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  syncHubSpotAssessmentMilestone,
  syncHubSpotContact,
  type AccountCreatedContact,
  type AssessmentMilestoneUpdate,
} from "./syncContact";

const TOKEN = "hs_test_token";
const ACCOUNT_ID = "9ab7b522-2104-4161-8995-f6dfef49e677";
const CONTACT_ID = "540873800434";
const STARTED_AT = "2026-08-25T20:07:11.000Z";
const COMPLETED_AT = "2026-08-26T12:07:41.000Z";

const STARTED: AssessmentMilestoneUpdate = {
  accountId: ACCOUNT_ID,
  milestone: "started",
  occurredAt: STARTED_AT,
};
const COMPLETED: AssessmentMilestoneUpdate = {
  accountId: ACCOUNT_ID,
  milestone: "completed",
  occurredAt: COMPLETED_AT,
};

const ACCOUNT: AccountCreatedContact = {
  email: "jordan@example.com",
  fullName: "Jordan Lee",
  accountId: ACCOUNT_ID,
  createdAt: "2026-08-21T12:00:00.000Z",
};

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function res(status: number, body: unknown, ok = status < 300) {
  return { ok, status, json: async () => body };
}
const searchHit = () => res(200, { total: 1, results: [{ id: CONTACT_ID }] });
const searchEmpty = () => res(200, { total: 0, results: [] });

function callBody(i: number): { properties: Record<string, unknown> } {
  return JSON.parse(fetchMock.mock.calls[i][1].body);
}

beforeEach(() => {
  vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", "");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

describe("assessment milestone — env gate", () => {
  it("makes no request at all when the token is unset", async () => {
    await expect(syncHubSpotAssessmentMilestone(STARTED)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// NO CONSENT, NO RECORD. The load-bearing guarantee of this change: the
// contact is created ONLY on first email confirmation, so "a contact carrying
// this atlas_account_id exists" IS the proof of a consented parent account.
// This path has no create branch at all.
// ---------------------------------------------------------------------------
describe("assessment milestone — never creates a contact", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN));

  it("writes NOTHING when atlas_account_id matches no contact", async () => {
    fetchMock.mockResolvedValueOnce(searchEmpty());

    await syncHubSpotAssessmentMilestone(STARTED);

    // Exactly one call — the search — and no create/PATCH of any kind.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/crm/v3/objects/contacts/search",
    );
    const writes = fetchMock.mock.calls.filter(([u, i]) => {
      const url = String(u);
      return (
        i.method === "PATCH" ||
        (i.method === "POST" && url.endsWith("/crm/v3/objects/contacts"))
      );
    });
    expect(writes).toHaveLength(0);
    expect(errorSpy.mock.calls[0][0]).toContain("[hubspot]");
  });

  it("does not write when atlas_account_id is ambiguous", async () => {
    fetchMock.mockResolvedValueOnce(
      res(200, { total: 2, results: [{ id: "1" }, { id: "2" }] }),
    );
    await syncHubSpotAssessmentMilestone(COMPLETED);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("[hubspot]");
  });

  it("matches on atlas_account_id, never on email", async () => {
    fetchMock.mockResolvedValueOnce(searchHit());
    fetchMock.mockResolvedValueOnce(res(200, {}));

    await syncHubSpotAssessmentMilestone(STARTED);

    const search = callBody(0) as unknown as {
      filterGroups: Array<{ filters: Array<Record<string, string>> }>;
    };
    expect(search.filterGroups[0].filters[0]).toMatchObject({
      propertyName: "atlas_account_id",
      operator: "EQ",
      value: ACCOUNT_ID,
    });
    expect(JSON.stringify(search)).not.toContain("email");
  });
});

describe("assessment milestone — timestamps only", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN));

  async function propsFor(update: AssessmentMilestoneUpdate) {
    fetchMock.mockResolvedValueOnce(searchHit());
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await syncHubSpotAssessmentMilestone(update);
    return callBody(1).properties;
  }

  it("writes ONLY assessment_started_date, as epoch millis", async () => {
    const p = await propsFor(STARTED);
    expect(Object.keys(p)).toEqual(["assessment_started_date"]);
    expect(p.assessment_started_date).toBe(Date.parse(STARTED_AT));
    expect(typeof p.assessment_started_date).toBe("number");
  });

  it("writes ONLY assessment_completed_date, as epoch millis", async () => {
    const p = await propsFor(COMPLETED);
    expect(Object.keys(p)).toEqual(["assessment_completed_date"]);
    expect(p.assessment_completed_date).toBe(Date.parse(COMPLETED_AT));
  });

  it("PATCHes the matched contact id", async () => {
    fetchMock.mockResolvedValueOnce(searchHit());
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await syncHubSpotAssessmentMilestone(STARTED);
    const [url, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe("PATCH");
    expect(String(url)).toContain(`/crm/v3/objects/contacts/${CONTACT_ID}`);
  });

  // D-0055 stands. D-0061 permits the two timestamps and nothing else.
  it("cannot carry a level, band, score or child field even if handed one", async () => {
    fetchMock.mockResolvedValueOnce(searchHit());
    fetchMock.mockResolvedValueOnce(res(200, {}));

    await syncHubSpotAssessmentMilestone({
      ...COMPLETED,
      overallLevel: "3A",
      placementBand: "3A",
      score: 12,
      strandMastery: { number_sense: 0.4 },
      childName: "Yara",
      childGrade: "3",
    } as unknown as AssessmentMilestoneUpdate);

    const serialized = fetchMock.mock.calls[1][1].body as string;
    for (const leak of [
      "3A",
      "overallLevel",
      "placementBand",
      "score",
      "strandMastery",
      "number_sense",
      "Yara",
      "childGrade",
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });
});

describe("assessment milestone — fail-soft, [hubspot]-prefixed on every path", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN));

  it("logs and returns when the search fails", async () => {
    fetchMock.mockResolvedValueOnce(res(403, {}, false));
    await expect(syncHubSpotAssessmentMilestone(STARTED)).resolves.toBeUndefined();
    expect(errorSpy.mock.calls[0][0]).toContain("[hubspot]");
  });

  it("logs and returns when the search body is malformed", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    });
    await expect(syncHubSpotAssessmentMilestone(STARTED)).resolves.toBeUndefined();
    expect(errorSpy.mock.calls[0][0]).toContain("[hubspot]");
  });

  it("logs and returns when the PATCH fails", async () => {
    fetchMock.mockResolvedValueOnce(searchHit());
    fetchMock.mockResolvedValueOnce(res(400, {}, false));
    await expect(syncHubSpotAssessmentMilestone(COMPLETED)).resolves.toBeUndefined();
    expect(errorSpy.mock.calls[0][0]).toContain("[hubspot]");
  });

  it("never rejects when the transport throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(syncHubSpotAssessmentMilestone(STARTED)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// splitName — the leading-space defect that is live on a real contact today
// (HubSpot lastname reads " Kasovitz"). parents.name is built as
// `${first} ${last}`.trim(), which strips only the ENDS, so a trailing space
// typed into the first-name box survives as an interior double space.
// ---------------------------------------------------------------------------
describe("name split — interior whitespace", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN));

  async function namesFor(fullName: string) {
    fetchMock.mockResolvedValueOnce(res(201, {}));
    await syncHubSpotContact({ ...ACCOUNT, fullName });
    const p = callBody(0).properties;
    return { firstname: p.firstname, lastname: p.lastname };
  }

  it("leaves no leading space on lastname for a DOUBLE-spaced name", async () => {
    expect(await namesFor("Yara  Kasovitz")).toEqual({
      firstname: "Yara",
      lastname: "Kasovitz",
    });
  });

  it("handles leading and trailing whitespace", async () => {
    expect(await namesFor("  Jordan Lee  ")).toEqual({
      firstname: "Jordan",
      lastname: "Lee",
    });
  });

  it("splits on the first whitespace RUN, keeping the rest of a compound surname", async () => {
    expect(await namesFor("Ana\t Maria Silva")).toEqual({
      firstname: "Ana",
      lastname: "Maria Silva",
    });
  });

  it("keeps a single-token name with an empty lastname", async () => {
    expect(await namesFor("Prince")).toEqual({
      firstname: "Prince",
      lastname: "",
    });
  });
});
