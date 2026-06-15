// Atlas Assessment — L2 authoring overlay applier (lane/l2-authoring).
//
// Mirrors the Option-3 pattern proven on lane/l1-reauthoring
// (scripts/conversion/apply-l1-overlay.ts): PURELY ADDITIVE. The committed
// migrations + the generated stage4 block in seed.sql are the source of
// truth for every NON-L2 row and stay byte-for-byte.
//
//   * writes ONE new migration (immutable history untouched):
//       - <LOAD_TS>_l2_overlay_load.sql   (11 new SAM-L2 inserts)
//     The is_active=true-while-requires_format_swap guardrail CHECK already
//     exists (added by 20260613120000 on lane/l1-reauthoring) — Q06 (the one
//     held row) satisfies it, so no guardrail migration is re-emitted.
//   * appends one marker-delimited block to the END of seed.sql mirroring
//     the load migration's inserts (dev/CI path; runs after the generated
//     stage4 block, the reclassify mirrors and the l1-overlay block).
//
// It NEVER rewrites the generated block or any existing migration, and
// verifyL2Only() asserts every emitted statement references only SAM-L2 ids.
//
// action=none rows (the 11 existing SAM-L2 rows) emit NO SQL — recorded in
// the overlay for the audit trail only.
//
// Run: pnpm convert:apply-l2-overlay   (tsx scripts/conversion/apply-l2-overlay.ts)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const OVERLAY_FILE = path.join(HERE, "overlay", "l2-authoring.json");
const SEED_FILE = path.join(REPO_ROOT, "supabase", "seed.sql");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");

// Fixed timestamp — sorts after every existing migration incl. the
// l1-overlay load (20260613120100), the l1 input-formats enum add
// (20260614120000), and the l1-art activation (20260614120001). Stamped
// 130000 (not 120000) to keep every migration version UNIQUE — a shared
// 20260614120000 would risk a schema_migrations primary-key conflict and
// fragile lexicographic ordering. Committed once.
const LOAD_TS = "20260614130000";
const LOAD_FILE = `${LOAD_TS}_l2_overlay_load.sql`;

const TENANT_SLUG = "inspirea_singapore_math";
const SEED_BEGIN = "-- BEGIN l2-overlay (lane/l2-authoring — do not hand-edit; pnpm convert:apply-l2-overlay)";
const SEED_END = "-- END l2-overlay";

// ---------------------------------------------------------------------------
// Overlay shape (only the fields this script consumes).
// ---------------------------------------------------------------------------

interface OverlayRow {
  strand: string;
  level: string;
  difficulty: number;
  format: string;
  content: Record<string, unknown>;
  misconception_tags: string[];
  word_count: number;
  operation_type: string;
  num_operations: number;
  representation: string;
  content_key: string | null;
}

interface OverlayAuthoring {
  target_interaction: string;
  blocker_code: string;
  held: boolean;
  requires_format_swap: boolean;
}

interface OverlayUpdate {
  format?: string;
  content?: Record<string, unknown>;
  is_active?: boolean;
  content_merge?: Record<string, unknown>;
}

interface OverlayGuard {
  external_id: string;
  format_in?: string[];
  is_active?: boolean;
}

interface OverlayTask {
  task_number: number;
  status: string;
  action: "insert" | "update" | "none";
  is_active: boolean;
  row?: OverlayRow;
  update?: OverlayUpdate;
  guard?: OverlayGuard;
  authoring: OverlayAuthoring;
}

interface Overlay {
  tasks: Record<string, OverlayTask>;
}

// ---------------------------------------------------------------------------
// SQL rendering helpers (mirror stage4-load.ts / apply-l1-overlay.ts).
// ---------------------------------------------------------------------------

function sqlString(text: string): string {
  return `'${text.replace(/'/g, "''")}'`;
}

function sqlJsonb(value: Record<string, unknown>): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(items: string[]): string {
  if (items.length === 0) return "array[]::text[]";
  return `array[${items.map((i) => sqlString(i)).join(", ")}]`;
}

/** content_key may be null (no taxonomy match, e.g. ordinal positions) — emit
 *  SQL NULL so the tax_content subquery yields a NULL content_id. */
function sqlContentKey(code: string | null): string {
  return code === null || code === "" ? "null" : sqlString(code);
}

/** Compact activation-control block embedded in the content jsonb of every
 *  non-active row, so held rows are self-describing AND the guardrail CHECK
 *  constraint can see requires_format_swap. The rich answer_model stays in
 *  the overlay file (source of truth). */
function authoringStub(a: OverlayAuthoring): Record<string, unknown> {
  return {
    target_interaction: a.target_interaction,
    blocker_code: a.blocker_code,
    held: a.held,
    requires_format_swap: a.requires_format_swap,
  };
}

