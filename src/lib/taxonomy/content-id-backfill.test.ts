// Drift detector for the SAM-L2 per-question content_id backfill
// (20260610000000). Same spirit as seed.test.ts's taxonomy parity check:
// the migration is the production path, seed.sql is the dev/CI path
// (AGENTS.md §11), and the shared SQL block must not drift between them.
//
// What's tested:
//   1. PARITY: the marked backfill block (BEGIN/END sentinels) is
//      byte-identical between the migration and seed.sql.
//   2. MAPPING SHAPE: exactly the 11 curated SAM-L2 external_ids are
//      mapped, the dev placeholder is NOT, and every target code is a
//      real content key in the taxonomy spec (§7 JSON).
//   3. NO-CLOBBER: the UPDATE keeps the `content_id is null` guard so a
//      re-run never overwrites a later manual correction.
//
// FK integrity of the backfill itself is enforced by the schema
// (questions.content_id references tax_content(id)); `supabase db reset`
// running cleanly proves the lookups resolve.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const SPEC_PATH = resolve(REPO_ROOT, "docs/sam-v2026-taxonomy.md");
const SEED_PATH = resolve(REPO_ROOT, "supabase/seed.sql");
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  "supabase/migrations/20260610000000_backfill_question_content_ids.sql",
);

const BEGIN_MARK = "-- BEGIN sam-l2-content-id-backfill";
const END_MARK = "-- END sam-l2-content-id-backfill";

/** The curated mapping — duplicated here on purpose so an accidental edit
 *  to the SQL VALUES list (row added/dropped/retargeted) fails loudly and
 *  has to be acknowledged in both places. */
const EXPECTED_MAPPING: Record<string, string> = {
  "SAM-L2-Q01": "l1-whole_numbers-2",
  "SAM-L2-Q07": "l1-whole_numbers-8",
  "SAM-L2-Q09": "l1-whole_numbers-9",
  "SAM-L2-Q10": "l1-whole_numbers-8",
  "SAM-L2-Q11": "l2-whole_numbers-4",
  "SAM-L2-Q14": "l2-whole_numbers-3",
  "SAM-L2-Q17": "l1-whole_numbers-9",
  "SAM-L2-Q19": "l2-whole_numbers-1",
  "SAM-L2-Q20": "l2-whole_numbers-1",
  "SAM-L2-Q21": "l2-whole_numbers-1",
  "SAM-L2-Q22": "l2-whole_numbers-1",
};

/** Extract the marked backfill block, inclusive of both sentinels.
 *  Line endings normalised to LF (Windows autocrlf working trees). */
function extractBackfillBlock(sql: string, label: string): string {
  const start = sql.indexOf(BEGIN_MARK);
  if (start === -1) throw new Error(`no BEGIN sentinel in ${label}`);
  const end = sql.indexOf(END_MARK, start);
  if (end === -1) throw new Error(`no END sentinel in ${label}`);
  return sql
    .slice(start, end + END_MARK.length)
    .replace(/\r\n/g, "\n");
}

/** Parse ('SAM-L2-Qxx', 'code') pairs out of the block's VALUES list. */
function parseMappingPairs(block: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const re = /\('(SAM-L2-Q\d+)',\s*'([a-z0-9_-]+)'\)/g;
  for (const m of block.matchAll(re)) {
    pairs.push([m[1], m[2]]);
  }
  return pairs;
}

const migrationSql = readFileSync(MIGRATION_PATH, "utf-8");
const seedSql = readFileSync(SEED_PATH, "utf-8");
const migrationBlock = extractBackfillBlock(migrationSql, "migration");
const seedBlock = extractBackfillBlock(seedSql, "seed.sql");

describe("SAM-L2 content_id backfill migration ↔ seed.sql parity", () => {
  it("marked backfill block is byte-identical between migration and seed.sql", () => {
    expect(seedBlock).toBe(migrationBlock);
  });

  it("seed.sql mirror runs AFTER the tax_content seed and the questions insert", () => {
    // The mirror is only effective if both lookup targets exist by the
    // time it runs — tax_content rows and the SAM-L2 question rows.
    const blockStart = seedSql.indexOf(BEGIN_MARK);
    expect(seedSql.indexOf("insert into tax_content")).toBeGreaterThan(-1);
    expect(seedSql.indexOf("insert into tax_content")).toBeLessThan(blockStart);
    expect(seedSql.indexOf("'SAM-L2-Q01'")).toBeLessThan(blockStart);
  });
});

describe("SAM-L2 content_id backfill mapping shape", () => {
  const pairs = parseMappingPairs(migrationBlock);

  it("maps exactly the 11 curated SAM-L2 external_ids", () => {
    expect(Object.fromEntries(pairs)).toEqual(EXPECTED_MAPPING);
    expect(pairs.length).toBe(11);
  });

  it("does not map the dev visual-gate placeholder", () => {
    expect(migrationBlock).not.toContain("('PLACEHOLDER-Q-IMG-GRID-001'");
  });

  it("every target code is a real content key in the taxonomy spec", () => {
    const md = readFileSync(SPEC_PATH, "utf-8");
    const m = md.match(/```json\s*([\s\S]*?)```/);
    if (!m) throw new Error("no ```json block in taxonomy spec");
    const spec = JSON.parse(m[1]) as {
      content: Array<{ key: string; mvp: boolean }>;
    };
    const contentKeys = new Map(spec.content.map((c) => [c.key, c.mvp]));
    for (const [, code] of pairs) {
      expect(contentKeys.has(code), `${code} missing from spec`).toBe(true);
      // All targets are L1/L2 topics, which are MVP levels.
      expect(contentKeys.get(code), `${code} not MVP`).toBe(true);
    }
  });

  it("keeps the no-clobber guard (content_id is null)", () => {
    expect(migrationBlock).toMatch(/and q\.content_id is null/);
  });
});
