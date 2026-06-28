import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

import {
  extractSeedQuestionIds,
  readManifest,
  OVERRIDES,
  REPO_ROOT,
} from "../../../scripts/conversion/answer-key-manifest";

// Answer-key verification guard (process-hardening). The licensed key PDFs are untracked
// source, absent in CI, so CI cannot re-parse them. Instead the committed manifest
// (scripts/conversion/audit/answer-key-manifest.json) records the result of the full key
// audit, and this test enforces it can't silently rot:
//   1. COVERAGE — every active/inactive question in seed.sql has a manifest entry, so a
//      newly added question fails CI until the manifest is regenerated (which forces a
//      key check). Regenerate: `pnpm tsx scripts/conversion/answer-key-manifest.ts --write`.
//   2. OVERRIDE ALLOWLIST — the only key-contradicting active answers are the documented
//      overrides; adding another requires an explicit, reviewable code change.
//   3. NO UNCLASSIFIED ACTIVE ITEM — every active item is either key_verified or carries a
//      known non-graded verdict, so the count of unverified active items can't grow silently.
describe("answer-key verification manifest", () => {
  const seed = readFileSync(path.join(REPO_ROOT, "supabase", "seed.sql"), "utf8");
  const seedIds = extractSeedQuestionIds(seed);
  const manifest = readManifest();
  const manifestIds = manifest.map((e) => e.external_id);

  it("covers every seed question (no un-audited rows)", () => {
    const inSeedNotManifest = seedIds.filter((id) => !manifestIds.includes(id));
    const inManifestNotSeed = manifestIds.filter((id) => !seedIds.includes(id));
    expect(
      inSeedNotManifest,
      `Questions in seed.sql with no manifest entry — regenerate the manifest ` +
        `(pnpm tsx scripts/conversion/answer-key-manifest.ts --write) after verifying their ` +
        `answers against the level key:\n  ${inSeedNotManifest.join(", ")}`,
    ).toEqual([]);
    expect(
      inManifestNotSeed,
      `Manifest entries with no seed row (stale) — regenerate:\n  ${inManifestNotSeed.join(", ")}`,
    ).toEqual([]);
  });

  it("only the documented overrides contradict the key", () => {
    const overrideEntries = manifest.filter((e) => e.verdict === "MISMATCH_OVERRIDE").map((e) => e.external_id).sort();
    expect(
      overrideEntries,
      `Active key contradictions must be explicitly allowlisted in OVERRIDES with a reason. ` +
        `A new MISMATCH here means an answer no longer matches its key.`,
    ).toEqual(Object.keys(OVERRIDES).sort());
  });

  it("every active item is classified (key_verified or a known non-graded verdict)", () => {
    const KNOWN = new Set(["MATCH", "MISMATCH_OVERRIDE", "UNGRADEABLE_FROM_KEY", "NO_KEY_ENTRY"]);
    const active = manifest.filter((e) => e.active);
    expect(active.length).toBeGreaterThan(0);
    const unclassified = active.filter((e) => !KNOWN.has(e.verdict));
    expect(unclassified.map((e) => e.external_id)).toEqual([]);
    // key_verified is true iff verdict is MATCH.
    for (const e of active) expect(e.key_verified).toBe(e.verdict === "MATCH");
  });
});
