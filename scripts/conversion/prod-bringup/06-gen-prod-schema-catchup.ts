// Atlas Assessment — PROD schema catch-up GENERATOR (idempotent, additive-only).
//
// WHAT IT DOES
//   Treats LOCAL (127.0.0.1:54322, post-reset = the full migration set) as the canonical
//   EXPECTED schema and compares PROD (read-only) against it, then emits ONLY guarded,
//   additive DDL that brings prod UP TO local. It NEVER drops, retypes, or tightens.
//
//   * Missing enum TYPES   -> DO-guarded CREATE TYPE (full local value list).
//   * Missing enum VALUES  -> ALTER TYPE ... ADD VALUE IF NOT EXISTS (one each).
//   * Missing TABLES       -> CREATE TABLE IF NOT EXISTS (local column defs + PK) + ENABLE RLS.
//   * Missing COLUMNS      -> ALTER TABLE ... ADD COLUMN IF NOT EXISTS (nullable, or with
//                            default; NOT NULL only when a default backfills it).
//   * RLS                  -> ENABLE ROW LEVEL SECURITY (idempotent) + DO-guarded
//                            CREATE POLICY for every local policy (skipped if already in
//                            pg_policies AT APPLY TIME).
//   * New-table constraints/indexes -> best-effort, guarded, additive (new tables only).
//
//   Anything NON-additive (type/nullability divergence on a column that exists in both,
//   a NOT NULL local column with no default, or an object that exists only in prod) is
//   written to catchup.review.md FLAGGED FOR HUMAN REVIEW and is never auto-fixed.
//
// OUTPUT (analysis only — applies NOTHING to prod):
//   * catchup.generated.sql  — the guarded additive DDL (founder applies in prod Studio).
//   * catchup.review.md      — divergences / prod-only objects / NOT-NULL gaps to review.
//   * stdout                 — summary counts + explicit prod state of the flagged objects.
//
// CHANNELS (see introspect.ts): both local and prod are read via DIRECT Postgres now —
// prod through PROD_DATABASE_URL (real pg_catalog/pg_policies), matching 07/09. The diff
// is therefore exact: only genuinely-missing tables/columns/enums/policies are emitted.
// Emitted DDL stays guarded/idempotent regardless. This is presence/additive-only; column
// attribute drift (type/nullable/default) is handled by 07 (verify) + 09 (remediation).
//
// Run:  tsx scripts/conversion/prod-bringup/06-gen-prod-schema-catchup.ts

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  introspectLocal, introspectProdSql, localConnString, prodConnString,
  normalizeType, stripSchema, type Schema, type Column, type Policy,
} from "./introspect";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQL_OUT = path.join(HERE, "catchup.generated.sql");
const REVIEW_OUT = path.join(HERE, "catchup.review.md");

// Objects ATLAS flagged as at-risk — explicitly reported regardless of diff outcome.
const AT_RISK_TABLES = [
  "responses", "report_narrations", "score_estimates",
  "tax_strands", "tax_levels", "tax_sub_strands", "tax_content", "vpc_audit_log",
];

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

// ---------------------------------------------------------------- DDL renderers

function renderColumnDef(c: Column): string {
  let s = `  ${q(c.name)} ${c.type}`;
  if (!c.nullable) s += " NOT NULL";
  if (c.default !== null) s += ` DEFAULT ${c.default}`;
  return s;
}

function renderCreateTable(table: string, cols: Map<string, Column>, local: Schema): string {
  const ordered = [...cols.values()].sort((a, b) => a.ordinal - b.ordinal);
  const lines = ordered.map(renderColumnDef);
  const pk = local.constraints.find((k) => k.table === table && k.contype === "p");
  if (pk) lines.push(`  CONSTRAINT ${q(pk.name)} ${pk.def}`);
  let out = `CREATE TABLE IF NOT EXISTS public.${q(table)} (\n${lines.join(",\n")}\n);\n`;
  if (local.rlsEnabled.has(table)) out += `ALTER TABLE public.${q(table)} ENABLE ROW LEVEL SECURITY;\n`;
  return out;
}