function buildInsertContent(task: OverlayTask): Record<string, unknown> {
  const row = task.row;
  if (!row) throw new Error("insert task without row");
  // Active rows stay clean (no _authoring); held/inactive rows carry the stub.
  if (task.status === "active" && task.is_active) return row.content;
  return { ...row.content, _authoring: authoringStub(task.authoring) };
}

function renderInsertTuple(externalId: string, task: OverlayTask): string {
  const row = task.row;
  if (!row) throw new Error(`insert task ${externalId} without row`);
  const content = buildInsertContent(task);
  return (
    `    (${sqlString(externalId)}, ${sqlString(row.strand)}, ${sqlString(row.level)}, ` +
    `${row.difficulty}, ${sqlString(row.format)},\n` +
    `     ${sqlJsonb(content)},\n` +
    `     ${sqlTextArray(row.misconception_tags)},\n` +
    `     ${row.word_count}, ${sqlString(row.operation_type)}, ${row.num_operations}, ` +
    `${sqlString(row.representation)}, ${String(task.is_active)}, ${sqlContentKey(row.content_key)})`
  );
}

function buildInsertStatement(inserts: Array<[string, OverlayTask]>): string {
  const tuples = inserts
    .map(([id, task]) => `    -- ${id} | ${task.status} | blocker ${task.authoring.blocker_code}\n${renderInsertTuple(id, task)}`)
    .join(",\n\n");
  return [
    `with t as (select id from tenants where slug = ${sqlString(TENANT_SLUG)})`,
    "insert into questions",
    "  (tenant_id, external_id, strand, level, difficulty, format,",
    "   content, misconception_tags,",
    "   word_count, operation_type, num_operations, representation,",
    "   is_active, content_id)",
    "select t.id, v.external_id, v.strand::strand, v.level::half_grade_level,",
    "       v.difficulty, v.format::question_format,",
    "       v.content::jsonb, v.misconception_tags,",
    "       v.word_count, v.operation_type::operation_type, v.num_operations,",
    "       v.representation::representation_kind,",
    "       v.is_active,",
    "       (select tc.id from tax_content tc",
    "          where tc.tenant_id = t.id and tc.code = v.content_key)",
    "from t,",
    "  (values",
    tuples,
    "  ) as v(external_id, strand, level, difficulty, format, content,",
    "         misconception_tags, word_count, operation_type, num_operations,",
    "         representation, is_active, content_key)",
    "on conflict (tenant_id, external_id) do nothing;",
  ].join("\n");
}

