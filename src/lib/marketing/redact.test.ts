import { describe, expect, it } from "vitest";

import {
  carriesChildIdentifier,
  CHILD_PARAM_KEYS,
  containsUuid,
  ga4PageContext,
  isUuid,
  REDACTED,
  redactPath,
  redactUrl,
} from "./redact";

const CHILD_UUID = "c284af8d-80bc-4c25-9894-04cd23510748";
const REPORT_URL = `https://app.samnewyork.com/report?child=${CHILD_UUID}`;

describe("isUuid / containsUuid", () => {
  it("recognises a UUID", () => {
    expect(isUuid(CHILD_UUID)).toBe(true);
    expect(isUuid(CHILD_UUID.toUpperCase())).toBe(true);
  });

  it("does not treat ordinary values as UUIDs", () => {
    for (const value of ["short", "1234", "dashboard", "", "not-a-uuid"]) {
      expect(isUuid(value)).toBe(false);
    }
  });

  it("finds a UUID embedded in a longer string", () => {
    expect(containsUuid(`child-${CHILD_UUID}-report`)).toBe(true);
    expect(containsUuid("no id here")).toBe(false);
  });
});

describe("redactUrl", () => {
  it("removes the child UUID from the report route", () => {
    const redacted = redactUrl(REPORT_URL);
    expect(redacted).not.toContain(CHILD_UUID);
    expect(redacted).toBe(
      `https://app.samnewyork.com/report?child=${REDACTED}`,
    );
  });

  it("keeps the route shape and the UTMs — the useful part of the hit", () => {
    const redacted = redactUrl(
      `${REPORT_URL}&utm_source=facebook&utm_campaign=sam_ny_fall`,
    );
    expect(redacted).toContain("/report");
    expect(redacted).toContain("utm_source=facebook");
    expect(redacted).toContain("utm_campaign=sam_ny_fall");
    expect(redacted).not.toContain(CHILD_UUID);
  });

  it("redacts by KEY even when the value is not a UUID", () => {
    for (const key of CHILD_PARAM_KEYS) {
      const redacted = redactUrl(
        `https://app.samnewyork.com/x?${key}=some-other-id-scheme`,
      );
      expect(redacted).toBe(
        `https://app.samnewyork.com/x?${key}=${REDACTED}`,
      );
    }
  });

  it("redacts a UUID under an UNKNOWN key (new route, no code change needed)", () => {
    const redacted = redactUrl(
      `https://app.samnewyork.com/x?something_new=${CHILD_UUID}`,
    );
    expect(redacted).not.toContain(CHILD_UUID);
    expect(redacted).toContain(`something_new=${REDACTED}`);
  });

  it("redacts a UUID in a PATH segment", () => {
    const redacted = redactUrl(
      `https://app.samnewyork.com/edit-child/${CHILD_UUID}`,
    );
    expect(redacted).not.toContain(CHILD_UUID);
    expect(redacted).toBe(`https://app.samnewyork.com/edit-child/${REDACTED}`);
  });

  it("redacts a UUID embedded inside a longer path segment", () => {
    const redacted = redactUrl(
      `https://app.samnewyork.com/r/child-${CHILD_UUID}.html`,
    );
    expect(redacted).not.toContain(CHILD_UUID);
  });

  it("drops the fragment rather than reasoning about its contents", () => {
    expect(redactUrl(`https://app.samnewyork.com/x#${CHILD_UUID}`)).toBe(
      "https://app.samnewyork.com/x",
    );
  });

  it("leaves a URL with nothing sensitive alone", () => {
    expect(redactUrl("https://app.samnewyork.com/dashboard")).toBe(
      "https://app.samnewyork.com/dashboard",
    );
  });

  it("fails CLOSED on unparseable or absent input", () => {
    for (const value of ["", "   ", "not a url", null, undefined]) {
      expect(redactUrl(value)).toBe("");
    }
  });
});

describe("redactPath", () => {
  it("returns path + redacted query only", () => {
    expect(redactPath(REPORT_URL)).toBe(`/report?child=${REDACTED}`);
  });

  it("fails closed", () => {
    expect(redactPath("nonsense")).toBe("");
  });
});

describe("carriesChildIdentifier", () => {
  it("is true for the report route", () => {
    expect(carriesChildIdentifier(REPORT_URL)).toBe(true);
  });

  it("is true for the assessment route (child_id)", () => {
    expect(
      carriesChildIdentifier(
        `https://app.samnewyork.com/assessment?child_id=${CHILD_UUID}`,
      ),
    ).toBe(true);
  });

  it("is true for a UUID path segment", () => {
    expect(
      carriesChildIdentifier(
        `https://app.samnewyork.com/edit-child/${CHILD_UUID}`,
      ),
    ).toBe(true);
  });

  it("is false for clean parent surfaces", () => {
    for (const url of [
      "https://app.samnewyork.com/",
      "https://app.samnewyork.com/dashboard",
      "https://app.samnewyork.com/?utm_source=facebook",
    ]) {
      expect(carriesChildIdentifier(url)).toBe(false);
    }
  });

  it("is false for a genuinely empty referrer (nothing to leak)", () => {
    expect(carriesChildIdentifier("")).toBe(false);
    expect(carriesChildIdentifier(null)).toBe(false);
    expect(carriesChildIdentifier(undefined)).toBe(false);
  });

  it("fails CLOSED on an unparseable value", () => {
    expect(carriesChildIdentifier("not a url")).toBe(true);
  });
});

describe("ga4PageContext", () => {
  it("redacts location, path and referrer together", () => {
    const context = ga4PageContext(REPORT_URL, REPORT_URL);
    expect(context.page_location).toBe(
      `https://app.samnewyork.com/report?child=${REDACTED}`,
    );
    expect(context.page_path).toBe(`/report?child=${REDACTED}`);
    expect(context.page_referrer).toBe(
      `https://app.samnewyork.com/report?child=${REDACTED}`,
    );
  });

  it("omits page_referrer entirely when there is no referrer", () => {
    // Sending "" would overwrite GA4's own correct "no referrer" with a bogus
    // value, so the key must be ABSENT rather than empty.
    const context = ga4PageContext(REPORT_URL, "");
    expect(context).not.toHaveProperty("page_referrer");
  });

  it("never emits a value containing the child UUID", () => {
    const context = ga4PageContext(REPORT_URL, REPORT_URL);
    for (const value of Object.values(context)) {
      expect(value).not.toContain(CHILD_UUID);
      expect(containsUuid(value)).toBe(false);
    }
  });
});
