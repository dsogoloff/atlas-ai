// Drift detector for the V2026 taxonomy. Lightweight per the brief — no
// DB connection. Two layers of assertion:
//
//   1. SPEC SHAPE: parse the §7 JSON in docs/sam-v2026-taxonomy.md and
//      assert the row counts, mvp-flag counts, and FK integrity of the
//      spec's own data. Catches drift inside the spec.
//
//   2. SEED SHAPE: parse seed.sql's tax_* INSERT blocks and assert each
//      table's VALUES row count matches the spec's count. Catches drift
//      where the seed and spec disagree.
//
// FK integrity at the seed level is enforced by the schema itself: every
// tax_sub_strands and tax_content row uses a scalar subquery against the
// parent code; if the parent is missing the subquery returns null and
// the NOT NULL FK constraint fails the INSERT. So `supabase db reset`
// running cleanly is part of the FK-integrity contract — this test
// layers row counts on top.

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
  "supabase/migrations/20260525000002_seed_v2026_taxonomy.sql",
);

interface SpecPayload {
  version: string;
  source: string;
  strands: Array<{ key: string; name: string }>;
  levels: Array<{ key: string; name: string; sort: number; mvp: boolean }>;
  sub_strands: Array<{
    key: string;
    name: string;
    strand: string;
    applies: string[];
  }>;
  content: Array<{
    key: string;
    level: string;
    sub_strand: string;
    seq: number;
    name: string;
    mvp: boolean;
  }>;
}

function loadSpec(): SpecPayload {
  const md = readFileSync(SPEC_PATH, "utf-8");
  // Exactly one ```json ... ``` block in §7. If a second JSON block ever
  // appears, this match takes the first; spec maintainers should keep §7
  // as the only JSON block.
  const m = md.match(/```json\s*([\s\S]*?)```/);
  if (!m) throw new Error("no ```json block in taxonomy spec");
  return JSON.parse(m[1]) as SpecPayload;
}

/** Count VALUES rows inside the (values ...) block of a tax_* INSERT in
 *  the given SQL text. Anchored from `(values` to the closing `) as v(`
 *  so scalar subqueries earlier in the SELECT (e.g. `(select s.id ...)`)
 *  don't false-positive as values rows. Each row begins on its own line
 *  indented + open-paren. */
