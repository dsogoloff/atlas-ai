// Atlas Assessment — AUDITED PROD question-bank loader (bring-up final content step).
//
// WHAT THIS DOES
//   Replicates the AUDITED LOCAL bank -> PROD, idempotently, via PostgREST upserts.
//   The local DB (built from supabase/seed.sql, the cumulative audited state) is the
//   SOURCE OF TRUTH — the final per-row is_active / short_test_eligible / content /
//   content_id values exist only as that materialized result, so we read them back
//   rather than re-deriving them from SQL text.
//
// WHY READ-FROM-LOCAL (not replay seed.sql)
//   * There is no exec_sql RPC and no prod DB password — a service_role key can only
//     drive PostgREST, so we cannot run raw bank SQL against prod. We upsert rows.
//   * Reading ONLY tax_* + questions structurally excludes EVERY non-bank row
//     (parents/children/consent/sessions/placements/report_narrations/admins/
//     instructors/centers) AND the entire `-- LOCAL-DEV QA SEED — DO NOT SHIP` tail —
//     none of those tables are touched. The one dev artifact inside `questions`
//     (PLACEHOLDER-Q-IMG-GRID-001, the visual-gate placeholder) is dropped by prefix.
//
// SAFETY
//   * DRY/COUNT by default: reads local (+ prod read-only) and prints the per-level
//     parity table; writes NOTHING. Pass --prod to perform the live prod upsert.
//   * --prod loads creds ONLY from the gitignored .env.prod.local (same gate as the
//     image uploader). Prints a PROD TARGET banner + resolved URL; aborts if the prod
//     URL is local/empty.
//   * Taxonomy is upserted BEFORE questions (content_id FK). FKs + content_id are
//     remapped by natural CODE across the two databases (uuids differ per DB).
//   * Upserts use the natural keys (tenant+code, tenant+external_id) so re-runs
//     converge and never duplicate.
//
// Run:
//   pnpm convert:load-bank:prod:dry    read local + prod, print parity table, NO writes
//   pnpm convert:load-bank:prod        live upsert into PROD (after founder review)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../activation-image-set";

const TENANT_SLUG = "inspirea_singapore_math";
const EXCLUDE_PREFIX = "PLACEHOLDER-"; // dev visual-gate placeholder; must not reach prod
const LOCAL_DEFAULT_URL = "http://127.0.0.1:54321";

/** Parse a .env file into a plain map WITHOUT touching process.env (two targets need
 *  independent creds from .env.local vs .env.prod.local). */
