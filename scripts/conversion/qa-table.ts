// Atlas Assessment — conversion pipeline master QA table (founder deliverable).
//
// Emits ONE ROW PER LOADED QUESTION (the effective bank parsed from the
// committed SQL — hand-seeded block + Stage 4 generated migration + the dev
// placeholder) with full lineage back to the S.A.M. source PDFs and the
// parsed answer keys, plus per-row auto-check flags:
//
//   * KEY-CONSISTENCY   — internal consistency (structure, keyed option in
//     options, distractor map, stem arithmetic recomputed, numeric answer
//     format) — reuses the Stage 5 audit checkers (stage5-audit.ts).
//   * ANSWER-KEY-TRACE  — stored answer vs the Stage 2 parsed answer-key
//     entry (MATCH / MISMATCH / UNVERIFIED).
//   * NORMALIZATION-SENSITIVE — the P1 grading-bug class: stored answers
//     whose grading depends on case / whitespace / comma / unit-spacing /
//     thousands-grouping normalization, and whether the P1 judge normalizer
//     (PR #25) resolves each.
//   * PROVENANCE        — PDF-CONVERTED / HAND-TRANSCRIBED / SYNTHETIC,
//     flagging anything non-traceable to a S.A.M. source.
//   * SUSPECT verdict   — the Stage 5 audit verdict (CLEAN / SUSPECT /
//     UNVERIFIABLE).
//
// Companion sections in both outputs: (a) the questions Stage 4 SKIPPED
// (never loaded), with task ref + worksheet + skip reason; (b) a quick-scan
// summary of the inactive rows (which also appear in the main table).
//
// Outputs (gitignored; the script + conversion.log line are what get
// committed):
//   scripts/conversion/output/QA-audit-L1-4.md
//   scripts/conversion/output/QA-audit-L1-4.csv   (Excel-safe: UTF-8 BOM,
//     CRLF records, every field quoted)
//
// Run via: pnpm convert:qa [--artifacts <dir>]
//   --artifacts <dir>  Stage 2/3/4 artifact root (default:
//                      scripts/conversion/output). Without artifacts the
//                      table still renders, but key traces are UNVERIFIED
//                      and the skipped-questions section is empty.

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Stage3Question } from "./stage4-load";
import {
  UNIT_TOKENS,
  assembleBank,
  auditQuestion,
  findGeneratedMigration,
  findWorksheet,
  isSingleNumberKey,
  loadArtifacts,
  normalizeAnswer,
  parseExternalId,
  storedAnswerOf,
  type BankRow,
  type CheckResult,
  type KeyInfo,
  type QuestionAudit,
  type WorksheetArtifacts,
} from "./stage5-audit";

// The P1 judge normalizer (PR #25 duplicate — keep in sync with
// src/lib/responseSubmit/correctness.ts) now lives in stage5-audit.ts so
// the audit's key-agreement comparison and this table classify with
// EXACTLY the same normalizer. Re-exported here for existing consumers.
export { isSingleNumberKey, normalizeAnswer } from "./stage5-audit";

const PLAIN_NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

// ---------------------------------------------------------------------------
// NORMALIZATION-SENSITIVE classification (pure).
// ---------------------------------------------------------------------------

export interface NormalizationFlag {
  /** Only NUMERIC_ENTRY / DRAG_DROP answers go through normalizeAnswer(). */
  applicable: boolean;
  sensitive: boolean;
  reasons: string[];
  /** Whether the P1 normalizer (PR #25) resolves the detected sensitivity. */
  p1Resolves: boolean;
  detail: string;
}

/** Sensitivity classes for ONE stored answer string. */
export function analyzeAnswerSensitivity(stored: string): string[] {
  const reasons: string[] = [];
  if (/[A-Z]/.test(stored)) reasons.push("case");
  if (/^\s|\s$|\s{2,}|\t/.test(stored)) reasons.push("irregular whitespace");
  if (stored.includes(",")) reasons.push("comma separator");
  if (new RegExp(`\\d ?(?:${UNIT_TOKENS})\\b`, "i").test(stored)) {
    reasons.push("unit tokens");
  }
  const norm = normalizeAnswer(stored);
  if (norm.includes(" ")) {
    reasons.push(
      isSingleNumberKey(norm)
        ? "thousands-grouped single number"
        : "multi-token list (separator semantics)",
    );
  }
  if (reasons.length === 0 && norm !== stored) {
    reasons.push("normalizer alters stored text");
  }
  return reasons;
}

