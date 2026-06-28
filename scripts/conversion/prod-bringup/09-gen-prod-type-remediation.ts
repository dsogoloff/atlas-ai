// Atlas Assessment — PROD type/constraint REMEDIATION generator.
//
// Re-runs the full attribute comparison (PROD direct Postgres vs canonical LOCAL) and
// classifies every column DRIFT, then writes:
//
//   remediation.generated.sql  — ONLY AUTO-SAFE fixes (cannot fail on existing rows, no
//     data loss), each idempotent / safe to re-run:
//       * type WIDENING / lossless cast  -> ALTER COLUMN ... TYPE ... USING (col::target)
//                                           (guarded: only fires if the type still differs)
//       * loosen NOT NULL -> NULL        -> ALTER COLUMN ... DROP NOT NULL
//       * add a MISSING default          -> ALTER COLUMN ... SET DEFAULT <local>
//       * missing enum VALUES            -> ALTER TYPE ... ADD VALUE IF NOT EXISTS
//
//   remediation.review.md      — drifts that could FAIL or LOSE DATA (NOT auto-emitted):
//       * NARROWING / lossy / incompatible cast
//       * tighten NULL -> NOT NULL (needs backfill first)
//       * a default CHANGE / drop (alters intent for new rows)
//       * prod-only columns/tables/enum-values (kept — additive philosophy; INFO)
//       * missing tables/columns/enum-types (-> that is 06's catch-up job; INFO)
//
// Applies NOTHING. Founder applies remediation.generated.sql in prod Studio after review.
//
// Run:  tsx scripts/conversion/prod-bringup/09-gen-prod-type-remediation.ts

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { introspectLocal, introspectProdSql, localConnString, prodConnString } from "./introspect";
import { fullCompare, classifyTypeChange, isAcceptedDrift, type FullDiff } from "./compare";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQL_OUT = path.join(HERE, "remediation.generated.sql");
const REVIEW_OUT = path.join(HERE, "remediation.review.md");

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

interface Auto { kind: "type" | "nullable" | "default" | "enum"; table?: string; col?: string; sql: string; note: string }
interface Review { kind: string; detail: string }
interface Accepted { detail: string }

/** Guarded ALTER COLUMN TYPE — only rewrites if the column type still differs from target. */
function guardedAlterType(table: string, col: string, target: string): string {
  return [
    `DO $$ BEGIN`,
    `  IF EXISTS (SELECT 1 FROM pg_attribute a`,
    `              JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace`,
    `             WHERE n.nspname='public' AND c.relname=${lit(table)} AND a.attname=${lit(col)}`,
    `               AND NOT a.attisdropped AND format_type(a.atttypid,a.atttypmod) <> ${lit(target)}) THEN`,
    `    ALTER TABLE public.${q(table)} ALTER COLUMN ${q(col)} TYPE ${target} USING (${q(col)}::${target});`,
    `  END IF;`,
    `END $$;`,
  ].join("\n");
}

