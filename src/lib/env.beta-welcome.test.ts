// Tests for the beta welcome flag (BETA_WELCOME_LIVE).
//
// Unlike the §12 rollout flags (default-OFF), this presentational pilot screen
// is default-ON: it renders unless the env var is the literal string 'false'.
// That contract is load-bearing — it's how the screen is removed at v1.0 with
// no code change — so it is pinned here.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isBetaWelcomeEnabled } from "./env";

describe("BETA_WELCOME_LIVE", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.BETA_WELCOME_LIVE;
    delete process.env.BETA_WELCOME_LIVE;
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.BETA_WELCOME_LIVE;
    else process.env.BETA_WELCOME_LIVE = saved;
  });

  it("defaults ON when the env var is unset", () => {
    expect(isBetaWelcomeEnabled()).toBe(true);
  });

  it("is OFF only for the literal string 'false'", () => {
    process.env.BETA_WELCOME_LIVE = "false";
    expect(isBetaWelcomeEnabled()).toBe(false);
  });

  it("stays ON for 'true' and any other value", () => {
    for (const val of ["true", "TRUE", "1", "yes", "", " false "]) {
      process.env.BETA_WELCOME_LIVE = val;
      expect(isBetaWelcomeEnabled()).toBe(true);
    }
  });
});
