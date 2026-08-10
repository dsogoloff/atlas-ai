// Guard: the customer-facing surface must not emit "Atlas" or "Inspirea", and
// the S.A.M brand mark must be the exact two-dot form.
//
// This is a source-level scan rather than a render-level one because the
// customer surface spans ~20 route files across four route groups, several of
// which need a live Supabase session to render. Scanning source catches the
// regression that actually happens: someone hardcodes a brand string in a new
// component instead of reading src/lib/branding.
//
// SCOPE — customer-facing only. Deliberately NOT scanned:
//   - src/app/(admin)/** and src/app/dev/**  — internal Inspirea chrome; Atlas
//     branding stays there on purpose.
//   - src/lib/branding/tenants/atlas.ts      — the Atlas skin itself.
//   - comments                               — engineering prose, never rendered.
//   - the operator/processor disclosure      — the one legitimate Inspirea
//     reference on the customer surface (legal fine print).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { allBrandings } from ".";
import { samNewYorkBranding } from "./tenants/sam-new-york";

const APP_ROOT = join(process.cwd(), "src", "app");

/** Route groups that are internal Inspirea chrome, not customer-facing. */
const EXCLUDED_DIRS = ["(admin)", "dev"];

const BANNED = /\b(Atlas|Inspirea)\b/;

function customerFacingFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry)) continue;
      out.push(...customerFacingFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

/**
 * Strip `//` and block comments, and the `legal.processorDisclosure` reference,
 * leaving only text that can reach a customer's screen.
 */
function renderableText(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/branding\.legal\.processorDisclosure/g, "");
}

describe("customer-facing surface — no Atlas/Inspirea branding", () => {
  const files = customerFacingFiles(APP_ROOT);

  it("scans a non-trivial number of route files", () => {
    // Sanity: a broken walker that finds nothing would make the guard vacuous.
    expect(files.length).toBeGreaterThan(20);
  });

  it("emits no 'Atlas' or 'Inspirea' outside the legal fine-print slot", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = renderableText(readFileSync(file, "utf8"));
      text.split("\n").forEach((line, i) => {
        if (BANNED.test(line)) {
          offenders.push(`${relative(process.cwd(), file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the operator/processor disclosure available in legal fine print", () => {
    // The disclosure must NOT be scrubbed by a rebrand — it is a compliance
    // statement, not branding, and it is the one place Inspirea remains.
    const coppa = readFileSync(
      join(APP_ROOT, "(auth)", "coppa", "page.tsx"),
      "utf8",
    );
    expect(coppa).toContain("branding.legal.processorDisclosure");
    expect(samNewYorkBranding.legal.processorDisclosure).toMatch(/Inspirea/);
  });
});

describe("S.A.M brand mark — exact two-dot form", () => {
  // "S.A.M": dot after S, dot after A, NO dot after M. See BUSINESS_RULES.md.
  const THREE_DOT = /S\.A\.M\./;

  it("the S.A.M New York skin uses the two-dot mark everywhere", () => {
    const strings = JSON.stringify(samNewYorkBranding);
    expect(strings).toMatch(/S\.A\.M\b/);
    expect(strings).not.toMatch(THREE_DOT);
  });

  it("no customer-facing route renders 'S.A.M.'", () => {
    const offenders: string[] = [];
    for (const file of customerFacingFiles(APP_ROOT)) {
      const text = renderableText(readFileSync(file, "utf8"));
      text.split("\n").forEach((line, i) => {
        if (THREE_DOT.test(line)) {
          offenders.push(`${relative(process.cwd(), file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("branding registry", () => {
  it("every skin has a unique key and a resolvable logo path", () => {
    const keys = allBrandings().map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const b of allBrandings()) {
      expect(b.logo.src.startsWith("/")).toBe(true);
      expect(b.faviconHref.startsWith("/")).toBe(true);
    }
  });

  it("the S.A.M New York skin asserts no trademark and hides 'powered by'", () => {
    expect(samNewYorkBranding.trademarkSymbol).toBeNull();
    expect(samNewYorkBranding.poweredBy).toBeNull();
  });

  it("no skin leaks a Windows path separator into an asset href", () => {
    // Guards the file walk above being reused for asset paths on win32.
    expect(sep === "\\" || sep === "/").toBe(true);
    for (const b of allBrandings()) {
      expect(b.logo.src).not.toContain("\\");
    }
  });
});
