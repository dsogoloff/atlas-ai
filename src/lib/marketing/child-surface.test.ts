// ATLAS-006 — the child-surface predicate that gates third-party analytics.
//
// This is a privacy control, so it is tested for BEHAVIOUR, not just for
// source shape. The two properties that matter: it recognises every child
// assessment path, and it fails CLOSED on anything it cannot read.

import { describe, expect, it } from "vitest";

import {
  analyticsMaySendFrom,
  CHILD_SURFACE_PREFIXES,
  isChildSurfacePath,
} from "./child-surface";

describe("isChildSurfacePath", () => {
  it.each([
    "/assessment",
    "/assessment/",
    "/assessment?child_id=8f2a1c44-0000-4000-8000-000000000001",
    "/assessment/anything/nested",
    "https://app.samnewyork.com/assessment",
    "https://app.samnewyork.com/assessment?child_id=abc",
  ])("treats %s as a child surface", (input) => {
    expect(isChildSurfacePath(input)).toBe(true);
  });

  it.each([
    "/",
    "/dashboard",
    "/report",
    "/report?child=8f2a1c44-0000-4000-8000-000000000001",
    "/signup",
    "/login",
    "/coppa",
    "/add-child",
    "/instructor",
    "/admin",
    "https://app.samnewyork.com/dashboard",
  ])("treats %s as a PARENT/staff surface", (input) => {
    expect(isChildSurfacePath(input)).toBe(false);
  });

  it("does not match a route that merely shares the prefix's characters", () => {
    // `/assessmentary` is not `/assessment`. A sloppy startsWith would take
    // analytics off an unrelated parent route.
    expect(isChildSurfacePath("/assessmentary")).toBe(false);
    expect(isChildSurfacePath("/assessments-overview")).toBe(false);
  });

  it("returns false for null / undefined / empty (nothing to classify)", () => {
    expect(isChildSurfacePath(null)).toBe(false);
    expect(isChildSurfacePath(undefined)).toBe(false);
    expect(isChildSurfacePath("")).toBe(false);
  });

  it("fails CLOSED on an unparseable absolute URL", () => {
    // If we cannot tell where we are, assume it is a child screen and suppress.
    expect(isChildSurfacePath("https://[not-a-valid-host/assessment")).toBe(true);
  });

  it("keeps the prefix list non-empty (a cleared list would disable the gate)", () => {
    expect(CHILD_SURFACE_PREFIXES.length).toBeGreaterThan(0);
    expect(CHILD_SURFACE_PREFIXES).toContain("/assessment");
  });
});

describe("analyticsMaySendFrom", () => {
  it("permits parent surfaces", () => {
    expect(analyticsMaySendFrom("https://app.samnewyork.com/dashboard")).toBe(true);
    expect(analyticsMaySendFrom("/report?child=abc")).toBe(true);
  });

  it("refuses child surfaces", () => {
    expect(analyticsMaySendFrom("https://app.samnewyork.com/assessment")).toBe(false);
    expect(analyticsMaySendFrom("/assessment?child_id=abc")).toBe(false);
  });

  it("refuses when the href is missing (fails closed)", () => {
    expect(analyticsMaySendFrom(null)).toBe(false);
    expect(analyticsMaySendFrom(undefined)).toBe(false);
    expect(analyticsMaySendFrom("")).toBe(false);
  });
});
