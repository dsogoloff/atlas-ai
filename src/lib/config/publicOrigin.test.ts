// ATLAS-011 — the canonical origin resolver.
//
// The property under test is narrow and absolute: the origin used for auth
// email comes from APP_PUBLIC_ORIGIN and from nothing else. No header, no
// inference, no fallback.

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  APP_PUBLIC_ORIGIN_VAR,
  assertPublicOriginConfigured,
  canonicalUrl,
  getAppPublicOrigin,
  validatePublicOrigin,
} from "./publicOrigin";

const PROD = "https://app.samnewyork.com";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("validatePublicOrigin — accepts", () => {
  it.each([
    ["production", PROD],
    ["a preview deployment", "https://atlas-ai-git-branch-user.vercel.app"],
    ["localhost dev", "http://localhost:3000"],
    ["loopback dev", "http://127.0.0.1:3000"],
    ["https with an explicit port", "https://app.samnewyork.com:8443"],
  ])("%s: %s", (_label, value) => {
    const result = validatePublicOrigin(value);
    expect(result.ok).toBe(true);
  });

  it("normalises a trailing slash to a bare origin", () => {
    const result = validatePublicOrigin(`${PROD}/`);
    expect(result).toEqual({ ok: true, origin: PROD });
  });

  it("trims surrounding whitespace (a common env-var paste error)", () => {
    expect(validatePublicOrigin(`  ${PROD}  `)).toEqual({ ok: true, origin: PROD });
  });
});

describe("validatePublicOrigin — rejects", () => {
  it.each([
    ["unset", undefined],
    ["null", null],
    ["empty", ""],
    ["whitespace only", "   "],
    ["not a URL", "app.samnewyork.com"],
    ["scheme-relative", "//app.samnewyork.com"],
    ["a path", "https://app.samnewyork.com/app"],
    ["a query", "https://app.samnewyork.com/?x=1"],
    ["a fragment", "https://app.samnewyork.com/#x"],
    ["embedded credentials", "https://user:pw@app.samnewyork.com"],
    ["a non-http scheme", "ftp://app.samnewyork.com"],
    ["javascript:", "javascript:alert(1)"],
    ["plain http on a public host", "http://app.samnewyork.com"],
  ])("%s", (_label, value) => {
    const result = validatePublicOrigin(value as string | undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain(APP_PUBLIC_ORIGIN_VAR);
  });
});

describe("assertPublicOriginConfigured — preflight (ATLAS-020 reuses this)", () => {
  it("returns the origin when configured", () => {
    expect(assertPublicOriginConfigured(PROD)).toBe(PROD);
  });

  it("THROWS when unset rather than falling back to anything", () => {
    // The whole point: a missing variable must stop the send, not quietly
    // resume trusting a header or emit a broken link.
    expect(() => assertPublicOriginConfigured(undefined)).toThrow(
      /APP_PUBLIC_ORIGIN is not set/,
    );
  });

  it("THROWS when malformed, and names the variable and the prod value", () => {
    expect(() => assertPublicOriginConfigured("not a url")).toThrow(
      /APP_PUBLIC_ORIGIN/,
    );
    expect(() => assertPublicOriginConfigured("not a url")).toThrow(
      /app\.samnewyork\.com/,
    );
  });

  it("reads process.env by default", () => {
    vi.stubEnv(APP_PUBLIC_ORIGIN_VAR, PROD);
    expect(assertPublicOriginConfigured()).toBe(PROD);
  });
});

describe("getAppPublicOrigin / canonicalUrl", () => {
  it("builds an auth-email URL on the configured origin", () => {
    vi.stubEnv(APP_PUBLIC_ORIGIN_VAR, PROD);
    expect(getAppPublicOrigin()).toBe(PROD);
    expect(canonicalUrl("/auth/confirm?next=/coppa")).toBe(
      `${PROD}/auth/confirm?next=/coppa`,
    );
    expect(canonicalUrl("/auth/reset?next=/login")).toBe(
      `${PROD}/auth/reset?next=/login`,
    );
  });

  it("throws when handed an absolute URL instead of a path", () => {
    // This is the "someone reintroduced a derived origin" shape. Passing it
    // through would silently restore the vulnerability.
    vi.stubEnv(APP_PUBLIC_ORIGIN_VAR, PROD);
    expect(() => canonicalUrl("https://evil.example/auth/confirm")).toThrow(
      /root-relative/,
    );
  });

  it("throws rather than emitting a link when the origin is unset", () => {
    vi.stubEnv(APP_PUBLIC_ORIGIN_VAR, "");
    expect(() => canonicalUrl("/auth/confirm")).toThrow(/APP_PUBLIC_ORIGIN/);
  });
});

// ===========================================================================
// THE HEADLINE REGRESSION TEST — the spoof, refused
// ===========================================================================
describe("hostile headers cannot influence the auth-email origin", () => {
  const HOSTILE = [
    "https://evil.example",
    "https://app.samnewyork.com.evil.example",
    "http://attacker.test:1337",
    "https://app.samnewyork.com@evil.example",
    "//evil.example",
  ];

  it.each(HOSTILE)(
    "a request carrying Origin/Referer/Host = %s still yields the canonical origin",
    (hostile) => {
      vi.stubEnv(APP_PUBLIC_ORIGIN_VAR, PROD);

      // Simulate every header an attacker could set. The resolver takes no
      // request argument AT ALL — that is the fix — so none of these can reach
      // it. Asserting on the produced URL keeps the test meaningful even if the
      // implementation is later refactored to accept a request.
      const forgedHeaders = new Headers({
        host: new URL(hostile.startsWith("//") ? `https:${hostile}` : hostile).host,
        "x-forwarded-host": "evil.example",
        forwarded: `host=evil.example;proto=https`,
        origin: hostile,
        referer: `${hostile}/signup`,
      });
      expect(forgedHeaders.get("origin")).toBe(hostile); // headers really are set

      const confirmUrl = canonicalUrl("/auth/confirm?next=/coppa");
      const resetUrl = canonicalUrl("/auth/reset?next=/login");

      expect(confirmUrl).toBe(`${PROD}/auth/confirm?next=/coppa`);
      expect(resetUrl).toBe(`${PROD}/auth/reset?next=/login`);
      expect(confirmUrl).not.toContain("evil.example");
      expect(resetUrl).not.toContain("evil.example");
      expect(confirmUrl.startsWith(`${PROD}/`)).toBe(true);
      expect(resetUrl.startsWith(`${PROD}/`)).toBe(true);
    },
  );

  it("a hostile value in the ENV VAR itself is still validated", () => {
    // Defence in depth: the canonical origin is trusted config, but a typo or a
    // compromised env should not produce an http:// link on a public host.
    vi.stubEnv(APP_PUBLIC_ORIGIN_VAR, "http://evil.example");
    expect(() => canonicalUrl("/auth/confirm")).toThrow(/https/);
  });
});