/** Additive ADD COLUMN with the never-fail-on-existing-rows rule.
 *  Returns the SQL and, if NOT NULL had to be dropped, a review note. */
function renderAddColumn(table: string, c: Column): { sql: string; review?: string } {
  const base = `ALTER TABLE public.${q(table)} ADD COLUMN IF NOT EXISTS ${q(c.name)} ${c.type}`;
  if (c.nullable) {
    return { sql: c.default !== null ? `${base} DEFAULT ${c.default};` : `${base};` };
  }
  if (c.default !== null) {
    // NOT NULL + default backfills existing rows safely.
    return { sql: `${base} NOT NULL DEFAULT ${c.default};` };
  }
  // NOT NULL, no default -> cannot enforce on a populated table; add nullable + flag.
  return {
    sql: `${base}; -- NOTE: local is NOT NULL w/o default; added NULLABLE (see catchup.review.md)`,
    review: `\`${table}.${c.name}\` is **NOT NULL with no default** in local. Added to prod as **nullable** (a NOT NULL add would fail on any existing row). Founder must backfill then \`ALTER COLUMN ... SET NOT NULL\` manually.`,
  };
}

function renderPolicy(p: Policy): string {
  const roles = p.roles.length ? p.roles.map((r) => (r === "public" ? "public" : q(r))).join(", ") : "public";
  let body = `CREATE POLICY ${q(p.name)} ON public.${q(p.table)} AS ${p.permissive} FOR ${p.cmd} TO ${roles}`;
  if (p.using !== null) body += ` USING (${p.using})`;
  if (p.withCheck !== null) body += ` WITH CHECK (${p.withCheck})`;
  return [
    `DO $$ BEGIN`,
    `  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=${lit(p.table)} AND policyname=${lit(p.name)}) THEN`,
    `    ${body};`,
    `  END IF;`,
    `END $$;`,
  ].join("\n");
}

function guardedCreateType(name: string, values: string[]): string {
  return [
    `DO $$ BEGIN`,
    `  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname=${lit(name)}) THEN`,
    `    CREATE TYPE public.${q(name)} AS ENUM (${values.map(lit).join(", ")});`,
    `  END IF;`,
    `END $$;`,
  ].join("\n");
}

function guardedAddConstraint(table: string, name: string, def: string): string {
  return [
    `DO $$ BEGIN`,
    `  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname=${lit(name)}) THEN`,
    `    ALTER TABLE public.${q(table)} ADD CONSTRAINT ${q(name)} ${def};`,
    `  END IF;`,
    `END $$;`,
  ].join("\n");
}

function indexIfNotExists(def: string): string {
  return def.replace(/^CREATE\s+(UNIQUE\s+)?INDEX\s+/i, (_m, u) => `CREATE ${u ?? ""}INDEX IF NOT EXISTS `);
}

/** Owned sequences behind serial columns (default = nextval('seq'::regclass)). A
 *  CREATE TABLE that references such a sequence fails unless the sequence exists first. */
