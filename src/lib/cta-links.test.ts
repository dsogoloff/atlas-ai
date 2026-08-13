// Pins the parent-facing CTA destinations. These are shipped links a parent
// clicks from the dashboard and the end-of-report — a silent regression back to
// a dead `#anchor` placeholder is invisible in review, so assert the shape here.

import { describe, expect, it } from "vitest";

import { CTA_LINKS } from "./cta-links";

describe("CTA_LINKS.scheduleFreeClass — interim director mailto", () => {
  it("is a mailto to the S.A.M New York center inbox, not a dead anchor", () => {
    expect(CTA_LINKS.scheduleFreeClass.startsWith("mailto:parents@samnewyork.com")).toBe(
      true,
    );
    expect(CTA_LINKS.scheduleFreeClass).not.toContain("#");
  });

  it("prefills the director-call subject, URL-encoded, with no body prefill", () => {
    const url = new URL(CTA_LINKS.scheduleFreeClass);
    expect(url.searchParams.get("subject")).toBe(
      "I'd like to schedule a call with the S.A.M director",
    );
    expect(url.searchParams.has("body")).toBe(false);
    // The raw href must carry the encoded form (spaces/apostrophe escaped) so
    // the mail client parses one subject param rather than truncating at the
    // first space.
    expect(CTA_LINKS.scheduleFreeClass).toContain("subject=I'd%20like%20to%20schedule");
  });
});

describe("CTA_LINKS.questionsTalkToUs", () => {
  it("stays wired to the support inbox", () => {
    expect(CTA_LINKS.questionsTalkToUs).toBe("mailto:hello@samnewyork.com");
  });
});
