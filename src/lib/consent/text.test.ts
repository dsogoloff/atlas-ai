import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CONSENT_TEXT,
  CONSENT_TEXT_VERSION,
  DISCLOSURE_CONTENT_SHA256,
  DISCLOSURE_VERSION,
} from "./text";

describe("consent-of-record integrity", () => {
  it("DISCLOSURE_CONTENT_SHA256 matches the served disclosure PDF bytes", () => {
    const pdf = readFileSync(
      path.join(process.cwd(), "public", "legal", "coppa-disclosure-v1.pdf"),
    );
    const digest = createHash("sha256").update(pdf).digest("hex");
    // If this fails, the served PDF and the hash persisted on every consent
    // record have drifted — regenerate via tools/legal/build_coppa_pdf.py and
    // update DISCLOSURE_CONTENT_SHA256 (and bump the version).
    expect(digest).toBe(DISCLOSURE_CONTENT_SHA256);
  });

  it("disclosure version is the v1 asset identifier", () => {
    expect(DISCLOSURE_VERSION).toBe("coppa-disclosure-v1");
  });

  it("consent attestation is the counsel-approved checkbox text", () => {
    expect(CONSENT_TEXT).toContain(
      "I am the parent or legal guardian and I consent",
    );
    expect(CONSENT_TEXT).toContain("this Parent Notice and Consent");
    // The old placeholder wording must be gone (single-source reconciliation).
    expect(CONSENT_TEXT).not.toContain("diagnostic data");
  });

  it("the consent text version is dated/non-empty so rows stay provable", () => {
    expect(CONSENT_TEXT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.v\d+$/);
  });
});
