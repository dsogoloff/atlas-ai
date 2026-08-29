import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dealNameFor,
  shouldAdvance,
  STAGE,
  syncHubSpotEnrollmentDeal,
  type DealEventInput,
} from "./syncDeal";

const TOKEN = "hs_test_token";
const ACCOUNT_ID = "9ab7b522-2104-4161-8995-f6dfef49e677";
const CONTACT_ID = "540873800434";
const DEAL_ID = "344731934412";

const STARTED: DealEventInput = {
  accountId: ACCOUNT_ID,
  parentFullName: "Jessica Kasovitz",
  event: "assessment_started",
};
const COMPLETED: DealEventInput = { ...STARTED, event: "assessment_completed" };
const ACCOUNT_CREATED: DealEventInput = { ...STARTED, event: "account_created" };

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function res(status: number, body: unknown, ok = status < 300) {
  return { ok, status, json: async () => body };
}
const contactHit = () => res(200, { results: [{ id: CONTACT_ID }] });
const dealHit = (stage: string) =>
  res(200, { results: [{ id: DEAL_ID, properties: { dealstage: stage } }] });
const dealNone = () => res(200, { results: [] });

function call(i: number) {
  return { url: String(fetchMock.mock.calls[i][0]), init: fetchMock.mock.calls[i][1] };
}
function bodyOf(i: number) {
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

// ---------------------------------------------------------------------------
// The relabelled-stage trap. These are the tests that would have caught a
// literal "exclude closedwon/closedlost" implementation.
// ---------------------------------------------------------------------------
describe("stage ids — this portal relabelled HubSpot's defaults", () => {
  it("treats ONLY Enrolled and Not Proceeding as terminal", () => {
    // Class Requested and Registered iClassPro carry the ids literally named
    // closedlost/closedwon but are mid-funnel and must stay findable.
    expect(STAGE.classRequested).toBe("closedlost");
    expect(STAGE.registeredIClassPro).toBe("closedwon");
    expect(STAGE.enrolled).toBe("4219340482");
    expect(STAGE.notProceeding).toBe("4219340483");
  });

  it("ranks the canonical order, with Not Proceeding unranked", () => {
    expect(shouldAdvance(STAGE.newLead, STAGE.atlasAccountCreated)).toBe(true);
    expect(shouldAdvance(STAGE.atlasAccountCreated, STAGE.assessmentStarted)).toBe(true);
    expect(shouldAdvance(STAGE.assessmentStarted, STAGE.assessmentCompleted)).toBe(true);
    // backward
    expect(shouldAdvance(STAGE.assessmentCompleted, STAGE.assessmentStarted)).toBe(false);
    expect(shouldAdvance(STAGE.registeredIClassPro, STAGE.assessmentCompleted)).toBe(false);
    expect(shouldAdvance(STAGE.inConversation, STAGE.assessmentStarted)).toBe(false);
    // same stage is not an advance
    expect(shouldAdvance(STAGE.assessmentStarted, STAGE.assessmentStarted)).toBe(false);
    // unranked / unknown is never moved
    expect(shouldAdvance(STAGE.notProceeding, STAGE.assessmentCompleted)).toBe(false);
    expect(shouldAdvance("some_custom_stage", STAGE.assessmentCompleted)).toBe(false);
  });
});

describe("deal sync — gating and consent", () => {
  it("makes no request at all when the token is unset", async () => {
    await expect(syncHubSpotEnrollmentDeal(STARTED)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates NOTHING when no consented contact exists", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    fetchMock.mockResolvedValueOnce(res(200, { results: [] })); // contact search
    await syncHubSpotEnrollmentDeal(STARTED);
    expect(fetchMock).toHaveBeenCalledTimes(1); // contact search only
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("deal sync — CREATE when the family has no open deal", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN));

  it('creates "<last> family" in the pipeline, associated, at the event stage', async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealNone());
    fetchMock.mockResolvedValueOnce(res(201, { id: DEAL_ID }));

    await syncHubSpotEnrollmentDeal(ACCOUNT_CREATED);

    const create = call(2);
    expect(create.init.method).toBe("POST");
    expect(create.url).toContain("/crm/v3/objects/deals");
    const body = bodyOf(2);
    expect(body.properties).toEqual({
      dealname: "Kasovitz family",
      pipeline: "default",
      dealstage: STAGE.atlasAccountCreated,
      entry_path: "Assessment",
      assessment_status: "Not Started",
    });
    expect(body.associations[0].to.id).toBe(CONTACT_ID);
    expect(body.associations[0].types[0].associationTypeId).toBe(3);
  });

  it("creates at Assessment Started with status Started", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealNone());
    fetchMock.mockResolvedValueOnce(res(201, { id: DEAL_ID }));
    await syncHubSpotEnrollmentDeal(STARTED);
    expect(bodyOf(2).properties).toMatchObject({
      dealstage: STAGE.assessmentStarted,
      assessment_status: "Started",
    });
  });

  it("does NOT create a deal when the deal search itself failed", async () => {
    // A transport failure must never be mistaken for "no deal exists" —
    // that is how duplicates get made.
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(res(500, {}, false));
    fetchMock.mockResolvedValueOnce(res(500, {}, false)); // retry
    await syncHubSpotEnrollmentDeal(STARTED);
    const creates = fetchMock.mock.calls.filter(
      ([u, i]) => i.method === "POST" && String(u).endsWith("/crm/v3/objects/deals"),
    );
    expect(creates).toHaveLength(0);
  });

  it("does NOT create when the contact has two open deals", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(
      res(200, {
        results: [
          { id: "1", properties: { dealstage: STAGE.newLead } },
          { id: "2", properties: { dealstage: STAGE.inConversation } },
        ],
      }),
    );
    await syncHubSpotEnrollmentDeal(STARTED);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("deal sync — ADVANCE, forward-only", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN));

  async function advanceFrom(stage: string, input: DealEventInput) {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(stage));
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await syncHubSpotEnrollmentDeal(input);
    return fetchMock.mock.calls.length > 2 ? bodyOf(2).properties : undefined;
  }

  it("advances Atlas Account Created -> Assessment Started", async () => {
    expect(await advanceFrom(STAGE.atlasAccountCreated, STARTED)).toEqual({
      assessment_status: "Started",
      dealstage: STAGE.assessmentStarted,
    });
  });

  it("advances Assessment Started -> Assessment Completed", async () => {
    expect(await advanceFrom(STAGE.assessmentStarted, COMPLETED)).toEqual({
      assessment_status: "Completed",
      dealstage: STAGE.assessmentCompleted,
    });
  });

  // The brief's headline acceptance case.
  it("enroll-first family at Registered iClassPro: stage UNCHANGED, status Completed", async () => {
    const props = await advanceFrom(STAGE.registeredIClassPro, COMPLETED);
    expect(props).toEqual({ assessment_status: "Completed" });
    expect(props).not.toHaveProperty("dealstage");
  });

  it("In Conversation stays put when the assessment completes", async () => {
    const props = await advanceFrom(STAGE.inConversation, COMPLETED);
    expect(props).toEqual({ assessment_status: "Completed" });
  });

  it("Class Requested stays put — it is mid-funnel despite its closedlost id", async () => {
    const props = await advanceFrom(STAGE.classRequested, COMPLETED);
    expect(props).toEqual({ assessment_status: "Completed" });
    expect(props).not.toHaveProperty("dealstage");
  });

  it("re-running the SAME event moves nothing backward and creates nothing", async () => {
    const props = await advanceFrom(STAGE.assessmentCompleted, COMPLETED);
    // status re-asserted, stage untouched
    expect(props).toEqual({ assessment_status: "Completed" });
    const creates = fetchMock.mock.calls.filter(
      ([u, i]) => i.method === "POST" && String(u).endsWith("/crm/v3/objects/deals"),
    );
    expect(creates).toHaveLength(0);
  });

  it("account_created never resets an existing assessment_status", async () => {
    // Already at Assessment Completed; an account_created event must not
    // write "Not Started" over it, and must not move the stage back.
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(STAGE.assessmentCompleted));
    await syncHubSpotEnrollmentDeal(ACCOUNT_CREATED);
    // Nothing to write at all → no PATCH is issued.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("PATCHes the matched deal id", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(STAGE.atlasAccountCreated));
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await syncHubSpotEnrollmentDeal(STARTED);
    const patch = call(2);
    expect(patch.init.method).toBe("PATCH");
    expect(patch.url).toContain(`/crm/v3/objects/deals/${DEAL_ID}`);
  });

  it("skips a terminal deal and creates a fresh one instead", async () => {
    // Enrolled / Not Proceeding are the only genuinely finished stages, so a
    // family that assesses again starts a new cycle.
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(
      res(200, { results: [{ id: "old", properties: { dealstage: STAGE.enrolled } }] }),
    );
    fetchMock.mockResolvedValueOnce(res(201, { id: DEAL_ID }));
    await syncHubSpotEnrollmentDeal(STARTED);
    expect(call(2).init.method).toBe("POST");
  });
});