function serialSeqs(cols: Map<string, Column>): Array<{ seq: string; col: string }> {
  const out: Array<{ seq: string; col: string }> = [];
  for (const c of cols.values()) {
    const m = c.default?.match(/nextval\('([^']+)'::regclass\)/);
    if (m) out.push({ seq: stripSchema(m[1].replace(/"/g, "")), col: c.name });
  }
  return out;
}

// --------------------------------------------------------------------- compute

interface Diff {
  missingEnumTypes: Array<{ name: string; values: string[] }>;
  missingEnumValues: Array<{ name: string; values: string[] }>;
  missingTables: string[];
  missingColumns: Array<{ table: string; col: Column }>;
  // review-only
  typeDivergences: string[];
  nullabilityDivergences: string[];
  notNullGaps: string[];
  prodOnlyTables: string[];
  prodOnlyColumns: string[];
  prodOnlyEnumValues: string[];
}

function computeDiff(local: Schema, prod: Schema): Diff {
  const d: Diff = {
    missingEnumTypes: [], missingEnumValues: [], missingTables: [], missingColumns: [],
    typeDivergences: [], nullabilityDivergences: [], notNullGaps: [],
    prodOnlyTables: [], prodOnlyColumns: [], prodOnlyEnumValues: [],
  };

  // Enums
  for (const [name, lvals] of local.enums) {
    if (!prod.enums.has(name)) {
      d.missingEnumTypes.push({ name, values: lvals });
    } else {
      const pset = new Set(prod.enums.get(name)!);
      const missing = lvals.filter((v) => !pset.has(v));
      if (missing.length) d.missingEnumValues.push({ name, values: missing });
    }
  }
  for (const [name, pvals] of prod.enums) {
    const lset = new Set(local.enums.get(name) ?? []);
    const extra = pvals.filter((v) => !lset.has(v));
    if (extra.length) d.prodOnlyEnumValues.push(`${name}: ${extra.join(", ")}`);
  }

  // Tables / columns
  for (const [t, lcols] of local.tables) {
    const pcols = prod.tables.get(t);
    if (!pcols) {
      d.missingTables.push(t);
      continue;
    }
    for (const [cn, lc] of lcols) {
      const pc = pcols.get(cn);
      if (!pc) {
        d.missingColumns.push({ table: t, col: lc });
        if (!lc.nullable && lc.default === null) {
          d.notNullGaps.push(`${t}.${cn}`);
        }
        continue;
      }
      if (normalizeType(lc.type) !== normalizeType(pc.type)) {
        d.typeDivergences.push(`\`${t}.${cn}\`: local \`${lc.type}\` vs prod \`${pc.type}\``);
      }
      if (lc.nullable !== pc.nullable) {
        const dir = lc.nullable ? "local NULLABLE, prod NOT NULL (prod stricter)" : "local NOT NULL, prod NULLABLE (prod looser)";
        d.nullabilityDivergences.push(`\`${t}.${cn}\`: ${dir}`);
      }
    }
    for (const cn of pcols.keys()) if (!lcols.has(cn)) d.prodOnlyColumns.push(`${t}.${cn}`);
  }
  for (const t of prod.tables.keys()) if (!local.tables.has(t)) d.prodOnlyTables.push(t);

  return d;
}

// ----------------------------------------------------------------- SQL builder

function buildSql(local: Schema, prod: Schema, d: Diff, stamp: string): { sql: string; notNullReviews: string[] } {
  const out: string[] = [];
  const notNullReviews: string[] = [];
  out.push("-- ============================================================================");
  out.push("-- Atlas Assessment — PROD schema catch-up (GENERATED, additive-only, idempotent)");
  out.push(`-- Generated: ${stamp}`);
  out.push("-- Source (canonical EXPECTED): LOCAL 127.0.0.1:54322 (post-reset full migration set)");
  out.push("-- Target: PROD atlas-assessment / ntfaqzueppqymfkefadm");
  out.push("--");
  out.push("-- APPLY IN PROD STUDIO (founder, attended). NEVER `supabase db push` to prod.");
  out.push("-- Every statement is guarded (IF NOT EXISTS / DO-block pg_policies check) so re-runs");
  out.push("-- converge and nothing fails on existing objects/rows. No DROP, no retype, no");
  out.push("-- NOT NULL tightening of existing columns. Divergences are in catchup.review.md.");
  out.push("--");
  out.push("-- Prod is read via DIRECT Postgres (PROD_DATABASE_URL) — real pg_catalog/pg_policies.");
  out.push("-- Section 5 emits only the RLS-enables and policies prod is actually MISSING (still");
  out.push("-- guarded, so safe to re-run). Attribute-level drift (type/nullable/default) is out of");
  out.push("-- scope here — that is 07 (verify) + 09 (remediation).");
  out.push("-- ============================================================================");
  out.push("");

  // 1. enum types
  out.push("-- ---------------------------------------------------------------------------");
  out.push("-- SECTION 1 — Missing enum TYPES (DO-guarded CREATE TYPE)");
  out.push("-- ---------------------------------------------------------------------------");
  if (d.missingEnumTypes.length === 0) out.push("-- (none)");
  for (const e of d.missingEnumTypes) out.push(guardedCreateType(e.name, e.values));
  out.push("");

  // 2. enum values
  out.push("-- ---------------------------------------------------------------------------");
  out.push("-- SECTION 2 — Missing enum VALUES (ALTER TYPE ... ADD VALUE IF NOT EXISTS)");
  out.push("-- ---------------------------------------------------------------------------");
  if (d.missingEnumValues.length === 0) out.push("-- (none)");
  for (const e of d.missingEnumValues) {
    for (const v of e.values) out.push(`ALTER TYPE public.${q(e.name)} ADD VALUE IF NOT EXISTS ${lit(v)};`);
  }
  out.push("");

  // 3. tables
  out.push("-- ---------------------------------------------------------------------------");
  out.push("-- SECTION 3 — Missing TABLES (CREATE TABLE IF NOT EXISTS + ENABLE RLS)");
  out.push("-- ---------------------------------------------------------------------------");
  if (d.missingTables.length === 0) out.push("-- (none)");
  const newSeqs = d.missingTables.flatMap((t) =>
    serialSeqs(local.tables.get(t)!).map((s) => ({ ...s, table: t })));
  for (const s of newSeqs) out.push(`CREATE SEQUENCE IF NOT EXISTS public.${q(s.seq)};`);
  if (newSeqs.length) out.push("");
  for (const t of d.missingTables) {
    out.push(renderCreateTable(t, local.tables.get(t)!, local));
  }
  // sequence ownership (set after the owning table/column exists; safe to re-run)
  for (const s of newSeqs) out.push(`ALTER SEQUENCE public.${q(s.seq)} OWNED BY public.${q(s.table)}.${q(s.col)};`);
  out.push("");

  // 4. columns
  out.push("-- ---------------------------------------------------------------------------");
  out.push("-- SECTION 4 — Missing COLUMNS (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)");
  out.push("-- ---------------------------------------------------------------------------");
  if (d.missingColumns.length === 0) out.push("-- (none)");
  for (const { table, col } of d.missingColumns) {
    const r = renderAddColumn(table, col);
    out.push(r.sql);
    if (r.review) notNullReviews.push(r.review);
  }
  out.push("");

  // 5. RLS enable + policies — diffed against real prod (direct Postgres). Emit only what
  //    prod is actually missing; statements stay guarded so they remain safe to re-run.
  out.push("-- ---------------------------------------------------------------------------");
  out.push("-- SECTION 5 — RLS: ENABLE (missing only) + guarded CREATE POLICY (missing only)");
  out.push("-- ---------------------------------------------------------------------------");
  const rlsTables = [...local.rlsEnabled].filter((t) => !prod.rlsEnabled.has(t)).sort();
  if (rlsTables.length === 0) out.push("-- (RLS already enabled on all expected tables)");
  for (const t of rlsTables) out.push(`ALTER TABLE public.${q(t)} ENABLE ROW LEVEL SECURITY;`);
  out.push("");
  const prodPolKeys = new Set(prod.policies.map((p) => `${p.table}.${p.name}`));
  const policies = [...local.policies]
    .filter((p) => !prodPolKeys.has(`${p.table}.${p.name}`))
    .sort((a, b) => (a.table + a.name).localeCompare(b.table + b.name));
  if (policies.length === 0) out.push("-- (all local policies already present in prod)");
  for (const p of policies) {
    out.push(renderPolicy(p));
    out.push("");
  }

  // 6. best-effort constraints/indexes for NEW tables only
  out.push("-- ---------------------------------------------------------------------------");
  out.push("-- SECTION 6 — Best-effort additive constraints & indexes for NEW tables (guarded)");
  out.push("-- (existing-table constraints/indexes are NOT reconciled here — see catchup.review.md)");
  out.push("-- ---------------------------------------------------------------------------");
  const newSet = new Set(d.missingTables);
  const extraCons = local.constraints.filter((c) => newSet.has(c.table) && c.contype !== "p");
  const extraIdx = local.indexes.filter((i) => newSet.has(i.table) && !i.isPrimary && !i.backsConstraint);
  if (extraCons.length === 0 && extraIdx.length === 0) out.push("-- (none)");
  for (const c of extraCons) out.push(guardedAddConstraint(c.table, c.name, c.def));
  for (const i of extraIdx) out.push(`${indexIfNotExists(i.def)};`);
  out.push("");

  return { sql: out.join("\n"), notNullReviews };
}

// -------------------------------------------------------------- review builder

function buildReview(d: Diff, prod: Schema, notNullReviews: string[], stamp: string): string {
  const m: string[] = [];
  const section = (title: string, items: string[], emptyNote = "_None._") => {
    m.push(`## ${title}`, "");
    if (items.length === 0) m.push(emptyNote);
    else for (const it of items) m.push(`- ${it}`);
    m.push("");
  };

  m.push("# Prod schema catch-up — REVIEW (human decision required)", "");
  m.push(`_Generated: ${stamp}. Source = LOCAL (canonical). Target = PROD (read-only, direct Postgres)._`, "");
  m.push("Everything below is **NOT** auto-fixed by `catchup.generated.sql` because it is");
  m.push("non-additive or lossy. Decide each manually. (Attribute drift — type/nullable/default —");
  m.push("is covered by 07/09, not here; this file is presence/additive only.)", "");

  section("Column TYPE divergence (exists in both, differing type)", d.typeDivergences);
  section("Column NULLABILITY divergence (exists in both)", d.nullabilityDivergences);
  section("NOT NULL columns added as NULLABLE (no default — backfill then tighten manually)", notNullReviews);
  section("PROD-only TABLES (exist in prod, absent in local — NOT dropped)", d.prodOnlyTables.map((t) => `\`${t}\``));
  section("PROD-only COLUMNS (exist in prod, absent in local — NOT dropped)", d.prodOnlyColumns.map((c) => `\`${c}\``));
  section("PROD-only enum VALUES (present in prod, absent in local — INFO)", d.prodOnlyEnumValues);

  m.push("## Scope notes", "");
  m.push("- **RLS policies:** prod's `pg_policies` IS read (direct Postgres); Section 5 emits only");
  m.push("  the policies/RLS-enables prod is actually missing (still guarded, safe to re-run).");
  m.push("- **Constraints / indexes:** only NEW-table constraints/indexes are emitted (Section 6);");
  m.push("  existing-table constraint/index drift is not reconciled here.");
  m.push("- **Attribute drift** (type / nullability / default on shared columns) is handled by");
  m.push("  07 (verify) + 09 (remediation), not this additive catch-up.");
  m.push("");
  return m.join("\n");
}

// ----------------------------------------------------------------------- print

function pad(s: string | number, n: number) { return String(s).padEnd(n); }
function padL(s: string | number, n: number) { return String(s).padStart(n); }

function printSummary(local: Schema, prod: Schema, d: Diff): void {
  const w = process.stdout;
  w.write("\n=== PROD SCHEMA CATCH-UP — SUMMARY (analysis only, nothing applied) ===\n");
  w.write(`  source(local): ${local.tables.size} tables, ${local.enums.size} enums, ${local.policies.length} policies\n`);
  w.write(`  target(prod) : ${prod.tables.size} tables, ${prod.enums.size} enum types, ${prod.policies.length} policies (direct Postgres)\n\n`);

  const prodPolKeys = new Set(prod.policies.map((p) => `${p.table}.${p.name}`));
  const missingPolicies = local.policies.filter((p) => !prodPolKeys.has(`${p.table}.${p.name}`)).length;
  const missingRls = [...local.rlsEnabled].filter((t) => !prod.rlsEnabled.has(t)).length;
  const rows: Array<[string, number]> = [
    ["Missing enum TYPES", d.missingEnumTypes.length],
    ["Missing enum VALUES", d.missingEnumValues.reduce((n, e) => n + e.values.length, 0)],
    ["Missing TABLES", d.missingTables.length],
    ["Missing COLUMNS", d.missingColumns.length],
    ["Missing POLICIES (emitted, guarded)", missingPolicies],
    ["Missing RLS-enable (emitted)", missingRls],
    ["-- review: TYPE divergences", d.typeDivergences.length],
    ["-- review: NULLABILITY divergences", d.nullabilityDivergences.length],
    ["-- review: NOT NULL added nullable", d.notNullGaps.length],
    ["-- review: PROD-only tables", d.prodOnlyTables.length],
    ["-- review: PROD-only columns", d.prodOnlyColumns.length],
    ["-- review: PROD-only enum values", d.prodOnlyEnumValues.length],
  ];
  w.write(`  ${pad("category", 42)}${padL("count", 7)}\n`);
  w.write(`  ${"-".repeat(49)}\n`);
  for (const [k, v] of rows) w.write(`  ${pad(k, 42)}${padL(v, 7)}\n`);
  w.write(`  ${"-".repeat(49)}\n`);

  if (d.missingTables.length) w.write(`\n  Missing tables: ${d.missingTables.join(", ")}\n`);
  if (d.missingColumns.length) w.write(`  Missing columns: ${d.missingColumns.map((c) => `${c.table}.${c.col.name}`).join(", ")}\n`);
  if (d.missingEnumValues.length) w.write(`  Missing enum values: ${d.missingEnumValues.map((e) => `${e.name}{${e.values.join(",")}}`).join(", ")}\n`);

  // Explicit prod state of the flagged objects.
  const has = (t: string, c?: string) =>
    (c === undefined ? prod.tables.has(t) : Boolean(prod.tables.get(t)?.has(c))) ? "PRESENT" : "ABSENT";
  w.write("\n  --- EXPLICIT PROD STATE OF FLAGGED OBJECTS ---\n");
  w.write(`  questions.short_test_eligible                : ${has("questions", "short_test_eligible")}\n`);
  w.write(`  consent_records (table)                      : ${has("consent_records")}\n`);
  w.write(`  consent_records.disclosure_version           : ${has("consent_records", "disclosure_version")}\n`);
  w.write(`  consent_records.disclosure_content_sha256    : ${has("consent_records", "disclosure_content_sha256")}\n`);
  w.write("  at-risk tables (prod presence):\n");
  for (const t of AT_RISK_TABLES) {
    const inLocal = local.tables.has(t);
    const note = inLocal ? "" : "  (not in local expected schema)";
    w.write(`    ${pad(t, 26)} ${has(t)}${note}\n`);
  }
}

// ------------------------------------------------------------------------ main

async function main(): Promise<void> {
  const stamp = new Date().toISOString();
  const dsn = localConnString();
  const prodDsn = prodConnString();
  process.stdout.write(`[catchup] local: ${dsn.replace(/:[^:@/]*@/, ":****@")}\n`);
  process.stdout.write(`[catchup] prod : ${prodDsn.replace(/:[^:@/]*@/, ":****@")} (DIRECT Postgres, read-only)\n`);

  const local = await introspectLocal(dsn);
  const prod = await introspectProdSql(prodDsn);

  const d = computeDiff(local, prod);
  const { sql, notNullReviews } = buildSql(local, prod, d, stamp);
  const review = buildReview(d, prod, notNullReviews, stamp);

  writeFileSync(SQL_OUT, sql, "utf8");
  writeFileSync(REVIEW_OUT, review, "utf8");

  printSummary(local, prod, d);
  process.stdout.write(`\n  wrote: ${path.relative(process.cwd(), SQL_OUT)}\n`);
  process.stdout.write(`  wrote: ${path.relative(process.cwd(), REVIEW_OUT)}\n`);
  process.stdout.write("\n  Analysis only — NOTHING was applied to prod. Founder applies the SQL in Studio.\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`[catchup] FAILED: ${String(err instanceof Error ? err.stack ?? err.message : err)}\n`);
  process.exitCode = 1;
});