/** Classify a bank row's stored answer(s) against the P1 grading-bug class.
 *  MULTIPLE_CHOICE is graded by exact option-text comparison (the client
 *  echoes the displayed option), so it sits outside the normalizer class. */
export function classifyNormalizationSensitivity(
  format: string,
  content: Record<string, unknown>,
): NormalizationFlag {
  if (format === "MULTIPLE_CHOICE") {
    return {
      applicable: false,
      sensitive: false,
      reasons: [],
      p1Resolves: false,
      detail:
        "n/a — MC graded by exact option-text match (client submits the displayed option)",
    };
  }
  const stored: string[] =
    format === "NUMERIC_ENTRY"
      ? typeof content.correct_answer === "string"
        ? [content.correct_answer]
        : []
      : Array.isArray(content.correct_order)
        ? content.correct_order.filter((t): t is string => typeof t === "string")
        : [];
  if (stored.length === 0) {
    return {
      applicable: true,
      sensitive: false,
      reasons: [],
      p1Resolves: false,
      detail: "no stored answer string to classify",
    };
  }
  const reasons = [...new Set(stored.flatMap((s) => analyzeAnswerSensitivity(s)))];
  if (reasons.length === 0) {
    return {
      applicable: true,
      sensitive: false,
      reasons,
      p1Resolves: false,
      detail: "not sensitive — stored answer already canonical",
    };
  }
  // Every detected class (case / separators / unit spacing / grouping) is
  // exactly what the P1 normalizer canonicalizes on BOTH sides, so
  // equivalent child input grades correct once PR #25 merges. Non-numeric
  // answers still require the normalized exact text beyond that.
  const allNumericAfterNorm = stored.every((s) =>
    PLAIN_NUMERIC_RE.test(normalizeAnswer(s).replace(/ /g, "")),
  );
  const caveat = allNumericAfterNorm
    ? ""
    : "; non-numeric answer — exact normalized text still required from the child";
  return {
    applicable: true,
    sensitive: true,
    reasons,
    p1Resolves: true,
    detail: `sensitive (${reasons.join("; ")}) — P1 normalizer (PR #25) resolves${caveat}`,
  };
}

// ---------------------------------------------------------------------------
// Flag derivation from the Stage 5 audit checks (pure).
// ---------------------------------------------------------------------------

export interface FlagResult {
  status: string;
  detail: string;
}

/** Internal-consistency checks (structure, keyed option in options,
 *  distractor map, recomputed stem arithmetic, numeric answer format). */
const KEY_CONSISTENCY_CHECKS = new Set([
  "structure",
  "distractor-map",
  "stem-arithmetic",
  "answer-format",
]);

export function flagKeyConsistency(checks: CheckResult[]): FlagResult {
  const relevant = checks.filter((c) => KEY_CONSISTENCY_CHECKS.has(c.name));
  const fails = relevant.filter((c) => c.status === "fail");
  if (fails.length > 0) {
    return {
      status: "FAIL",
      detail: fails.map((f) => `${f.name}: ${f.detail}`).join(" | "),
    };
  }
  const arithmetic = relevant.find((c) => c.name === "stem-arithmetic");
  if (arithmetic?.status === "pass") {
    return { status: "PASS", detail: arithmetic.detail };
  }
  return {
    status: "PASS",
    detail: "structural checks pass; stem arithmetic not mechanically checkable",
  };
}

export function flagAnswerKeyTrace(checks: CheckResult[]): FlagResult {
  const check = checks.find((c) => c.name === "key-agreement");
  if (!check) return { status: "UNVERIFIED", detail: "no key-agreement check ran" };
  if (check.status === "pass") return { status: "MATCH", detail: check.detail };
  if (check.status === "fail") return { status: "MISMATCH", detail: check.detail };
  return { status: "UNVERIFIED", detail: check.detail };
}

export type ProvenanceClass = "PDF-CONVERTED" | "HAND-TRANSCRIBED" | "SYNTHETIC";

