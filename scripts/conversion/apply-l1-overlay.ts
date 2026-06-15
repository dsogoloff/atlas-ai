// Atlas Assessment — L1 re-authoring overlay applier (lane/l1-reauthoring).
//
// Option 3 (founder-directed 2026-06-13): stage4-load.ts and its tests are
// left UNTOUCHED. The committed migrations + the generated stage4 block in
// seed.sql are the source of truth for every NON-L1 row and must stay
// byte-for-byte. This script is PURELY ADDITIVE:
//
//   * writes two NEW migrations (immutable history untouched):
//       - <GUARDRAIL_TS>_l1_activation_guardrail.sql  (CHECK constraint)
//       - <LOAD_TS>_l1_overlay_load.sql               (16 inserts + 2 updates)
//   * appends one marker-delimited block to the END of seed.sql mirroring
//     the load migration's data statements (the same "statements after the
//     generated block" pattern the reclassify mirror already uses). The
//     generated stage4 BEGIN/END block is never reopened.
//
// It NEVER rewrites the generated block or any existing migration, so the
// non-destruction property holds by construction; verifyNonDestruction()
// additionally asserts every emitted statement references only SAM-L1 ids.
//
// Run: pnpm convert:apply-overlay   (tsx scripts/conversion/apply-l1-overlay.ts)
//
// NOT a full seed reconciliation — the L1-4 stage3-stale drift remains a
// tracked follow-up. This is the L1 down-payment.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const OVERLAY_FILE = path.join(HERE, "overlay", "l1-authoring.json");
const SEED_FILE = path.join(REPO_ROOT, "supabase", "seed.sql");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");

// Fixed timestamps (sort after every existing migration; committed once).
// Guardrail first so the constraint exists before the load inserts run.
const GUARDRAIL_TS = "20260613120000";
const LOAD_TS = "20260613120100";
const GUARDRAIL_FILE = `${GUARDRAIL_TS}_l1_activation_guardrail.sql`;
const LOAD_FILE = `${LOAD_TS}_l1_overlay_load.sql`;

const TENANT_SLUG = "inspirea_singapore_math";
const SEED_BEGIN = "-- BEGIN l1-overlay (lane/l1-reauthoring — do not hand-edit; pnpm convert:apply-overlay)";
const SEED_END = "-- END l1-overlay";
const CONSTRAINT_NAME = "questions_held_rows_inactive";

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
  content_key: string;
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
// SQL rendering helpers (mirror stage4-load.ts conventions).
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

/** Compact activation-control block embedded in the content jsonb of every
 *  non-active row, so held rows are self-describing AND the guardrail CHECK
 *  constraint can see requires_format_swap. The rich answer_model stays in
 *  the overlay file (source of truth) — not duplicated into the DB. */
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
    `${sqlString(row.representation)}, ${String(task.is_active)}, ${sqlString(row.content_key)})`
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

function buildGuardrailSql(): string {
  return [
    "-- Atlas Assessment — L1 activation guardrail (lane/l1-reauthoring).",
    "--",
    "-- A staged row whose real interaction is not yet a wired question_format",
    "-- (equation-set, select-multiple, multi-blank, visual-matching) carries",
    "-- content._authoring.requires_format_swap = true. This CHECK makes a bare",
    "-- is_active=true on such a row INVALID by construction: activation is the",
    "-- atomic step (add the enum value -> set real format + content -> clear",
    "-- requires_format_swap -> set is_active=true). Existing rows carry no",
    "-- _authoring key, so the flag coalesces to false and they are unaffected.",
    "-- Idempotent: drop-if-exists then add.",
    "",
    `alter table questions drop constraint if exists ${CONSTRAINT_NAME};`,
    "",
    `alter table questions add constraint ${CONSTRAINT_NAME}`,
    "  check (",
    "    not (",
    "      is_active",
    "      and coalesce((content #>> '{_authoring,requires_format_swap}')::boolean, false)",
    "    )",
    "  );",
    "",
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
  // Stable order by task_number for readable, deterministic output.
  inserts.sort((a, b) => a[1].task_number - b[1].task_number);
  updates.sort((a, b) => a[1].task_number - b[1].task_number);
  return {
    insertSql: buildInsertStatement(inserts),
    updateSqls: updates.map(([id, task]) => buildUpdateStatement(id, task)),
  };
}

/** Every external_id literal appearing in the emitted SQL must be SAM-L1-*.
 *  Guards against an accidental non-L1 mutation. */
function verifyL1Only(sql: string): void {
  const ids = sql.match(/SAM-L\d+[A-Z]?-Q\d+/g) ?? [];
  const nonL1 = [...new Set(ids)].filter((id) => !/^SAM-L1-Q\d+$/.test(id));
  if (nonL1.length > 0) {
    throw new Error(`non-destruction violated: emitted SQL references non-L1 ids: ${nonL1.join(", ")}`);
  }
}

function buildLoadMigration(insertSql: string, updateSqls: string[]): string {
  return [
    "-- Atlas Assessment — L1 overlay load (lane/l1-reauthoring).",
    "--",
    "-- Generated by scripts/conversion/apply-l1-overlay.ts from",
    "-- scripts/conversion/overlay/l1-authoring.json. Do not hand-edit.",
    "--",
    "-- Additive only: 16 new SAM-L1 inserts (on conflict do nothing) + 2",
    "-- corrections (Q20 -> MULTIPLE_CHOICE, Q25 -> deactivated). The original",
    "-- generated load migration (20260610151306) is immutable and untouched;",
    "-- on-conflict means re-inserting an existing id is a no-op, so the two",
    "-- corrections are UPDATEs guarded on current state (idempotent across the",
    "-- pre/post reclassify head state: NUMERIC_ENTRY|TEXT_ENTRY).",
    "--",
    "-- AGENTS.md §11 parity: prod path. On dev `supabase db reset` this is a",
    "-- no-op (runs before seed.sql creates the tenant); the identical",
    "-- statements are mirrored into seed.sql in the l1-overlay block.",
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
    "-- generated stage4 block and the reclassify mirrors). Idempotent.",
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
    if (end === -1) throw new Error("seed.sql has BEGIN l1-overlay without END");
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
  const guardrailSql = buildGuardrailSql();

  // Non-destruction guard: emitted data SQL must touch only SAM-L1 ids.
  verifyL1Only(loadMigration);
  verifyL1Only(seedBlock);

  await writeFile(path.join(MIGRATIONS_DIR, GUARDRAIL_FILE), guardrailSql, "utf8");
  await writeFile(path.join(MIGRATIONS_DIR, LOAD_FILE), `${loadMigration}\n`, "utf8");

  const seedBefore = await readFile(SEED_FILE, "utf8");
  const seedAfter = spliceSeedBlock(seedBefore, seedBlock);
  await writeFile(SEED_FILE, seedAfter, "utf8");

  const inserts = Object.entries(overlay.tasks).filter(([, t]) => t.action === "insert");
  const updates = Object.entries(overlay.tasks).filter(([, t]) => t.action === "update");
  process.stdout.write(
    [
      "[apply-l1-overlay] done",
      `  migrations: ${GUARDRAIL_FILE}, ${LOAD_FILE}`,
      `  inserts: ${String(inserts.length)}  updates: ${String(updates.length)}`,
      `  seed.sql: l1-overlay block ${seedBefore.includes(SEED_BEGIN) ? "replaced" : "appended"}`,
      "  non-destruction: emitted SQL references only SAM-L1 ids (asserted)",
      "",
    ].join("\n"),
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`[apply-l1-overlay] FAILED: ${String(err)}\n`);
  process.exitCode = 1;
});