function classify(diff: FullDiff): { autos: Auto[]; reviews: Review[]; accepted: Accepted[] } {
  const autos: Auto[] = [];
  const reviews: Review[] = [];
  const accepted: Accepted[] = [];

  // Missing tables / columns -> 06's job (INFO only).
  for (const t of diff.tables) {
    if (!t.present) {
      reviews.push({ kind: "MISSING-TABLE", detail: `\`${t.table}\` absent in prod — generate with 06 (CREATE TABLE), not 09.` });
      continue;
    }
    for (const c of t.columns) {
      if (c.verdict.kind === "MISSING") {
        reviews.push({ kind: "MISSING-COLUMN", detail: `\`${t.table}.${c.column}\` absent in prod — generate with 06 (ADD COLUMN), not 09.` });
        continue;
      }
      if (c.verdict.kind !== "DRIFT") continue;
      const d = c.verdict.drift;
      const ref = `${t.table}.${c.column}`;

      // --- type ---
      if (d.type && isAcceptedDrift(t.table, c.column, "type")) {
        accepted.push({ detail: `\`${ref}\` type: prod \`${d.type.prod}\` -> local \`${d.type.local}\` — accepted for beta.` });
      } else if (d.type) {
        const change = classifyTypeChange(d.type.prod, d.type.local);
        if (change === "WIDEN") {
          autos.push({ kind: "type", table: t.table, col: c.column, sql: guardedAlterType(t.table, c.column, d.type.local), note: `${ref}: ${d.type.prod} -> ${d.type.local} (widen/lossless)` });
        } else {
          reviews.push({ kind: "TYPE-" + change, detail: `\`${ref}\`: prod \`${d.type.prod}\` -> local \`${d.type.local}\` — **${change}** cast (lossy/uncertain); decide manually.` });
        }
      }

      // --- nullable ---
      if (d.nullable && isAcceptedDrift(t.table, c.column, "nullable")) {
        accepted.push({ detail: `\`${ref}\` nullable: prod ${d.nullable.prod ? "NULL" : "NOT NULL"} -> local ${d.nullable.local ? "NULL" : "NOT NULL"} — accepted for beta (tightening deferred).` });
      } else if (d.nullable) {
        if (d.nullable.local === true && d.nullable.prod === false) {
          autos.push({ kind: "nullable", table: t.table, col: c.column, sql: `ALTER TABLE public.${q(t.table)} ALTER COLUMN ${q(c.column)} DROP NOT NULL;`, note: `${ref}: loosen NOT NULL -> NULL` });
        } else {
          reviews.push({ kind: "TIGHTEN-NOTNULL", detail: `\`${ref}\`: prod NULLABLE -> local NOT NULL — **backfill nulls first**, then \`ALTER COLUMN ${c.column} SET NOT NULL\`.` });
        }
      }

      // --- default ---
      if (d.default && isAcceptedDrift(t.table, c.column, "default")) {
        accepted.push({ detail: `\`${ref}\` default: prod \`${d.default.prod ?? "∅"}\` -> local \`${d.default.local ?? "∅"}\` — accepted for beta (kept).` });
      } else if (d.default) {
        if (d.default.prod === null && d.default.local !== null) {
          autos.push({ kind: "default", table: t.table, col: c.column, sql: `ALTER TABLE public.${q(t.table)} ALTER COLUMN ${q(c.column)} SET DEFAULT ${d.default.local};`, note: `${ref}: add missing default ${d.default.local}` });
        } else if (d.default.local === null && d.default.prod !== null) {
          reviews.push({ kind: "DEFAULT-DROP", detail: `\`${ref}\`: prod has default \`${d.default.prod}\`, local has none — kept (additive). Drop manually only if intended.` });
        } else {
          reviews.push({ kind: "DEFAULT-CHANGE", detail: `\`${ref}\`: prod default \`${d.default.prod}\` -> local \`${d.default.local}\` — changes new-row semantics; decide manually.` });
        }
      }
    }
    if (t.prodOnlyColumns.length) {
      reviews.push({ kind: "PROD-ONLY-COL", detail: `\`${t.table}\` prod-only columns (kept): ${t.prodOnlyColumns.map((x) => `\`${x}\``).join(", ")}.` });
    }
  }

  // --- enums ---
  for (const e of diff.enums) {
    if (e.status === "MISSING") {
      reviews.push({ kind: "MISSING-ENUM", detail: `enum \`${e.name}\` absent in prod — create with 06 (CREATE TYPE), not 09.` });
    } else if (e.status === "DRIFT") {
      for (const v of e.missingInProd) {
        autos.push({ kind: "enum", sql: `ALTER TYPE public.${q(e.name)} ADD VALUE IF NOT EXISTS ${lit(v)};`, note: `enum ${e.name}: add value ${v}` });
      }
    }
    if (e.extraInProd.length) {
      reviews.push({ kind: "PROD-ONLY-ENUMVAL", detail: `enum \`${e.name}\` prod-only values (kept): ${e.extraInProd.join(", ")}.` });
    }
  }
  for (const n of diff.prodOnlyTables) reviews.push({ kind: "PROD-ONLY-TABLE", detail: `\`${n}\` exists in prod, absent in local — kept (additive).` });
  for (const n of diff.prodOnlyEnums) reviews.push({ kind: "PROD-ONLY-ENUM", detail: `enum \`${n}\` exists in prod, absent in local — kept (additive).` });

  return { autos, reviews, accepted };
}

function buildSql(autos: Auto[], stamp: string): string {
  const out: string[] = [];
  out.push("-- ============================================================================");
  out.push("-- Atlas Assessment — PROD type/constraint REMEDIATION (GENERATED, AUTO-SAFE only)");
  out.push(`-- Generated: ${stamp}`);
  out.push("-- Source (canonical EXPECTED): LOCAL 127.0.0.1:54322 (post-reset full migration set)");
  out.push("-- Target: PROD atlas-assessment / ntfaqzueppqymfkefadm");
  out.push("--");
  out.push("-- APPLY IN PROD STUDIO (founder, attended). NEVER `supabase db push` to prod.");
  out.push("-- Only AUTO-SAFE drifts are here: widening/lossless type casts, loosened NOT NULL,");
  out.push("-- and added-missing defaults — none can fail on existing rows or lose data. Each is");
  out.push("-- idempotent (type casts are guarded to skip if already applied). Lossy/narrowing/");
  out.push("-- tightening/default-change drifts are in remediation.review.md (human decision).");
  out.push("-- NOTE: ALTER COLUMN TYPE may rewrite the table (ACCESS EXCLUSIVE lock) but is safe.");
  out.push("-- ============================================================================");
  out.push("");

  const section = (title: string, items: Auto[]) => {
    out.push("-- ---------------------------------------------------------------------------");
    out.push(`-- ${title}`);
    out.push("-- ---------------------------------------------------------------------------");
    if (items.length === 0) out.push("-- (none)");
    for (const a of items) { out.push(`-- ${a.note}`); out.push(a.sql); }
    out.push("");
  };
  section("Type WIDENING (lossless cast)", autos.filter((a) => a.kind === "type"));
  section("Loosen NOT NULL -> NULL", autos.filter((a) => a.kind === "nullable"));
  section("Add MISSING default", autos.filter((a) => a.kind === "default"));
  section("Missing enum VALUES (additive)", autos.filter((a) => a.kind === "enum"));
  return out.join("\n");
}