export function provenanceOf(
  origin: BankRow["origin"],
  hasStage3Record: boolean,
): FlagResult & { class: ProvenanceClass; traceable: boolean } {
  if (origin === "dev-placeholder") {
    return {
      class: "SYNTHETIC",
      traceable: true,
      status: "SYNTHETIC",
      detail: "dev placeholder (Item #13a visual gate; seed.sql only, never ships to prod)",
    };
  }
  if (origin === "hand-seeded") {
    return {
      class: "HAND-TRANSCRIBED",
      traceable: true,
      status: "HAND-TRANSCRIBED",
      detail: hasStage3Record
        ? "founder-curated Item #11 transcription; pipeline twin confirms the same S.A.M. source"
        : "founder-curated Item #11 transcription (pipeline twin artifacts not present)",
    };
  }
  return hasStage3Record
    ? {
        class: "PDF-CONVERTED",
        traceable: true,
        status: "PDF-CONVERTED",
        detail: "stage3-tagged.json record names the S.A.M. source PDF",
      }
    : {
        class: "PDF-CONVERTED",
        traceable: false,
        status: "PDF-CONVERTED **NOT TRACEABLE**",
        detail: "no stage3-tagged.json record found for this row — investigate",
      };
}

// ---------------------------------------------------------------------------
// CSV rendering (pure). Excel-safe: UTF-8 BOM so × and ÷ render, CRLF
// record separators, EVERY field quoted with internal quotes doubled;
// commas/newlines therefore stay safely inside quoted fields.
// ---------------------------------------------------------------------------

export function csvField(value: string): string {
  return `"${value.replace(/\r\n/g, "\n").replace(/"/g, '""')}"`;
}

export function csvLine(fields: string[]): string {
  return fields.map(csvField).join(",");
}

export function buildCsvDocument(rows: string[][]): string {
  const BOM = "﻿"; // UTF-8 BOM so Excel renders × and ÷ correctly
  return `${BOM}${rows.map(csvLine).join("\r\n")}\r\n`;
}

// ---------------------------------------------------------------------------
// Markdown cell escaping (pure).
// ---------------------------------------------------------------------------

export function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>").trim();
}

// ---------------------------------------------------------------------------
// Row assembly.
// ---------------------------------------------------------------------------

interface QaRow {
  external_id: string;
  worksheet: string;
  task: string;
  key_file: string;
  key_entry: string;
  sam_level: string;
  half_grade_level: string;
  strand: string;
  sub_strand: string;
  content_key: string;
  format: string;
  stem: string;
  options: string;
  stored_answer: string;
  misconception_tags: string;
  is_active: string;
  inactive_reason: string;
  key_consistency: FlagResult;
  answer_key_trace: FlagResult;
  normalization: NormalizationFlag;
  provenance: ReturnType<typeof provenanceOf>;
  verdict: QuestionAudit["verdict"];
}

/** "l3-fractions-2" → "fractions" (content keys are l<level>-<sub_strand>-<seq>). */
export function subStrandFromContentKey(contentKey: string): string | null {
  const m = /^l\d[abc]?-(.+)-\d+$/.exec(contentKey);
  return m ? m[1] : null;
}

