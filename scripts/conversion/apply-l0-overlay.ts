// Atlas Assessment — L0 authoring overlay applier (lane/l0-authoring).
//
// Re-authors S.A.M. Levels 0A/0B/0C from source into the shared bank, mirroring
// the Option-3 additive pattern proven on lane/l1-reauthoring and lane/l2-authoring
// (apply-l1-overlay.ts / apply-l2-overlay.ts). PURELY ADDITIVE: the committed
// migrations + the generated stage4 block in seed.sql stay byte-for-byte; every
// emitted statement references ONLY SAM-L0* ids (verifyL0Only asserts it).
//
// Background: the 2026-06-11 full-library pipeline run (20260611134158) loaded 21
// SAM-L0* rows but (a) banded them KA/KB because half_grade_level had no pre-K
// level, and (b) model-reconstructed several stems/options (e.g. "Option B
// (unknown)"). This overlay corrects them verbatim-from-source and inserts the
// tasks the pipeline skipped.
//
//   * Consumes THREE overlay files (one per source doc, never folded):
//       overlay/l0a-authoring.json, l0b-authoring.json, l0c-authoring.json
//   * Writes ONE new migration: <LOAD_TS>_l0_overlay_load.sql (inserts +
//     updates). The pre-K enum values 0A/0B/0C are added by the SEPARATE
//     preceding migration 20260616120000_add_prek_grade_levels.sql (enum DDL
//     cannot be used in the same migration that adds it).
//   * Appends one marker-delimited block to the END of seed.sql mirroring the
//     load migration (dev/CI path; runs after every existing block, including
//     the 20260611134158 L0 inserts, so the UPDATEs re-band/re-author them).
//
// The questions_held_rows_inactive CHECK (20260613120000) already exists; held
// image-tap rows carry content._authoring.requires_format_swap=true + is_active
// =false and satisfy it. Activation (real format swap + tiles + clear flag +
// is_active) is a later, atomic step — NOT done here.
//
// Run: pnpm convert:apply-l0-overlay   (tsx scripts/conversion/apply-l0-overlay.ts)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const OVERLAY_FILES = [
  path.join(HERE, "overlay", "l0a-authoring.json"),
  path.join(HERE, "overlay", "l0b-authoring.json"),
  path.join(HERE, "overlay", "l0c-authoring.json"),
];
const SEED_FILE = path.join(REPO_ROOT, "supabase", "seed.sql");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");

// Fixed timestamp — sorts after the pre-K enum migration (20260616120000) and
// every other existing migration. Committed once.
const LOAD_TS = "20260616120100";
const LOAD_FILE = `${LOAD_TS}_l0_overlay_load.sql`;

const TENANT_SLUG = "inspirea_singapore_math";
const SEED_BEGIN = "-- BEGIN l0-overlay (lane/l0-authoring — do not hand-edit; pnpm convert:apply-l0-overlay)";
const SEED_END = "-- END l0-overlay";

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
  level?: string;
  format?: string;
  content?: Record<string, unknown>;
  is_active?: boolean;
  content_merge?: Record<string, unknown>;
}

