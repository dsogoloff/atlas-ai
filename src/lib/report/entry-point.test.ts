import { describe, expect, it } from "vitest";

import { splitEntryPoint } from "./entry-point";

describe("splitEntryPoint", () => {
  it("maps a B half-level to 'second half' and strips the band", () => {
    expect(splitEntryPoint("S.A.M Level 2B")).toEqual({
      band: "S.A.M Level 2",
      half: "second half",
    });
  });

  it("maps an A half-level to 'first half'", () => {
    expect(splitEntryPoint("S.A.M Level 3A")).toEqual({
      band: "S.A.M Level 3",
      half: "first half",
    });
  });

  it("handles the Kindergarten label shape", () => {
    expect(splitEntryPoint("S.A.M Kindergarten B")).toEqual({
      band: "S.A.M Kindergarten",
      half: "second half",
    });
  });

  it("returns half: null when there is no trailing A/B", () => {
    expect(splitEntryPoint("S.A.M Level 2")).toEqual({
      band: "S.A.M Level 2",
      half: null,
    });
  });
});
