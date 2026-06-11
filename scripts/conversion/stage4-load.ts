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
// Misconception-code validation: every code in misconception_tags and in
// distractor_misconceptions values must be one of the codes seeded into
// the misconceptions table (supabase/seed.sql "Misconception taxonomy"
// block; mirrored by migrations 20260509000000 + 20260511000000). An
// unknown code routes the record to the skip list with a console.error
// naming the code + external_id — never silently dropped, never invented.
// The seeded set is parsed from seed.sql at run time and cross-checked
// against KNOWN_MISCONCEPTION_CODES below; any drift aborts the run.
//
// Per-run load report: one `stage4` line per worksheet is appended to
// scripts/conversion/conversion.log with loaded / content_id / review-flag
// / inactive-image / image-upload / skip-category counts.
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

/** The 21 misconception codes seeded into the misconceptions table.
 *  Source of truth: supabase/seed.sql "Misconception taxonomy" insert
 *  (19 starter codes) + the Item #11 Phase 1 codes mirrored from
 *  20260511000000_sam_l2_misconception_taxonomy.sql (NS_ZERO_VALUE,
 *  WP_KEYWORD_TRAP; the four MD_ codes are likewise mirrored from
 *  20260509000000_misconception_classifier_audit.sql). Stage 3 prompts
 *  with exactly this vocabulary (FALLBACK_MISCONCEPTIONS in
 *  stage3-tag.ts). A drift test in src/lib/taxonomy/stage4-load.test.ts
 *  pins this constant to the seed.sql insert, and main() re-checks at run
 *  time. NEVER add a code here without seeding it first. */
export const KNOWN_MISCONCEPTION_CODES = [
  "NS_COUNTING_ERROR",
  "NS_PLACE_VALUE_CONFUSION",
  "NS_MAGNITUDE_MISJUDGE",
  "NS_ZERO_VALUE",
  "OP_NO_REGROUPING",
  "OP_SUBTRACTION_DIRECTION",
  "OP_MULT_AS_REPEATED_ADD",
  "OP_DIV_REMAINDER",
  "WP_OPERATION_SELECTION",
  "WP_IRRELEVANT_INFO",
  "WP_MULTI_STEP_SEQUENCE",
  "WP_KEYWORD_TRAP",
  "FR_NUM_DENOM_INDEPENDENT",
  "FR_FRACTION_AS_TWO_NUMS",
  "FR_COMMON_DENOMINATOR",
  "GE_PERIMETER_AREA",
  "GE_SHAPE_PROPERTY",
  "MD_UNIT_CONFUSION",
  "MD_RULER_ZERO_POINT",
  "MD_TIME_READING",
  "MD_CHART_SCALE",
] as const;

/** Parse the misconception codes out of seed.sql's
 *  `insert into misconceptions ... (values ...) as v(...)` block.
 *  Anchored the same way as the taxonomy drift tests
 *  (src/lib/taxonomy/seed.test.ts): from the insert to the `) as v(`
 *  close, so quoted description text elsewhere can't false-positive.
 *  Each VALUES row starts on its own line as `('CODE',`. */
export function parseSeedMisconceptionCodes(seedSql: string): string[] {
  const insertStart = seedSql.indexOf("insert into misconceptions");
  if (insertStart === -1) {
    throw new Error("seed.sql: no `insert into misconceptions` block found");
  }
  const valuesStart = seedSql.indexOf("(values", insertStart);
  if (valuesStart === -1) {
    throw new Error("seed.sql: no (values block after the misconceptions insert");
  }
  const valuesEnd = seedSql.indexOf(") as v(", valuesStart);
  if (valuesEnd === -1) {
    throw new Error("seed.sql: no values-close after the misconceptions insert");
  }
  const block = seedSql.slice(valuesStart, valuesEnd);
  const codes: string[] = [];
  const rowRe = /^\s*\('([A-Z][A-Z0-9_]+)'/gm;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(block)) !== null) {
    if (!codes.includes(m[1])) codes.push(m[1]);
  }
  if (codes.length === 0) {
    throw new Error("seed.sql: misconceptions insert yielded zero codes");
  }
  return codes;
}

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
  options_guess?: string[];
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
// Deterministic load gates (root-cause memo 2026-06-10, leverage list #1).
//
// Stage 3's review_flags announced every model misstep that mattered
// (SAM-L3-Q11's flag literally said "correct_index corrected to 0" while
// the emitted field stayed 1), but Stage 4 only COUNTED flags. These two
// gates act on them:
//
//   * detectFlagContradictions — a record whose review_flags state an
//     explicit index/answer correction that contradicts the emitted field
//     is skipped (category `flag-contradiction`). Would have caught Q11.
//   * detectOptionsDivergence — when Stage 2 parsed an options_guess for
//     the task, the Stage 3 options must match it up to whitespace/case
//     normalization; divergence means the model reconstructed option text
//     the extractor lost (memo failure mode M4) and the record is skipped
//     (category `options-divergence`). Would have caught SAM-L3-Q03/Q15
//     and SAM-L4-Q18.
// ---------------------------------------------------------------------------