interface OverlayGuard {
  external_id: string;
  format_in?: string[];
  is_active?: boolean;
  level_in?: string[];
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
// SQL rendering helpers (mirror apply-l1/l2-overlay.ts).
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

/** content_key may be null (no clean taxonomy code, e.g. "Same or different",
 *  position/direction words) — emit SQL NULL so content_id resolves to NULL. */
function sqlContentKey(code: string | null): string {
  return code === null || code === "" ? "null" : sqlString(code);
}

/** Compact activation-control stub embedded in the content jsonb of every
 *  held/inactive row so it is self-describing AND the guardrail CHECK can read
 *  requires_format_swap. The rich answer_model/tiles stay in the overlay file
 *  (source of truth) and are materialised into the DB only at activation. */
function authoringStub(a: OverlayAuthoring): Record<string, unknown> {
  return {
    target_interaction: a.target_interaction,
    blocker_code: a.blocker_code,
    held: a.held,
    requires_format_swap: a.requires_format_swap,
  };
}

/** Active rows stay clean; held/inactive rows carry the _authoring stub.
 *  Applied to BOTH insert and update content so the guardrail invariant holds
 *  regardless of action. */
function withAuthoring(task: OverlayTask, content: Record<string, unknown>): Record<string, unknown> {
  if (task.status === "active" && task.is_active) return content;
  return { ...content, _authoring: authoringStub(task.authoring) };
}

function renderInsertTuple(externalId: string, task: OverlayTask): string {
  const row = task.row;
  if (!row) throw new Error(`insert task ${externalId} without row`);
  const content = withAuthoring(task, row.content);
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
  if (upd.level !== undefined) sets.push(`level = ${sqlString(upd.level)}::half_grade_level`);
  if (upd.format !== undefined) sets.push(`format = ${sqlString(upd.format)}::question_format`);
  if (upd.is_active !== undefined) sets.push(`is_active = ${String(upd.is_active)}`);
  if (upd.content !== undefined) sets.push(`content = ${sqlJsonb(withAuthoring(task, upd.content))}`);
  if (upd.content_merge !== undefined) {
    sets.push(`content = q.content || ${sqlJsonb(upd.content_merge)}`);
  }
  if (sets.length === 0) throw new Error(`update task ${externalId} has empty SET`);
  const where: string[] = [`q.tenant_id = t.id`, `q.external_id = ${sqlString(externalId)}`];
  if (guard.format_in && guard.format_in.length > 0) {
    where.push(`q.format in (${guard.format_in.map((f) => sqlString(f)).join(", ")})`);
  }
  if (guard.level_in && guard.level_in.length > 0) {
    where.push(`q.level in (${guard.level_in.map((l) => sqlString(l)).join(", ")})`);
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

function dataStatements(tasks: Array<[string, OverlayTask]>): { insertSql: string; updateSqls: string[] } {
  const inserts: Array<[string, OverlayTask]> = [];
  const updates: Array<[string, OverlayTask]> = [];
  for (const [id, task] of tasks) {
    if (task.action === "insert") inserts.push([id, task]);
    else if (task.action === "update") updates.push([id, task]);
  }
  const byId = (a: [string, OverlayTask], b: [string, OverlayTask]): number => a[0].localeCompare(b[0]);
  inserts.sort(byId);
  updates.sort(byId);
  return {
    insertSql: buildInsertStatement(inserts),
    updateSqls: updates.map(([id, task]) => buildUpdateStatement(id, task)),
  };
}

/** Every external_id literal appearing in the emitted SQL must be SAM-L0[ABC]-Q*. */
function verifyL0Only(sql: string): void {
  const ids = sql.match(/SAM-L\d+[A-Z]?-Q\d+/g) ?? [];
  const nonL0 = [...new Set(ids)].filter((id) => !/^SAM-L0[ABC]-Q\d+$/.test(id));
  if (nonL0.length > 0) {
    throw new Error(`non-destruction violated: emitted SQL references non-L0 ids: ${nonL0.join(", ")}`);
  }
}

function buildLoadMigration(insertSql: string, updateSqls: string[]): string {
  return [
    "-- Atlas Assessment — L0 authoring overlay load (lane/l0-authoring).",
    "--",
    "-- Generated by scripts/conversion/apply-l0-overlay.ts from",
    "-- scripts/conversion/overlay/l0{a,b,c}-authoring.json. Do not hand-edit.",
    "--",
    "-- Additive only: SAM-L0* inserts (on conflict do nothing) + UPDATEs that",
    "-- re-band the 21 pipeline-loaded SAM-L0 rows from KA/KB to their true",
    "-- 0A/0B/0C level and replace model-reconstructed content with",
    "-- verbatim-from-source content. Requires the pre-K enum values added by",
    "-- 20260616120000_add_prek_grade_levels.sql (separate migration).",
    "--",
    "-- Held image-tap rows (tap-one / tap-many / order pictures) carry",
    "-- content._authoring.requires_format_swap=true + is_active=false and",
    "-- satisfy the questions_held_rows_inactive CHECK (20260613120000). They are",
    "-- NOT activated here (serve-time per-tile image minting is a later step).",
    "--",
    "-- AGENTS.md §11 parity: prod path. On dev `supabase db reset` this is a",
    "-- no-op for inserts (runs before seed.sql creates the tenant); the identical",
    "-- statements are mirrored into seed.sql in the l0-overlay block.",
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
    "-- generated stage4 block, the reclassify mirrors, the full-library L0 inserts",
    "-- (20260611134158) and the l1/l2-overlay blocks). Idempotent.",
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
    if (end === -1) throw new Error("seed.sql has BEGIN l0-overlay without END");
    const after = end + SEED_END.length;
    return seed.slice(0, begin) + block + seed.slice(after);
  }
  const sep = seed.endsWith("\n") ? "\n" : "\n\n";
  return `${seed}${sep}${block}\n`;
}

async function loadOverlays(): Promise<Array<[string, OverlayTask]>> {
  const all: Array<[string, OverlayTask]> = [];
  const seen = new Set<string>();
  for (const file of OVERLAY_FILES) {
    const overlay = JSON.parse(await readFile(file, "utf8")) as Overlay;
    for (const [id, task] of Object.entries(overlay.tasks)) {
      if (seen.has(id)) throw new Error(`duplicate external_id across overlay files: ${id}`);
      seen.add(id);
      all.push([id, task]);
    }
  }
  return all;
}

async function main(): Promise<void> {
  const tasks = await loadOverlays();
  const { insertSql, updateSqls } = dataStatements(tasks);

  const loadMigration = buildLoadMigration(insertSql, updateSqls);
  const seedBlock = buildSeedBlock(insertSql, updateSqls);

  // Non-destruction guard: emitted data SQL must touch only SAM-L0 ids.
  verifyL0Only(loadMigration);
  verifyL0Only(seedBlock);

  await writeFile(path.join(MIGRATIONS_DIR, LOAD_FILE), `${loadMigration}\n`, "utf8");

  const seedBefore = await readFile(SEED_FILE, "utf8");
  const seedAfter = spliceSeedBlock(seedBefore, seedBlock);
  await writeFile(SEED_FILE, seedAfter, "utf8");

  const inserts = tasks.filter(([, t]) => t.action === "insert");
  const updates = tasks.filter(([, t]) => t.action === "update");
  const none = tasks.filter(([, t]) => t.action === "none");
  process.stdout.write(
    [
      "[apply-l0-overlay] done",
      `  migration: ${LOAD_FILE}`,
      `  inserts: ${String(inserts.length)}  updates: ${String(updates.length)}  none(audit-only): ${String(none.length)}`,
      `  seed.sql: l0-overlay block ${seedBefore.includes(SEED_BEGIN) ? "replaced" : "appended"}`,
      "  non-destruction: emitted SQL references only SAM-L0 ids (asserted)",
      "",
    ].join("\n"),
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`[apply-l0-overlay] FAILED: ${String(err)}\n`);
  process.exitCode = 1;
});
