import { describe, expect, it } from "vitest";

import { mascotIsLively, mascotPoseFor } from "./mascot";

describe("mascotPoseFor", () => {
  it("waves while the session is starting (greeting beat)", () => {
    expect(mascotPoseFor("starting")).toBe("waving");
  });

  it("thinks while questions are running", () => {
    expect(mascotPoseFor("running")).toBe("thinking");
  });

  it("celebrates on completion", () => {
    expect(mascotPoseFor("completed")).toBe("celebrating");
  });

  it("stays out of error states entirely", () => {
    expect(mascotPoseFor("error")).toBeNull();
  });
});

describe("mascotIsLively", () => {
  it("animates for K_4 when motion is allowed", () => {
    expect(mascotIsLively("K_4", false)).toBe(true);
  });

  it("stays still for K_4 under prefers-reduced-motion", () => {
    expect(mascotIsLively("K_4", true)).toBe(false);
  });

  it("stays still for G5_8 regardless of motion preference", () => {
    expect(mascotIsLively("G5_8", false)).toBe(false);
    expect(mascotIsLively("G5_8", true)).toBe(false);
  });

  it("treats a null reduced-motion reading (SSR) as motion allowed for K_4", () => {
    // framer-motion's useReducedMotion returns null before hydration.
    expect(mascotIsLively("K_4", null)).toBe(true);
  });
});