// ---------------------------------------------------------------------------
// D-0055 / D-0061
// ---------------------------------------------------------------------------
describe("deal sync — no child result ever reaches HubSpot", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN));

  it("cannot carry a level, band, score or child field even if handed one", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealNone());
    fetchMock.mockResolvedValueOnce(res(201, { id: DEAL_ID }));

    await syncHubSpotEnrollmentDeal({
      ...COMPLETED,
      overallLevel: "3A",
      placementBand: "3A",
      score: 12,
      strandMastery: { number_sense: 0.4 },
      childName: "Yara",
      childGrade: "3",
    } as unknown as DealEventInput);

    const serialized = fetchMock.mock.calls[2][1].body as string;
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

describe("deal name", () => {
  it("uses the last name", () => {
    expect(dealNameFor("Jessica Kasovitz")).toBe("Kasovitz family");
  });
  it("survives the interior double space that produced ' Kasovitz'", () => {
    expect(dealNameFor("Yara  Kasovitz")).toBe("Kasovitz family");
  });
  it("falls back to the first name for a single-token name", () => {
    expect(dealNameFor("Prince")).toBe("Prince family");
  });
  it("never produces a bare ' family'", () => {
    expect(dealNameFor("   ")).toBe("Atlas family");
  });
});

describe("deal sync — fail-soft, [hubspot]-prefixed", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN));

  it("logs and returns when the create fails", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealNone());
    fetchMock.mockResolvedValueOnce(res(400, {}, false));
    await expect(syncHubSpotEnrollmentDeal(STARTED)).resolves.toBeUndefined();
    expect(errorSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes("[hubspot]"))).toBe(true);
  });

  it("logs and returns when the PATCH fails", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(STAGE.atlasAccountCreated));
    fetchMock.mockResolvedValueOnce(res(400, {}, false));
    await expect(syncHubSpotEnrollmentDeal(STARTED)).resolves.toBeUndefined();
    expect(errorSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes("[hubspot]"))).toBe(true);
  });

  it("never rejects when the transport throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(syncHubSpotEnrollmentDeal(STARTED)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("logs and returns when the deal search body is malformed", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    });
    await expect(syncHubSpotEnrollmentDeal(STARTED)).resolves.toBeUndefined();
    expect(errorSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes("[hubspot]"))).toBe(true);
  });
});