function buildReview(reviews: Review[], accepted: Accepted[], stamp: string): string {
  const m: string[] = [];
  m.push("# Prod type/constraint remediation — REVIEW (human decision required)", "");
  m.push(`_Generated: ${stamp}. Source = LOCAL (canonical). Target = PROD (direct Postgres)._`, "");
  m.push("These drifts are **NOT** in `remediation.generated.sql` because applying them could fail");
  m.push("on existing rows, lose data, or change intent. Decide each manually.", "");

  m.push("## Accepted for beta (no action, no remediation)", "");
  if (accepted.length === 0) m.push("_None._");
  else for (const a of accepted) m.push(`- ${a.detail}`);
  m.push("");

  const groups: Array<[string, string[]]> = [
    ["Lossy / narrowing / incompatible type casts", ["TYPE-NARROW", "TYPE-INCOMPATIBLE"]],
    ["Tighten NULL -> NOT NULL (backfill first)", ["TIGHTEN-NOTNULL"]],
    ["Default change / drop (new-row semantics)", ["DEFAULT-CHANGE", "DEFAULT-DROP"]],
    ["Prod-only objects (kept — additive, INFO)", ["PROD-ONLY-COL", "PROD-ONLY-TABLE", "PROD-ONLY-ENUM", "PROD-ONLY-ENUMVAL"]],
    ["Missing objects (use 06 catch-up, not 09 — INFO)", ["MISSING-TABLE", "MISSING-COLUMN", "MISSING-ENUM"]],
  ];
  for (const [title, kinds] of groups) {
    const items = reviews.filter((r) => kinds.includes(r.kind));
    m.push(`## ${title}`, "");
    if (items.length === 0) m.push("_None._");
    else for (const it of items) m.push(`- ${it.detail}`);
    m.push("");
  }
  return m.join("\n");
}

async function main(): Promise<void> {
  const stamp = new Date().toISOString();
  const localDsn = localConnString();
  const prodDsn = prodConnString();
  process.stdout.write(`[remediation] local: ${localDsn.replace(/:[^:@/]*@/, ":****@")}\n`);
  process.stdout.write(`[remediation] prod : ${prodDsn.replace(/:[^:@/]*@/, ":****@")} (DIRECT Postgres, read-only)\n`);

  const local = await introspectLocal(localDsn);
  const prod = await introspectProdSql(prodDsn);
  const diff = fullCompare(local, prod);
  const { autos, reviews, accepted } = classify(diff);

  writeFileSync(SQL_OUT, buildSql(autos, stamp), "utf8");
  writeFileSync(REVIEW_OUT, buildReview(reviews, accepted, stamp), "utf8");

  const w = process.stdout;
  w.write("\n=== REMEDIATION CLASSIFICATION (analysis only, nothing applied) ===\n");
  const byKind = (k: string) => autos.filter((a) => a.kind === k).length;
  w.write(`  AUTO-SAFE: ${autos.length}  (type-widen ${byKind("type")}, drop-not-null ${byKind("nullable")}, add-default ${byKind("default")}, enum-value ${byKind("enum")})\n`);
  w.write(`  REVIEW   : ${reviews.length}\n`);
  w.write(`  ACCEPTED (beta, no action): ${accepted.length}\n`);
  if (autos.length) {
    w.write("\n  AUTO-SAFE items:\n");
    for (const a of autos) w.write(`    [${a.kind}] ${a.note}\n`);
  }
  if (reviews.length) {
    w.write("\n  REVIEW items:\n");
    for (const r of reviews) w.write(`    [${r.kind}] ${r.detail.replace(/`/g, "")}\n`);
  }
  if (accepted.length) {
    w.write("\n  ACCEPTED-for-beta (no action):\n");
    for (const a of accepted) w.write(`    ${a.detail.replace(/`/g, "")}\n`);
  }
  w.write(`\n  wrote: ${path.relative(process.cwd(), SQL_OUT)}\n`);
  w.write(`  wrote: ${path.relative(process.cwd(), REVIEW_OUT)}\n`);
  w.write("\n  Analysis only — NOTHING applied. Founder applies remediation.generated.sql in Studio.\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`[remediation] FAILED: ${String(err instanceof Error ? err.stack ?? err.message : err)}\n`);
  process.exitCode = 1;
});
