import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildChildProperties,
  syncHubSpotChildFields,
  toHubspotGrade,
  type ChildCrmRecord,
} from "./childFields";

const TOKEN = "hs_test_token";
const ACCOUNT_ID = "cdc2c196-eae4-4a71-ab72-2cf9cd455425";
const CONTACT_ID = "550914173668";

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function res(status: number, body: unknown, ok = status < 300) {
  return { ok, status, json: async () => body };
}
const searchHit = () => res(200, { total: 1, results: [{ id: CONTACT_ID }] });

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

describe("toHubspotGrade", () => {
  // Every value here was read off the LIVE portal enum this cycle. Writing
  // anything outside it rejects the whole PATCH, so this mapping is load-bearing.
  it.each([
    ["K", "k"],
    ["k", "k"],
    ["KA", "k"],
    ["kb", "k"],
    ["Kindergarten", "k"],
    ["Pre-K", "pre_k"],
    ["pre-k (age 4)", "pre_k"],
    ["PreK", "pre_k"],
    ["pre kindergarten", "pre_k"],
    ["1", "1"],
    ["1st", "1"],
    ["first", "1"],
    ["2b", "2"],
    ["3rd", "3"],
    ["Grade 5", "5"],
    ["5th grade", "5"],
    ["  8  ", "8"],
    ["eighth", "8"],
  ])("maps %s to the enum value %s", (input, expected) => {
    expect(toHubspotGrade(input)).toBe(expected);
  });

  it.each([[null], [undefined], [""], ["   "], ["9"], ["12"], ["freshman"], ["banana"]])(
    "returns undefined for unmapped input %s (never a guessed grade)",
    (input) => {
      expect(toHubspotGrade(input as string | null)).toBeUndefined();
    },
  );
});

describe("buildChildProperties", () => {
  it("fills slot 1 with first name and grade", () => {
    expect(buildChildProperties([{ firstName: "Daniel", grade: "K" }])).toEqual({
      child_1_name: "Daniel",
      child_1_grade: "k",
    });
  });

  it("assigns siblings to slots in the order given (oldest first)", () => {
    const props = buildChildProperties([
      { firstName: "Yara", grade: "3" },
      { firstName: "Nafti", grade: "2" },
    ]);
    expect(props).toEqual({
      child_1_name: "Yara",
      child_1_grade: "3",
      child_2_name: "Nafti",
      child_2_grade: "2",
    });
  });

  it("writes a third child's name AND grade now that child_3_name exists", () => {
    // child_3_name was absent from the portal until 2026-09-12, so slot 3 was
    // grade-only. It has since been created (verified live, type string).
    const props = buildChildProperties([
      { firstName: "A", grade: "1" },
      { firstName: "B", grade: "2" },
      { firstName: "C", grade: "3" },
    ]);
    expect(props.child_3_grade).toBe("3");
    expect(props.child_3_name).toBe("C");
  });

  it("omits an unmapped grade rather than writing a bad enum value", () => {
    const props = buildChildProperties([{ firstName: "Sam", grade: "freshman" }]);
    expect(props).toEqual({ child_1_name: "Sam" });
  });

  it("omits the grade entirely when Atlas never captured one", () => {
    expect(buildChildProperties([{ firstName: "Sam", grade: null }])).toEqual({
      child_1_name: "Sam",
    });
  });

  it("does not blank a slot for a child Atlas does not have", () => {
    const props = buildChildProperties([{ firstName: "Solo", grade: "4" }]);
    expect(props).not.toHaveProperty("child_2_name");
    expect(props).not.toHaveProperty("child_2_grade");
    expect(props).not.toHaveProperty("child_3_grade");
  });

  it("ignores children beyond the three modelled slots", () => {
    const four: ChildCrmRecord[] = [1, 2, 3, 4].map((n) => ({
      firstName: `Kid${n}`,
      grade: "1",
    }));
    const props = buildChildProperties(four);
    expect(Object.keys(props)).not.toContain("child_4_name");
    expect(Object.keys(props)).not.toContain("child_4_grade");
  });

  it("COMPLIANCE: emits ONLY child name + grade keys — no level, band or score", () => {
    const props = buildChildProperties([{ firstName: "Daniel", grade: "K" }]);
    for (const key of Object.keys(props)) {
      expect(key).toMatch(/^child_[123]_(name|grade)$/);
    }
  });
});

describe("syncHubSpotChildFields", () => {
  it("no-ops entirely when the sync token is unset (no fetch, no spend)", async () => {
    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Daniel", grade: "K" }],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("PATCHes the matched contact with the child properties", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    // Three calls since the fill-only-when-empty change: search, then the
    // mandatory read of current values, then the PATCH. See
    // childFieldsFillOnly.test.ts for the fill-vs-preserve behaviour itself.
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(res(200, { id: CONTACT_ID, properties: {} }))
      .mockResolvedValueOnce(res(200, {}));

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Daniel", grade: "K" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toBe(`https://api.hubapi.com/crm/v3/objects/contacts/${CONTACT_ID}`);
    expect(init.method).toBe("PATCH");
    expect(callBody(2).properties).toEqual({
      child_1_name: "Daniel",
      child_1_grade: "k",
    });
  });

  it("does not call HubSpot at all when Atlas has nothing to assert", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "   ", grade: "banana" }],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is UPDATE-ONLY: no contact match means no write and no create", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    fetchMock.mockResolvedValueOnce(res(200, { total: 0, results: [] }));

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Daniel", grade: "K" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1); // the search only
    expect(errorSpy).toHaveBeenCalled();
  });

  it("never throws when HubSpot rejects the write", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(res(200, { id: CONTACT_ID, properties: {} }))
      .mockResolvedValueOnce(res(400, {}));

    await expect(
      syncHubSpotChildFields({
        accountId: ACCOUNT_ID,
        children: [{ firstName: "Daniel", grade: "K" }],
      }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