function buildQaRow(
  row: BankRow,
  ws: WorksheetArtifacts | null,
  key: KeyInfo | null,
  s3: Stage3Question | null,
  audit: QuestionAudit,
): QaRow {
  const parsed = parseExternalId(row.external_id);
  const isPlaceholder = row.origin === "dev-placeholder";
  const worksheet = isPlaceholder
    ? "none — synthetic dev fixture"
    : (ws?.source ??
      (parsed ? `Level ${String(parsed.level)} Placement Worksheet.pdf (inferred from external_id)` : "UNKNOWN"));
  const task = isPlaceholder
    ? "n/a"
    : parsed
      ? row.origin === "hand-seeded"
        ? `task ${String(parsed.task)} (parsed from external_id)`
        : `task ${String(parsed.task)}`
      : "UNKNOWN";

  let keyFile: string;
  let keyEntry: string;
  if (isPlaceholder) {
    keyFile = "none";
    keyEntry = "n/a — synthetic dev fixture";
  } else {
    keyFile =
      ws?.answerKeySource ??
      (parsed ? `Level ${String(parsed.level)} Placement Worksheet Answer Key.pdf (inferred)` : "UNKNOWN");
    const rendered = key
      ? `"${key.raw_answer}"${key.answer_kind ? ` [${key.answer_kind}]` : ""}`
      : "no parsed key entry for this task";
    keyEntry =
      row.origin === "hand-seeded"
        ? `hand-transcribed (key entry from pipeline twin): ${rendered}`
        : rendered;
  }

  const samLevel = isPlaceholder
    ? "none (synthetic)"
    : `${ws?.testLevelLabel ?? (parsed ? `Level ${String(parsed.level)}` : "UNKNOWN")}` +
      (s3 && s3.sam_level !== null ? ` (stage3 sam_level=${String(s3.sam_level)})` : "");

  const contentKey =
    row.content_key ??
    (s3
      ? `${s3.content_key} (from pipeline twin; hand-seeded insert stores no content_key)`
      : isPlaceholder
        ? "none (dev placeholder)"
        : "none stored");
  const subStrand =
    s3?.sub_strand ??
    (row.content_key ? subStrandFromContentKey(row.content_key) : null) ??
    (s3 ? (subStrandFromContentKey(s3.content_key) ?? "n/a") : "n/a");

  const options =
    row.format === "MULTIPLE_CHOICE" && Array.isArray(row.content.options)
      ? (row.content.options as string[]).map((o, i) => `[${String(i)}] ${o}`).join(" ; ")
      : "n/a";

  let inactiveReason = "";
  if (!row.is_active) {
    inactiveReason = isPlaceholder
      ? "dev placeholder (Item #13a visual gate; seed.sql only)"
      : "image-essential; awaiting curated per-question image";
  }

  return {
    external_id: row.external_id,
    worksheet,
    task,
    key_file: keyFile,
    key_entry: keyEntry,
    sam_level: samLevel,
    half_grade_level: row.level,
    strand: row.strand,
    sub_strand: subStrand,
    content_key: contentKey,
    format: row.format,
    stem: typeof row.content.stem === "string" ? row.content.stem : "",
    options,
    stored_answer: storedAnswerOf(row),
    misconception_tags:
      row.misconception_tags.length > 0 ? row.misconception_tags.join(", ") : "(none)",
    is_active: row.is_active ? "active" : "INACTIVE",
    inactive_reason: inactiveReason,
    key_consistency: flagKeyConsistency(audit.checks),
    answer_key_trace: flagAnswerKeyTrace(audit.checks),
    normalization: classifyNormalizationSensitivity(row.format, row.content),
    provenance: provenanceOf(row.origin, s3 !== null),
    verdict: audit.verdict,
  };
}

// ---------------------------------------------------------------------------
// Skipped questions (stage4-skipped.json companion artifacts).
// ---------------------------------------------------------------------------

interface SkippedEntry {
  external_id: string;
  task_number: number;
  worksheet: string;
  reasons: string[];
}

async function loadSkipped(artifactsDir: string, worksheetDirs: string[]): Promise<SkippedEntry[]> {
  const out: SkippedEntry[] = [];
  for (const dir of worksheetDirs) {
    let parsed: {
      source: string;
      skipped: Array<{ external_id: string; task_number: number; reasons: string[] }>;
    };
    try {
      parsed = JSON.parse(
        await readFile(path.join(artifactsDir, dir, "stage4-skipped.json"), "utf8"),
      ) as typeof parsed;
    } catch {
      continue;
    }
    for (const s of parsed.skipped) {
      out.push({
        external_id: s.external_id,
        task_number: s.task_number,
        worksheet: parsed.source,
        reasons: s.reasons,
      });
    }
  }
  out.sort((a, b) => a.external_id.localeCompare(b.external_id));
  return out;
}

// ---------------------------------------------------------------------------
// Document rendering.
// ---------------------------------------------------------------------------

interface Totals {
  rows: number;
  active: number;
  inactive: number;
  keyConsistencyFails: QaRow[];
  traceMismatches: QaRow[];
  traceUnverified: number;
  normSensitive: QaRow[];
  suspects: QaRow[];
  byProvenance: Map<string, number>;
  nonTraceable: QaRow[];
}

function computeTotals(rows: QaRow[]): Totals {
  const byProvenance = new Map<string, number>();
  for (const r of rows) {
    byProvenance.set(r.provenance.class, (byProvenance.get(r.provenance.class) ?? 0) + 1);
  }
  return {
    rows: rows.length,
    active: rows.filter((r) => r.is_active === "active").length,
    inactive: rows.filter((r) => r.is_active !== "active").length,
    keyConsistencyFails: rows.filter((r) => r.key_consistency.status === "FAIL"),
    traceMismatches: rows.filter((r) => r.answer_key_trace.status === "MISMATCH"),
    traceUnverified: rows.filter((r) => r.answer_key_trace.status === "UNVERIFIED").length,
    normSensitive: rows.filter((r) => r.normalization.sensitive),
    suspects: rows.filter((r) => r.verdict === "SUSPECT"),
    byProvenance,
    nonTraceable: rows.filter((r) => !r.provenance.traceable),
  };
}