function parseEnvFile(fileName: string): Record<string, string> {
  const out: Record<string, string> = {};
  const file = path.join(REPO_ROOT, fileName);
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Throw on PostgREST error; return data. */
function ok<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: no data`);
  return res.data;
}

async function resolveTenantId(c: SupabaseClient): Promise<string> {
  const rows = ok(
    await c.from("tenants").select("id, slug, display_name").eq("slug", TENANT_SLUG),
    "read tenant",
  ) as Array<{ id: string; display_name: string }>;
  if (rows.length === 0) throw new Error(`tenant slug '${TENANT_SLUG}' not found`);
  return rows[0].id;
}

interface Bank {
  tenantDisplayName: string;
  strands: Array<{ id: string; code: string; name: string; display_order: number }>;
  levels: Array<{ id: string; code: string; name: string; display_order: number; mvp: boolean }>;
  subStrands: Array<{
    id: string; code: string; name: string; display_order: number;
    applies_to_level_codes: string[]; strand_id: string;
  }>;
  content: Array<{
    id: string; code: string; name: string; display_order: number; mvp: boolean;
    sub_strand_id: string; level_id: string;
  }>;
  questions: Array<Record<string, unknown> & { external_id: string; level: string; is_active: boolean; short_test_eligible: boolean; content_id: string | null }>;
}

async function readBank(c: SupabaseClient, tid: string, displayName: string): Promise<Bank> {
  const strands = ok(await c.from("tax_strands").select("id, code, name, display_order").eq("tenant_id", tid), "read tax_strands") as Bank["strands"];
  const levels = ok(await c.from("tax_levels").select("id, code, name, display_order, mvp").eq("tenant_id", tid), "read tax_levels") as Bank["levels"];
  const subStrands = ok(await c.from("tax_sub_strands").select("id, code, name, display_order, applies_to_level_codes, strand_id").eq("tenant_id", tid), "read tax_sub_strands") as Bank["subStrands"];
  const content = ok(await c.from("tax_content").select("id, code, name, display_order, mvp, sub_strand_id, level_id").eq("tenant_id", tid), "read tax_content") as Bank["content"];
  const questionsAll = ok(
    await c.from("questions").select(
      "external_id, strand, level, difficulty, format, content, misconception_tags, word_count, operation_type, num_operations, representation, is_active, short_test_eligible, content_id",
    ).eq("tenant_id", tid),
    "read questions",
  ) as Bank["questions"];
  const questions = questionsAll.filter((q) => !q.external_id.startsWith(EXCLUDE_PREFIX));
  return { tenantDisplayName: displayName, strands, levels, subStrands, content, questions };
}

/** per-level counts: total / active / short_test_eligible. */
function levelCounts(qs: Bank["questions"]): Map<string, { total: number; active: number; short: number }> {
  const m = new Map<string, { total: number; active: number; short: number }>();
  for (const q of qs) {
    const e = m.get(q.level) ?? { total: 0, active: 0, short: 0 };
    e.total += 1;
    if (q.is_active) e.active += 1;
    if (q.short_test_eligible) e.short += 1;
    m.set(q.level, e);
  }
  return m;
}

function pad(s: string | number, n: number): string {
  return String(s).padEnd(n);
}
function padL(s: string | number, n: number): string {
  return String(s).padStart(n);
}

async function readProdActiveByLevel(c: SupabaseClient, tid: string): Promise<Map<string, number>> {
  const rows = ok(
    await c.from("questions").select("level, is_active").eq("tenant_id", tid),
    "read prod questions",
  ) as Array<{ level: string; is_active: boolean }>;
  const m = new Map<string, number>();
  for (const r of rows) if (r.is_active) m.set(r.level, (m.get(r.level) ?? 0) + 1);
  return m;
}

function printParityTable(local: Bank, prodActive: Map<string, number> | null): void {
  const counts = levelCounts(local.questions);
  const levels = [...counts.keys()].sort();
  process.stdout.write("\n  PER-LEVEL PARITY (source = audited LOCAL bank)\n");
  process.stdout.write(`  ${pad("level", 8)}${padL("local_total", 13)}${padL("local_active", 14)}${padL("local_short", 13)}${padL("prod_active*", 14)}\n`);
  process.stdout.write(`  ${"-".repeat(8 + 13 + 14 + 13 + 14)}\n`);
  let tT = 0, tA = 0, tS = 0, tP = 0;
  for (const lv of levels) {
    const e = counts.get(lv)!;
    const p = prodActive ? (prodActive.get(lv) ?? 0) : null;
    tT += e.total; tA += e.active; tS += e.short; if (p !== null) tP += p;
    process.stdout.write(`  ${pad(lv, 8)}${padL(e.total, 13)}${padL(e.active, 14)}${padL(e.short, 13)}${padL(p === null ? "—" : p, 14)}\n`);
  }
  process.stdout.write(`  ${"-".repeat(8 + 13 + 14 + 13 + 14)}\n`);
  process.stdout.write(`  ${pad("TOTAL", 8)}${padL(tT, 13)}${padL(tA, 14)}${padL(tS, 13)}${padL(prodActive ? tP : "—", 14)}\n`);
  process.stdout.write("  * prod_active = rows currently is_active in PROD (before this load; expected 0 on first run).\n");
  process.stdout.write(`\n  TAXONOMY (local): strands ${local.strands.length} | levels ${local.levels.length} | sub_strands ${local.subStrands.length} | content ${local.content.length}\n`);
  process.stdout.write(`  QUESTIONS (local, excl. ${EXCLUDE_PREFIX}*): ${local.questions.length}\n`);
}

async function upsertBank(prod: SupabaseClient, prodTid: string, local: Bank): Promise<void> {
  // id<->code maps from LOCAL (to translate FK uuids -> codes).
  const lStrandCode = new Map(local.strands.map((s) => [s.id, s.code]));
  const lLevelCode = new Map(local.levels.map((l) => [l.id, l.code]));
  const lSubCode = new Map(local.subStrands.map((s) => [s.id, s.code]));
  const lContentCode = new Map(local.content.map((c) => [c.id, c.code]));

  // 1. tax_strands
  await up(prod, "tax_strands", "tenant_id,code", local.strands.map((s) => ({
    tenant_id: prodTid, code: s.code, name: s.name, display_order: s.display_order,
  })));
  const pStrandId = await codeIdMap(prod, "tax_strands", prodTid);

  // 2. tax_levels
  await up(prod, "tax_levels", "tenant_id,code", local.levels.map((l) => ({
    tenant_id: prodTid, code: l.code, name: l.name, display_order: l.display_order, mvp: l.mvp,
  })));
  const pLevelId = await codeIdMap(prod, "tax_levels", prodTid);

  // 3. tax_sub_strands (strand_id remapped by code)
  await up(prod, "tax_sub_strands", "tenant_id,code", local.subStrands.map((s) => ({
    tenant_id: prodTid, code: s.code, name: s.name, display_order: s.display_order,
    applies_to_level_codes: s.applies_to_level_codes,
    strand_id: pStrandId.get(lStrandCode.get(s.strand_id)!)!,
  })));
  const pSubId = await codeIdMap(prod, "tax_sub_strands", prodTid);

  // 4. tax_content (sub_strand_id + level_id remapped by code)
  await up(prod, "tax_content", "tenant_id,code", local.content.map((c) => ({
    tenant_id: prodTid, code: c.code, name: c.name, display_order: c.display_order, mvp: c.mvp,
    sub_strand_id: pSubId.get(lSubCode.get(c.sub_strand_id)!)!,
    level_id: pLevelId.get(lLevelCode.get(c.level_id)!)!,
  })));
  const pContentId = await codeIdMap(prod, "tax_content", prodTid);

  // 5. questions (content_id remapped: local uuid -> code -> prod uuid)
  const rows = local.questions.map((q) => {
    const code = q.content_id ? lContentCode.get(q.content_id) : null;
    const prodContentId = code ? (pContentId.get(code) ?? null) : null;
    if (q.content_id && !prodContentId) {
      throw new Error(`content_id remap failed for ${q.external_id} (local content_id ${String(q.content_id)} -> code ${String(code)})`);
    }
    return {
      tenant_id: prodTid,
      external_id: q.external_id,
      strand: q.strand,
      level: q.level,
      difficulty: q.difficulty,
      format: q.format,
      content: q.content,
      misconception_tags: q.misconception_tags,
      word_count: q.word_count,
      operation_type: q.operation_type,
      num_operations: q.num_operations,
      representation: q.representation,
      is_active: q.is_active,
      short_test_eligible: q.short_test_eligible,
      content_id: prodContentId,
    };
  });
  await up(prod, "questions", "tenant_id,external_id", rows);
}

async function up(c: SupabaseClient, table: string, onConflict: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await c.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`upsert ${table}: ${error.message}`);
  process.stdout.write(`  upserted ${padL(rows.length, 4)} into ${table}\n`);
}

async function codeIdMap(c: SupabaseClient, table: string, tid: string): Promise<Map<string, string>> {
  const rows = ok(await c.from(table).select("id, code").eq("tenant_id", tid), `re-read ${table}`) as Array<{ id: string; code: string }>;
  return new Map(rows.map((r) => [r.code, r.id]));
}

async function main(): Promise<void> {
  const live = process.argv.includes("--prod");

  // --- SOURCE: local audited bank -----------------------------------------
  const localEnv = parseEnvFile(".env.local");
  const localUrl = localEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || LOCAL_DEFAULT_URL;
  const localKey = localEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!localKey) throw new Error("local SUPABASE_SERVICE_ROLE_KEY not found (.env.local). The local audited DB is the source of truth.");
  if (!/127\.0\.0\.1|localhost/.test(localUrl)) {
    throw new Error(`source must be LOCAL, got ${localUrl}. Refusing to read the bank from a non-local DB.`);
  }
  const localC = makeClient(localUrl, localKey);
  process.stdout.write(`[load-bank] source (local): ${localUrl}\n`);
  const localTid = await resolveTenantId(localC);
  const localTenant = ok(await localC.from("tenants").select("display_name").eq("id", localTid), "read tenant name") as Array<{ display_name: string }>;
  const bank = await readBank(localC, localTid, localTenant[0]?.display_name ?? "");

  // --- TARGET: prod (read-only in dry mode) -------------------------------
  const prodEnv = parseEnvFile(".env.prod.local");
  const prodUrl = prodEnv.NEXT_PUBLIC_SUPABASE_URL || "";
  const prodKey = prodEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  const prodConfigured = Boolean(prodUrl && prodKey);
  const prodIsLocal = /127\.0\.0\.1|localhost/.test(prodUrl);

  let prodC: SupabaseClient | null = null;
  let prodTid: string | null = null;
  let prodActive: Map<string, number> | null = null;
  if (prodConfigured && !prodIsLocal) {
    prodC = makeClient(prodUrl, prodKey);
    try {
      prodTid = await resolveTenantId(prodC);
      prodActive = await readProdActiveByLevel(prodC, prodTid);
    } catch (e) {
      process.stdout.write(`  (prod read skipped: ${String(e)})\n`);
    }
  }

  // --- DRY MODE -----------------------------------------------------------
  if (!live) {
    process.stdout.write("\n=== DRY RUN (no writes) — what WOULD load into PROD ===\n");
    process.stdout.write(`  prod target: ${prodConfigured ? prodUrl : "(.env.prod.local not populated)"}${prodIsLocal ? "  [LOCAL — ignored]" : ""}\n`);
    printParityTable(bank, prodActive);
    process.stdout.write("\n  This was a DRY RUN. Re-run with --prod (pnpm convert:load-bank:prod) to write.\n");
    return;
  }

  // --- LIVE PROD WRITE ----------------------------------------------------
  if (!prodConfigured) throw new Error("--prod given but .env.prod.local is missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  if (prodIsLocal) throw new Error(`--prod given but prod URL is local/empty (${prodUrl}). Populate .env.prod.local with the PROD url; aborting.`);
  process.stdout.write(`\n[load-bank] *** PROD TARGET *** ${prodUrl}\n`);
  if (!prodC || !prodTid) {
    prodC = makeClient(prodUrl, prodKey);
    prodTid = await resolveTenantId(prodC);
  }
  process.stdout.write(`  prod tenant '${TENANT_SLUG}' resolved.\n\n`);

  await upsertBank(prodC, prodTid, bank);

  // --- POST-LOAD parity ---------------------------------------------------
  const after = await readProdActiveByLevel(prodC, prodTid);
  printParityTable(bank, after);
  const want = levelCounts(bank.questions);
  let mismatch = 0;
  for (const [lv, e] of want) if ((after.get(lv) ?? 0) !== e.active) mismatch += 1;
  if (mismatch > 0) {
    process.stderr.write(`\nFAIL — ${mismatch} level(s) have a prod active-count != local. Review above.\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("\nPASS — prod per-level active counts match the audited local bank.\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`[load-bank] FAILED: ${String(err)}\n`);
  process.exitCode = 1;
});
