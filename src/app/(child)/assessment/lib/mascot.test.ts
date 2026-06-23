import { describe, expect, it } from "vitest";

import {
  MASCOT_SRC,
  footerMascotPose,
  mascotIsLively,
  mascotPoseFor,
  questionMascotIsLively,
} from "./mascot";

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

describe("questionMascotIsLively (in-question footer — all tiers)", () => {
  it("animates when motion is allowed, regardless of tier", () => {
    // No tier param: the in-question mascot is intentionally tier-agnostic.
    expect(questionMascotIsLively(false)).toBe(true);
  });

  it("stays still under prefers-reduced-motion", () => {
    expect(questionMascotIsLively(true)).toBe(false);
  });

  it("treats a null reduced-motion reading (SSR) as motion allowed", () => {
    expect(questionMascotIsLively(null)).toBe(true);
  });
});

describe("MASCOT_SRC", () => {
  it("points every pose at a transparent public/mascot asset", () => {
    expect(MASCOT_SRC.waving).toBe("/mascot/waving.png");
    expect(MASCOT_SRC.thinking).toBe("/mascot/thinking.png");
    expect(MASCOT_SRC.celebrating).toBe("/mascot/celebrating.png");
  });
});

describe("footerMascotPose", () => {
  it("idles on the thinking pose between submits", () => {
    expect(footerMascotPose(false)).toBe("thinking");
  });

  it("swaps to celebrating during the submit beat", () => {
    expect(footerMascotPose(true)).toBe("celebrating");
  });
});