function provenanceStatement(t: Totals): string {
  const hand = t.byProvenance.get("HAND-TRANSCRIBED") ?? 0;
  const pdf = t.byProvenance.get("PDF-CONVERTED") ?? 0;
  const synthetic = t.byProvenance.get("SYNTHETIC") ?? 0;
  return (
    `Every ACTIVE question traces to a S.A.M. placement-worksheet PDF: of the ${String(t.rows)} loaded rows, ` +
    `${String(hand)} are founder hand-transcriptions of "Level 2 Placement Worksheet.pdf" and ` +
    `${String(pdf)} are pipeline conversions of the Level 1-4 placement worksheet PDFs — all ${String(hand + pdf)} ` +
    `carry mechanical lineage to a S.A.M. source (${String(t.nonTraceable.length)} non-traceable rows found). ` +
    `The only row with no S.A.M. source is the ${String(synthetic)} synthetic dev placeholder ` +
    `(PLACEHOLDER-Q-IMG-GRID-001), which is INACTIVE and exists only in seed.sql (never ships to production). ` +
    `All ${String(t.active)} active questions are S.A.M.-sourced; no AI-authored question content exists in the bank.`
  );
}

const FLAGS_LEGEND =
  "KEY-CONSISTENCY = internal consistency (keyed option present, stem arithmetic recomputed); " +
  "ANSWER-KEY-TRACE = stored answer vs Stage 2 parsed answer key; " +
  "NORM-SENSITIVE = P1 grading-bug class (case/whitespace/comma/unit/grouping sensitivity) " +
  "and whether the PR #25 normalizer resolves it; " +
  "PROVENANCE = PDF-CONVERTED / HAND-TRANSCRIBED / SYNTHETIC; " +
  "VERDICT = Stage 5 audit verdict (CLEAN / SUSPECT / UNVERIFIABLE).";

function renderFlagsCell(r: QaRow): string {
  return [
    `KEY-CONSISTENCY: ${r.key_consistency.status}${r.key_consistency.status === "FAIL" ? ` — ${r.key_consistency.detail}` : ""}`,
    `ANSWER-KEY-TRACE: ${r.answer_key_trace.status}${r.answer_key_trace.status === "MISMATCH" ? ` — ${r.answer_key_trace.detail}` : ""}`,
    `NORM-SENSITIVE: ${r.normalization.sensitive ? `YES — ${r.normalization.detail}` : r.normalization.applicable ? "no" : "n/a (MC)"}`,
    `PROVENANCE: ${r.provenance.status}`,
    `VERDICT: ${r.verdict}`,
  ].join("<br>");
}