function countValuesRows(sql: string, table: string): number {
  const insertStart = sql.indexOf(`insert into ${table}`);
  if (insertStart === -1) throw new Error(`no insert into ${table} in SQL`);
  const valuesStart = sql.indexOf("(values", insertStart);
  if (valuesStart === -1) throw new Error(`no (values block after ${table} insert`);
  const valuesEnd = sql.indexOf(") as v(", valuesStart);
  if (valuesEnd === -1) throw new Error(`no values-close after ${table} insert`);
  const block = sql.slice(valuesStart, valuesEnd);
  const matches = block.match(/^\s+\(/gm);
  return matches?.length ?? 0;
}

/** Extract the inclusive `(values ... )` block as a string. Used by the
 *  byte-identical parity check between seed.sql and the rollout migration —
 *  any drift in row content, ordering, or formatting fails the test.
 *
 *  Line endings are normalised to LF so the test is robust against the
 *  Windows autocrlf working-tree setting — git stores LF on disk but the
 *  working tree may have CRLF on Windows. Drift in content/ordering still
 *  fails; cosmetic line-ending mismatches do not. */
function extractValuesBlock(sql: string, table: string): string {
  const insertStart = sql.indexOf(`insert into ${table}`);
  if (insertStart === -1) throw new Error(`no insert into ${table} in SQL`);
  const valuesStart = sql.indexOf("(values", insertStart);
  if (valuesStart === -1) throw new Error(`no (values block after ${table} insert`);
  const valuesEnd = sql.indexOf(") as v(", valuesStart);
  if (valuesEnd === -1) throw new Error(`no values-close after ${table} insert`);
  return sql.slice(valuesStart, valuesEnd + 1).replace(/\r\n/g, "\n");
}

const seedSql = readFileSync(SEED_PATH, "utf-8");
const migrationSql = readFileSync(MIGRATION_PATH, "utf-8");

function countSeedValuesRows(table: string): number {
  return countValuesRows(seedSql, table);
}

const spec = loadSpec();

describe("V2026 taxonomy spec (§7) shape", () => {
  it("has 3 strands, 12 sub-strands, 9 levels, 145 content items", () => {
    expect(spec.strands.length).toBe(3);
    expect(spec.sub_strands.length).toBe(12);
    expect(spec.levels.length).toBe(9);
    expect(spec.content.length).toBe(145);
  });

  it("flags 4 MVP levels (exactly L1, L2, L3, L4)", () => {
    const mvpLevelKeys = spec.levels
      .filter((l) => l.mvp)
      .map((l) => l.key)
      .sort();
    expect(mvpLevelKeys).toEqual(["l1", "l2", "l3", "l4"]);
  });

  it("flags 71 MVP content items (all from L1–L4)", () => {
    const mvpContent = spec.content.filter((c) => c.mvp);
    expect(mvpContent.length).toBe(71);
    const mvpLevels = new Set(["l1", "l2", "l3", "l4"]);
    for (const c of mvpContent) {
      expect(mvpLevels.has(c.level)).toBe(true);
    }
  });

  it("every content.mvp matches its level.mvp (no rogue MVP flags)", () => {
    const levelMvpByKey = new Map(spec.levels.map((l) => [l.key, l.mvp]));
    for (const c of spec.content) {
      expect(c.mvp).toBe(levelMvpByKey.get(c.level));
    }
  });

  it("every sub_strand.strand references a real strand", () => {
    const strandKeys = new Set(spec.strands.map((s) => s.key));
    for (const ss of spec.sub_strands) {
      expect(strandKeys.has(ss.strand)).toBe(true);
    }
  });

  it("every sub_strand.applies entry references a real level", () => {
    const levelKeys = new Set(spec.levels.map((l) => l.key));
    for (const ss of spec.sub_strands) {
      for (const code of ss.applies) {
        expect(levelKeys.has(code)).toBe(true);
      }
    }
  });

  it("every content.level + content.sub_strand reference real rows", () => {
    const levelKeys = new Set(spec.levels.map((l) => l.key));
    const subStrandKeys = new Set(spec.sub_strands.map((ss) => ss.key));
    for (const c of spec.content) {
      expect(levelKeys.has(c.level)).toBe(true);
      expect(subStrandKeys.has(c.sub_strand)).toBe(true);
    }
  });
});

describe("V2026 taxonomy seed.sql row counts", () => {
  it("tax_strands has 3 rows", () => {
    expect(countSeedValuesRows("tax_strands")).toBe(3);
  });

  it("tax_levels has 9 rows", () => {
    expect(countSeedValuesRows("tax_levels")).toBe(9);
  });

  it("tax_sub_strands has 12 rows", () => {
    expect(countSeedValuesRows("tax_sub_strands")).toBe(12);
  });

  it("tax_content has 145 rows", () => {
    expect(countSeedValuesRows("tax_content")).toBe(145);
  });
});

describe("V2026 taxonomy seed.sql ↔ rollout migration parity", () => {
  // Phase 7 Part A added the production-rollout migration. Its VALUES
  // blocks must stay byte-identical to seed.sql's so the two files cannot
  // drift. If a row is added/removed/edited in one file and not the other,
  // these tests fail loudly.
  for (const table of [
    "tax_strands",
    "tax_levels",
    "tax_sub_strands",
    "tax_content",
  ]) {
    it(`${table} VALUES block is byte-identical between seed.sql and migration`, () => {
      const seedBlock = extractValuesBlock(seedSql, table);
      const migrationBlock = extractValuesBlock(migrationSql, table);
      expect(migrationBlock).toBe(seedBlock);
    });

    it(`${table} row count matches between seed.sql and migration`, () => {
      expect(countValuesRows(migrationSql, table)).toBe(
        countValuesRows(seedSql, table),
      );
    });
  }
});
