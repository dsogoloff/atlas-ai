import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { syncHubSpotContact, type AccountCreatedContact } from "./syncContact";

const TOKEN = "hs_test_token";

const CONTACT: AccountCreatedContact = {
  email: "Jordan@Example.com",
  fullName: "Jordan Lee",
  accountId: "acct-1",
  createdAt: "2026-08-21T12:00:00.000Z",
  attribution: {
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_campaign: "sam_ny_fall",
    utm_content: "ad-1",
    utm_term: "math tutoring",
    first_seen: "2026-08-01T00:00:00.000Z",
  },
};

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function jsonResponse(status: number, body: unknown, ok = status < 300) {
  return { ok, status, json: async () => body };
}

function bodyOf(callIndex: number): { properties: Record<string, unknown> } {
  return JSON.parse(fetchMock.mock.calls[callIndex][1].body);
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
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// (a) no-op when unset/blank
// ---------------------------------------------------------------------------
describe("gated off (default)", () => {
  it("no-ops with no fetch when the token is unset", async () => {
    await expect(syncHubSpotContact(CONTACT)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no-ops with no fetch when the token is whitespace only", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", "   ");
    await expect(syncHubSpotContact(CONTACT)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (b)(c)(d) — fresh POST field contract
// ---------------------------------------------------------------------------
describe("fresh create (201) — field contract", () => {
  beforeEach(() => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
  });

  it("POSTs to the contacts endpoint with the bearer token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact(CONTACT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/contacts");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("sends EXACTLY the allowlisted keys and none of the look-alike/child fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact(CONTACT);

    const { properties } = bodyOf(0);
    expect(Object.keys(properties).sort()).toEqual(
      [
        "atlas_account_created_date",
        "atlas_account_id",
        "contact_category",
        "email",
        "firstname",
        "lastname",
        "lifecyclestage",
        "sam_source",
        "utm_campaign",
        "utm_content",
        "utm_medium",
        "utm_source",
        "utm_term",
      ].sort(),
    );

    const serialized = fetchMock.mock.calls[0][1].body as string;
    for (const forbidden of [
      "advocate_utm_content",
      "referral_source",
      "signup_source",
      "phone",
      "child_1_grade",
      "first_seen",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("lowercases the email (dedup key)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact(CONTACT);
    expect(bodyOf(0).properties.email).toBe("jordan@example.com");
  });

  it("sends contact_category as the internal enum value, never a display label", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact(CONTACT);
    expect(bodyOf(0).properties.contact_category).toBe("prospect_parent");
  });

  it("sends atlas_account_created_date as epoch MILLISECONDS, a number, not an ISO string", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact(CONTACT);

    const value = bodyOf(0).properties.atlas_account_created_date;
    expect(typeof value).toBe("number");
    expect(value).toBe(new Date(CONTACT.createdAt).getTime());
  });

  it("sends sam_source and lifecyclestage literals on create", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact(CONTACT);

    const { properties } = bodyOf(0);
    expect(properties.sam_source).toBe("atlas_assessment");
    expect(properties.lifecyclestage).toBe("lead");
  });

  it("does nothing further once the POST returns 201", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact(CONTACT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (g) name splitting
// ---------------------------------------------------------------------------
describe("name splitting", () => {
  beforeEach(() => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
  });

  it("single-word full name -> empty lastname", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact({ ...CONTACT, fullName: "Madonna" });

    const { properties } = bodyOf(0);
    expect(properties.firstname).toBe("Madonna");
    expect(properties.lastname).toBe("");
  });

  it("multi-word full name -> first token vs. remainder", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact({ ...CONTACT, fullName: "Jordan van der Berg" });

    const { properties } = bodyOf(0);
    expect(properties.firstname).toBe("Jordan");
    expect(properties.lastname).toBe("van der Berg");
  });
});

// ---------------------------------------------------------------------------
// (h) attribution absent
// ---------------------------------------------------------------------------
describe("attribution absent", () => {
  beforeEach(() => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
  });

  it("omits all five utm_* keys (never sent as empty strings) and still succeeds", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await expect(
      syncHubSpotContact({ ...CONTACT, attribution: undefined }),
    ).resolves.toBeUndefined();

    const { properties } = bodyOf(0);
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]) {
      expect(properties).not.toHaveProperty(key);
    }
    const serialized = fetchMock.mock.calls[0][1].body as string;
    expect(serialized).not.toContain('""');
  });

  it("also omits utm_* keys when attribution is an explicit null", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact({ ...CONTACT, attribution: null });
    const { properties } = bodyOf(0);
    expect(properties).not.toHaveProperty("utm_source");
  });

  it("omits only the missing keys when attribution is partial", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));
    await syncHubSpotContact({
      ...CONTACT,
      attribution: { utm_source: "google" },
    });
    const { properties } = bodyOf(0);
    expect(properties.utm_source).toBe("google");
    expect(properties).not.toHaveProperty("utm_medium");
  });
});

