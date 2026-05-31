// Tests for the §12 staged-rollout feature flags.
//
// The load-bearing invariant (strategy §12 / BUSINESS_RULES "Staged rollout"):
// every rollout flag is OFF unless its env var is the literal string 'true'.
// A regression here would silently globally-enable a high-risk feature, so the
// default-off contract is pinned here per flag and in aggregate.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ROLLOUT_FLAGS } from "./env";

const FLAG_KEYS = Object.keys(ROLLOUT_FLAGS) as Array<
  keyof typeof ROLLOUT_FLAGS
>;
const ALL_ENV_VARS = FLAG_KEYS.map((k) => ROLLOUT_FLAGS[k].envVar);

describe("§12 rollout flags", () => {
  // Snapshot + clear the flag env vars so the ambient environment can't make a
  // "default-off" assertion pass for the wrong reason, and restore after.
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const v of ALL_ENV_VARS) {
      saved[v] = process.env[v];
      delete process.env[v];
    }
  });

  afterEach(() => {
    for (const v of ALL_ENV_VARS) {
      if (saved[v] === undefined) delete process.env[v];
      else process.env[v] = saved[v];
    }
  });

  it("registers all 11 §12 flags", () => {
    expect(FLAG_KEYS).toHaveLength(11);
  });

  it("defaults every flag to OFF when its env var is unset", () => {
    for (const key of FLAG_KEYS) {
      expect(ROLLOUT_FLAGS[key].get()).toBe(false);
    }
  });

  it("treats any value other than the literal 'true' as OFF", () => {
    for (const key of FLAG_KEYS) {
      const { envVar, get } = ROLLOUT_FLAGS[key];
      for (const val of ["false", "1", "TRUE", "yes", "", " true "]) {
        process.env[envVar] = val;
        expect(get()).toBe(false);
      }
      delete process.env[envVar];
    }
  });

  it("enables a flag only when its env var is exactly 'true'", () => {
    for (const key of FLAG_KEYS) {
      const { envVar, get } = ROLLOUT_FLAGS[key];
      process.env[envVar] = "true";
      expect(get()).toBe(true);
      delete process.env[envVar];
      // Setting one flag must not enable the others.
      for (const other of FLAG_KEYS) {
        if (other !== key) expect(ROLLOUT_FLAGS[other].get()).toBe(false);
      }
    }
  });
});
