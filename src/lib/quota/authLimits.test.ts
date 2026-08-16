// ATLAS-004 — limiter logic and the privacy rules around it.
//
// The durable counting behaviour (windows, atomicity, recovery) is proven
// against a real database in tests/integration/quota.itest.ts. What is unit
// tested here is the part that must be right regardless of the store: the
// thresholds, the keying, and what does and does not leak.

import { describe, expect, it } from "vitest";

import {
  AUTH_LIMITS,
  MAX_AUTH_PAYLOAD_BYTES,
  authPayloadWithinLimit,
  type AuthLimitRule,
} from "./authLimits";

// `as const satisfies` narrows each entry to its own literal type, so iterating
// yields a union in which the IP-only members genuinely lack identifierLimit.
// Widen to the declared interface for the iterating assertions.
const RULES = Object.entries(AUTH_LIMITS) as Array<[string, AuthLimitRule]>;
import {
  aiGlobalBucket,
  aiSessionBucket,
  authIdentifierBucket,
  authIpBucket,
  hashIdentifier,
} from "./keys";
import {
  AI_DAILY_CALL_LIMIT_DEFAULT,
  AI_SESSION_CALL_LIMIT_DEFAULT,
} from "./aiSpend";

describe("auth thresholds — pilot-appropriate, not punitive", () => {
  it("keeps the per-IP limit LOOSER than the per-account limit", () => {
    // This is the property that stops a shared NAT — a school, a library, one
    // family's router — from collectively locking itself out. The tight gate
    // rides on the individual account instead.
    //
    // Only meaningful for routes that HAVE an account to key on: confirm/reset
    // carry an opaque token, and password_set identifies its account by the
    // recovery session, so both are IP-only by design.
    for (const [route, rule] of RULES) {
      if (rule.identifierLimit === undefined) continue;
      expect(
        rule.ipLimit,
        `${route}: per-IP must be looser than per-account`,
      ).toBeGreaterThan(rule.identifierLimit);
    }
  });

  it("marks exactly the token/session routes as IP-only", () => {
    const ipOnly = RULES.filter(([, rule]) => rule.identifierLimit === undefined)
      .map(([route]) => route)
      .sort();
    expect(ipOnly).toEqual(["confirm", "password_set"]);
  });

  it("allows a real person enough retries to recover from a typo", () => {
    // Ten password attempts in 15 minutes is generous for a human and useless
    // for a credential-stuffer.
    expect(AUTH_LIMITS.login.identifierLimit).toBeGreaterThanOrEqual(5);
    expect(AUTH_LIMITS.login.identifierLimit).toBeLessThanOrEqual(20);
  });

  it("limits the email-sending routes hardest", () => {
    // signup and reset both put mail in someone's inbox — the amplification
    // vector — so they are tighter than the routes that only touch our own DB.
    expect(AUTH_LIMITS.signup.identifierLimit!).toBeLessThanOrEqual(
      AUTH_LIMITS.login.identifierLimit,
    );
    expect(AUTH_LIMITS.reset.identifierLimit!).toBeLessThanOrEqual(
      AUTH_LIMITS.login.identifierLimit,
    );
  });

  it("keeps token confirmation loose — scanners pre-fetch those links", () => {
    expect(AUTH_LIMITS.confirm.ipLimit).toBeGreaterThanOrEqual(20);
  });

  it("every rule has a positive window and positive limits", () => {
    for (const [route, rule] of RULES) {
      expect(rule.windowSeconds, route).toBeGreaterThan(0);
      expect(rule.ipLimit, route).toBeGreaterThan(0);
      if (rule.identifierLimit !== undefined) {
        expect(rule.identifierLimit, route).toBeGreaterThan(0);
      }
    }
  });
});

describe("payload size cap — reject before the expensive work", () => {
  it("accepts a realistic auth payload", () => {
    expect(
      authPayloadWithinLimit({
        email: "parent@example.com",
        password: "correct horse battery staple",
      }),
    ).toBe(true);
  });

  it("rejects an oversized payload", () => {
    expect(
      authPayloadWithinLimit({ email: "a@b.c", password: "x".repeat(20_000) }),
    ).toBe(false);
  });

  it("rejects an unserialisable payload rather than guessing", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(authPayloadWithinLimit(cyclic)).toBe(false);
  });

  it("caps well below anything a form would legitimately send", () => {
    expect(MAX_AUTH_PAYLOAD_BYTES).toBeLessThanOrEqual(16_384);
  });
});

// ===========================================================================
// PRIVACY — bucket keys reach the database, so this is the rule that matters
// ===========================================================================
describe("bucket keys never carry an identity", () => {
  const EMAIL = "Parent.Person@Example.COM";

  it("hashes an email before it becomes a key", () => {
    const key = authIdentifierBucket("login", EMAIL);
    expect(key).not.toContain("Parent");
    expect(key).not.toContain("example.com");
    expect(key).not.toContain("@");
    expect(key).toContain(hashIdentifier(EMAIL));
  });

  it("normalises case and whitespace so one account is one bucket", () => {
    expect(hashIdentifier("  parent.person@example.com ")).toBe(
      hashIdentifier(EMAIL),
    );
  });

  it("gives different accounts different buckets", () => {
    expect(authIdentifierBucket("login", "a@example.com")).not.toBe(
      authIdentifierBucket("login", "b@example.com"),
    );
  });

  it("separates routes so signup attempts do not consume login budget", () => {
    expect(authIdentifierBucket("login", EMAIL)).not.toBe(
      authIdentifierBucket("signup", EMAIL),
    );
    expect(authIpBucket("login", "203.0.113.7")).not.toBe(
      authIpBucket("signup", "203.0.113.7"),
    );
  });

  it("separates the two AI dimensions", () => {
    expect(aiSessionBucket("s1")).not.toBe(aiSessionBucket("s2"));
    expect(aiGlobalBucket()).not.toContain("s1");
  });
});

describe("AI ceiling defaults", () => {
  it("gives a session generous headroom over its real maximum", () => {
    // A comprehensive assessment tops out at 26 items -> at most ~26 classifier
    // calls, plus a narration and one self-heal. The default must clear that
    // with room for legitimate retries, while still stopping a loop.
    expect(AI_SESSION_CALL_LIMIT_DEFAULT).toBeGreaterThan(28);
    expect(AI_SESSION_CALL_LIMIT_DEFAULT).toBeLessThan(200);
  });

  it("sets a daily ceiling far above pilot usage but far below a runaway", () => {
    expect(AI_DAILY_CALL_LIMIT_DEFAULT).toBeGreaterThan(
      AI_SESSION_CALL_LIMIT_DEFAULT * 10,
    );
    expect(AI_DAILY_CALL_LIMIT_DEFAULT).toBeLessThanOrEqual(10_000);
  });
});
