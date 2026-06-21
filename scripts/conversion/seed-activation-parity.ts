// Atlas Assessment — SEED ↔ MIGRATION activation parity guard.
//
// WHY: activations are dual-written (a migration + a hand/tool-maintained seed.sql
// mirror). The dev DB builds ENTIRELY from seed.sql (every tenant-scoped migration
// no-ops during `supabase db reset`, before seed creates the tenant). So a migration
// whose seed mirror was dropped in a stacked-PR merge silently produces ABSENT
// content — no error, caught only in QA. The #97–#108 wave dropped ~12 mirrors and
// nothing flagged it.
//
// WHAT this checks: for every activation/correction MIGRATION, the rows/effects it
// declares must also be present in seed.sql. Concretely, for each of these dimensions
// the migration-set must be a SUBSET of the seed-set:
//   * activated      — external_ids in a statement that sets is_active = true
//   * content_id     — external_ids in a statement that sets content_id
//   * short_eligible — external_ids in a statement that sets short_test_eligible = true
//   * image_path     — every "image_path":"<key>" referenced
//   * tax_code       — every tax_content code created (insert into tax_content)
// Anything a migration declares but seed lacks => the mirror was DROPPED => FAIL,
// naming the value, dimension, and the source migration.
//
// Wired into the verify bar via src/lib/conversion/seed-activation-parity.test.ts.
// CLI: `pnpm seed:check-activation-parity [--seed <path>]` (the --seed override lets
// you point at a pre-repair seed to demonstrate the guard catching a known drop).

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "..", "..");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");
const SEED_DEFAULT = path.join(REPO_ROOT, "supabase", "seed.sql");

const DIMENSIONS = ["activated", "content_id", "short_eligible", "image_path", "tax_code"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface ParityFailure {
  dimension: Dimension;
  value: string;
  migration: string;
}

const EXTERNAL_ID = /'(SAM-L\d+[A-Z]?-Q\d+[A-Z]?)'/g;

/** Split into statements and strip `-- line comments` so comments never match. */
function statements(sql: string): string[] {
  const stripped = sql
    .split("\n")
    .map((l) => {
      const i = l.indexOf("--");
      return i === -1 ? l : l.slice(0, i);
    })
    .join("\n");
  return stripped.split(";");
}

function idsInStatementsWhere(sql: string, pred: (st: string) => boolean): Set<string> {
  const out = new Set<string>();
  for (const st of statements(sql)) {
    if (!pred(st)) continue;
    for (const m of st.matchAll(EXTERNAL_ID)) out.add(m[1]);
  }
  return out;
}

/** The five effect-sets a SQL text declares. */
export function extract(sql: string): Record<Dimension, Set<string>> {
  const imagePaths = new Set<string>();
  for (const m of sql.matchAll(/"image_path"\s*:\s*"([^"]+)"/g)) imagePaths.add(m[1]);

  const taxCodes = new Set<string>();
  for (const st of statements(sql)) {
    if (!/insert\s+into\s+tax_content/i.test(st)) continue;
    for (const m of st.matchAll(/'(l\d[a-z]?-[a-z_]+-\d+)'/g)) taxCodes.add(m[1]);
  }

  return {
    activated: idsInStatementsWhere(sql, (st) => /is_active\s*=\s*true/.test(st)),
    content_id: idsInStatementsWhere(sql, (st) => /content_id\s*=/.test(st)),
    short_eligible: idsInStatementsWhere(sql, (st) => /short_test_eligible\s*=\s*true/.test(st)),
    image_path: imagePaths,
    tax_code: taxCodes,
  };
}

export interface ParityResult {
  ok: boolean;
  failures: ParityFailure[];
  /** migration files scanned */
  migrationsScanned: number;
}

export function checkParity(opts?: { seedPath?: string; migrationsDir?: string }): ParityResult {
  const seedPath = opts?.seedPath ?? SEED_DEFAULT;
  const migDir = opts?.migrationsDir ?? MIGRATIONS_DIR;
  const seed = readFileSync(seedPath, "utf8");
  const seedSets = extract(seed);

  const files = readdirSync(migDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const failures: ParityFailure[] = [];
  const seen = new Set<string>(); // dedupe value+dimension across migrations
  for (const file of files) {
    const migSets = extract(readFileSync(path.join(migDir, file), "utf8"));
    for (const dim of DIMENSIONS) {
      for (const value of migSets[dim]) {
        if (seedSets[dim].has(value)) continue;
        const k = `${dim}::${value}`;
        if (seen.has(k)) continue;
        seen.add(k);
        failures.push({ dimension: dim, value, migration: file });
      }
    }
  }
  return { ok: failures.length === 0, failures, migrationsScanned: files.length };
}

export function formatFailures(failures: ParityFailure[]): string {
  const verb: Record<Dimension, string> = {
    activated: "activates",
    content_id: "sets content_id on",
    short_eligible: "marks short_test_eligible",
    image_path: "references image_path",
    tax_code: "creates taxonomy code",
  };
  return failures
    .map((f) => `Migration ${f.migration} ${verb[f.dimension]} ${f.value}; no matching seed mirror — DROPPED.`)
    .join("\n");
}

// --- CLI -------------------------------------------------------------------
const INVOKED_DIRECTLY = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) {
  const sIdx = process.argv.indexOf("--seed");
  const seedPath = sIdx !== -1 ? process.argv[sIdx + 1] : undefined;
  const res = checkParity({ seedPath });
  process.stdout.write(
    `[seed-activation-parity] scanned ${String(res.migrationsScanned)} migrations against ${seedPath ?? "supabase/seed.sql"}\n`,
  );
  if (res.ok) {
    process.stdout.write("PASS — every migration activation has a seed mirror.\n");
  } else {
    process.stderr.write(`\nFAIL — ${String(res.failures.length)} dropped seed mirror(s):\n` + formatFailures(res.failures) + "\n");
    process.exitCode = 1;
  }
}