// ---------------------------------------------------------------------------
// (e)(f)(k) — 409 upsert path
// ---------------------------------------------------------------------------
describe("409 upsert path", () => {
  beforeEach(() => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
  });

  it("GETs the existing contact then PATCHes, with sam_source ABSENT from the PATCH body", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, { message: "already exists" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: "hs-1", properties: {} }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: "hs-1" }));

    await syncHubSpotContact(CONTACT);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [getUrl, getInit] = fetchMock.mock.calls[1];
    expect(getUrl).toBe(
      "https://api.hubapi.com/crm/v3/objects/contacts/jordan%40example.com?idProperty=email",
    );
    expect(getInit.method).toBe("GET");

    const [patchUrl, patchInit] = fetchMock.mock.calls[2];
    expect(patchUrl).toBe("https://api.hubapi.com/crm/v3/objects/contacts/hs-1");
    expect(patchInit.method).toBe("PATCH");

    const patchBody = JSON.parse(patchInit.body) as {
      properties: Record<string, unknown>;
    };
    expect(patchBody.properties).not.toHaveProperty("sam_source");
    // Always-included fields.
    expect(typeof patchBody.properties.atlas_account_created_date).toBe("number");
    expect(patchBody.properties.atlas_account_id).toBe("acct-1");
  });

  it("set-if-empty: does not overwrite an existing non-empty utm_content, sam_source, or firstname", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          id: "hs-1",
          properties: {
            firstname: "AlreadySet",
            utm_content: "placement-tag-already-live",
            sam_source: "atlas_assessment",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: "hs-1" }));

    await syncHubSpotContact(CONTACT);

    const patchBody = JSON.parse(fetchMock.mock.calls[2][1].body) as {
      properties: Record<string, unknown>;
    };
    expect(patchBody.properties).not.toHaveProperty("firstname");
    expect(patchBody.properties).not.toHaveProperty("utm_content");
    expect(patchBody.properties).not.toHaveProperty("sam_source");
    // The other, genuinely-empty utm keys still get set.
    expect(patchBody.properties.utm_source).toBe("facebook");
  });

  it("set-if-empty: DOES set fields that come back empty/missing on the GET", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: "hs-1", properties: { lastname: "" } }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: "hs-1" }));

    await syncHubSpotContact(CONTACT);

    const patchBody = JSON.parse(fetchMock.mock.calls[2][1].body) as {
      properties: Record<string, unknown>;
    };
    expect(patchBody.properties.firstname).toBe("Jordan");
    expect(patchBody.properties.lastname).toBe("Lee");
    expect(patchBody.properties.contact_category).toBe("prospect_parent");
  });

  it("lifecycle-stage advance-only: an existing 'opportunity' is NOT downgraded by incoming 'lead'", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          id: "hs-1",
          properties: { lifecyclestage: "opportunity" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: "hs-1" }));

    await syncHubSpotContact(CONTACT);

    const patchBody = JSON.parse(fetchMock.mock.calls[2][1].body) as {
      properties: Record<string, unknown>;
    };
    expect(patchBody.properties).not.toHaveProperty("lifecyclestage");
  });

  it("lifecycle-stage advance-only: an unrecognized existing value still advances to 'lead'", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          id: "hs-1",
          properties: { lifecyclestage: "some_custom_hubspot_stage" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: "hs-1" }));

    await syncHubSpotContact(CONTACT);

    const patchBody = JSON.parse(fetchMock.mock.calls[2][1].body) as {
      properties: Record<string, unknown>;
    };
    expect(patchBody.properties.lifecyclestage).toBe("lead");
  });

  it("gives up quietly (logs, no throw) when the GET lookup fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(409, {}))
      .mockResolvedValueOnce(jsonResponse(500, {}));

    await expect(syncHubSpotContact(CONTACT)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2); // no PATCH attempted
    expect(errorSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (i) structural / payload-keys guarantee
// ---------------------------------------------------------------------------
describe("structural no-child-data guarantee", () => {
  beforeEach(() => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
  });

  it("a careless caller spreading extra fields cannot get them onto the wire", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "1" }));

    // TypeScript's excess-property check rejects this at the call site for a
    // literal; the cast proves the RUNTIME body is built from the allowlist,
    // not from whatever object a caller hands in.
    await syncHubSpotContact({
      ...CONTACT,
      phone: "555-0100",
      child_1_grade: "3",
      childName: "Aiden",
      birthYear: 2016,
      overallLevel: "3B",
      score: 12,
    } as unknown as AccountCreatedContact);

    const serialized = fetchMock.mock.calls[0][1].body as string;
    for (const leak of [
      "555-0100",
      "child_1_grade",
      "childName",
      "Aiden",
      "birthYear",
      "2016",
      "overallLevel",
      "3B",
      "score",
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });
});

// ---------------------------------------------------------------------------
// (j) failure handling — never throws
// ---------------------------------------------------------------------------
describe("failure handling — never throws", () => {
  beforeEach(() => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
  });

  it("resolves without throwing when fetch itself throws synchronously", async () => {
    fetchMock.mockImplementation(() => {
      throw new Error("network down");
    });

    await expect(syncHubSpotContact(CONTACT)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("resolves without throwing when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(syncHubSpotContact(CONTACT)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("retries once on 5xx, and resolves without throwing when the retry also 5xx's", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockResolvedValueOnce(jsonResponse(503, {}));

    const promise = syncHubSpotContact(CONTACT);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("recovers on the retry when the first POST 5xx's but the second succeeds", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockResolvedValueOnce(jsonResponse(201, { id: "1" }));

    const promise = syncHubSpotContact(CONTACT);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("logs and gives up (no retry) on a non-409 4xx", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { message: "bad request" }));
    await expect(syncHubSpotContact(CONTACT)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});
