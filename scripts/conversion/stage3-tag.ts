// Atlas Assessment — conversion pipeline Stage 3.
//
// AI-assisted question tagging. Reads each Stage 2 output's
// stage2-questions.json, calls Claude Sonnet 4.6 once per question with
// the taxonomy and the controlled misconception vocabulary, and emits a
// fully structured DRAFT for human review:
//
//   * stage3-tagged.json — machine-readable, one validated record per question
//   * stage3-review.md   — human-readable review sheet (the founder's gate)
//
// Output is DRAFT. Tags against docs/sam-v2026-taxonomy.md and the 21-code
// misconception vocabulary in supabase/seed.sql — no DB writes.
//
// Run via: pnpm convert:tag
//
// Per-level sequential runs: a folder that already has stage3-tagged.json is
// SKIPPED, so re-running for the next level never re-invokes the API (or
// silently changes tags) for worksheets that were already tagged/loaded.
//   --force          re-tag every discovered worksheet
//   --only <folder>  restrict the run to one output/<folder>

import { access, appendFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Reuse the Sonnet model identifier from src/lib/report/narration/llmClient.ts
// (which routes via the Vercel AI Gateway as "anthropic/claude-sonnet-4-6").
// The direct-SDK form drops the provider prefix.
const MODEL = "claude-sonnet-4-6";

// Anthropic SDK timeout per request. Generous because a 22-question worksheet
// shouldn't fail end-to-end on one slow call.
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_TOKENS = 2000;

const VALID_OPERATION_TYPES = [
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

const VALID_REPRESENTATIONS = [
  "SYMBOLIC",
  "PICTORIAL",
  "BAR_MODEL_REQUIRED",
  "WORD_PROBLEM_SINGLE",
  "WORD_PROBLEM_MULTI",
] as const;

const VALID_FORMATS = ["MULTIPLE_CHOICE", "NUMERIC_ENTRY", "DRAG_DROP"] as const;
const VALID_CONFIDENCE = ["high", "medium", "low"] as const;

// Fallback misconception list if seed.sql parsing fails. Per the brief:
// these are the only 21 codes the LLM may use.
const FALLBACK_MISCONCEPTIONS = [
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OperationType = (typeof VALID_OPERATION_TYPES)[number];
type Representation = (typeof VALID_REPRESENTATIONS)[number];
type QuestionFormat = (typeof VALID_FORMATS)[number];
type Confidence = (typeof VALID_CONFIDENCE)[number];

interface TaxonomyStrand {
  key: string;
  name: string;
}

interface TaxonomySubStrand {
  key: string;
  name: string;
  strand: string;
  applies: string[];
}

interface TaxonomyLevel {
  key: string;
  name: string;
  sort: number;
  mvp: boolean;
}

interface TaxonomyContent {
  key: string;
  level: string;
  sub_strand: string;
  seq: number;
  name: string;
  mvp: boolean;
}

interface Taxonomy {
  version: string;
  source: string;
  strands: TaxonomyStrand[];
  levels: TaxonomyLevel[];
  sub_strands: TaxonomySubStrand[];
  content: TaxonomyContent[];
}

interface Misconception {
  code: string;
  label: string;
  description: string;
}

interface Stage2Question {
  task_number: number;
  pages: number[];
  page_images: string[];
  raw_text: string;
  stem_guess: string;
  format_guess: string;
  options_guess?: string[];
  image_likely: boolean;
  eval_key: {
    task_number: number;
    concepts_and_skills: string | null;
    topic: string | null;
    level: number | null;
  } | null;
  correct_answer: {
    raw_answer: string;
    answer_kind: "OPTION" | "VALUE";
    answer_value: string | number | null;
    source: "answer_key";
  } | null;
  answer_format_mismatch: boolean;
}

interface Stage2Output {
  source: string;
  answer_key_source: string | null;
  test_level_label: string | null;
  segmentedAt: string;
  question_count: number;
  eval_results_raw: string | null;
  answer_key_raw: string | null;
  questions: Stage2Question[];
}

interface LlmTagged {
  task_number: number;
  sam_level: number | null;
  sam_topic: string | null;
  content_key: string;
  format: QuestionFormat;
  stem: string;
  options?: string[];
  correct_index: number | null;
  correct_answer: string | null;
  distractor_misconceptions?: Record<string, string>;
  misconception_tags: string[];
  operation_type: OperationType;
  num_operations: number;
  representation: Representation;
  difficulty_seed: number;
  image_required: boolean;
  image_alt: string | null;
  confidence: Confidence;
  reasoning: string;
  review_flags: string[];
}

interface Stage3Question extends LlmTagged {
  external_id: string;
  sub_strand: string | null;
  strand: string | null;
  word_count: number;
  status: "ok" | "failed";
  error?: string;
}

interface Stage3Output {
  source: string;
  answer_key_source: string | null;
  test_level_label: string | null;
  taggedAt: string;
  model: string;
  question_count: number;
  failed_count: number;
  confidence_breakdown: Record<Confidence | "none", number>;
  total_review_flags: number;
  questions: Stage3Question[];
}

// ---------------------------------------------------------------------------
// Paths + small env loader
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(HERE, "output");
const LOG_FILE = path.join(HERE, "conversion.log");
const REPO_ROOT = path.resolve(HERE, "..", "..");
const ENV_LOCAL = path.join(REPO_ROOT, ".env.local");
const TAXONOMY_FILE = path.join(REPO_ROOT, "docs", "sam-v2026-taxonomy.md");
const SEED_FILE = path.join(REPO_ROOT, "supabase", "seed.sql");

// CLI flags. `pnpm convert:tag --force` passes args straight through to tsx,
// so process.argv is [node, stage3-tag.ts, ...flags].
const CLI_ARGS = process.argv.slice(2);
const FORCE = CLI_ARGS.includes("--force");
const ONLY_INDEX = CLI_ARGS.indexOf("--only");
const ONLY_FOLDER = ONLY_INDEX >= 0 ? (CLI_ARGS[ONLY_INDEX + 1] ?? null) : null;

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function parseEnvFile(content: string): Map<string, string> {
  const env = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding single or double quotes.
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

async function loadAnthropicApiKey(): Promise<string> {
  let envContent: string;
  try {
    envContent = await readFile(ENV_LOCAL, "utf8");
  } catch {
    throw new Error(
      `Missing .env.local at ${ENV_LOCAL}. Add ANTHROPIC_API_KEY=<your key> to it and re-run.`,
    );
  }
  const env = parseEnvFile(envContent);
  const key = env.get("ANTHROPIC_API_KEY") ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      `ANTHROPIC_API_KEY not set in .env.local. Add a line "ANTHROPIC_API_KEY=<your key>" and re-run.`,
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Taxonomy loader
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
// Misconception vocabulary loader
// ---------------------------------------------------------------------------

interface VocabLoadResult {
  list: Misconception[];
  usedFallback: boolean;
}

async function loadMisconceptions(): Promise<VocabLoadResult> {
  try {
    const sql = await readFile(SEED_FILE, "utf8");
    const parsed = parseSeedMisconceptions(sql);
    const expected = new Set<string>(FALLBACK_MISCONCEPTIONS);
    const present = new Set(parsed.map((p) => p.code));
    const allFound = [...expected].every((c) => present.has(c));
    if (parsed.length >= FALLBACK_MISCONCEPTIONS.length && allFound) {
      return { list: parsed, usedFallback: false };
    }
  } catch {
    // Fall through to the fallback.
  }
  const list: Misconception[] = FALLBACK_MISCONCEPTIONS.map((code) => ({
    code,
    label: code,
    description: code,
  }));
  return { list, usedFallback: true };
}

function parseSeedMisconceptions(sql: string): Misconception[] {
  // Each misconception is a (code, strand, label, description) VALUES row.
  // The format in seed.sql is:
  //   ('CODE',         'strand',
  //      'Label',
  //      'description text possibly across multiple lines'),
  // We capture the code, then walk to the matching `)`, gather quoted
  // strings, and pick the LAST two as label + description (strand is
  // discarded for the LLM payload).
  const out: Misconception[] = [];
  const codeRe = /\(\s*'([A-Z][A-Z0-9_]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(sql)) !== null) {
    if (!FALLBACK_MISCONCEPTIONS.includes(m[1] as (typeof FALLBACK_MISCONCEPTIONS)[number])) {
      continue;
    }
    // Walk forward from the match to find the closing `)` at paren depth 0.
    let depth = 1;
    let i = m.index + 1;
    while (i < sql.length && depth > 0) {
      const c = sql[i];
      if (c === "(") depth += 1;
      else if (c === ")") depth -= 1;
      if (depth === 0) break;
      i += 1;
    }
    const tupleBody = sql.slice(m.index, i + 1);
    const strings = collectSqlStrings(tupleBody);
    if (strings.length >= 4) {
      // [code, strand, label, ...descriptionParts]
      const label = strings[2];
      const description = strings.slice(3).join(" ").replace(/\s+/g, " ").trim();
      const exists = out.some((e) => e.code === m![1]);
      if (!exists) out.push({ code: m![1], label, description });
    }
  }
  return out;
}

function collectSqlStrings(text: string): string[] {
  // Extract all single-quoted SQL strings, handling Postgres '' escapes.
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "'") {
      i += 1;
      continue;
    }
    i += 1;
    let buf = "";
    while (i < text.length) {
      if (text[i] === "'" && text[i + 1] === "'") {
        buf += "'";
        i += 2;
        continue;
      }
      if (text[i] === "'") {
        i += 1;
        break;
      }
      buf += text[i];
      i += 1;
    }
    out.push(buf);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Stage 2 discovery
// ---------------------------------------------------------------------------

interface DiscoveredStage2 {
  folder: string;
  data: Stage2Output;
}

async function discoverStage2(): Promise<DiscoveredStage2[]> {
  const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
  const found: DiscoveredStage2[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(OUTPUT_DIR, entry.name, "stage2-questions.json");
    try {
      const raw = await readFile(file, "utf8");
      found.push({ folder: entry.name, data: JSON.parse(raw) as Stage2Output });
    } catch {
      continue;
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert Singapore Math curriculum tagger. Your job is to take an individual placement-test question (already extracted and segmented) and produce a single fully-structured tagged record that classifies it against the S.A.M. V2026 taxonomy and the controlled Atlas misconception vocabulary.

HARD CONSTRAINTS:
1. Call the submit_tagging tool exactly once for this question. The tool's input_schema fixes the response shape — populate every required field. Use null (not omission) for fields that legitimately don't apply (e.g. options on a non-MC question).
2. content_key MUST be one of the keys from the provided taxonomy content list. Never invent a key.
3. Every misconception code (in distractor_misconceptions values and misconception_tags) MUST be one of the 21 codes from the provided vocabulary. Never invent a code.
4. operation_type MUST be one of: ${VALID_OPERATION_TYPES.join(", ")}.
5. representation MUST be one of: ${VALID_REPRESENTATIONS.join(", ")}.
6. format MUST be one of: ${VALID_FORMATS.join(", ")}.
7. confidence MUST be exactly "high", "medium", or "low".
8. sam_level MUST be the bare integer from the eval table (1, 2, 3, ...). Not "1", not "l1".

S.A.M. EVAL TABLE RULES (the worksheet ships an Evaluation Results table that maps each task to a Topic and Level):
- Apply FILL-DOWN: when a row's Topic or Level cell is blank, inherit the most recent non-blank value from above. Real S.A.M. worksheets leave these blank when consecutive tasks share the same Topic.
- Record the resolved sam_topic and sam_level. If you had to fill-down, add "topic inherited via fill-down" or "level inherited via fill-down" to review_flags.

ANSWER LOGIC:
- If the answer key gave a parenthesised digit (OPTION) and format is MULTIPLE_CHOICE: correct_index = (option_number - 1), correct_answer = null.
- If format is NUMERIC_ENTRY or DRAG_DROP: correct_index = null, correct_answer = the cleaned value.
- If the answer key value is null or prose-only: set correct_index = null, correct_answer = null, and add "no key answer" to review_flags.

DISTRACTOR LOGIC (MULTIPLE_CHOICE only):
- For each wrong option, choose at most ONE misconception code from the 21 that best explains why a student would pick that wrong answer.
- Omit the option from distractor_misconceptions if no code genuinely fits — over-tagging is worse than under-tagging.
- misconception_tags MUST be the deduplicated superset of every code used in distractor_misconceptions, plus any item-level codes that apply.

DIFFICULTY SEED:
- A rough IRT b parameter, NOT a final calibration. Scale by sam_level:
  - Level 1: roughly -2.5..-1.5
  - Level 2: roughly -2.0..-0.5
  - Level 3: roughly -1.0..0.5
  - Level 4: roughly  0.0..1.5
  Nudge toward the higher end of the band for questions that look genuinely tough at that level.

IMAGE:
- image_required = true only when the question CANNOT be answered without the picture/graph/figure/clock (Q2 count-triangles, Q15 clock, Q5 picture-graph data extraction). A word problem that happens to show a thematic apple counts as image_required = false.
- image_alt = a one-sentence answer-safe description (never reveals the answer) when image_required = true; null otherwise.

QUALITY:
- stem must be the clean question text, no leading task number, no option markers, no trailing answer blanks.
- options (MC only) must be exactly the 4 option strings as printed.
- review_flags is your channel to flag anything a human should double-check.`;

interface PromptInput {
  question: Stage2Question;
  taxonomyContent: TaxonomyContent[];
  misconceptions: Misconception[];
  testLevelLabel: string | null;
  evalResultsRaw: string | null;
}

function buildUserPrompt(input: PromptInput): string {
  const { question: q, taxonomyContent, misconceptions, testLevelLabel, evalResultsRaw } = input;
  const taxonomyJson = JSON.stringify(
    taxonomyContent.map((c) => ({
      key: c.key,
      level: c.level,
      sub_strand: c.sub_strand,
      name: c.name,
    })),
    null,
    2,
  );
  const vocabJson = JSON.stringify(
    misconceptions.map((m) => ({ code: m.code, label: m.label, description: m.description })),
    null,
    2,
  );
  return `WORKSHEET LEVEL LABEL: ${testLevelLabel ?? "unknown"}

EVALUATION RESULTS TABLE (verbatim — apply fill-down to resolve topic/level for this task):
\`\`\`
${evalResultsRaw ?? "(not available)"}
\`\`\`

QUESTION RECORD INPUTS:
- task_number: ${q.task_number}
- raw_text:
\`\`\`
${q.raw_text}
\`\`\`
- stem_guess (Stage 2 heuristic): ${q.stem_guess}
- format_guess (Stage 2 heuristic): ${q.format_guess}
- options_guess (Stage 2 heuristic): ${q.options_guess ? JSON.stringify(q.options_guess) : "(none)"}
- image_likely (Stage 2 heuristic): ${q.image_likely}
- answer key entry: ${q.correct_answer ? JSON.stringify(q.correct_answer) : "null"}

TAXONOMY content items in scope (filtered to the worksheet level ± 1):
\`\`\`json
${taxonomyJson}
\`\`\`

MISCONCEPTION vocabulary (the ONLY 21 codes allowed):
\`\`\`json
${vocabJson}
\`\`\`

Call the submit_tagging tool with this question's tagged record.`;
}

// ---------------------------------------------------------------------------
// Tool-use schema + LLM call
// ---------------------------------------------------------------------------

// The submit_tagging tool's input_schema. EVERY field the pipeline needs is
// `required` — Anthropic's forced tool-use prevents the model from omitting
// any required key. Fields that legitimately don't apply (options on
// non-MC, correct_index on non-MC, image_alt when no image) are made
// nullable via `type: [..., "null"]` rather than optional, so the model
// still has to emit the key with an explicit null.
//
// Enum constraints on format / operation_type / representation / confidence
// and on every misconception code (in both the per-distractor map values
// and the misconception_tags array items) make invalid enum values
// impossible at the API boundary — the model cannot return e.g.
// `confidence: "very high"` or `operation_type: "INTEGRATION"`.
function buildTaggingToolSchema(misconceptionCodes: string[]): Record<string, unknown> {
  const codeEnum = { type: "string", enum: misconceptionCodes };
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "task_number",
      "sam_level",
      "sam_topic",
      "content_key",
      "format",
      "stem",
      "options",
      "correct_index",
      "correct_answer",
      "distractor_misconceptions",
      "misconception_tags",
      "operation_type",
      "num_operations",
      "representation",
      "difficulty_seed",
      "image_required",
      "image_alt",
      "confidence",
      "reasoning",
      "review_flags",
    ],
    properties: {
      task_number: { type: "integer", minimum: 1 },
      sam_level: {
        type: ["integer", "null"],
        minimum: 0,
        maximum: 6,
        description: "Bare integer level from the eval table (1, 2, 3...). Not 'l1'.",
      },
      sam_topic: { type: ["string", "null"] },
      content_key: {
        type: "string",
        description: "Must exactly match one key from the provided taxonomy content list.",
      },
      format: { type: "string", enum: [...VALID_FORMATS] },
      stem: { type: "string" },
      options: {
        type: ["array", "null"],
        items: { type: "string" },
        description: "Exactly 4 strings for MULTIPLE_CHOICE; null otherwise.",
      },
      correct_index: {
        type: ["integer", "null"],
        minimum: 0,
        description: "0-based index into options for MC; null for non-MC.",
      },
      correct_answer: {
        type: ["string", "null"],
        description: "Cleaned value for NUMERIC_ENTRY/DRAG_DROP; null for MC.",
      },
      distractor_misconceptions: {
        type: ["object", "null"],
        additionalProperties: codeEnum,
        description:
          "MC only: keys are stringified option indices ('0'..'3'); values are misconception codes from the 21. Omit a key when no code fits.",
      },
      misconception_tags: {
        type: "array",
        items: codeEnum,
        description:
          "Deduplicated superset of every distractor code plus any item-level codes.",
      },
      operation_type: { type: "string", enum: [...VALID_OPERATION_TYPES] },
      num_operations: { type: "integer", minimum: 1 },
      representation: { type: "string", enum: [...VALID_REPRESENTATIONS] },
      difficulty_seed: { type: "number" },
      image_required: { type: "boolean" },
      image_alt: { type: ["string", "null"] },
      confidence: { type: "string", enum: [...VALID_CONFIDENCE] },
      reasoning: { type: "string" },
      review_flags: { type: "array", items: { type: "string" } },
    },
  };
}

const TOOL_NAME = "submit_tagging";

// Rate-limit resilience: the org-level input-tokens-per-minute cap trips on
// long serial runs (every call carries the taxonomy), and the SDK's default
// 2 retries can exhaust before the token bucket refills. Retry 429/529/5xx
// here with retry-after-aware backoff; anything else still fails the question.
const MAX_RATE_LIMIT_RETRIES = 5;

function errorStatus(err: unknown): number | null {
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

function retryAfterSeconds(err: unknown): number | null {
  if (typeof err !== "object" || err === null || !("headers" in err)) return null;
  const headers = (err as { headers?: unknown }).headers;
  let raw: string | null = null;
  if (headers instanceof Headers) {
    raw = headers.get("retry-after");
  } else if (typeof headers === "object" && headers !== null) {
    const value = (headers as Record<string, unknown>)["retry-after"];
    if (typeof value === "string") raw = value;
  }
  if (raw === null) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

async function createWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      const status = errorStatus(err);
      const retryable =
        status === 429 || status === 529 || (status !== null && status >= 500);
      if (!retryable || attempt >= MAX_RATE_LIMIT_RETRIES) throw err;
      const retryAfter = retryAfterSeconds(err);
      const waitMs =
        retryAfter !== null
          ? retryAfter * 1000
          : Math.min(60_000, 15_000 * 2 ** attempt);
      console.log(
        `    HTTP ${status}; retry ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES} in ${Math.round(waitMs / 1000)}s`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

async function tagQuestion(
  client: Anthropic,
  input: PromptInput,
): Promise<{ ok: true; data: LlmTagged } | { ok: false; error: string }> {
  try {
    const response = await createWithRetry(client, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description:
            "Submit the fully-structured tagged record for this S.A.M. placement-test question.",
          input_schema: buildTaggingToolSchema(
            input.misconceptions.map((m) => m.code),
          ) as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });

    // With forced tool_choice the model must emit a single tool_use block
    // for TOOL_NAME. Read its `input` directly — no text block, no fence
    // stripping, no JSON.parse.
    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === TOOL_NAME) {
        return { ok: true, data: block.input as LlmTagged };
      }
    }
    return {
      ok: false,
      error: `No tool_use block named '${TOOL_NAME}' in response (stop_reason=${response.stop_reason}).`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Validation + enrichment
// ---------------------------------------------------------------------------

function shortLevelSlug(label: string | null): string {
  if (!label) return "X";
  const m = /\bLevel\s+(\d+)\b/i.exec(label);
  return m ? `L${m[1]}` : label.replace(/\s+/g, "").toUpperCase();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

// Normalize sam_level to a bare integer regardless of whether the model
// returns 1, "1", or "l1". Tool-use forces integer at the API boundary,
// but this stays defensive: a manual re-run with a malformed JSON file,
// or a future model variation that slips a string through, will not
// produce the "ll1" false-mismatch flag the prose-prompt version did.
function normalizeSamLevel(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const m = /^l?(\d+)$/i.exec(value.trim());
    if (m) return Number(m[1]);
  }
  return null;
}

function validateAndEnrich(
  tagged: LlmTagged,
  q: Stage2Question,
  taxonomy: Taxonomy,
  validCodes: Set<string>,
  testLevelLabel: string | null,
): Stage3Question {
  const flags = new Set<string>(tagged.review_flags ?? []);

  // content_key
  const content = taxonomy.content.find((c) => c.key === tagged.content_key);
  let subStrandKey: string | null = null;
  let strandKey: string | null = null;
  // Normalize sam_level once for the consistency check below AND for the
  // record we return (so downstream consumers see a clean integer).
  const normalizedLevel = normalizeSamLevel(tagged.sam_level);
  if (!content) {
    flags.add(`content_key '${tagged.content_key}' not in taxonomy`);
  } else {
    subStrandKey = content.sub_strand;
    const subStrand = taxonomy.sub_strands.find((s) => s.key === content.sub_strand);
    strandKey = subStrand?.strand ?? null;
    // sam_level / content level consistency. Both sides normalized to "l<n>".
    if (normalizedLevel !== null) {
      const levelKey = `l${normalizedLevel}`;
      if (content.level !== levelKey) {
        flags.add(
          `sam_level=${normalizedLevel} does not match content_key level ${content.level}`,
        );
      }
    }
  }

  // misconception codes
  const allCodes = new Set<string>();
  if (tagged.distractor_misconceptions) {
    for (const [, code] of Object.entries(tagged.distractor_misconceptions)) {
      allCodes.add(code);
    }
  }
  for (const code of tagged.misconception_tags ?? []) allCodes.add(code);
  for (const code of allCodes) {
    if (!validCodes.has(code)) flags.add(`misconception code '${code}' not in vocabulary`);
  }

  // correct_index range
  if (
    tagged.correct_index !== null &&
    tagged.correct_index !== undefined &&
    (!tagged.options ||
      tagged.correct_index < 0 ||
      tagged.correct_index >= tagged.options.length)
  ) {
    flags.add(
      `correct_index ${tagged.correct_index} out of range for options length ${tagged.options?.length ?? 0}`,
    );
  }

  // enum sanity
  if (!VALID_OPERATION_TYPES.includes(tagged.operation_type)) {
    flags.add(`operation_type '${tagged.operation_type}' invalid`);
  }
  if (!VALID_REPRESENTATIONS.includes(tagged.representation)) {
    flags.add(`representation '${tagged.representation}' invalid`);
  }
  if (!VALID_FORMATS.includes(tagged.format)) {
    flags.add(`format '${tagged.format}' invalid`);
  }

  // format / answer-kind agreement
  if (tagged.format === "MULTIPLE_CHOICE" && tagged.correct_index === null) {
    flags.add("MULTIPLE_CHOICE but correct_index is null");
  }
  if (
    (tagged.format === "NUMERIC_ENTRY" || tagged.format === "DRAG_DROP") &&
    tagged.correct_index !== null
  ) {
    flags.add(`${tagged.format} but correct_index is set`);
  }
  if (q.correct_answer?.answer_kind === "OPTION" && tagged.format !== "MULTIPLE_CHOICE") {
    flags.add(`answer key kind=OPTION but format=${tagged.format}`);
  }
  if (q.correct_answer?.answer_kind === "VALUE" && tagged.format === "MULTIPLE_CHOICE") {
    flags.add(`answer key kind=VALUE but format=MULTIPLE_CHOICE`);
  }

  // num_operations sanity
  if (!Number.isInteger(tagged.num_operations) || tagged.num_operations < 1) {
    flags.add(`num_operations must be an integer >= 1 (got ${tagged.num_operations})`);
  }

  const wordCount = countWords(tagged.stem);
  const externalId = `SAM-${shortLevelSlug(testLevelLabel)}-Q${String(q.task_number).padStart(2, "0")}`;

  return {
    ...tagged,
    sam_level: normalizedLevel,
    review_flags: [...flags],
    external_id: externalId,
    sub_strand: subStrandKey,
    strand: strandKey,
    word_count: wordCount,
    status: "ok",
  };
}

function failedRecord(
  q: Stage2Question,
  testLevelLabel: string | null,
  error: string,
): Stage3Question {
  const externalId = `SAM-${shortLevelSlug(testLevelLabel)}-Q${String(q.task_number).padStart(2, "0")}`;
  return {
    task_number: q.task_number,
    sam_level: null,
    sam_topic: null,
    content_key: "",
    format: "MULTIPLE_CHOICE",
    stem: "",
    correct_index: null,
    correct_answer: null,
    misconception_tags: [],
    operation_type: "ADDITION",
    num_operations: 1,
    representation: "SYMBOLIC",
    difficulty_seed: 0,
    image_required: false,
    image_alt: null,
    confidence: "low",
    reasoning: "",
    review_flags: [`LLM call failed: ${error}`],
    external_id: externalId,
    sub_strand: null,
    strand: null,
    word_count: 0,
    status: "failed",
    error,
  };
}

// ---------------------------------------------------------------------------
// Review-sheet renderer
// ---------------------------------------------------------------------------

// Derive a stable question label even when task_number is somehow absent —
// tool-use now requires it, but the renderer stays defensive so a hand-
// edited stage3-tagged.json never renders "## Qundefined".
function questionLabel(q: Stage3Question): string {
  if (typeof q.task_number === "number" && Number.isFinite(q.task_number)) {
    return `Q${q.task_number}`;
  }
  const m = /Q0*(\d+)$/.exec(q.external_id);
  return m ? `Q${m[1]}` : "Q?";
}

function renderReviewSheet(out: Stage3Output): string {
  const lines: string[] = [];
  lines.push(`# Stage 3 review — ${out.source}`);
  lines.push("");
  lines.push(`- **Model:** \`${out.model}\``);
  lines.push(`- **Tagged at:** ${out.taggedAt}`);
  lines.push(`- **Level label:** ${out.test_level_label ?? "(unknown)"}`);
  lines.push(`- **Answer key paired:** ${out.answer_key_source ?? "(none)"}`);
  lines.push(
    `- **Counts:** ${out.question_count} questions / ${out.failed_count} failed / ${out.total_review_flags} total review_flags`,
  );
  const conf = out.confidence_breakdown;
  lines.push(
    `- **Confidence:** high=${conf.high}  medium=${conf.medium}  low=${conf.low}  none=${conf.none}`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const q of out.questions) {
    lines.push(`## ${questionLabel(q)} — ${q.external_id}`);
    lines.push(`**Confidence:** ${q.confidence}  **Status:** ${q.status}`);
    if (q.status === "failed") {
      lines.push("");
      lines.push(`> LLM call failed: ${q.error ?? "unknown error"}`);
      lines.push("");
      lines.push("---");
      lines.push("");
      continue;
    }
    lines.push("");
    lines.push(`**Stem:** ${q.stem}`);
    lines.push(`**Format:** ${q.format}`);
    if (q.format === "MULTIPLE_CHOICE" && q.options) {
      lines.push("**Options:**");
      q.options.forEach((opt, i) => {
        const marker = i === q.correct_index ? "✓ " : "  ";
        lines.push(`- ${marker}(${i + 1}) ${opt}`);
      });
    } else {
      lines.push(`**Correct answer:** ${q.correct_answer ?? "(none)"}`);
    }
    lines.push("");
    lines.push(
      `**S.A.M. eval:** topic=\`${q.sam_topic ?? "(null)"}\`  level=${q.sam_level ?? "(null)"}`,
    );
    lines.push(
      `**Tagged to:** content_key=\`${q.content_key}\`  sub_strand=\`${q.sub_strand ?? "(none)"}\`  strand=\`${q.strand ?? "(none)"}\``,
    );

    if (
      q.format === "MULTIPLE_CHOICE" &&
      q.options &&
      q.distractor_misconceptions
    ) {
      lines.push("");
      lines.push("**Distractor misconceptions:**");
      for (let i = 0; i < q.options.length; i += 1) {
        if (i === q.correct_index) continue;
        const code = q.distractor_misconceptions[String(i)];
        if (code) {
          lines.push(`- (${i + 1}) \`${q.options[i]}\` → \`${code}\``);
        } else {
          lines.push(`- (${i + 1}) \`${q.options[i]}\` → _(no misconception assigned)_`);
        }
      }
    }
    if (q.misconception_tags.length > 0) {
      lines.push("");
      lines.push(`**Misconception tags:** ${q.misconception_tags.map((c) => `\`${c}\``).join(", ")}`);
    }

    lines.push("");
    lines.push(
      `**Norm fields:** operation_type=\`${q.operation_type}\`  num_operations=${q.num_operations}  representation=\`${q.representation}\`  word_count=${q.word_count}`,
    );
    lines.push(`**Difficulty seed:** ${q.difficulty_seed}`);
    lines.push(
      `**Image:** required=${q.image_required}${q.image_alt ? `  alt="${q.image_alt}"` : ""}`,
    );
    lines.push("");
    lines.push(`**Reasoning:** ${q.reasoning}`);

    if (q.review_flags.length > 0) {
      lines.push("");
      lines.push("**Review flags:**");
      for (const f of q.review_flags) lines.push(`- ${f}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Per-worksheet flow
// ---------------------------------------------------------------------------

async function appendAuditLine(
  source: string,
  questionCount: number,
  failedCount: number,
): Promise<void> {
  const line = `${new Date().toISOString()} | stage3 | ${source} | ${questionCount} tagged | ${failedCount} failed\n`;
  await appendFile(LOG_FILE, line, "utf8");
}

function filterTaxonomyForLevel(
  taxonomy: Taxonomy,
  testLevelLabel: string | null,
): TaxonomyContent[] {
  if (!testLevelLabel) return taxonomy.content;
  const m = /\bLevel\s+(\d+)\b/i.exec(testLevelLabel);
  if (!m) return taxonomy.content;
  const level = Number(m[1]);
  const window = new Set<string>([
    `l${Math.max(0, level - 1)}`,
    `l${level}`,
    `l${level + 1}`,
  ]);
  return taxonomy.content.filter((c) => window.has(c.level));
}

async function processWorksheet(
  client: Anthropic,
  stage2: DiscoveredStage2,
  taxonomy: Taxonomy,
  misconceptions: Misconception[],
): Promise<void> {
  const { folder, data } = stage2;
  console.log(`\nTagging ${data.source} (${data.question_count} questions)`);

  const validCodes = new Set(misconceptions.map((m) => m.code));
  const taxonomyContent = filterTaxonomyForLevel(taxonomy, data.test_level_label);

  const records: Stage3Question[] = [];
  for (const q of data.questions) {
    const result = await tagQuestion(client, {
      question: q,
      taxonomyContent,
      misconceptions,
      testLevelLabel: data.test_level_label,
      evalResultsRaw: data.eval_results_raw,
    });
    if (result.ok) {
      const enriched = validateAndEnrich(
        result.data,
        q,
        taxonomy,
        validCodes,
        data.test_level_label,
      );
      records.push(enriched);
      const flagCount = enriched.review_flags.length;
      console.log(
        `  Q${q.task_number}: ${enriched.confidence}${flagCount > 0 ? `  (${flagCount} flag${flagCount === 1 ? "" : "s"})` : ""}`,
      );
    } else {
      records.push(failedRecord(q, data.test_level_label, result.error));
      console.error(`  Q${q.task_number}: FAILED — ${result.error}`);
    }
  }

  const failedCount = records.filter((r) => r.status === "failed").length;
  const confidenceBreakdown: Record<Confidence | "none", number> = {
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  };
  for (const r of records) {
    if (r.status === "failed") {
      confidenceBreakdown.none += 1;
    } else if (VALID_CONFIDENCE.includes(r.confidence)) {
      confidenceBreakdown[r.confidence] += 1;
    } else {
      confidenceBreakdown.none += 1;
    }
  }
  const totalReviewFlags = records.reduce((acc, r) => acc + r.review_flags.length, 0);

  const out: Stage3Output = {
    source: data.source,
    answer_key_source: data.answer_key_source,
    test_level_label: data.test_level_label,
    taggedAt: new Date().toISOString(),
    model: MODEL,
    question_count: records.length,
    failed_count: failedCount,
    confidence_breakdown: confidenceBreakdown,
    total_review_flags: totalReviewFlags,
    questions: records,
  };

  const taggedPath = path.join(OUTPUT_DIR, folder, "stage3-tagged.json");
  const reviewPath = path.join(OUTPUT_DIR, folder, "stage3-review.md");
  await writeFile(taggedPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  await writeFile(reviewPath, renderReviewSheet(out), "utf8");

  console.log(
    `  -> ${path.relative(process.cwd(), taggedPath)}\n  -> ${path.relative(process.cwd(), reviewPath)}`,
  );
  console.log(
    `  summary: question_count=${out.question_count}  failed=${failedCount}  high=${confidenceBreakdown.high}  medium=${confidenceBreakdown.medium}  low=${confidenceBreakdown.low}  review_flags=${totalReviewFlags}`,
  );

  await appendAuditLine(data.source, records.length, failedCount);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const apiKey = await loadAnthropicApiKey();
  const taxonomy = await loadTaxonomy();
  const { list: misconceptions, usedFallback } = await loadMisconceptions();
  if (usedFallback) {
    console.warn(
      "[warn] seed.sql misconception parse fell back to the hardcoded 21-code list (codes only, no labels/descriptions).",
    );
  }
  console.log(
    `Loaded taxonomy: ${taxonomy.content.length} content items / ${taxonomy.sub_strands.length} sub_strands / ${taxonomy.strands.length} strands.`,
  );
  console.log(`Loaded misconception vocabulary: ${misconceptions.length} codes.`);
  console.log(`Model: ${MODEL}`);

  if (ONLY_INDEX >= 0 && ONLY_FOLDER === null) {
    throw new Error(`--only requires a folder name (e.g. --only "Level 2 Placement Worksheet").`);
  }

  const stage2 = await discoverStage2();
  if (stage2.length === 0) {
    console.log(
      `No Stage 2 outputs found under ${path.relative(process.cwd(), OUTPUT_DIR)}/. Run pnpm convert:segment first.`,
    );
    return;
  }
  console.log(`Found ${stage2.length} Stage 2 worksheet output(s).`);

  const selected =
    ONLY_FOLDER === null ? stage2 : stage2.filter((ws) => ws.folder === ONLY_FOLDER);
  if (ONLY_FOLDER !== null && selected.length === 0) {
    console.log(`No Stage 2 output folder named '${ONLY_FOLDER}'. Nothing to tag.`);
    return;
  }

  const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });

  let skipped = 0;
  for (const ws of selected) {
    // Skip-existing guard: never re-tag (and never re-spend API calls on) a
    // worksheet that already has a stage3 output, unless --force is given.
    if (!FORCE && (await fileExists(path.join(OUTPUT_DIR, ws.folder, "stage3-tagged.json")))) {
      console.log(`[skip] ${ws.folder} — stage3-tagged.json exists (use --force to re-tag)`);
      skipped += 1;
      continue;
    }
    await processWorksheet(client, ws, taxonomy, misconceptions);
  }

  console.log(
    `\nStage 3 done.${skipped > 0 ? ` (${skipped} worksheet(s) skipped — already tagged)` : ""}`,
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error("Stage 3 failed:", message);
  process.exit(1);
});
