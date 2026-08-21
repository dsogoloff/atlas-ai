// Regression guard for the 2026-04-26 -> 2026-08-21 silent outage: signUp()
// and resetPasswordForEmail() minted PKCE-flavored tokens that /auth/confirm
// and /auth/reset's verifyOtp({ token_hash }) calls could never accept,
// because @supabase/ssr hardcodes flowType: "pkce" and cannot be overridden.
//
// This test does NOT hit a live Supabase project — it asserts the exact
// options this module passes to @supabase/supabase-js's createClient, which
// is the one fact that determines whether a minted token is PKCE-flavored or
// plain-hash. If this ever regresses (flowType option removed, changed back
// to "pkce", or this module gets swapped back to the @supabase/ssr wrapper),
// this test fails — it is the standing guard against the exact defect
// recurring silently again.

import { describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.fn<
  (
    url: string,
    key: string,
    options: { auth: Record<string, unknown> },
  ) => { auth: Record<string, unknown> }
>(() => ({ auth: {} }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string, options: { auth: Record<string, unknown> }) =>
    mockCreateClient(url, key, options),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  },
}));

import { createTokenHashClient } from "./tokenHashClient";

describe("createTokenHashClient", () => {
  it("forces flowType 'implicit' — never 'pkce'", () => {
    createTokenHashClient();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    const [, , options] = mockCreateClient.mock.calls[0];
    expect(options.auth.flowType).toBe("implicit");
    expect(options.auth.flowType).not.toBe("pkce");
  });

  it("uses @supabase/supabase-js directly, NOT the @supabase/ssr wrapper", async () => {
    // The @supabase/ssr wrapper is what hardcodes flowType: "pkce" — this
    // module must import createClient from @supabase/supabase-js only. Scoped
    // to actual `import` lines, not the whole file — the header comment
    // legitimately mentions "@supabase/ssr" in prose to explain why it's
    // avoided.
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./tokenHashClient.ts", import.meta.url), "utf-8"),
    );
    const importLines = source
      .split("\n")
      .filter((line) => line.trim().startsWith("import "));
    expect(importLines.some((l) => l.includes('"@supabase/supabase-js"'))).toBe(
      true,
    );
    expect(importLines.some((l) => l.includes("@supabase/ssr"))).toBe(false);
  });

  it("does not persist a session or auto-refresh (stateless, one-off call)", () => {
    createTokenHashClient();

    const [, , options] = mockCreateClient.mock.calls[0];
    expect(options.auth.persistSession).toBe(false);
    expect(options.auth.autoRefreshToken).toBe(false);
  });

  it("uses the project URL and anon key from env — not the service role", () => {
    createTokenHashClient();

    const [url, key] = mockCreateClient.mock.calls[0];
    expect(url).toBe("https://project.supabase.co");
    expect(key).toBe("anon-key");
  });
});
