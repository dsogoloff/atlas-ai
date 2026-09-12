import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  shouldAdvance,
  STAGE,
  syncHubSpotEnrollmentDeal,
  type DealEventInput,
} from "./syncDeal";

// The deal half of the report-CTA change: a tap advances the family to
// "In Conversation" (contractsent), forward-only, reusing the existing rank
// comparison rather than a parallel path.

const TOKEN = "hs_test_token";
const ACCOUNT_ID = "9ab7b522-2104-4161-8995-f6dfef49e677";
const CONTACT_ID = "540873800434";
const DEAL_ID = "344731934412";

const TAP: DealEventInput = {
  accountId: ACCOUNT_ID,
  parentFullName: "Jessica Kasovitz",
  event: "contact_requested",
};

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function res(status: number, body: unknown, ok = status < 300) {
  return { ok, status, json: async () => body };
}
const contactHit = () => res(200, { results: [{ id: CONTACT_ID }] });
const dealHit = (stage: string, name = "Kasovitz family") =>
  res(200, { results: [{ id: DEAL_ID, properties: { dealstage: stage, dealname: name } }] });

function bodyOf(i: number) {
  return JSON.parse(fetchMock.mock.calls[i][1].body);
}

beforeEach(() => {
  vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

describe("contact_requested — advances to In Conversation", () => {
  it("VERIFY 1: moves an Assessment Completed deal to In Conversation", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(STAGE.assessmentCompleted));
    fetchMock.mockResolvedValueOnce(res(200, {}));

    await syncHubSpotEnrollmentDeal(TAP);

    expect(bodyOf(2).properties).toEqual({ dealstage: STAGE.inConversation });
    expect(STAGE.inConversation).toBe("contractsent");
  });

  it("VERIFY 2: a repeat tap writes nothing — no second stage write", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(STAGE.inConversation));

    await syncHubSpotEnrollmentDeal(TAP);

    // Already there, and contact_requested carries no assessment_status, so
    // there is nothing to write and NO PATCH is issued at all.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("VERIFY 3: a later stage is never moved backwards", async () => {
    for (const later of [
      STAGE.classRequested,
      STAGE.registeredIClassPro,
      STAGE.notProceeding,
    ]) {
      expect(shouldAdvance(later, STAGE.inConversation)).toBe(false);
    }
    // and end-to-end for the mid-funnel one
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(STAGE.registeredIClassPro));
    await syncHubSpotEnrollmentDeal(TAP);
    expect(fetchMock).toHaveBeenCalledTimes(2); // no PATCH
  });

  it("does not reset assessment_status — a tap says nothing about assessing", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(STAGE.atlasAccountCreated));
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await syncHubSpotEnrollmentDeal(TAP);
    expect(bodyOf(2).properties).not.toHaveProperty("assessment_status");
  });

  it("VERIFY 5: no contact (anonymous / no account) writes nothing", async () => {
    fetchMock.mockResolvedValueOnce(res(200, { results: [] }));
    await syncHubSpotEnrollmentDeal(TAP);
    expect(fetchMock).toHaveBeenCalledTimes(1); // contact search only
  });

  it("VERIFY 4: a transport failure never throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(syncHubSpotEnrollmentDeal(TAP)).resolves.toBeUndefined();
  });

  it("VERIFY 6: no child field can reach the wire", async () => {
    fetchMock.mockResolvedValueOnce(contactHit());
    fetchMock.mockResolvedValueOnce(dealHit(STAGE.assessmentCompleted));
    fetchMock.mockResolvedValueOnce(res(200, {}));

    await syncHubSpotEnrollmentDeal({
      ...TAP,
      overallLevel: "3A",
      placementBand: "3A",
      score: 12,
      strandMastery: { number_sense: 0.4 },
      childName: "Yara",
      childGrade: "3",
      responses: [1, 2, 3],
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
      "responses",
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });
});
