// Atlas Assessment — conversion pipeline Stage 4.
//
// Load: turns Stage 3 output (stage3-tagged.json, founder-reviewed DRAFT)
// into DB-loadable SQL:
//
//   * supabase/migrations/<ts>_load_sam_questions.sql — the questions
//     INSERT in the established tenant-CTE pattern (prod path).
//   * supabase/seed.sql — the identical statement mirrored between
//     BEGIN/END markers (dev/CI path; AGENTS.md §11: migrations run before
//     seed.sql creates the tenant, so the migration INSERT is a no-op on
//     `supabase db reset` — the seed mirror is what loads rows in dev).
//   * stage4-upload-manifest.json — per-worksheet record of source-page
//     PNG uploads to the private question-images bucket (staging material
//     for image curation; NEVER the displayed question image).
//
// Idempotency:
//   * migration — re-runs find the existing *_load_sam_questions.sql by
//     its marker header comment and rewrite it in place (no second file).
//   * seed.sql — re-runs replace the marker-delimited block (no
//     duplication). Existing hand-written blocks are never touched.
//   * DB layer — `on conflict (tenant_id, external_id) do nothing`.
//
// Run via: pnpm convert:load

import { appendFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants — enum values read from src/lib/supabase/database.types.ts and
// supabase/migrations/20260507000000_add_question_time_norm_tags.sql.
// ---------------------------------------------------------------------------

export const VALID_OPERATION_TYPES = [
  "ADDITION",
  "SUBTRACTION",
  "MULTIPLICATION",
  "DIVISION",
  "FRACTION_OP",
  "DECIMAL_OP",
  "PERCENT_OP",
  "GEOMETRY",
  "MEASUREMENT",
  "PATTERN",
  "ALGEBRA",
  "COUNTING",
  "IDENTIFY",
] as const;

export const VALID_REPRESENTATIONS = [
  "SYMBOLIC",
  "PICTORIAL",
  "BAR_MODEL_REQUIRED",
  "WORD_PROBLEM_SINGLE",
  "WORD_PROBLEM_MULTI",
] as const;

export const VALID_FORMATS = [
  "MULTIPLE_CHOICE",
  "NUMERIC_ENTRY",
  "DRAG_DROP",
] as const;

/** Old `strand` enum (database.types.ts Enums.strand) — the engine's
 *  diagnostic-band axis. */
export const VALID_STRANDS = [
  "number_sense",
  "operations_algorithms",
  "fractions_decimals",
  "measurement",
  "geometry",
  "data_statistics",
] as const;

/** half_grade_level enum in ability order (database.types.ts). */
export const HALF_GRADE_LEVELS = [
  "KA", "KB",
  "1A", "1B",
  "2A", "2B",
  "3A", "3B",
  "4A", "4B",
  "5A", "5B",
  "6A", "6B",
  "7A", "7B",
  "8A", "8B",
] as const;

export type OperationType = (typeof VALID_OPERATION_TYPES)[number];
export type Representation = (typeof VALID_REPRESENTATIONS)[number];
export type QuestionFormat = (typeof VALID_FORMATS)[number];
export type StrandEnum = (typeof VALID_STRANDS)[number];
export type HalfGradeLevel = (typeof HALF_GRADE_LEVELS)[number];

// ---------------------------------------------------------------------------
// Strand mapping — V2026 sub_strand → old strand enum.
//
// Anchors come from the bridge migration
// 20260525000003_bridge_questions_to_tax_content.sql (geometry→geometry,
// measurement→measurement, data_representation→data_statistics). The rest
// are decided here and documented in the PR:
//   * whole_numbers → number_sense (place value, ordering, counting,
//     patterns — matches every SYMBOLIC hand-seeded SAM-L2 row).
//   * fractions / decimals / percentage → fractions_decimals.
//   * money → measurement (old taxonomy housed Money under the
//     measurement sub-strand: l1-measurement-3, l2-measurement-4).
//   * area_volume → geometry (perimeter/area diagnostics carry the GE_
//     misconception prefix — GE_PERIMETER_AREA).
//   * rate / ratio / algebra → operations_algorithms (multiplicative /
//     algebraic reasoning; L5-L6 only, outside MVP).
//
// Word-problem override: a whole_numbers or money item whose
// representation is WORD_PROBLEM_* AND whose operation_type is one of the
// four arithmetic ops maps to operations_algorithms instead. This is NOT
// a free-floating "word problems change strand" rule — it is the exact
// precedent the hand-seeded rows establish (SAM-L2-Q11/Q14/Q17 are
// word-problem arithmetic → operations_algorithms; the Q17 seed comment
// documents the money reassignment explicitly) while every SYMBOLIC
// whole-number row stayed number_sense. Word problems in other
// sub-strands (e.g. l3-measurement-3 "Word Problems") keep their
// sub-strand mapping.
// ---------------------------------------------------------------------------

const SUB_STRAND_TO_STRAND: Record<string, StrandEnum> = {
  whole_numbers: "number_sense",
  fractions: "fractions_decimals",
  decimals: "fractions_decimals",
  percentage: "fractions_decimals",
  money: "measurement",
  rate: "operations_algorithms",
  ratio: "operations_algorithms",
  algebra: "operations_algorithms",
  measurement: "measurement",
  geometry: "geometry",
  area_volume: "geometry",
  data_representation: "data_statistics",
};

const WORD_PROBLEM_OVERRIDE_SUB_STRANDS = new Set(["whole_numbers", "money"]);
const ARITHMETIC_OPS = new Set<string>([
  "ADDITION",
  "SUBTRACTION",
  "MULTIPLICATION",
  "DIVISION",
]);

export function mapSubStrandToStrand(
  subStrand: string,
  representation: string,
  operationType: string,
): StrandEnum | null {
  const base = SUB_STRAND_TO_STRAND[subStrand];
  if (!base) return null;
  if (
    WORD_PROBLEM_OVERRIDE_SUB_STRANDS.has(subStrand) &&
    (representation === "WORD_PROBLEM_SINGLE" ||
      representation === "WORD_PROBLEM_MULTI") &&
    ARITHMETIC_OPS.has(operationType)
  ) {
    return "operations_algorithms";
  }
  return base;
}

// ---------------------------------------------------------------------------
// Level (half_grade_level) derivation — documented tunable.
//
// No canonical difficulty↔half-grade mapping exists in src/lib/. The
// closest is levelTheta() in src/lib/engine/levels.ts (linear KA=-3 …
// 8B=+3, step 6/17 ≈ 0.3529), but the hand-seeded SAM-L2 rows sit about
// one half-grade step ABOVE that line (e.g. 1A rows carry difficulty
// -1.9..-1.7 where levelTheta('1A') = -2.29), so inverting levelTheta
// would shift every assignment down a half-grade vs the precedent.
//
// Instead: a band-cut table anchored on the hand-seeded L2 precedent
// (1A: -1.9..-1.7, 1B: -1.6..-1.5, 2A: -1.3..-1.0, 2B: -0.9..-0.7).
// For a question tagged to a tax level n (from its content_key), the
// candidate half-grades are (n-1)A, (n-1)B, nA, nB — a placement test
// for S.A.M. Level n spans content from the grade below up through nB.
// The three cuts between those four bands for L2 are L2_BAND_CUTS; other
// levels shift the cuts by (n-2) * GRADE_THETA_SPAN (one full grade =
// two engine half-grade steps = 2 * 6/17 in θ, keeping the spacing
// consistent with src/lib/engine/levels.ts). Indices clamp at the enum
// edges (KA / 8B), which also covers the l0a/l0b/l0c kindergarten codes.
//
// TUNABLE: adjust L2_BAND_CUTS (and the shift) when calibration data
// lands; the unit tests pin the hand-seeded precedent.
// ---------------------------------------------------------------------------

export const L2_BAND_CUTS: readonly [number, number, number] = [-1.65, -1.4, -0.95];
export const GRADE_THETA_SPAN = 2 * (6 / 17);

/** "l0a"/"l0b"/"l0c" → 0; "l1".."l6" → 1..6; unknown → null. */
export function taxLevelNumber(levelCode: string): number | null {
  const m = /^l(\d)([abc])?$/.exec(levelCode);
  if (!m) return null;
  return Number(m[1]);
}

export function deriveHalfGradeLevel(
  taxLevelCode: string,
  difficultySeed: number,
): HalfGradeLevel | null {
  const n = taxLevelNumber(taxLevelCode);
  if (n === null || !Number.isFinite(difficultySeed)) return null;
  const shift = (n - 2) * GRADE_THETA_SPAN;
  const cuts = L2_BAND_CUTS.map((c) => c + shift);
  let band: number;
  if (difficultySeed <= cuts[0]) band = 0;
  else if (difficultySeed <= cuts[1]) band = 1;
  else if (difficultySeed <= cuts[2]) band = 2;
  else band = 3;
  // Band indices into HALF_GRADE_LEVELS: (n-1)A = 2(n-1), …, nB = 2n+1.
  // (KA/KB act as "grade 0".)
  const idx = 2 * (n - 1) + band;
  const clamped = Math.max(0, Math.min(HALF_GRADE_LEVELS.length - 1, idx));
  return HALF_GRADE_LEVELS[clamped];
}

// ---------------------------------------------------------------------------
// Types — Stage 3 output (mirrors stage3-tag.ts; stages re-declare their
// input types, same as stage2/stage3 do) + taxonomy (docs §7 fenced JSON).
// ---------------------------------------------------------------------------

export interface Stage3Question {
  task_number: number;
  sam_level: number | null;
  sam_topic: string | null;
  content_key: string;
  format: string;
  stem: string;
  options?: string[] | null;
  correct_index: number | null;
  correct_answer: string | null;
  distractor_misconceptions?: Record<string, string> | null;
  misconception_tags: string[];
  operation_type: string;
  num_operations: number;
  representation: string;
  difficulty_seed: number;
  image_required: boolean;
  image_alt: string | null;
  confidence: string;
  reasoning: string;
  review_flags: string[];
  external_id: string;
  sub_strand: string | null;
  strand: string | null;
  word_count: number;
  status: "ok" | "failed";
  error?: string;
}

export interface Stage3Output {
  source: string;
  answer_key_source: string | null;
  test_level_label: string | null;
  taggedAt: string;
  model: string;
  question_count: number;
  failed_count: number;
  questions: Stage3Question[];
}

interface Stage2LineageQuestion {
  task_number: number;
  pages: number[];
  page_images: string[];
}

interface Stage2LineageOutput {
  questions: Stage2LineageQuestion[];
}

export interface TaxonomyContent {
  key: string;
  level: string;
  sub_strand: string;
  seq: number;
  name: string;
  mvp: boolean;
}

export interface Taxonomy {
  version: string;
  source: string;
  strands: Array<{ key: string; name: string }>;
  levels: Array<{ key: string; name: string; sort: number; mvp: boolean }>;
  sub_strands: Array<{ key: string; name: string; strand: string; applies: string[] }>;
  content: TaxonomyContent[];
}

/** One fully-mapped, load-ready questions row. */
export interface LoadRow {
  external_id: string;
  strand: StrandEnum;
  level: HalfGradeLevel;
  difficulty: number;
  format: QuestionFormat;
  content: Record<string, unknown>;
  misconception_tags: string[];
  word_count: number;
  operation_type: OperationType;
  num_operations: number;
  representation: Representation;
  is_active: boolean;
  content_key: string;
}

export interface SkippedRecord {
  external_id: string;
  task_number: number;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// DRAG_DROP content mapping.
//
// The questions-table wire format for DRAG_DROP is
// {stem, items, correct_order} (judged by src/lib/responseSubmit/
// correctness.ts:60-63; seeded precedent SAM-L2-Q10/Q21). Stage 3 emits a
// single correct_answer string. Per the precedent set in migration
// 20260511000100 ("synthesize items[] + correct_order[] from the JSON's
// correct_answer string"):
//   * correct_order — the correct_answer split on comma/semicolon/arrow
//     separators (≥ 2 tokens required).
//   * items — the same tokens in PRESENTATION order, recovered from their
//     positions in the stem (each token must appear in the stem at a
//     distinct, non-word-adjacent position). Falling back to answer order
//     would leak the answer into the presented item order, so when stem
//     recovery fails the record routes to the skip list instead.
// ---------------------------------------------------------------------------

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseDragDropContent(
  stem: string,
  correctAnswer: string | null,
): { items: string[]; correct_order: string[] } | null {
  if (!correctAnswer) return null;
  const tokens = correctAnswer
    .split(/\s*(?:[,;]|->|→)\s*/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length < 2) return null;

  const positions: Array<{ token: string; index: number }> = [];
  for (const token of tokens) {
    const re = new RegExp(`(?<![\\w])${escapeRegExp(token)}(?![\\w])`);
    const m = re.exec(stem);
    if (!m) return null;
    positions.push({ token, index: m.index });
  }
  // Duplicate tokens resolve to the same stem position — order would be
  // ambiguous, so treat as unmappable.
  if (new Set(positions.map((p) => p.index)).size !== positions.length) {
    return null;
  }
  const items = [...positions]
    .sort((a, b) => a.index - b.index)
    .map((p) => p.token);
  return { items, correct_order: tokens };
}

// ---------------------------------------------------------------------------
// Content jsonb shaping — matches the seeded shapes exactly:
//   MC: {stem, options, correct_index, distractor_misconceptions}
//   NUMERIC_ENTRY: {stem, correct_answer}
//   DRAG_DROP: {stem, items, correct_order}
// image_required=true rows additionally carry image_alt + image_required
// (NO image_path — that stays absent until a curated per-question image
// exists; mintImage.ts returns undefined for image-less content).
// ---------------------------------------------------------------------------

export function buildContentJson(
  q: Stage3Question,
): { ok: true; content: Record<string, unknown> } | { ok: false; reason: string } {
  const content: Record<string, unknown> = { stem: q.stem };

  switch (q.format) {
    case "MULTIPLE_CHOICE": {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return { ok: false, reason: "MULTIPLE_CHOICE without >=2 options" };
      }
      if (q.options.some((o) => typeof o !== "string" || o.length === 0)) {
        return { ok: false, reason: "MULTIPLE_CHOICE options contain empty/non-string entries" };
      }
      if (
        typeof q.correct_index !== "number" ||
        !Number.isInteger(q.correct_index) ||
        q.correct_index < 0 ||
        q.correct_index >= q.options.length
      ) {
        return {
          ok: false,
          reason: `MULTIPLE_CHOICE correct_index ${String(q.correct_index)} out of range for ${q.options.length} options`,
        };
      }
      content.options = q.options;
      content.correct_index = q.correct_index;
      if (
        q.distractor_misconceptions &&
        Object.keys(q.distractor_misconceptions).length > 0
      ) {
        content.distractor_misconceptions = q.distractor_misconceptions;
      }
      break;
    }
    case "NUMERIC_ENTRY": {
      if (typeof q.correct_answer !== "string" || q.correct_answer.trim().length === 0) {
        return { ok: false, reason: "NUMERIC_ENTRY without correct_answer" };
      }
      content.correct_answer = q.correct_answer.trim();
      break;
    }
    case "DRAG_DROP": {
      const parsed = parseDragDropContent(q.stem, q.correct_answer);
      if (!parsed) {
        return {
          ok: false,
          reason:
            "DRAG_DROP correct_answer not mappable to items/correct_order (tokens missing from stem or < 2 tokens)",
        };
      }
      content.items = parsed.items;
      content.correct_order = parsed.correct_order;
      break;
    }
    default:
      return { ok: false, reason: `unknown format '${q.format}'` };
  }

  if (q.image_required) {
    if (typeof q.image_alt === "string" && q.image_alt.length > 0) {
      content.image_alt = q.image_alt;
    }
    content.image_required = true;
  }
  return { ok: true, content };
}

// ---------------------------------------------------------------------------
// Per-record validation + mapping.
// ---------------------------------------------------------------------------

export function validateAndMapRecord(
  q: Stage3Question,
  contentByKey: Map<string, TaxonomyContent>,
): { ok: true; row: LoadRow } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];

  if (typeof q.external_id !== "string" || q.external_id.length === 0) {
    reasons.push("missing external_id");
  }
  if (typeof q.stem !== "string" || q.stem.trim().length === 0) {
    reasons.push("missing stem");
  }

  const taxContent = contentByKey.get(q.content_key);
  if (!taxContent) {
    reasons.push(`content_key '${q.content_key}' not in taxonomy`);
  }

  // Four NOT-NULL norm fields (20260507000000_add_question_time_norm_tags.sql).
  if (typeof q.word_count !== "number" || !Number.isInteger(q.word_count) || q.word_count < 0) {
    reasons.push(`word_count missing or invalid (${String(q.word_count)})`);
  }
  if (!(VALID_OPERATION_TYPES as readonly string[]).includes(q.operation_type)) {
    reasons.push(`operation_type '${String(q.operation_type)}' invalid`);
  }
  if (
    typeof q.num_operations !== "number" ||
    !Number.isInteger(q.num_operations) ||
    q.num_operations < 1
  ) {
    reasons.push(`num_operations missing or invalid (${String(q.num_operations)})`);
  }
  if (!(VALID_REPRESENTATIONS as readonly string[]).includes(q.representation)) {
    reasons.push(`representation '${String(q.representation)}' invalid`);
  }

  if (typeof q.difficulty_seed !== "number" || !Number.isFinite(q.difficulty_seed)) {
    reasons.push(`difficulty_seed missing or invalid (${String(q.difficulty_seed)})`);
  }
  if (
    !Array.isArray(q.misconception_tags) ||
    q.misconception_tags.some((t) => typeof t !== "string" || t.length === 0)
  ) {
    reasons.push("misconception_tags missing or contains non-string entries");
  }
  if (!(VALID_FORMATS as readonly string[]).includes(q.format)) {
    reasons.push(`format '${String(q.format)}' invalid`);
  }

  // Format / answer agreement + content jsonb shape.
  let content: Record<string, unknown> | null = null;
  if ((VALID_FORMATS as readonly string[]).includes(q.format)) {
    const built = buildContentJson(q);
    if (built.ok) content = built.content;
    else reasons.push(built.reason);
  }

  // Strand + level derivation (needs the taxonomy row).
  let strand: StrandEnum | null = null;
  let level: HalfGradeLevel | null = null;
  if (taxContent) {
    strand = mapSubStrandToStrand(
      taxContent.sub_strand,
      q.representation,
      q.operation_type,
    );
    if (!strand) {
      reasons.push(`sub_strand '${taxContent.sub_strand}' has no strand mapping`);
    }
    if (typeof q.difficulty_seed === "number" && Number.isFinite(q.difficulty_seed)) {
      level = deriveHalfGradeLevel(taxContent.level, q.difficulty_seed);
      if (!level) {
        reasons.push(`cannot derive half-grade level from tax level '${taxContent.level}'`);
      }
    }
  }

  if (reasons.length > 0 || !content || !strand || !level || !taxContent) {
    return { ok: false, reasons };
  }

  return {
    ok: true,
    row: {
      external_id: q.external_id,
      strand,
      level,
      difficulty: q.difficulty_seed,
      format: q.format as QuestionFormat,
      content,
      misconception_tags: q.misconception_tags,
      word_count: q.word_count,
      operation_type: q.operation_type as OperationType,
      num_operations: q.num_operations,
      representation: q.representation as Representation,
      // Image-essential questions stage as INACTIVE: Stage 1 renders whole
      // PAGES, and a full page would leak neighboring questions/answers to
      // the child — so no image_path is set and the row stays off until a
      // curated per-question image exists.
      is_active: !q.image_required,
      content_key: q.content_key,
    },
  };
}