/** Conservative whitespace/case/unicode normalization for option-text
 *  comparison. NFKC folds the worksheets' mathematical-bold digits; dash
 *  variants unify; whitespace collapses; case folds. Anything beyond this
 *  counts as real divergence. */
export function normalizeOptionText(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const INDEX_CORRECTION_RE =
  /correct[_\s]?index\s+(?:was\s+)?(?:corrected|changed|fixed|updated)\s+to\s+(\d+)|correct[_\s]?index\s+should\s+be\s+(\d+)/i;
const ANSWER_CORRECTION_RE =
  /correct[_\s]?answer\s+(?:was\s+)?(?:corrected|changed|fixed|updated)\s+to\s+["']?([^"';,(—–]+?)["']?\s*(?:[;,(—–]|$)|correct[_\s]?answer\s+should\s+be\s+["']?([^"';,(—–]+?)["']?\s*(?:[;,(—–]|$)/i;

/** Every review flag that states an explicit correction contradicting the
 *  emitted field. A flag that AGREES with the emitted field (the model
 *  corrected itself and the correction landed) is not a contradiction.
 *  Reasons are prefixed "flag contradiction:" for categorizeSkipReason. */
export function detectFlagContradictions(q: Stage3Question): string[] {
  const reasons: string[] = [];
  if (!Array.isArray(q.review_flags)) return reasons;
  for (const flag of q.review_flags) {
    if (typeof flag !== "string") continue;
    const idx = INDEX_CORRECTION_RE.exec(flag);
    if (idx) {
      const stated = Number(idx[1] ?? idx[2]);
      if (q.correct_index !== stated) {
        reasons.push(
          `flag contradiction: review flag states correct_index should be ${String(stated)} ` +
            `but the record emits ${String(q.correct_index)} — flag: "${flag}"`,
        );
      }
    }
    const ans = ANSWER_CORRECTION_RE.exec(flag);
    if (ans) {
      const stated = (ans[1] ?? ans[2] ?? "").trim().replace(/\.$/, "");
      const emitted = typeof q.correct_answer === "string" ? q.correct_answer : "";
      if (stated.length > 0 && normalizeOptionText(emitted) !== normalizeOptionText(stated)) {
        reasons.push(
          `flag contradiction: review flag states correct_answer should be "${stated}" ` +
            `but the record emits "${emitted}" — flag: "${flag}"`,
        );
      }
    }
  }
  return reasons;
}

/** Compare Stage 3's emitted options against Stage 2's parsed
 *  options_guess for the same task. Returns a skip reason (prefixed
 *  "options divergence:") when they differ beyond whitespace/case
 *  normalization, or null when the gate passes / does not apply (no
 *  options_guess parsed, or the record has no options). */
export function detectOptionsDivergence(
  stage3Options: string[] | null | undefined,
  optionsGuess: string[] | null | undefined,
): string | null {
  if (!Array.isArray(optionsGuess) || optionsGuess.length === 0) return null;
  if (!Array.isArray(stage3Options) || stage3Options.length === 0) return null;
  if (stage3Options.length !== optionsGuess.length) {
    return (
      `options divergence: stage3 emitted ${String(stage3Options.length)} options but stage2 ` +
      `parsed ${String(optionsGuess.length)} (${JSON.stringify(optionsGuess)})`
    );
  }
  const diverging: string[] = [];
  for (let i = 0; i < optionsGuess.length; i += 1) {
    if (normalizeOptionText(stage3Options[i]) !== normalizeOptionText(optionsGuess[i])) {
      diverging.push(
        `[${String(i)}] stage3 "${stage3Options[i]}" vs stage2 "${optionsGuess[i]}"`,
      );
    }
  }
  if (diverging.length === 0) return null;
  return (
    `options divergence: stage3 options are not verbatim from the stage2 extraction — ` +
    diverging.join("; ")
  );
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

/** Every misconception code the record references (misconception_tags
 *  items + distractor_misconceptions values) that is NOT in the seeded
 *  vocabulary, deduplicated in first-seen order. */
export function collectUnknownMisconceptionCodes(
  q: Stage3Question,
  validCodes: ReadonlySet<string>,
): string[] {
  const unknown: string[] = [];
  const see = (code: unknown): void => {
    if (typeof code !== "string" || code.length === 0) return;
    if (!validCodes.has(code) && !unknown.includes(code)) unknown.push(code);
  };
  if (Array.isArray(q.misconception_tags)) {
    for (const code of q.misconception_tags) see(code);
  }
  if (q.distractor_misconceptions) {
    for (const code of Object.values(q.distractor_misconceptions)) see(code);
  }
  return unknown;
}

export function validateAndMapRecord(
  q: Stage3Question,
  contentByKey: Map<string, TaxonomyContent>,
  validMisconceptionCodes: ReadonlySet<string>,
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
  // Founder rule: never silently drop or invent a misconception code — an
  // unknown code fails the whole record into the skip list.
  for (const code of collectUnknownMisconceptionCodes(q, validMisconceptionCodes)) {
    reasons.push(`unknown misconception code '${code}' (not in the seeded misconception set)`);
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
  /** task_number → parsed options_guess, from stage2-questions.json
   *  (verbatim-options gate input). */
  optionsGuessByTask: Map<number, string[]>;
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
    const optionsGuessByTask = new Map<number, string[]>();
    try {
      const stage2File = path.join(OUTPUT_DIR, entry.name, "stage2-questions.json");
      const stage2 = JSON.parse(await readFile(stage2File, "utf8")) as Stage2LineageOutput;
      for (const q of stage2.questions) {
        pageImagesByTask.set(q.task_number, q.page_images);
        if (Array.isArray(q.options_guess) && q.options_guess.length > 0) {
          optionsGuessByTask.set(q.task_number, q.options_guess);
        }
      }
    } catch {
      // Lineage optional — uploads for this worksheet will be marked
      // un-uploadable in the manifest, and the verbatim-options gate
      // cannot fire (no options_guess to compare against).
    }
    found.push({ folder: entry.name, data, pageImagesByTask, optionsGuessByTask });
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
// Audit log — per-run load report (one line per worksheet).
// ---------------------------------------------------------------------------

/** Stable reason-category buckets for the load report. A skipped record
 *  counts once per distinct category across all of its reasons, so the
 *  category sum can exceed the skipped total. */
export function categorizeSkipReason(reason: string): string {
  if (reason.startsWith("stage3 status=failed")) return "stage3-failed";
  if (reason.startsWith("duplicate external_id")) return "duplicate-external-id";
  if (reason.startsWith("flag contradiction")) return "flag-contradiction";
  if (reason.startsWith("options divergence")) return "options-divergence";
  if (reason.includes("unknown misconception code")) return "unknown-misconception-code";
  if (reason.includes("not in taxonomy")) return "unknown-content-key";
  return "invalid-fields";
}

export interface WorksheetLoadReport {
  source: string;
  loaded: number;
  /** Rows whose content_key resolved against the taxonomy — the insert's
   *  tax_content subselect assigns content_id for every one of these. */
  contentIdAssigned: number;
  /** Total stage3 review_flags carried by the LOADED rows. */
  reviewFlags: number;
  /** Image-essential rows loaded with is_active=false. */
  imageInactive: number;
  imagesUploaded: number;
  /** Manifest entries not uploaded (missing creds, missing local page
   *  file, or upload failure) — retried on the next convert:load run. */
  imagesDeferred: number;
  skipped: number;
  skipReasonCounts: Record<string, number>;
}

export function formatStage4AuditLine(
  report: WorksheetLoadReport,
  timestamp: string,
): string {
  const categories = Object.entries(report.skipReasonCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, count]) => `${category}=${String(count)}`)
    .join(", ");
  const skipped =
    report.skipped > 0 ? `skipped=${String(report.skipped)} (${categories})` : "skipped=0";
  return (
    `${timestamp} | stage4 | ${report.source} | ` +
    `loaded=${String(report.loaded)} content_id=${String(report.contentIdAssigned)} ` +
    `review_flags=${String(report.reviewFlags)} inactive_image=${String(report.imageInactive)} ` +
    `images_uploaded=${String(report.imagesUploaded)} images_deferred=${String(report.imagesDeferred)} ` +
    skipped
  );
}

async function appendAuditLine(report: WorksheetLoadReport): Promise<void> {
  await appendFile(LOG_FILE, `${formatStage4AuditLine(report, new Date().toISOString())}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const taxonomy = await loadTaxonomy();
  const contentByKey = new Map(taxonomy.content.map((c) => [c.key, c]));
  console.log(`Loaded taxonomy: ${taxonomy.content.length} content items.`);

  // Misconception vocabulary — parsed from seed.sql (the seeded source of
  // truth) and cross-checked against the in-code constant. Any drift means
  // someone changed the seeded set without updating this loader (or vice
  // versa): abort rather than validate against the wrong vocabulary.
  const seedCodes = parseSeedMisconceptionCodes(await readFile(SEED_FILE, "utf8"));
  const validMisconceptionCodes: ReadonlySet<string> = new Set(seedCodes);
  {
    const expected = [...KNOWN_MISCONCEPTION_CODES].sort();
    const actual = [...seedCodes].sort();
    if (expected.length !== actual.length || expected.some((c, i) => c !== actual[i])) {
      throw new Error(
        `seed.sql misconception codes drifted from KNOWN_MISCONCEPTION_CODES in stage4-load.ts ` +
          `(seed: ${actual.join(", ")}). Reconcile before loading.`,
      );
    }
  }
  console.log(`Loaded misconception vocabulary: ${seedCodes.length} codes (seed.sql).`);

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
    let loadedReviewFlags = 0;

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
      // Deterministic gates (memo leverage #1) — loud, never silent:
      // a review flag that contradicts the emitted field, or option text
      // that is not verbatim from the Stage 2 extraction, skips the
      // record before any further validation.
      const gateReasons = detectFlagContradictions(q);
      const divergence = detectOptionsDivergence(
        q.options ?? null,
        ws.optionsGuessByTask.get(q.task_number) ?? null,
      );
      if (divergence) gateReasons.push(divergence);
      if (gateReasons.length > 0) {
        for (const reason of gateReasons) {
          console.error(`  [ERROR] ${q.external_id}: ${reason} — record skipped`);
        }
        skipped.push({
          external_id: q.external_id,
          task_number: q.task_number,
          reasons: gateReasons,
        });
        continue;
      }
      // Unknown misconception codes are a hard, loud failure for the
      // record — name every bad code so it can't slip past in the noise.
      for (const code of collectUnknownMisconceptionCodes(q, validMisconceptionCodes)) {
        console.error(
          `  [ERROR] ${q.external_id}: unknown misconception code '${code}' — ` +
            `not one of the ${String(validMisconceptionCodes.size)} seeded codes; record skipped`,
        );
      }
      const result = validateAndMapRecord(q, contentByKey, validMisconceptionCodes);
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
      loadedReviewFlags += Array.isArray(q.review_flags) ? q.review_flags.length : 0;
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

    // Image staging uploads + manifest. Per-question best-effort: a
    // missing page render or a failed upload defers THAT entry to the
    // manifest (retried on the next run) and never blocks the batch —
    // the question row above is already staged (inactive) either way.
    const manifest = await stagePageImages(ws, imageRows, supabase, uploadSkipReason);
    const manifestPath = path.join(OUTPUT_DIR, ws.folder, "stage4-upload-manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const uploadedCount = manifest.entries.filter((e) => e.uploaded).length;
    if (supabase) {
      for (const entry of manifest.entries) {
        if (!entry.uploaded) {
          console.error(
            `  [ERROR] ${entry.external_id}: page image not staged (${entry.error ?? "unknown"}) — question still loads inactive; deferred to manifest`,
          );
        }
      }
    }
    console.log(
      `  images: ${uploadedCount}/${manifest.entries.length} page render(s) uploaded to ${QUESTION_IMAGE_BUCKET}/${STAGING_PREFIX}/ (manifest: ${path.relative(process.cwd(), manifestPath)})`,
    );

    const skipReasonCounts: Record<string, number> = {};
    for (const record of skipped) {
      for (const category of new Set(record.reasons.map(categorizeSkipReason))) {
        skipReasonCounts[category] = (skipReasonCounts[category] ?? 0) + 1;
      }
    }
    const report: WorksheetLoadReport = {
      source: ws.data.source,
      loaded: rows.length,
      contentIdAssigned: rows.length,
      reviewFlags: loadedReviewFlags,
      imageInactive: rows.filter((r) => !r.is_active).length,
      imagesUploaded: uploadedCount,
      imagesDeferred: manifest.entries.length - uploadedCount,
      skipped: skipped.length,
      skipReasonCounts,
    };
    await appendAuditLine(report);
    console.log(
      `  summary: loaded=${rows.length}  skipped=${skipped.length}  active=${rows.filter((r) => r.is_active).length}  inactive=${report.imageInactive}  review_flags=${loadedReviewFlags}`,
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