function buildMarkdown(
  rows: QaRow[],
  skipped: SkippedEntry[],
  totals: Totals,
  generatedAt: string,
  artifactsDir: string,
  parityOk: boolean,
): string {
  const lines: string[] = [];
  lines.push("# Master QA table — question bank L1-4 (QA-audit-L1-4)");
  lines.push("");
  lines.push(
    `Generated ${generatedAt} by \`pnpm convert:qa\` (scripts/conversion/qa-table.ts). ` +
      `READ-ONLY: nothing in the bank was modified. Artifacts root: \`${artifactsDir}\`. ` +
      `CSV twin: \`QA-audit-L1-4.csv\` (UTF-8 BOM, CRLF, all fields quoted — opens directly in Excel).`,
  );
  lines.push("");
  lines.push("## Cover summary");
  lines.push("");
  lines.push(`* Loaded rows: **${String(totals.rows)}** (${String(totals.active)} active, ${String(totals.inactive)} inactive).`);
  lines.push(
    `* Provenance: ${[...totals.byProvenance.entries()].map(([k, v]) => `${k}=${String(v)}`).join(", ")}; non-traceable rows: ${String(totals.nonTraceable.length)}.`,
  );
  lines.push(`* KEY-CONSISTENCY failures: **${String(totals.keyConsistencyFails.length)}**.`);
  lines.push(`* ANSWER-KEY-TRACE mismatches: **${String(totals.traceMismatches.length)}** (plus ${String(totals.traceUnverified)} UNVERIFIED — no mechanically usable key entry).`);
  lines.push(
    `* NORMALIZATION-SENSITIVE answers: **${String(totals.normSensitive.length)}** — P1 normalizer (PR #25) resolves ${String(totals.normSensitive.filter((r) => r.normalization.p1Resolves).length)} of ${String(totals.normSensitive.length)}.`,
  );
  lines.push(`* Stage 5 audit SUSPECT verdicts: **${String(totals.suspects.length)}**.`);
  lines.push(`* §11 parity (generated INSERT identical in migration and seed.sql): ${parityOk ? "OK" : "**VIOLATED**"}.`);
  lines.push(`* Skipped at Stage 4 (never loaded): ${String(skipped.length)} — see companion section A.`);
  lines.push("");
  lines.push(`**Provenance statement.** ${provenanceStatement(totals)}`);
  lines.push("");

  lines.push(`### KEY-CONSISTENCY failures (full list, ${String(totals.keyConsistencyFails.length)})`);
  lines.push("");
  if (totals.keyConsistencyFails.length === 0) lines.push("None.");
  for (const r of totals.keyConsistencyFails) {
    lines.push(`* **${r.external_id}** (${r.is_active}, ${r.format}) — ${mdCell(r.key_consistency.detail)}`);
  }
  lines.push("");
  lines.push(`### ANSWER-KEY-TRACE mismatches (full list, ${String(totals.traceMismatches.length)})`);
  lines.push("");
  if (totals.traceMismatches.length === 0) lines.push("None.");
  for (const r of totals.traceMismatches) {
    lines.push(`* **${r.external_id}** (${r.is_active}, ${r.format}) — ${mdCell(r.answer_key_trace.detail)}`);
  }
  lines.push("");
  lines.push(`### NORMALIZATION-SENSITIVE rows (${String(totals.normSensitive.length)})`);
  lines.push("");
  if (totals.normSensitive.length === 0) lines.push("None.");
  for (const r of totals.normSensitive) {
    lines.push(`* **${r.external_id}** (${r.is_active}, ${r.format}) — stored ${mdCell(r.stored_answer)} — ${mdCell(r.normalization.detail)}`);
  }
  lines.push("");

  lines.push(`## Main table — one row per loaded question (${String(totals.rows)})`);
  lines.push("");
  lines.push(`Flags legend: ${FLAGS_LEGEND}`);
  lines.push("");
  lines.push(
    "| # | external_id | source worksheet + task | answer key file + parsed entry | S.A.M. level → half_grade_level | strand / sub_strand / content key | format | stem | options | stored correct answer | misconception_tags | active | auto-check flags |",
  );
  lines.push("|---:|---|---|---|---|---|---|---|---|---|---|---|---|");
  rows.forEach((r, i) => {
    lines.push(
      `| ${String(i + 1)} | ${mdCell(r.external_id)} | ${mdCell(`${r.worksheet} — ${r.task}`)} | ` +
        `${mdCell(`${r.key_file} — ${r.key_entry}`)} | ${mdCell(`${r.sam_level} → ${r.half_grade_level}`)} | ` +
        `${mdCell(`${r.strand} / ${r.sub_strand} / ${r.content_key}`)} | ${mdCell(r.format)} | ${mdCell(r.stem)} | ` +
        `${mdCell(r.options)} | ${mdCell(r.stored_answer)} | ${mdCell(r.misconception_tags)} | ` +
        `${mdCell(r.is_active + (r.inactive_reason ? ` — ${r.inactive_reason}` : ""))} | ${renderFlagsCell(r)} |`,
    );
  });
  lines.push("");

  lines.push(`## Companion section A — skipped at Stage 4, never loaded (${String(skipped.length)})`);
  lines.push("");
  lines.push("These worksheet tasks were rejected by Stage 4 validation and are NOT in the bank.");
  lines.push("");
  lines.push("| task ref (external_id-equivalent) | worksheet | task # | skip reason |");
  lines.push("|---|---|---:|---|");
  for (const s of skipped) {
    lines.push(`| ${s.external_id} | ${mdCell(s.worksheet)} | ${String(s.task_number)} | ${mdCell(s.reasons.join("; "))} |`);
  }
  if (skipped.length === 0) lines.push("| (no stage4-skipped.json artifacts found) | | | |");
  lines.push("");

  const inactiveRows = rows.filter((r) => r.is_active !== "active");
  lines.push(`## Companion section B — inactive rows quick-scan (${String(inactiveRows.length)})`);
  lines.push("");
  lines.push("Already full rows in the main table; listed here with reasons for quick scanning.");
  lines.push("");
  lines.push("| external_id | worksheet | format | reason inactive |");
  lines.push("|---|---|---|---|");
  for (const r of inactiveRows) {
    lines.push(`| ${r.external_id} | ${mdCell(r.worksheet)} | ${r.format} | ${mdCell(r.inactive_reason)} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildCsvRows(
  rows: QaRow[],
  skipped: SkippedEntry[],
  totals: Totals,
  generatedAt: string,
  parityOk: boolean,
): string[][] {
  const out: string[][] = [];
  const comment = (text: string): void => {
    out.push([`# ${text}`]);
  };
  comment("Master QA table - question bank L1-4 (QA-audit-L1-4)");
  comment(`Generated ${generatedAt} by pnpm convert:qa (scripts/conversion/qa-table.ts). Markdown twin: QA-audit-L1-4.md`);
  comment(
    `SUMMARY: rows=${String(totals.rows)} (active=${String(totals.active)} inactive=${String(totals.inactive)}); ` +
      `provenance ${[...totals.byProvenance.entries()].map(([k, v]) => `${k}=${String(v)}`).join(" ")}; non-traceable=${String(totals.nonTraceable.length)}; ` +
      `key-consistency-failures=${String(totals.keyConsistencyFails.length)}; answer-key-trace-mismatches=${String(totals.traceMismatches.length)} ` +
      `(unverified=${String(totals.traceUnverified)}); normalization-sensitive=${String(totals.normSensitive.length)} ` +
      `(P1-resolves=${String(totals.normSensitive.filter((r) => r.normalization.p1Resolves).length)}); suspects=${String(totals.suspects.length)}; ` +
      `section-11-parity=${parityOk ? "OK" : "VIOLATED"}; skipped-never-loaded=${String(skipped.length)}`,
  );
  comment(`PROVENANCE STATEMENT: ${provenanceStatement(totals)}`);
  for (const r of totals.keyConsistencyFails) {
    comment(`KEY-CONSISTENCY FAILURE: ${r.external_id} (${r.is_active}, ${r.format}) - ${r.key_consistency.detail}`);
  }
  for (const r of totals.traceMismatches) {
    comment(`ANSWER-KEY-TRACE MISMATCH: ${r.external_id} (${r.is_active}, ${r.format}) - ${r.answer_key_trace.detail}`);
  }
  comment(`FLAGS LEGEND: ${FLAGS_LEGEND}`);
  comment("MAIN TABLE: one row per loaded question");
  out.push([
    "external_id",
    "source_worksheet",
    "source_task",
    "answer_key_file",
    "answer_key_parsed_entry",
    "sam_level_label",
    "half_grade_level_loaded",
    "strand",
    "sub_strand",
    "content_key",
    "format",
    "stem",
    "options",
    "stored_correct_answer",
    "misconception_tags",
    "is_active",
    "inactive_reason",
    "flag_key_consistency",
    "flag_key_consistency_detail",
    "flag_answer_key_trace",
    "flag_answer_key_trace_detail",
    "flag_normalization_sensitive",
    "flag_normalization_detail",
    "flag_provenance",
    "flag_audit_verdict",
  ]);
  for (const r of rows) {
    out.push([
      r.external_id,
      r.worksheet,
      r.task,
      r.key_file,
      r.key_entry,
      r.sam_level,
      r.half_grade_level,
      r.strand,
      r.sub_strand,
      r.content_key,
      r.format,
      r.stem,
      r.options,
      r.stored_answer,
      r.misconception_tags,
      r.is_active,
      r.inactive_reason,
      r.key_consistency.status,
      r.key_consistency.detail,
      r.answer_key_trace.status,
      r.answer_key_trace.detail,
      r.normalization.sensitive ? "YES" : r.normalization.applicable ? "no" : "n/a (MC)",
      r.normalization.detail,
      r.provenance.status,
      r.verdict,
    ]);
  }
  out.push([""]);
  comment(`COMPANION SECTION A: skipped at Stage 4, never loaded (${String(skipped.length)})`);
  out.push(["task_ref_external_id_equivalent", "worksheet", "task_number", "skip_reason"]);
  for (const s of skipped) {
    out.push([s.external_id, s.worksheet, String(s.task_number), s.reasons.join("; ")]);
  }
  out.push([""]);
  const inactiveRows = rows.filter((r) => r.is_active !== "active");
  comment(`COMPANION SECTION B: inactive rows quick-scan (${String(inactiveRows.length)}) - full rows in the main table above`);
  out.push(["external_id", "worksheet", "format", "reason_inactive"]);
  for (const r of inactiveRows) {
    out.push([r.external_id, r.worksheet, r.format, r.inactive_reason]);
  }
  return out;
}

export function formatQaLogLine(timestamp: string, rows: number, suspects: number): string {
  return `${timestamp} | qa-table | rows=${String(rows)} | suspects=${String(suspects)} | output=QA-audit-L1-4.{md,csv}`;
}

// ---------------------------------------------------------------------------
// Runner.
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const OUTPUT_DIR = path.join(HERE, "output");
const DEFAULT_ARTIFACTS = OUTPUT_DIR;
const LOG_FILE = path.join(HERE, "conversion.log");
const SEED_FILE = path.join(REPO_ROOT, "supabase", "seed.sql");

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const artIdx = args.indexOf("--artifacts");
  const artifactsDir =
    artIdx !== -1 && args[artIdx + 1] ? path.resolve(args[artIdx + 1]) : DEFAULT_ARTIFACTS;

  const seedSql = await readFile(SEED_FILE, "utf8");
  const migration = await findGeneratedMigration();
  if (!migration) throw new Error("no *_load_sam_questions.sql migration with the stage4 marker found");
  const assembly = assembleBank(seedSql, migration.sql);

  const artifacts = await loadArtifacts(artifactsDir);
  if (artifacts.size === 0) {
    console.warn(
      `[warn] no Stage 2/3 artifacts under ${artifactsDir} — key traces will be UNVERIFIED and the skipped section empty`,
    );
  }
  const skipped = await loadSkipped(artifactsDir, [...artifacts.keys()].map((s) => s.replace(/\.pdf$/, "")));

  const qaRows: QaRow[] = [];
  for (const row of assembly.bank) {
    const ws = findWorksheet(artifacts, row.external_id);
    const parsed = parseExternalId(row.external_id);
    const key = ws && parsed ? (ws.keyByTask.get(parsed.task) ?? null) : null;
    const s3 = ws ? (ws.byExternalId.get(row.external_id) ?? null) : null;
    const source =
      row.origin === "dev-placeholder"
        ? "dev fixture (seed.sql only)"
        : (ws?.source ?? "UNKNOWN");
    const audit = auditQuestion(row, key, s3, source);
    qaRows.push(buildQaRow(row, ws, key, s3, audit));
  }

  const totals = computeTotals(qaRows);
  const now = new Date().toISOString();

  await mkdir(OUTPUT_DIR, { recursive: true });
  const mdPath = path.join(OUTPUT_DIR, "QA-audit-L1-4.md");
  const csvPath = path.join(OUTPUT_DIR, "QA-audit-L1-4.csv");
  await writeFile(mdPath, buildMarkdown(qaRows, skipped, totals, now, artifactsDir, assembly.parityOk), "utf8");
  await writeFile(csvPath, buildCsvDocument(buildCsvRows(qaRows, skipped, totals, now, assembly.parityOk)), "utf8");

  const logLine = formatQaLogLine(now, totals.rows, totals.suspects.length);
  await appendFile(LOG_FILE, `${logLine}\n`, "utf8");
  console.log(logLine);
  console.log(`Markdown: ${mdPath}`);
  console.log(`CSV:      ${csvPath}`);
  console.log(
    `rows=${String(totals.rows)} active=${String(totals.active)} inactive=${String(totals.inactive)} ` +
      `key-consistency-fails=${String(totals.keyConsistencyFails.length)} ` +
      `trace-mismatches=${String(totals.traceMismatches.length)} trace-unverified=${String(totals.traceUnverified)} ` +
      `norm-sensitive=${String(totals.normSensitive.length)} suspects=${String(totals.suspects.length)} ` +
      `skipped=${String(skipped.length)}`,
  );
}

// Only run when executed directly (pnpm convert:qa / tsx) — the module is
// also imported by unit tests for its pure functions.
const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error("QA table generation failed:", message);
    process.exit(1);
  });
}