// ---------------------------------------------------------------------------
// SQL generation.
// ---------------------------------------------------------------------------

/** Postgres single-quoted string literal escaping ('' doubling). */
export function escapeSqlString(text: string): string {
  return text.replace(/'/g, "''");
}

function sqlTextArray(items: string[]): string {
  if (items.length === 0) return "array[]::text[]";
  return `array[${items.map((i) => `'${escapeSqlString(i)}'`).join(",")}]`;
}

export function renderValuesRow(row: LoadRow): string {
  const contentJson = JSON.stringify(row.content);
  const lines = [
    `    -- ${row.external_id} | ${row.content_key} | ${row.strand} / ${row.level} | ${row.format}${row.is_active ? "" : " | INACTIVE (image-essential; awaiting curated image)"}`,
    `    ('${escapeSqlString(row.external_id)}', '${row.strand}', '${row.level}', ${String(row.difficulty)}, '${row.format}',`,
    `     '${escapeSqlString(contentJson)}',`,
    `     ${sqlTextArray(row.misconception_tags)},`,
    `     ${String(row.word_count)}, '${row.operation_type}', ${String(row.num_operations)}, '${row.representation}', ${row.is_active ? "true" : "false"}, '${escapeSqlString(row.content_key)}')`,
  ];
  return lines.join("\n");
}

/** The full INSERT statement — identical in the migration and the
 *  seed.sql mirror (the §11 parity contract). */
export function buildQuestionsInsert(rows: LoadRow[]): string {
  const valueRows = rows.map(renderValuesRow).join(",\n\n");
  return [
    "with t as (select id from tenants where slug = 'inspirea_singapore_math')",
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
    valueRows,
    "  ) as v(external_id, strand, level, difficulty, format,",
    "         content, misconception_tags,",
    "         word_count, operation_type, num_operations, representation,",
    "         is_active, content_key)",
    "on conflict (tenant_id, external_id) do nothing;",
  ].join("\n");
}

export const MIGRATION_MARKER = "-- stage4-load:generated-migration";

export function buildMigrationFile(rows: LoadRow[], generatedAt: string): string {
  return [
    "-- Atlas Assessment — Stage 4 generated S.A.M. question load.",
    MIGRATION_MARKER,
    "--",
    "-- GENERATED FILE — written by scripts/conversion/stage4-load.ts",
    "-- (pnpm convert:load). Do not hand-edit. Re-running the script finds",
    "-- this file by the marker comment above and rewrites it in place",
    "-- rather than creating a second migration.",
    "--",
    `-- Generated at: ${generatedAt}`,
    "--",
    "-- AGENTS.md §11 parity: this migration is the PRODUCTION path. On a",
    "-- dev `supabase db reset` it is a no-op (migrations run before",
    "-- seed.sql creates the inspirea_singapore_math tenant, so the CTE",
    "-- cross-join yields zero rows). The identical statement is mirrored",
    "-- into supabase/seed.sql between the stage4 BEGIN/END markers — that",
    "-- mirror is the dev/CI path. Both use",
    "-- `on conflict (tenant_id, external_id) do nothing`, so either path",
    "-- (or both) produces the same final state.",
    "--",
    "-- content_id is resolved at insert time by tax_content.code lookup",
    "-- (codes equal taxonomy keys, e.g. 'l2-whole_numbers-1' — see",
    "-- 20260525000002_seed_v2026_taxonomy.sql). image-essential rows load",
    "-- with is_active=false and NO image_path: Stage 1 renders whole pages",
    "-- and a full page would leak neighboring questions/answers, so a",
    "-- curated per-question image must land before activation.",
    "",
    buildQuestionsInsert(rows),
    "",
  ].join("\n");
}

export const SEED_BEGIN_MARKER =
  "-- BEGIN stage4-generated-questions (scripts/conversion/stage4-load.ts — do not hand-edit; re-runs replace this block)";
export const SEED_END_MARKER = "-- END stage4-generated-questions";

export function buildSeedBlock(
  rows: LoadRow[],
  migrationFileName: string,
  generatedAt: string,
): string {
  return [
    SEED_BEGIN_MARKER,
    "-- =============================================================================",
    "-- Stage 4 generated S.A.M. questions (conversion pipeline)",
    "-- =============================================================================",
    `-- MIRRORED FROM: supabase/migrations/${migrationFileName}`,
    `-- Generated at: ${generatedAt}`,
    "--",
    "-- AGENTS.md §11: the migration above is the prod path and a no-op on",
    "-- dev reset (it runs before this file creates the tenant); this block",
    "-- is the dev/CI path. The INSERT statement is byte-identical in both.",
    "",
    buildQuestionsInsert(rows),
    SEED_END_MARKER,
  ].join("\n");
}

/** Replace the marker-delimited block in seed.sql, or append the block at
 *  EOF when no markers exist yet. Never touches anything outside the
 *  markers. Idempotent: applying twice with the same block equals once. */
export function replaceSeedBlock(seedSql: string, block: string): string {
  const begin = seedSql.indexOf(SEED_BEGIN_MARKER);
  const end = seedSql.indexOf(SEED_END_MARKER);
  if (begin !== -1 && end !== -1 && end > begin) {
    const afterEnd = end + SEED_END_MARKER.length;
    return seedSql.slice(0, begin) + block + seedSql.slice(afterEnd);
  }
  const sep = seedSql.endsWith("\n") ? "\n" : "\n\n";
  return `${seedSql}${sep}${block}\n`;
}

// ---------------------------------------------------------------------------
// Paths + env loader (same conventions as stage 3).
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(HERE, "output");
const LOG_FILE = path.join(HERE, "conversion.log");
const REPO_ROOT = path.resolve(HERE, "..", "..");
const ENV_LOCAL = path.join(REPO_ROOT, ".env.local");
const TAXONOMY_FILE = path.join(REPO_ROOT, "docs", "sam-v2026-taxonomy.md");
const SEED_FILE = path.join(REPO_ROOT, "supabase", "seed.sql");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");

export const QUESTION_IMAGE_BUCKET = "question-images";
export const STAGING_PREFIX = "conversion-staging";

function parseEnvFile(content: string): Map<string, string> {
  const env = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value.length > 0) env.set(key, value);
  }
  return env;
}

