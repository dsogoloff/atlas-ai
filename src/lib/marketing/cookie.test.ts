import { describe, expect, it } from "vitest";

import { ATTRIBUTION_COOKIE } from "./attribution";
import {
  attributionFromCookieString,
  buildAttributionCookie,
  readCookieValue,
  resolveCookieDomain,
} from "./cookie";

describe("resolveCookieDomain", () => {
  it("scopes the app subdomain to the REGISTRABLE domain (the whole point)", () => {
    // app.samnewyork.com and www.samnewyork.com must share one cookie.
    expect(resolveCookieDomain("app.samnewyork.com")).toBe(".samnewyork.com");
    expect(resolveCookieDomain("www.samnewyork.com")).toBe(".samnewyork.com");
    expect(resolveCookieDomain("samnewyork.com")).toBe(".samnewyork.com");
  });

  it("never scopes to the app subdomain itself", () => {
    expect(resolveCookieDomain("app.samnewyork.com")).not.toBe(
      "app.samnewyork.com",
    );
    expect(resolveCookieDomain("app.samnewyork.com")).not.toBe(
      ".app.samnewyork.com",
    );
  });

  it("is case- and trailing-dot-insensitive", () => {
    expect(resolveCookieDomain("APP.SamNewYork.com.")).toBe(".samnewyork.com");
  });

  it("returns null (host-only) for localhost, IPs and empty hosts", () => {
    expect(resolveCookieDomain("localhost")).toBeNull();
    expect(resolveCookieDomain("127.0.0.1")).toBeNull();
    expect(resolveCookieDomain("[::1]")).toBeNull();
    expect(resolveCookieDomain("")).toBeNull();
  });

  it("returns null on *.vercel.app — a public suffix, not a registrable domain", () => {
    expect(resolveCookieDomain("atlas-ai-git-lane.vercel.app")).toBeNull();
  });

  it("handles multi-part public suffixes", () => {
    expect(resolveCookieDomain("app.example.co.uk")).toBe(".example.co.uk");
    expect(resolveCookieDomain("example.co.uk")).toBe(".example.co.uk");
    expect(resolveCookieDomain("co.uk")).toBeNull();
  });
});

describe("buildAttributionCookie", () => {
  const attribution = { utm_source: "facebook", utm_campaign: "sam_ny_fall" };

  it("writes Path=/, a 90-day Max-Age, SameSite=Lax and the registrable Domain", () => {
    const cookie = buildAttributionCookie(
      attribution,
      "app.samnewyork.com",
      true,
    );
    expect(cookie).toContain(`${ATTRIBUTION_COOKIE}=`);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain(`Max-Age=${90 * 24 * 60 * 60}`);
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Domain=.samnewyork.com");
    expect(cookie).toContain("Secure");
  });

  it("uses SameSite=Lax so an ad click (cross-site nav) still carries it", () => {
    expect(
      buildAttributionCookie(attribution, "samnewyork.com", true),
    ).not.toContain("SameSite=Strict");
  });

  it("omits Domain and Secure on plain-http localhost", () => {
    const cookie = buildAttributionCookie(attribution, "localhost", false);
    expect(cookie).not.toContain("Domain=");
    expect(cookie).not.toContain("Secure");
  });

  it("round-trips through a document.cookie-style string", () => {
    const cookie = buildAttributionCookie(
      attribution,
      "app.samnewyork.com",
      true,
    );
    const jar = `sb-access-token=xyz; ${cookie.split(";")[0]}; other=1`;
    expect(attributionFromCookieString(jar)).toEqual(attribution);
  });
});

describe("readCookieValue", () => {
  it("finds a cookie among others and tolerates spacing", () => {
    expect(readCookieValue("a=1;  b=2 ; c=3", "b")).toBe("2");
  });

  it("does not match on a prefix of another cookie name", () => {
    expect(readCookieValue("atlas_attrib_v2=zzz", "atlas_attrib")).toBeUndefined();
  });

  it("returns undefined when absent or when the jar is empty", () => {
    expect(readCookieValue("", "atlas_attrib")).toBeUndefined();
    expect(readCookieValue("a=1", "atlas_attrib")).toBeUndefined();
  });

  it("keeps '=' inside a value intact", () => {
    expect(readCookieValue("a=b=c", "a")).toBe("b=c");
  });
});

describe("attributionFromCookieString", () => {
  it("returns empty for an unattributed visitor", () => {
    expect(attributionFromCookieString("sb-access-token=xyz")).toEqual({});
  });
});
