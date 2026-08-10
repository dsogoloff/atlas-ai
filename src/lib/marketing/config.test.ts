import { afterEach, describe, expect, it } from "vitest";

import { ga4MeasurementId, metaPixelId } from "./config";

const ORIGINAL = {
  ga4: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  meta: process.env.NEXT_PUBLIC_META_PIXEL_ID,
};

afterEach(() => {
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = ORIGINAL.ga4;
  process.env.NEXT_PUBLIC_META_PIXEL_ID = ORIGINAL.meta;
});

describe("marketing config", () => {
  it("returns the configured ids", () => {
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = "G-VEEHTL66LR";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "1351380140193716";
    expect(ga4MeasurementId()).toBe("G-VEEHTL66LR");
    expect(metaPixelId()).toBe("1351380140193716");
  });

  // FAIL SAFE: an unconfigured environment must no-op, never throw. This is the
  // difference between "no analytics on a preview" and "a blank page".
  it("returns null when unset, so the trackers no-op", () => {
    delete process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    expect(ga4MeasurementId()).toBeNull();
    expect(metaPixelId()).toBeNull();
  });

  it("treats blank / whitespace-only values as unset", () => {
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = "   ";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "";
    expect(ga4MeasurementId()).toBeNull();
    expect(metaPixelId()).toBeNull();
  });

  it("trims surrounding whitespace from a pasted value", () => {
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = " G-VEEHTL66LR ";
    expect(ga4MeasurementId()).toBe("G-VEEHTL66LR");
  });
});