/** Supabase creds via the env-var names used by
 *  scripts/upload-dev-storage-seed.mjs and src/lib/env.ts; .env.local
 *  values fill in anything missing from process.env. Returns null when
 *  unavailable (uploads are then skipped gracefully). */
async function loadSupabaseCreds(): Promise<{ url: string; key: string } | null> {
  let fileEnv = new Map<string, string>();
  try {
    fileEnv = parseEnvFile(await readFile(ENV_LOCAL, "utf8"));
  } catch {
    // .env.local optional — vars may already be in the process env.
  }
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    fileEnv.get("SUPABASE_URL") ??
    fileEnv.get("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return { url, key };
}

// ---------------------------------------------------------------------------
// Taxonomy loader (same §7 fenced-JSON contract as stage 3).
// ---------------------------------------------------------------------------

async function loadTaxonomy(): Promise<Taxonomy> {
  let md: string;
  try {
    md = await readFile(TAXONOMY_FILE, "utf8");
  } catch {
    throw new Error(
      `Missing ${path.relative(REPO_ROOT, TAXONOMY_FILE)}. Save sam-v2026-taxonomy.md into docs/ before re-running.`,
    );
  }
  const fence = /```json\s*\n([\s\S]*?)\n```/.exec(md);
  if (!fence) {
    throw new Error(
      `${path.relative(REPO_ROOT, TAXONOMY_FILE)} contains no fenced \`\`\`json block. Cannot parse the taxonomy.`,
    );
  }
  const parsed = JSON.parse(fence[1]) as Taxonomy;
  if (!Array.isArray(parsed.content) || parsed.content.length === 0) {
    throw new Error(`Taxonomy JSON has no content[] items.`);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Stage 3 discovery.
// ---------------------------------------------------------------------------

interface DiscoveredStage3 {
  folder: string;
  data: Stage3Output;
  /** task_number → page image filenames, from stage2-questions.json. */
  pageImagesByTask: Map<number, string[]>;
}

async function discoverStage3(): Promise<DiscoveredStage3[]> {
  let entries;
  try {
    entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: DiscoveredStage3[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const taggedFile = path.join(OUTPUT_DIR, entry.name, "stage3-tagged.json");
    let data: Stage3Output;
    try {
      data = JSON.parse(await readFile(taggedFile, "utf8")) as Stage3Output;
    } catch {
      continue;
    }
    const pageImagesByTask = new Map<number, string[]>();
    try {
      const stage2File = path.join(OUTPUT_DIR, entry.name, "stage2-questions.json");
      const stage2 = JSON.parse(await readFile(stage2File, "utf8")) as Stage2LineageOutput;
      for (const q of stage2.questions) {
        pageImagesByTask.set(q.task_number, q.page_images);
      }
    } catch {
      // Lineage optional — uploads for this worksheet will be marked
      // un-uploadable in the manifest.
    }
    found.push({ folder: entry.name, data, pageImagesByTask });
  }
  found.sort((a, b) => a.folder.localeCompare(b.folder));
  return found;
}

// ---------------------------------------------------------------------------
// Migration file resolution (regeneration story).
// ---------------------------------------------------------------------------

async function resolveMigrationFileName(): Promise<string> {
  let entries: string[] = [];
  try {
    entries = await readdir(MIGRATIONS_DIR);
  } catch {
    throw new Error(`Missing migrations dir at ${MIGRATIONS_DIR}.`);
  }
  for (const name of entries) {
    if (!/_load_sam_questions\.sql$/.test(name)) continue;
    try {
      const text = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
      if (text.includes(MIGRATION_MARKER)) return name;
    } catch {
      continue;
    }
  }
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${ts}_load_sam_questions.sql`;
}

// ---------------------------------------------------------------------------
// Image staging uploads.
// ---------------------------------------------------------------------------

interface UploadManifestEntry {
  external_id: string;
  local_file: string;
  object_path: string;
  uploaded: boolean;
  error?: string;
}

interface UploadManifest {
  source: string;
  bucket: string;
  generatedAt: string;
  note: string;
  entries: UploadManifestEntry[];
}

async function stagePageImages(
  ws: DiscoveredStage3,
  imageRows: Array<{ external_id: string; task_number: number }>,
  supabase: SupabaseClient | null,
  skipReason: string | null,
): Promise<UploadManifest> {
  const entries: UploadManifestEntry[] = [];
  for (const row of imageRows) {
    const pageImages = ws.pageImagesByTask.get(row.task_number);
    if (!pageImages || pageImages.length === 0) {
      entries.push({
        external_id: row.external_id,
        local_file: "",
        object_path: "",
        uploaded: false,
        error: "no stage2 page_images lineage (stage2-questions.json missing or task not found)",
      });
      continue;
    }
    for (const fileName of pageImages) {
      const localFile = path.join(OUTPUT_DIR, ws.folder, fileName);
      const objectPath = `${STAGING_PREFIX}/${row.external_id}/${fileName}`;
      if (!supabase) {
        entries.push({
          external_id: row.external_id,
          local_file: path.relative(REPO_ROOT, localFile),
          object_path: objectPath,
          uploaded: false,
          error: skipReason ?? "uploads skipped",
        });
        continue;
      }
      try {
        const bytes = await readFile(localFile);
        const { error } = await supabase.storage
          .from(QUESTION_IMAGE_BUCKET)
          .upload(objectPath, bytes, { contentType: "image/png", upsert: true });
        if (error) {
          entries.push({
            external_id: row.external_id,
            local_file: path.relative(REPO_ROOT, localFile),
            object_path: objectPath,
            uploaded: false,
            error: error.message,
          });
        } else {
          entries.push({
            external_id: row.external_id,
            local_file: path.relative(REPO_ROOT, localFile),
            object_path: objectPath,
            uploaded: true,
          });
        }
      } catch (err) {
        entries.push({
          external_id: row.external_id,
          local_file: path.relative(REPO_ROOT, localFile),
          object_path: objectPath,
          uploaded: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  return {
    source: ws.data.source,
    bucket: QUESTION_IMAGE_BUCKET,
    generatedAt: new Date().toISOString(),
    note:
      "Source PAGE renders staged for image curation only. A full page leaks neighboring questions/answers — never set one as a question's image_path. Re-run pnpm convert:load to retry failed uploads.",
    entries,
  };
}

// ---------------------------------------------------------------------------
// Audit log.
// ---------------------------------------------------------------------------

async function appendAuditLine(
  source: string,
  loadedCount: number,
  skippedCount: number,
): Promise<void> {
  const line = `${new Date().toISOString()} | stage4 | ${source} | ${loadedCount} loaded | ${skippedCount} skipped\n`;
  await appendFile(LOG_FILE, line, "utf8");
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const taxonomy = await loadTaxonomy();
  const contentByKey = new Map(taxonomy.content.map((c) => [c.key, c]));
  console.log(`Loaded taxonomy: ${taxonomy.content.length} content items.`);

  const worksheets = await discoverStage3();
  if (worksheets.length === 0) {
    console.log(
      `No Stage 3 outputs found under ${path.relative(process.cwd(), OUTPUT_DIR)}/. Run pnpm convert:tag first.`,
    );
    return;
  }
  console.log(`Found ${worksheets.length} Stage 3 worksheet output(s).`);

  const creds = await loadSupabaseCreds();
  const supabase = creds
    ? createClient(creds.url, creds.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  const uploadSkipReason = creds
    ? null
    : "missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local) — re-run pnpm convert:load when the local stack is up";
  if (!supabase) {
    console.warn(`[warn] image staging uploads skipped: ${uploadSkipReason}`);
  }

  const allRows: LoadRow[] = [];
  const seenExternalIds = new Set<string>();

  for (const ws of worksheets) {
    console.log(`\nLoading ${ws.data.source} (${ws.data.questions.length} records)`);
    const skipped: SkippedRecord[] = [];
    const rows: LoadRow[] = [];
    const imageRows: Array<{ external_id: string; task_number: number }> = [];

    for (const q of ws.data.questions) {
      if (q.status === "failed") {
        console.log(`  ${q.external_id}: SKIP (stage3 status=failed: ${q.error ?? "unknown"})`);
        skipped.push({
          external_id: q.external_id,
          task_number: q.task_number,
          reasons: [`stage3 status=failed: ${q.error ?? "unknown"}`],
        });
        continue;
      }
      if (seenExternalIds.has(q.external_id)) {
        console.log(`  ${q.external_id}: SKIP (duplicate external_id)`);
        skipped.push({
          external_id: q.external_id,
          task_number: q.task_number,
          reasons: ["duplicate external_id (already loaded from an earlier worksheet/record)"],
        });
        continue;
      }
      const result = validateAndMapRecord(q, contentByKey);
      if (!result.ok) {
        console.log(`  ${q.external_id}: SKIP (${result.reasons.join("; ")})`);
        skipped.push({
          external_id: q.external_id,
          task_number: q.task_number,
          reasons: result.reasons,
        });
        continue;
      }
      seenExternalIds.add(q.external_id);
      rows.push(result.row);
      if (q.image_required) {
        imageRows.push({ external_id: q.external_id, task_number: q.task_number });
      }
      console.log(
        `  ${q.external_id}: ${result.row.strand} / ${result.row.level}${result.row.is_active ? "" : "  (inactive — image-essential)"}`,
      );
    }

    allRows.push(...rows);

    // Per-worksheet skip report (review artifact, like stage3-review.md).
    const skipPath = path.join(OUTPUT_DIR, ws.folder, "stage4-skipped.json");
    await writeFile(
      skipPath,
      `${JSON.stringify({ source: ws.data.source, skipped }, null, 2)}\n`,
      "utf8",
    );

    // Image staging uploads + manifest.
    const manifest = await stagePageImages(ws, imageRows, supabase, uploadSkipReason);
    const manifestPath = path.join(OUTPUT_DIR, ws.folder, "stage4-upload-manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const uploadedCount = manifest.entries.filter((e) => e.uploaded).length;
    console.log(
      `  images: ${uploadedCount}/${manifest.entries.length} page render(s) uploaded to ${QUESTION_IMAGE_BUCKET}/${STAGING_PREFIX}/ (manifest: ${path.relative(process.cwd(), manifestPath)})`,
    );

    await appendAuditLine(ws.data.source, rows.length, skipped.length);
    console.log(
      `  summary: loaded=${rows.length}  skipped=${skipped.length}  active=${rows.filter((r) => r.is_active).length}  inactive=${rows.filter((r) => !r.is_active).length}`,
    );
  }

  if (allRows.length === 0) {
    console.log(
      "\nNo loadable records after validation — migration and seed.sql left untouched.",
    );
    return;
  }

  const generatedAt = new Date().toISOString();
  const migrationFileName = await resolveMigrationFileName();
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFileName);
  await writeFile(migrationPath, buildMigrationFile(allRows, generatedAt), "utf8");
  console.log(`\nMigration written: ${path.relative(process.cwd(), migrationPath)}`);

  const seedSql = await readFile(SEED_FILE, "utf8");
  let block = buildSeedBlock(allRows, migrationFileName, generatedAt);
  // Match the seed file's dominant line-ending so the marker block doesn't
  // introduce mixed EOLs on a CRLF working tree.
  if (seedSql.includes("\r\n")) block = block.replace(/\n/g, "\r\n");
  await writeFile(SEED_FILE, replaceSeedBlock(seedSql, block), "utf8");
  console.log(`seed.sql mirror updated: ${path.relative(process.cwd(), SEED_FILE)}`);

  console.log(
    `\nStage 4 done. ${allRows.length} question row(s) staged across ${worksheets.length} worksheet(s).`,
  );
}

// Only run when executed directly (pnpm convert:load / tsx) — the module
// is also imported by unit tests for its pure functions.
const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error("Stage 4 failed:", message);
    process.exit(1);
  });
}
