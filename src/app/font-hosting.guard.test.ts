// Guard: the production build must not depend on a third-party font CDN.
//
// On 2026-08-13 `next/font/google` resolved Plus Jakarta Sans woff2 URLs that
// fonts.gstatic.com then answered with HTTP 404. Turbopack could not resolve the
// font modules, `pnpm run build` exited 1, and the production deploy failed on a
// commit whose only change was three markdown files. The verify bar was green —
// it builds the same code, just at a moment when Google happened to serve the
// files. That is the failure this guard exists to prevent recurring: not a bug
// in our code, but a build we did not fully control.
//
// Fonts are now committed under src/app/fonts/ and loaded with next/font/local.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "src", "app");
const FONTS_DIR = join(APP_DIR, "fonts");
const LAYOUT = join(APP_DIR, "layout.tsx");

/** Every .ts/.tsx source file under src/, excluding tests. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      sourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const SOURCES = sourceFiles(join(process.cwd(), "src"));

describe("font hosting", () => {
  it("scans a non-trivial number of source files (guard is not vacuous)", () => {
    expect(SOURCES.length).toBeGreaterThan(50);
  });

  it("no source file imports next/font/google", () => {
    const offenders = SOURCES.filter((f) =>
      /from\s+["']next\/font\/google["']/.test(readFileSync(f, "utf8")),
    ).map((f) => f.replace(process.cwd(), ""));

    // next/font/google downloads each weight from fonts.gstatic.com during the
    // build. Commit the woff2 under src/app/fonts/ and use next/font/local.
    expect(offenders).toEqual([]);
  });

  it("layout.tsx loads every family through next/font/local", () => {
    const layout = readFileSync(LAYOUT, "utf8");
    expect(layout).toContain('from "next/font/local"');
    for (const family of [
      "--font-plus-jakarta",
      "--font-inter",
      "--font-playfair-display",
      "--font-dm-sans",
    ]) {
      expect(layout).toContain(family);
    }
  });

  it("every woff2 layout.tsx references is actually committed", () => {
    const layout = readFileSync(LAYOUT, "utf8");
    const referenced = [...layout.matchAll(/["']\.\/fonts\/([\w.-]+\.woff2)["']/g)].map(
      (m) => m[1],
    );

    expect(referenced.length).toBe(5);
    for (const file of referenced) {
      expect(existsSync(join(FONTS_DIR, file))).toBe(true);
    }
  });

  it("keeps the OFL license text alongside the fonts (SIL OFL 1.1 requires it)", () => {
    const licenses = readdirSync(FONTS_DIR).filter((f) => /^OFL-.*\.txt$/.test(f));
    expect(licenses.length).toBe(4);
    for (const file of licenses) {
      expect(readFileSync(join(FONTS_DIR, file), "utf8")).toContain(
        "SIL OPEN FONT LICENSE",
      );
    }
  });
});
