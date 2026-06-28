// Atlas Assessment — ANSWER-KEY VERIFICATION MANIFEST (generator + shared readers).
//
// WHY: the licensed S.A.M. answer-key PDFs are untracked source (scripts/conversion/
// source/**), so they are ABSENT in CI — a CI job cannot re-parse them. Yet every active
// bank item's stored answer must trace to a key entry (the source-verification rule).
// The feasible guard is a COMMITTED manifest (this audit's result) plus a CI test that
// (a) every active seed question appears in the manifest, and (b) no active item carries
// an un-allowlisted MISMATCH. New/edited questions then cannot ship without a manifest
// entry, and a fresh accidental key contradiction fails the build.
//
// The manifest is regenerated locally (source present) by:
//   pnpm tsx scripts/conversion/answer-key-manifest.ts --write
// Verdicts below are the 2026-06-28 full key audit (all 9 booklets, every active item).
// The id SET is DERIVED from seed.sql (comments stripped) so it can never drift from the
// real rows; only verdict classification is encoded here.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "..", "..");
const SEED = path.join(REPO_ROOT, "supabase", "seed.sql");
export const MANIFEST_PATH = path.join(HERE, "audit", "answer-key-manifest.json");

const EXTERNAL_ID = /SAM-L(?:0[ABC]|[1-6])-Q\d+[A-Z]?/g;

/** Unique question external_ids referenced in real SQL (──comments stripped so a
 *  "held Q17" note never counts as a row). Excludes the PLACEHOLDER- dev row. */
export function extractSeedQuestionIds(seedSql: string): string[] {
  const noComments = seedSql
    .split("\n")
    .map((l) => {
      const i = l.indexOf("--");
      return i === -1 ? l : l.slice(0, i);
    })
    .join("\n");
  const ids = new Set<string>();
  for (const m of noComments.matchAll(EXTERNAL_ID)) ids.add(m[0]);
  return [...ids].filter((id) => !id.startsWith("PLACEHOLDER-")).sort();
}

export function bookletOf(externalId: string): string {
  const m = externalId.match(/^SAM-(L(?:0[ABC]|[1-6]))-/);
  return m ? m[1] : "?";
}

// ── 2026-06-28 audit classification (active items only need a non-MATCH note) ──────────
// Inactive in final seed state (not served; not key-graded here).
const INACTIVE = new Set<string>([
  "SAM-L0A-Q01","SAM-L0A-Q02","SAM-L0A-Q04","SAM-L0A-Q09","SAM-L0A-Q12","SAM-L0A-Q16","SAM-L0A-Q18",
  "SAM-L0B-Q01","SAM-L0B-Q05","SAM-L0B-Q08","SAM-L0B-Q12","SAM-L0B-Q13",
  "SAM-L0C-Q01","SAM-L0C-Q02","SAM-L0C-Q06","SAM-L0C-Q07","SAM-L0C-Q11","SAM-L0C-Q12",
  "SAM-L1-Q06","SAM-L1-Q08","SAM-L1-Q09","SAM-L1-Q18","SAM-L1-Q25","SAM-L1-Q26",
  "SAM-L2-Q04",
  "SAM-L3-Q19",
  "SAM-L5-Q08","SAM-L5-Q12",
  "SAM-L6-Q26",
]);

// Active, but the key cell is open/observational (young-band tap/position/draw) — no key
// value to compare against.
const UNGRADEABLE_FROM_KEY = new Set<string>([
  "SAM-L0A-Q03","SAM-L0A-Q05","SAM-L0A-Q06","SAM-L0A-Q07","SAM-L0A-Q10","SAM-L0A-Q13","SAM-L0A-Q14","SAM-L0A-Q15",
  "SAM-L0B-Q03",
  "SAM-L0C-Q05",
]);