function buildUpdateStatement(externalId: string, task: OverlayTask): string {
  const upd = task.update;
  const guard = task.guard;
  if (!upd || !guard) throw new Error(`update task ${externalId} missing update/guard`);
  const sets: string[] = [];
  if (upd.format !== undefined) sets.push(`format = ${sqlString(upd.format)}`);
  if (upd.is_active !== undefined) sets.push(`is_active = ${String(upd.is_active)}`);
  if (upd.content !== undefined) sets.push(`content = ${sqlJsonb(upd.content)}`);
  if (upd.content_merge !== undefined) {
    sets.push(`content = q.content || ${sqlJsonb(upd.content_merge)}`);
  }
  const where: string[] = [`q.tenant_id = t.id`, `q.external_id = ${sqlString(externalId)}`];
  if (guard.format_in && guard.format_in.length > 0) {
    where.push(`q.format in (${guard.format_in.map((f) => sqlString(f)).join(", ")})`);
  }
  if (guard.is_active !== undefined) where.push(`q.is_active = ${String(guard.is_active)}`);
  return [
    `-- ${externalId}: ${task.status} (${task.authoring.target_interaction}, blocker ${task.authoring.blocker_code})`,
    `with t as (select id from tenants where slug = ${sqlString(TENANT_SLUG)})`,
    `update questions q`,
    `set ${sets.join(",\n    ")}`,
    `from t`,
    `where ${where.join("\n  and ")};`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Assembly + non-destruction proof.
// ---------------------------------------------------------------------------

function dataStatements(overlay: Overlay): { insertSql: string; updateSqls: string[] } {
  const inserts: Array<[string, OverlayTask]> = [];
  const updates: Array<[string, OverlayTask]> = [];
  for (const [id, task] of Object.entries(overlay.tasks)) {
    if (task.action === "insert") inserts.push([id, task]);
    else if (task.action === "update") updates.push([id, task]);
  }
  inserts.sort((a, b) => a[1].task_number - b[1].task_number);
  updates.sort((a, b) => a[1].task_number - b[1].task_number);
  return {
    insertSql: buildInsertStatement(inserts),
    updateSqls: updates.map(([id, task]) => buildUpdateStatement(id, task)),
  };
}

/** Every external_id literal appearing in the emitted SQL must be SAM-L2-*. */
function verifyL2Only(sql: string): void {
  const ids = sql.match(/SAM-L\d+[A-Z]?-Q\d+/g) ?? [];
  const nonL2 = [...new Set(ids)].filter((id) => !/^SAM-L2-Q\d+$/.test(id));
  if (nonL2.length > 0) {
    throw new Error(`non-destruction violated: emitted SQL references non-L2 ids: ${nonL2.join(", ")}`);
  }
}

function buildLoadMigration(insertSql: string, updateSqls: string[]): string {
  return [
    "-- Atlas Assessment — L2 authoring overlay load (lane/l2-authoring).",
    "--",
    "-- Generated by scripts/conversion/apply-l2-overlay.ts from",
    "-- scripts/conversion/overlay/l2-authoring.json. Do not hand-edit.",
    "--",
    "-- Additive only: 11 new SAM-L2 inserts (on conflict do nothing). The 11",
    "-- existing SAM-L2 rows (20260511000100 + content_id backfill 20260610000000)",
    "-- are untouched. 10 inserts are active (text/numeric/MC, image-essential",
    "-- ones carry image_path/image_alt/image_required); Q06 is held",
    "-- (is_active=false, _authoring.requires_format_swap=true — image-option MC",
    "-- not yet a wired format) and satisfies the questions_held_rows_inactive",
    "-- CHECK from 20260613120000.",
    "--",
    "-- AGENTS.md §11 parity: this is the prod path. On dev `supabase db reset`",
    "-- it is a no-op (runs before seed.sql creates the tenant); the identical",
    "-- statements are mirrored into seed.sql in the l2-overlay block.",
    "",
    insertSql,
    "",
    ...updateSqls.flatMap((s) => [s, ""]),
  ].join("\n");
}

function buildSeedBlock(insertSql: string, updateSqls: string[]): string {
  return [
    SEED_BEGIN,
    `-- MIRRORS supabase/migrations/${LOAD_FILE} (dev/CI path; runs after the`,
    "-- generated stage4 block, the reclassify mirrors and the l1-overlay block).",
    "-- Idempotent (on conflict do nothing).",
    "",
    insertSql,
    "",
    ...updateSqls.flatMap((s) => [s, ""]),
    SEED_END,
  ].join("\n");
}

function spliceSeedBlock(seed: string, block: string): string {
  const begin = seed.indexOf(SEED_BEGIN);
  if (begin !== -1) {
    const end = seed.indexOf(SEED_END, begin);
    if (end === -1) throw new Error("seed.sql has BEGIN l2-overlay without END");
    const after = end + SEED_END.length;
    return seed.slice(0, begin) + block + seed.slice(after);
  }
  const sep = seed.endsWith("\n") ? "\n" : "\n\n";
  return `${seed}${sep}${block}\n`;
}

async function main(): Promise<void> {
  const overlay = JSON.parse(await readFile(OVERLAY_FILE, "utf8")) as Overlay;
  const { insertSql, updateSqls } = dataStatements(overlay);

  const loadMigration = buildLoadMigration(insertSql, updateSqls);
  const seedBlock = buildSeedBlock(insertSql, updateSqls);

  // Non-destruction guard: emitted data SQL must touch only SAM-L2 ids.
  verifyL2Only(loadMigration);
  verifyL2Only(seedBlock);

  await writeFile(path.join(MIGRATIONS_DIR, LOAD_FILE), `${loadMigration}\n`, "utf8");

  const seedBefore = await readFile(SEED_FILE, "utf8");
  const seedAfter = spliceSeedBlock(seedBefore, seedBlock);
  await writeFile(SEED_FILE, seedAfter, "utf8");

  const inserts = Object.entries(overlay.tasks).filter(([, t]) => t.action === "insert");
  const updates = Object.entries(overlay.tasks).filter(([, t]) => t.action === "update");
  const none = Object.entries(overlay.tasks).filter(([, t]) => t.action === "none");
  process.stdout.write(
    [
      "[apply-l2-overlay] done",
      `  migration: ${LOAD_FILE}`,
      `  inserts: ${String(inserts.length)}  updates: ${String(updates.length)}  none(audit-only): ${String(none.length)}`,
      `  seed.sql: l2-overlay block ${seedBefore.includes(SEED_BEGIN) ? "replaced" : "appended"}`,
      "  non-destruction: emitted SQL references only SAM-L2 ids (asserted)",
      "",
    ].join("\n"),
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`[apply-l2-overlay] FAILED: ${String(err)}\n`);
  process.exitCode = 1;
});
