import { describe, expect, it } from "vitest";

import {
  deserializeAttribution,
  hasAnyUtm,
  parseUtmParams,
  resolveFirstTouch,
  serializeAttribution,
  UTM_KEYS,
} from "./attribution";

const TAGGED =
  "?utm_source=facebook&utm_medium=paid_social&utm_campaign=sam_ny_fall" +
  "&utm_content=carousel_a&utm_term=math%20tutoring";

describe("parseUtmParams", () => {
  it("reads all five params, exact lowercase names", () => {
    expect(parseUtmParams(TAGGED)).toEqual({
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "sam_ny_fall",
      utm_content: "carousel_a",
      utm_term: "math tutoring",
    });
  });

  it("accepts a search string with or without the leading '?'", () => {
    expect(parseUtmParams("utm_source=google")).toEqual({
      utm_source: "google",
    });
    expect(parseUtmParams("?utm_source=google")).toEqual({
      utm_source: "google",
    });
  });

  it("ignores non-exact casing and unrelated params", () => {
    const parsed = parseUtmParams("?UTM_Source=google&gclid=abc&ref=x");
    expect(parsed).toEqual({});
  });

  it("omits absent and blank params rather than storing empty strings", () => {
    expect(parseUtmParams("?utm_source=google&utm_medium=&utm_term=%20")).toEqual(
      { utm_source: "google" },
    );
  });

  it("truncates a hostile over-long value", () => {
    const parsed = parseUtmParams(`?utm_campaign=${"x".repeat(5000)}`);
    expect(parsed.utm_campaign).toHaveLength(200);
  });

  it("returns empty for an untagged query string", () => {
    expect(parseUtmParams("")).toEqual({});
    expect(parseUtmParams("?child=123")).toEqual({});
  });
});

describe("hasAnyUtm", () => {
  it("is false for empty and true for any single param", () => {
    expect(hasAnyUtm({})).toBe(false);
    expect(hasAnyUtm({ utm_term: "x" })).toBe(true);
  });
});

describe("serialize / deserialize", () => {
  it("round-trips", () => {
    const attribution = {
      ...parseUtmParams(TAGGED),
      first_seen: "2026-08-03T12:00:00.000Z",
    };
    expect(deserializeAttribution(serializeAttribution(attribution))).toEqual(
      attribution,
    );
  });

  it("produces a cookie-safe value (no ';' or ',' unescaped)", () => {
    const encoded = serializeAttribution({ utm_campaign: "a;b,c d" });
    expect(encoded).not.toMatch(/[;,\s]/);
  });

  it("fails soft on garbage, truncation and wrong shapes", () => {
    expect(deserializeAttribution(undefined)).toEqual({});
    expect(deserializeAttribution("")).toEqual({});
    expect(deserializeAttribution("not-json")).toEqual({});
    expect(deserializeAttribution("%7B%22utm_source")).toEqual({});
    expect(deserializeAttribution(encodeURIComponent("[1,2]"))).toEqual({});
    expect(deserializeAttribution(encodeURIComponent('"str"'))).toEqual({});
  });

  it("drops unknown keys, so a hand-edited cookie cannot smuggle fields", () => {
    const raw = encodeURIComponent(
      JSON.stringify({
        utm_source: "google",
        score: 7,
        misconception: "place_value",
        child_name: "Ada",
      }),
    );
    expect(deserializeAttribution(raw)).toEqual({ utm_source: "google" });
  });

  it("drops non-string values for known keys", () => {
    const raw = encodeURIComponent(JSON.stringify({ utm_source: { a: 1 } }));
    expect(deserializeAttribution(raw)).toEqual({});
  });
});

describe("resolveFirstTouch", () => {
  const NOW = "2026-08-03T12:00:00.000Z";

  it("writes the incoming UTMs when nothing is stored", () => {
    const decision = resolveFirstTouch(undefined, TAGGED, NOW);
    expect(decision.shouldWrite).toBe(true);
    expect(decision.attribution.utm_source).toBe("facebook");
    expect(decision.attribution.first_seen).toBe(NOW);
  });

  it("FIRST TOUCH WINS: a later tagged URL does not overwrite", () => {
    const stored = serializeAttribution({
      utm_source: "facebook",
      first_seen: "2026-07-01T00:00:00.000Z",
    });
    const decision = resolveFirstTouch(stored, "?utm_source=google", NOW);
    expect(decision.shouldWrite).toBe(false);
    expect(decision.attribution).toEqual({
      utm_source: "facebook",
      first_seen: "2026-07-01T00:00:00.000Z",
    });
  });

  it("an untagged pageview never writes, so it cannot claim the visitor", () => {
    const decision = resolveFirstTouch(undefined, "?child=abc", NOW);
    expect(decision.shouldWrite).toBe(false);
    expect(decision.attribution).toEqual({});
  });

  it("a corrupted cookie is replaced by a tagged visit", () => {
    const decision = resolveFirstTouch("garbage", TAGGED, NOW);
    expect(decision.shouldWrite).toBe(true);
    expect(decision.attribution.utm_campaign).toBe("sam_ny_fall");
  });

  it("survives internal navigation: re-running on later pages is a no-op", () => {
    const first = resolveFirstTouch(undefined, TAGGED, NOW);
    const stored = serializeAttribution(first.attribution);
    for (const path of ["", "?child=abc", "?session=xyz"]) {
      const next = resolveFirstTouch(stored, path, NOW);
      expect(next.shouldWrite).toBe(false);
      expect(next.attribution).toEqual(first.attribution);
    }
  });
});

describe("UTM_KEYS", () => {
  it("is exactly the five lowercase names the ad platforms emit", () => {
    expect([...UTM_KEYS]).toEqual([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]);
  });
});
