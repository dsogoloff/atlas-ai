// The on-screen COPPA disclosure and the downloadable PDF must say the SAME
// thing. This test enforces that against the real asset: it extracts the text
// from public/legal/coppa-disclosure-v1.pdf at test time and asserts every
// counsel string we render is present in it, verbatim.
//
// So a well-meaning edit to disclosure-copy.ts — a typo "fix", a tightened
// sentence — fails here rather than silently shipping a page that contradicts
// the document the parent can download.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync, inflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
  AI_PROCESSING_SECTION,
  DISCLOSURE_INTRO,
  DISCLOSURE_SECTIONS,
  DISCLOSURE_TITLE,
} from "./disclosure-copy";

const PDF_PATH = join(
  process.cwd(),
  "public",
  "legal",
  "coppa-disclosure-v1.pdf",
);

/**
 * Pull the readable text out of the PDF: inflate each content stream, then
 * collect the string literals fed to the `Tj` text operator. Enough for an
 * equality check — this is a simple, text-only, generated document.
 */
function pdfText(): string {
  const buf = readFileSync(PDF_PATH);
  const pieces: string[] = [];

  let cursor = 0;
  while (true) {
    const start = buf.indexOf("stream", cursor);
    if (start === -1) break;
    let from = start + "stream".length;
    if (buf[from] === 0x0d) from++; // CR
    if (buf[from] === 0x0a) from++; // LF
    const end = buf.indexOf("endstream", from);
    if (end === -1) break;

    const raw = buf.subarray(from, end);
    let decoded: string;
    try {
      decoded = inflateSync(raw).toString("latin1");
    } catch {
      try {
        decoded = inflateRawSync(raw).toString("latin1");
      } catch {
        decoded = raw.toString("latin1");
      }
    }
    pieces.push(decoded);
    cursor = end + "endstream".length;
  }

  // `(literal) Tj` — unescape the three escapes a generated PDF uses.
  const literals: string[] = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  for (const stream of pieces) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(stream)) !== null) {
      literals.push(m[1].replace(/\\([()\\])/g, "$1"));
    }
  }
  return normalize(literals.join(" "));
}

/** Collapse all whitespace — PDF line breaks are page-width artifacts. */
function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const PDF = pdfText();

describe("coppa-disclosure-v1.pdf — extraction sanity", () => {
  it("yields the document's text (guards against a silently empty parse)", () => {
    expect(PDF.length).toBeGreaterThan(3000);
    expect(PDF).toContain(DISCLOSURE_TITLE);
  });
});

describe("on-screen copy matches the counsel PDF verbatim", () => {
  it.each(DISCLOSURE_INTRO.map((p, i) => [`intro paragraph ${i + 1}`, p]))(
    "%s",
    (_label, paragraph) => {
      expect(PDF).toContain(normalize(paragraph));
    },
  );

  const rows: Array<[string, string]> = [];
  for (const section of DISCLOSURE_SECTIONS) {
    rows.push([`${section.heading} — heading`, section.heading]);
    for (const block of section.blocks) {
      for (const line of Array.isArray(block) ? block : [block as string]) {
        rows.push([`${section.heading} — "${line.slice(0, 48)}…"`, line]);
      }
    }
  }

  it.each(rows)("%s", (_label, text) => {
    expect(PDF).toContain(normalize(text));
  });

  it("covers all ten counsel sections", () => {
    expect(DISCLOSURE_SECTIONS).toHaveLength(10);
    expect(DISCLOSURE_SECTIONS[0].heading).toBe(
      "1. Parent or Guardian Consent Required",
    );
    expect(DISCLOSURE_SECTIONS[9].heading).toBe("10. Consent");
  });
});

describe("app-authored AI disclosure", () => {
  it("is NOT in the counsel PDF, and is numbered after the counsel sections", () => {
    // Documents the one deliberate divergence: safeguard C2 is ours, not
    // counsel's. If the PDF is ever revised to include it, move it into
    // DISCLOSURE_SECTIONS and delete this test.
    expect(PDF).not.toContain(normalize(AI_PROCESSING_SECTION.blocks[0] as string));
    expect(AI_PROCESSING_SECTION.heading).toBe("11. Automated (AI) Processing");
  });
});

describe("copy that was removed with the Stitch placeholder", () => {
  it.each([
    "Bank-grade security protocols",
    "For students under the age of 13",
    "Data Privacy Officer",
    "October 24, 2023",
  ])("%s is absent from the counsel text (so it must not be rendered)", (claim) => {
    expect(PDF).not.toContain(claim);
  });
});
