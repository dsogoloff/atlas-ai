// ATLAS-012 (partial) — the shipped security headers.
//
// These assert the header SET and the route classes it applies to. Where
// possible they read .next/routes-manifest.json — the artifact Next actually
// compiles next.config's headers() into — so the test reflects what ships
// rather than what the source says it intends. When no build output is present
// (a bare `pnpm test` on a clean checkout) those assertions skip and the
// source-level ones still run; CI runs `next build` in the same job, so the
// manifest assertions do execute there.
//
// Fresh-browser verification over the wire belongs to the ATLAS-017 Playwright
// layer and is listed as todo at the bottom.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  applySecurityHeaders,
  BASE_SECURITY_HEADERS,
  CHILD_ROUTE_SOURCES,
  CHILD_SECURITY_HEADERS,
} from "./headers";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, ".next", "routes-manifest.json");

function headerMap(set: readonly { key: string; value: string }[]) {
  return Object.fromEntries(set.map((h) => [h.key, h.value]));
}

const base = headerMap(BASE_SECURITY_HEADERS);
const child = headerMap(CHILD_SECURITY_HEADERS);

describe("base header set — applied to every route", () => {
  it("sets HSTS for two years including subdomains", () => {
    expect(base["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains",
    );
  });

  it("does NOT ship preload — that is a domain-wide founder decision", () => {
    // preload is a browser-list submission, slow to reverse, and with
    // includeSubDomains it would commit every subdomain of samnewyork.com —
    // including the marketing site this repo does not own.
    expect(base["Strict-Transport-Security"]).not.toContain("preload");
  });

  it("blocks MIME sniffing", () => {
    expect(base["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("denies framing BOTH ways — legacy and modern", () => {
    expect(base["X-Frame-Options"]).toBe("DENY");
    expect(base["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
  });

  it("ships ONLY frame-ancestors as CSP — a full policy is Bar 2's job", () => {
    // A policy with only frame-ancestors cannot break a surface: unspecified
    // directives are unrestricted. If script-src/default-src ever appear here
    // without the report-only rollout, that is the mistake this guards.
    const csp = base["Content-Security-Policy"];
    expect(csp).not.toContain("default-src");
    expect(csp).not.toContain("script-src");
    expect(csp).not.toContain("style-src");
    expect(csp.split(";").filter((s) => s.trim())).toHaveLength(1);
  });

  it("sets a sane default referrer policy", () => {
    expect(base["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("denies every powerful browser feature (the app uses none)", () => {
    const policy = base["Permissions-Policy"];
    for (const feature of [
      "camera",
      "microphone",
      "geolocation",
      "payment",
      "usb",
      "display-capture",
      "fullscreen",
      "autoplay",
    ]) {
      expect(policy, `${feature} must be denied`).toContain(`${feature}=()`);
    }
  });

  it("leaves no feature accidentally allow-listed", () => {
    // Every directive must be an empty allowlist. A `feature=(self)` slipping
    // in is exactly the regression worth catching.
    for (const directive of base["Permissions-Policy"].split(",")) {
      expect(directive.trim()).toMatch(/^[a-z-]+=\(\)$/);
    }
  });
});

describe("child assessment routes — the stricter set (ties to ATLAS-006)", () => {
  it("hardens the referrer policy to no-referrer", () => {
    expect(child["Referrer-Policy"]).toBe("no-referrer");
    expect(child["Referrer-Policy"]).not.toBe(base["Referrer-Policy"]);
  });

  it("differs from the base set ONLY in the referrer policy", () => {
    // One deliberate difference, not a divergent second policy that could
    // drift out of step with the base.
    const differing = Object.keys(base).filter((k) => base[k] !== child[k]);
    expect(differing).toEqual(["Referrer-Policy"]);
  });

  it("keeps every other protection at full strength", () => {
    expect(child["X-Frame-Options"]).toBe("DENY");
    expect(child["X-Content-Type-Options"]).toBe("nosniff");
    expect(child["Strict-Transport-Security"]).toBe(
      base["Strict-Transport-Security"],
    );
    expect(child["Permissions-Policy"]).toBe(base["Permissions-Policy"]);
  });

  it("covers the assessment route and everything nested under it", () => {
    expect([...CHILD_ROUTE_SOURCES]).toEqual([
      "/assessment",
      "/assessment/:path*",
    ]);
  });
});

describe("applySecurityHeaders — used for middleware-short-circuited responses", () => {
  it("writes the whole base set onto a Headers object", () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    for (const { key, value } of BASE_SECURITY_HEADERS) {
      expect(headers.get(key)).toBe(value);
    }
  });

  it("can apply the child set explicitly", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, CHILD_SECURITY_HEADERS);
    expect(headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("overwrites rather than appends (no duplicate header values)", () => {
    const headers = new Headers({ "X-Frame-Options": "SAMEORIGIN" });
    applySecurityHeaders(headers);
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });
});

// ===========================================================================
// What actually ships — read from the compiled routes manifest
// ===========================================================================
describe("compiled output (.next/routes-manifest.json)", () => {
  const present = existsSync(MANIFEST);
  const manifest = present
    ? (JSON.parse(readFileSync(MANIFEST, "utf8")) as {
        headers?: Array<{ source: string; regex: string; headers: Array<{ key: string; value: string }> }>;
      })
    : null;

  it.runIf(present)("compiles a catch-all rule carrying the base set", () => {
    const rules = manifest!.headers ?? [];
    expect(rules.length).toBeGreaterThan(0);

    const catchAll = rules.find((r) => r.source === "/:path*");
    expect(catchAll, "no /:path* header rule was compiled").toBeDefined();

    const compiled = headerMap(catchAll!.headers);
    for (const { key, value } of BASE_SECURITY_HEADERS) {
      expect(compiled[key]).toBe(value);
    }
  });

  it.runIf(present)("compiles the child rules AFTER the catch-all so they win", () => {
    const rules = manifest!.headers ?? [];
    const catchAllIndex = rules.findIndex((r) => r.source === "/:path*");
    for (const source of CHILD_ROUTE_SOURCES) {
      const index = rules.findIndex((r) => r.source === source);
      expect(index, `${source} rule missing`).toBeGreaterThan(-1);
      // Later rule wins for the same key — that is what makes no-referrer stick.
      expect(index).toBeGreaterThan(catchAllIndex);
      expect(headerMap(rules[index].headers)["Referrer-Policy"]).toBe(
        "no-referrer",
      );
    }
  });

  it.runIf(present)("the catch-all regex matches every representative route", () => {
    const rules = manifest!.headers ?? [];
    const catchAll = rules.find((r) => r.source === "/:path*")!;
    const re = new RegExp(catchAll.regex);
    for (const route of [
      "/", // marketing
      "/login", // auth
      "/signup",
      "/coppa",
      "/dashboard", // parent
      "/report",
      "/assessment", // child
      "/instructor", // staff
      "/instructor/student/abc",
      "/admin",
      "/api/assess/submit", // API route handler
      "/mfa/enroll",
    ]) {
      expect(re.test(route), `${route} not covered by the catch-all`).toBe(true);
    }
  });
});

// Over-the-wire verification in a real browser is the ATLAS-017 Playwright
// layer. Listed so the cases are not lost; not built here.
describe("pending E2E (ATLAS-017 Playwright layer)", () => {
  it.todo("GET / returns HSTS, nosniff, DENY, frame-ancestors, Referrer-Policy, Permissions-Policy");
  it.todo("GET /assessment returns Referrer-Policy: no-referrer");
  it.todo("POST to a server action carries the base header set");
  it.todo("GET /api/assess/submit carries the base header set");
  it.todo("the ATLAS-007 MFA redirect response carries the base header set");
  it.todo("attempting to frame any route in an iframe is blocked by the browser");
});
