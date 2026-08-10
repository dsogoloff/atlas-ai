import { beforeEach, describe, expect, it, vi } from "vitest";

// Contract test for the seam the HubSpot lane (Contract A) will call. It must
// return the persisted UTMs server-side and NEVER throw — a contact sync must
// be able to attach attribution without a try/catch of its own.

const getCookie = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: getCookie }),
}));

import { serializeAttribution } from "./attribution";
import { getAttribution } from "./server";

beforeEach(() => {
  getCookie.mockReset();
});

describe("getAttribution", () => {
  it("returns the persisted first-touch UTMs", async () => {
    const attribution = {
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "sam_ny_fall",
      first_seen: "2026-08-03T12:00:00.000Z",
    };
    getCookie.mockReturnValue({ value: serializeAttribution(attribution) });

    await expect(getAttribution()).resolves.toEqual(attribution);
  });

  it("returns {} for an unattributed visitor", async () => {
    getCookie.mockReturnValue(undefined);
    await expect(getAttribution()).resolves.toEqual({});
  });

  it("returns {} rather than throwing when the cookie store is unavailable", async () => {
    getCookie.mockImplementation(() => {
      throw new Error("called outside a request scope");
    });
    await expect(getAttribution()).resolves.toEqual({});
  });

  it("returns {} for a corrupted cookie", async () => {
    getCookie.mockReturnValue({ value: "garbage" });
    await expect(getAttribution()).resolves.toEqual({});
  });

  it("never surfaces a non-UTM field, whatever is in the cookie", async () => {
    getCookie.mockReturnValue({
      value: encodeURIComponent(
        JSON.stringify({ utm_source: "google", sam_level: "L3", score: 9 }),
      ),
    });
    await expect(getAttribution()).resolves.toEqual({ utm_source: "google" });
  });
});