// Active, but the key TABLE CELL for this task is blank (no printed answer) — stored answer
// is internally/arithmetically consistent but cannot be traced to a key entry.
const NO_KEY_ENTRY = new Set<string>([
  "SAM-L1-Q07","SAM-L1-Q13","SAM-L1-Q15",
  "SAM-L6-Q09","SAM-L6-Q10","SAM-L6-Q11","SAM-L6-Q12","SAM-L6-Q13","SAM-L6-Q15","SAM-L6-Q16",
]);

// Active items whose stored answer DELIBERATELY diverges from the printed key — documented
// founder/team overrides. Allowlisted so they pass; a NEW (un-listed) mismatch fails CI.
export const OVERRIDES: Record<string, { stored: string; key: string; reason: string }> = {
  "SAM-L0B-Q06": {
    stored: "{7, 8} (stem reinterpreted: tap numbers greater than 6)",
    key: "colour 7 and 6 → {6, 7}",
    reason: "Founder reinterpreted the worksheet's contradictory instruction; seed.sql:3982-3985,4003.",
  },
  "SAM-L3-Q17": {
    stored: "25",
    key: "3",
    reason: "Team judged the printed key wrong; picture-graph (9-4)×5=25; seed.sql:3825-3829.",
  },
};

export type Verdict =
  | "MATCH" | "MISMATCH_OVERRIDE" | "UNGRADEABLE_FROM_KEY" | "NO_KEY_ENTRY" | "INACTIVE";

export interface ManifestEntry {
  external_id: string;
  booklet: string;
  active: boolean;
  verdict: Verdict;
  key_verified: boolean;
  note?: string;
}

export function classify(externalId: string): ManifestEntry {
  const booklet = bookletOf(externalId);
  if (INACTIVE.has(externalId))
    return { external_id: externalId, booklet, active: false, verdict: "INACTIVE", key_verified: false };
  if (OVERRIDES[externalId]) {
    const o = OVERRIDES[externalId];
    return { external_id: externalId, booklet, active: true, verdict: "MISMATCH_OVERRIDE",
      key_verified: false, note: `stored=${o.stored}; key=${o.key}; ${o.reason}` };
  }
  if (UNGRADEABLE_FROM_KEY.has(externalId))
    return { external_id: externalId, booklet, active: true, verdict: "UNGRADEABLE_FROM_KEY",
      key_verified: false, note: "key cell is open/observational (no value to compare)" };
  if (NO_KEY_ENTRY.has(externalId))
    return { external_id: externalId, booklet, active: true, verdict: "NO_KEY_ENTRY",
      key_verified: false,
      note: booklet === "L6"
        ? "L6 AWARENESS: fraction/decimal item — answer is COMPUTED, NOT key-verified (key table cell blank). Founder-acknowledged 2026-06-28."
        : "key table cell blank; stored answer not traceable to a key entry" };
  return { external_id: externalId, booklet, active: true, verdict: "MATCH", key_verified: true };
}

export function buildManifest(seedSql: string): ManifestEntry[] {
  return extractSeedQuestionIds(seedSql).map(classify);
}

export function readManifest(): ManifestEntry[] {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")).entries as ManifestEntry[];
}

// CLI: --write regenerates the committed manifest from the current seed.
const INVOKED = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED) {
  const entries = buildManifest(readFileSync(SEED, "utf8"));
  const counts = entries.reduce<Record<string, number>>((a, e) => ((a[e.verdict] = (a[e.verdict] ?? 0) + 1), a), {});
  if (process.argv.includes("--write")) {
    const payload = {
      generated_by: "scripts/conversion/answer-key-manifest.ts",
      audit_date: "2026-06-28",
      note: "Regenerate with `pnpm tsx scripts/conversion/answer-key-manifest.ts --write` after adding/editing questions or re-auditing keys.",
      counts,
      entries,
    };
    writeFileSync(MANIFEST_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
    process.stdout.write(`[answer-key-manifest] wrote ${entries.length} entries -> ${MANIFEST_PATH}\n`);
  }
  process.stdout.write(`[answer-key-manifest] ${entries.length} questions; counts=${JSON.stringify(counts)}\n`);
}
