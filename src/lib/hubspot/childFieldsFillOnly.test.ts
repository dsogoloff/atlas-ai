import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHILD_PROPERTY_NAMES,
  fillOnlyEmpty,
  syncHubSpotChildFields,
} from "./childFields";

// Fill-only-when-empty (founder decision 2026-09-12): a non-empty value in
// HubSpot is staff-owned and must NEVER be overwritten. Atlas fills blanks.
//
// The regression these tests exist to prevent is specific and was observed in
// the live portal: contact 547126905574 (Kaya Endo) carries a staff-typed
// child_1_grade with NO child_1_name. The old authoritative PATCH would have
// replaced that grade with Atlas's own value.

const TOKEN = "hs_test_token";
const ACCOUNT_ID = "eab783fa-1c40-4bb0-8ba0-2bfea79a462e";
const CONTACT_ID = "547126905574";

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function res(status: number, body: unknown, ok = status < 300) {
  return { ok, status, json: async () => body };
}
const searchHit = () => res(200, { total: 1, results: [{ id: CONTACT_ID }] });
const contactWith = (properties: Record<string, unknown>) =>
  res(200, { id: CONTACT_ID, properties });

function patchBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls.find((c) => c[1]?.method === "PATCH");
  if (!call) throw new Error("no PATCH was issued");
  return JSON.parse(call[1].body).properties;
}
const patchIssued = () =>
  fetchMock.mock.calls.some((c) => c[1]?.method === "PATCH");

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

describe("fillOnlyEmpty", () => {
  it("keeps a candidate whose slot is absent from HubSpot", () => {
    expect(fillOnlyEmpty({ child_1_name: "Kaya" }, {})).toEqual({
      child_1_name: "Kaya",
    });
  });

  it.each([[null], [""], [undefined]])(
    "treats %s as empty and fills it",
    (existingValue) => {
      expect(
        fillOnlyEmpty({ child_1_name: "Kaya" }, { child_1_name: existingValue }),
      ).toEqual({ child_1_name: "Kaya" });
    },
  );

  it("DROPS a candidate whose slot already holds a staff-typed value", () => {
    expect(
      fillOnlyEmpty({ child_1_grade: "2" }, { child_1_grade: "3" }),
    ).toEqual({});
  });

  it("treats a whitespace-only existing value as FILLED, not blank", () => {
    // A human typed it. Filling blanks is this module's job; tidying is not.
    expect(fillOnlyEmpty({ child_1_name: "Kaya" }, { child_1_name: " " })).toEqual(
      {},
    );
  });

  it("fills and preserves per-slot, not all-or-nothing", () => {
    // The live Kaya Endo shape: grade staff-typed, name blank.
    const out = fillOnlyEmpty(
      { child_1_name: "Kaya", child_1_grade: "2" },
      { child_1_grade: "3" },
    );
    expect(out).toEqual({ child_1_name: "Kaya" });
    expect(out).not.toHaveProperty("child_1_grade");
  });

  it("leaves a sibling's filled slot alone while filling another child's blank", () => {
    const out = fillOnlyEmpty(
      { child_1_name: "A", child_2_name: "B", child_2_grade: "4" },
      { child_1_name: "StaffTyped", child_2_grade: "" },
    );
    expect(out).toEqual({ child_2_name: "B", child_2_grade: "4" });
  });
});

describe("CHILD_PROPERTY_NAMES", () => {
  it("covers every property the writer can emit, so the GET cannot under-request", () => {
    // An under-requested GET makes a populated property look empty, which
    // would turn this guard into the clobbering it exists to prevent.
    for (const name of [
      "child_1_name",
      "child_1_grade",
      "child_2_name",
      "child_2_grade",
      "child_3_name",
      "child_3_grade",
    ]) {
      expect(CHILD_PROPERTY_NAMES).toContain(name);
    }
  });

  it("requests child_3_name now that the portal has it", () => {
    // Created 2026-09-12. If the GET omitted it, a populated child_3_name would
    // read as empty and be overwritten — the exact clobbering this guards.
    expect(CHILD_PROPERTY_NAMES).toContain("child_3_name");
  });
});

describe("syncHubSpotChildFields — fill-only-when-empty", () => {
  it("reads the contact BEFORE writing, requesting the exact property list", async () => {
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(contactWith({}))
      .mockResolvedValueOnce(res(200, {}));

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Kaya", grade: "2" }],
    });

    const [getUrl, getInit] = fetchMock.mock.calls[1];
    expect(getInit.method).toBe("GET");
    const requested = decodeURIComponent(
      new URL(getUrl).searchParams.get("properties") ?? "",
    ).split(",");
    for (const name of CHILD_PROPERTY_NAMES) {
      expect(requested).toContain(name);
    }
  });

  it("fills a blank slot", async () => {
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(contactWith({ child_1_name: "", child_1_grade: null }))
      .mockResolvedValueOnce(res(200, {}));

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Kaya", grade: "2" }],
    });

    expect(patchBody()).toEqual({ child_1_name: "Kaya", child_1_grade: "2" });
  });

  it("NEVER overwrites a staff-typed grade — the live Kaya Endo case", async () => {
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(contactWith({ child_1_grade: "3" }))
      .mockResolvedValueOnce(res(200, {}));

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Kaya", grade: "2" }],
    });

    const body = patchBody();
    expect(body).toEqual({ child_1_name: "Kaya" });
    expect(body).not.toHaveProperty("child_1_grade");
  });

  it("issues NO PATCH at all when every slot is already filled", async () => {
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(
        contactWith({ child_1_name: "StaffTyped", child_1_grade: "3" }),
      );

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Kaya", grade: "2" }],
    });

    expect(patchIssued()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2); // search + read only
  });

  it("FAILS CLOSED: a failed read writes nothing", async () => {
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(res(500, {}));

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Kaya", grade: "2" }],
    });

    // "Could not tell whether it was empty" must never become "overwrite".
    expect(patchIssued()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("FAILS CLOSED: a throwing read writes nothing", async () => {
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockRejectedValueOnce(new Error("network down"));

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Kaya", grade: "2" }],
    });

    expect(patchIssued()).toBe(false);
  });

  it("FAILS CLOSED: malformed read JSON writes nothing", async () => {
    fetchMock.mockResolvedValueOnce(searchHit()).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    });

    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "Kaya", grade: "2" }],
    });

    expect(patchIssued()).toBe(false);
  });

  it("still never throws when the PATCH itself is rejected", async () => {
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(contactWith({}))
      .mockResolvedValueOnce(res(400, {}));

    await expect(
      syncHubSpotChildFields({
        accountId: ACCOUNT_ID,
        children: [{ firstName: "Kaya", grade: "2" }],
      }),
    ).resolves.toBeUndefined();
  });

  it("does not read at all when Atlas has nothing to assert", async () => {
    await syncHubSpotChildFields({
      accountId: ACCOUNT_ID,
      children: [{ firstName: "   ", grade: "banana" }],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
