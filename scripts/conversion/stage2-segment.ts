// Atlas Assessment — conversion pipeline Stage 2.
//
// Reads every Stage 1 extraction.json under scripts/conversion/output/,
// classifies each as WORKSHEET or ANSWER_KEY, pairs them by level label,
// segments worksheets into individual questions, parses answer keys, and
// emits stage2-questions.json in each worksheet's output folder.
//
// Output is DRAFT — best-effort heuristic parsing only. Stage 3 (tag) will
// reconcile against the real S.A.M. content and apply misconception/strand
// classifications. Anything ambiguous here gets a *_guess field or a null
// and a warning to console + conversion.log.
//
// Run via: pnpm convert:segment

import { access, appendFile, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

interface Stage1Page {
  page: number;
  image: string;
  text: string;
}

export interface Stage1Extraction {
  source: string;
  extractedAt: string;
  pageCount: number;
  pages: Stage1Page[];
}

type DocKind = "WORKSHEET" | "ANSWER_KEY";

interface ClassifiedDoc {
  folder: string;
  extraction: Stage1Extraction;
  kind: DocKind;
  levelLabel: string | null;
}

type FormatGuess = "MULTIPLE_CHOICE" | "NUMERIC_ENTRY" | "DRAG_DROP" | "UNKNOWN";
type AnswerKind = "OPTION" | "VALUE";

export interface AnswerEntry {
  raw_answer: string;
  answer_kind: AnswerKind;
  answer_value: string | number | null;
}

interface EvalKeyEntry {
  task_number: number;
  concepts_and_skills: string | null;
  topic: string | null;
  level: number | null;
}

interface QuestionRecord {
  task_number: number;
  pages: number[];
  page_images: string[];
  raw_text: string;
  stem_guess: string;
  format_guess: FormatGuess;
  options_guess?: string[];
  image_likely: boolean;
  eval_key: EvalKeyEntry | null;
  correct_answer:
    | (AnswerEntry & { source: "answer_key" })
    | null;
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
  questions: QuestionRecord[];
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(HERE, "output");
const LOG_FILE = path.join(HERE, "conversion.log");

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const warnings: string[] = [];

function warn(message: string): void {
  warnings.push(message);
  console.warn(`  [warn] ${message}`);
}

async function appendAuditLine(
  source: string,
  questionCount: number,
  answerKeySource: string | null,
): Promise<void> {
  const keyPart = answerKeySource ?? "none";
  const line = `${new Date().toISOString()} | stage2 | ${source} | ${questionCount} questions | key: ${keyPart}\n`;
  await appendFile(LOG_FILE, line, "utf8");
}

// ---------------------------------------------------------------------------
// 1. Discover + classify Stage 1 outputs
// ---------------------------------------------------------------------------

async function discoverDocs(): Promise<ClassifiedDoc[]> {
  const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
  const docs: ClassifiedDoc[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const extractionPath = path.join(OUTPUT_DIR, entry.name, "extraction.json");
    let raw: string;
    try {
      raw = await readFile(extractionPath, "utf8");
    } catch {
      continue; // folder without extraction.json — skip silently
    }
    const extraction = JSON.parse(raw) as Stage1Extraction;
    const kind = classifyKind(extraction);
    const levelLabel = extractLevelLabel(extraction);
    docs.push({ folder: entry.name, extraction, kind, levelLabel });
  }
  return docs;
}

function classifyKind(extraction: Stage1Extraction): DocKind {
  if (/answer\s*key/i.test(extraction.source)) return "ANSWER_KEY";
  const page1 = extraction.pages[0]?.text ?? "";
  if (/answer\s*key/i.test(page1)) return "ANSWER_KEY";
  return "WORKSHEET";
}

// "Level <n>" or the Kindergarten labels "Level 0A/0B/0C" (observed verbatim
// on the 0A/0B/0C worksheet covers and answer-key headers). The 0A|0B|0C
// alternatives come first so "Level 0A" captures "0A", not "0".
const LEVEL_LABEL = /\bLevel\s+(0A|0B|0C|\d+)\b/i;

export function parseLevelLabel(text: string): string | null {
  const m = LEVEL_LABEL.exec(text);
  return m ? `Level ${m[1].toUpperCase()}` : null;
}

function extractLevelLabel(extraction: Stage1Extraction): string | null {
  // Probe pages for the level label — matches both worksheet covers and the
  // answer-key header.
  for (const p of extraction.pages) {
    const label = parseLevelLabel(p.text);
    if (label) return label;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Pair worksheets with answer keys by level label
// ---------------------------------------------------------------------------

function pairDocs(docs: ClassifiedDoc[]): Map<string, ClassifiedDoc | null> {
  const worksheets = docs.filter((d) => d.kind === "WORKSHEET");
  const keys = docs.filter((d) => d.kind === "ANSWER_KEY");
  const pairing = new Map<string, ClassifiedDoc | null>();

  for (const ws of worksheets) {
    // Prefer label match; otherwise if 1:1 worksheets:keys, pair anyway.
    let match: ClassifiedDoc | undefined;
    if (ws.levelLabel) {
      match = keys.find((k) => k.levelLabel === ws.levelLabel);
    }
    if (!match && worksheets.length === 1 && keys.length === 1) {
      match = keys[0];
    }
    pairing.set(ws.folder, match ?? null);
  }
  return pairing;
}

// ---------------------------------------------------------------------------
// 3. Parse the answer key
// ---------------------------------------------------------------------------

// Mathematical Alphanumeric Symbols digits (U+1D7CE..U+1D7FF): bold,
// double-struck, sans-serif, sans-serif bold, monospace — each a run of
// ten code points 0..9. Answer keys occasionally render fraction digits
// in mathematical bold (e.g. 𝟒/𝟗); normalize them to ASCII.
export function normalizeMathDigits(text: string): string {
  return text.replace(/[\u{1D7CE}-\u{1D7FF}]/gu, (ch) => {
    const cp = ch.codePointAt(0) as number;
    return String((cp - 0x1d7ce) % 10);
  });
}

const TAB_TABLE_HEADER = /Task\s*\t.*Answer.*Task\s*\t.*Answer/i;
// "N." followed by whitespace then the answer, or by end-of-line (empty
// answer, e.g. L3 task 16). A tab may appear after the period ("10. \t1").
// Decimal-looking lines ("1.5") do NOT match — no separator after the dot.
const NUMBERED_TASK = /^\s*(\d+)\.(?:[ \t]+(.*))?$/;

type AnswerKeyFormat = "TAB_TABLE" | "NUMBERED_LIST";

function detectAnswerKeyFormat(lines: string[]): AnswerKeyFormat {
  if (lines.some((l) => TAB_TABLE_HEADER.test(l))) return "TAB_TABLE";
  const numbered = lines.filter((l) => NUMBERED_TASK.test(l)).length;
  return numbered >= 3 ? "NUMBERED_LIST" : "TAB_TABLE";
}

export function parseAnswerKey(
  keyExtraction: Stage1Extraction,
): { raw: string; byTask: Map<number, AnswerEntry> } {
  const raw = keyExtraction.pages.map((p) => p.text).join("\n");
  const lines = raw.split("\n").map((l) => l.replace(/\r$/, ""));
  const byTask =
    detectAnswerKeyFormat(lines) === "NUMBERED_LIST"
      ? parseNumberedListKey(lines)
      : parseTabTableKey(lines);
  return { raw, byTask };
}

// --- Format B: single-column numbered list ("1. 3" / "2. Five hundred...").
// Seen first on the Level 3 key. Quirks handled: tab after the period
// ("10. \t1"); stacked bold-digit fractions (numerator line(s) above
// denominator line(s) — "𝟒" / "𝟗" -> 4/9); genuinely empty answers
// ("16." with nothing after) -> no entry -> downstream missing-entry
// warning; trailing footer text ("Seriously Addictive Maths") not absorbed.

const KEY_NOISE =
  /Seriously\s+Addictive|Placement\s+Worksheet|Copyright|copyright owner|Answer\s*Key/i;
// Continuation lines we trust as answer content: digits (already
// normalized), whitespace, and number punctuation only.
const NUMERIC_CONTINUATION = /^[\d\s.,/$–—-]+$/;

function parseNumberedListKey(lines: string[]): Map<number, AnswerEntry> {
  const byTask = new Map<number, AnswerEntry>();
  let pending: { task: number; parts: string[] } | null = null;

  function commitPending(): void {
    if (!pending) return;
    const parts = pending.parts.map((p) => p.trim()).filter((p) => p.length > 0);
    // Empty answer (e.g. L3 task 16): no entry — surfaces downstream as the
    // normal "answer key missing entry for task N" warning.
    if (parts.length > 0) {
      byTask.set(pending.task, buildNumberedListEntry(parts));
    }
    pending = null;
  }

  for (const rawLine of lines) {
    const line = normalizeMathDigits(rawLine);
    if (line.trim().length === 0) continue;

    const task = NUMBERED_TASK.exec(line);
    if (task) {
      commitPending();
      const rest = (task[2] ?? "").trim();
      pending = { task: Number(task[1]), parts: rest.length > 0 ? [rest] : [] };
      continue;
    }
    if (!pending) continue; // header/page-number noise before the first task

    const trimmed = line.trim();
    if (KEY_NOISE.test(trimmed) || !NUMERIC_CONTINUATION.test(trimmed)) {
      // Obvious non-answer text (footer/header) — close the open entry and
      // drop the line. It stays in answer_key_raw for human review.
      commitPending();
      continue;
    }
    pending.parts.push(trimmed);
  }
  commitPending();
  return byTask;
}

function buildNumberedListEntry(parts: string[]): AnswerEntry {
  // Stacked fraction reconstruction: when an answer wraps as bare numeric
  // lines, the line break is the fraction bar. "4" / "9" -> "4/9";
  // "2" / "11 , 6" / "11 , 9" / "11 , 10" / "11" -> "2/11, 6/11, 9/11, 10/11".
  if (parts.length >= 2 && parts.every((p) => /^[\d\s,]+$/.test(p))) {
    const value = parts
      .map((p) => p.replace(/\s+/g, " ").trim())
      .join("/")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s*\/\s*/g, "/");
    return {
      raw_answer: parts.join("\n"),
      answer_kind: "VALUE",
      answer_value: value,
    };
  }
  return buildAnswerEntry(parts.join("\n").trim());
}

// --- Format A: two-column tab table ("Task\tAnswer\tTask\tAnswer"), as on
// the Level 1/2 keys. Extended (L5/L6/0A/0C keys) with column-DELTA-gated
// rescue shapes: those keys' text layers drop a column's answer entirely or
// merge two tasks' cells onto one line, which the plain fullRow/halfRow
// reading mis-attributes (e.g. L6 "11 \t17" became task 11 = "17").

// Header with one Task/Answer pair (single-column keys, e.g. Level 0B).
const ANY_TABLE_HEADER = /Task\s*\t\s*Answer/i;

const FULL_ROW = /^\s*(\d+)\s*\t\s*(.+?)\s*\t\s*(\d+)\s*\t\s*(.+?)\s*$/;
const HALF_ROW = /^\s*(\d+)\s*\t\s*(.+?)\s*$/;
const BARE_NUM = /^\s*(\d+)\s*$/;
// Rescue shapes — applied ONLY when the document's column delta is known
// (deriveColumnDelta) and the two numbers differ by exactly that delta:
//   "12 \t18 \t(4)"   left answer lost; rest is the right task's answer.
const NUM_NUM_ANSWER_ROW = /^\s*(\d+)\s*\t\s*(\d+)\s*\t\s*(.+?)\s*$/;
//   "3 \t162 000 \t9" right answer wraps to following lines (or is lost).
const TRAILING_TASK_ROW = /^\s*(\d+)\s*\t\s*(.+?)\s*\t\s*(\d+)\s*$/;
//   "11 \t17"         both answers lost from the text layer.
const NUM_NUM_ROW = /^\s*(\d+)\s*\t\s*(\d+)\s*$/;
// "10 3, …" (L5 task 10): the tab between task number and answer came out
// as a space. Only accepted when the number is exactly the smallest task
// not yet seen — continuation prose like "28 apples." must never match.
const SPACE_ROW = /^\s*(\d+) +(\S.*)$/;
// Continuation line carrying the next right-column task inline (L6 task
// 26's fraction continuation merged with task 32's whole row:
// '"# … = 60% \t32 \t59°').
const EMBEDDED_TASK_SPLIT = /^(.*?)\s*\t\s*(\d+)\s*\t\s*(.+?)\s*$/;

// The two-column keys lay tasks out left/right with a constant task-number
// offset per document (L5: right = left + 15; L6: +6; 0A/0C: +1). Derive it
// from the unambiguous fullRow lines; fall back to the rescue shapes when a
// key has no clean fullRow at all (0A). Anything inconsistent -> null, which
// disables every rescue shape (the L1/L2-era behavior).
function deriveColumnDelta(body: string[], twoColumn: boolean): number | null {
  if (!twoColumn) return null;
  const deltas = new Set<number>();
  for (const line of body) {
    const m = FULL_ROW.exec(line);
    if (m) deltas.add(Number(m[3]) - Number(m[1]));
  }
  if (deltas.size === 0) {
    for (const line of body) {
      const nn = NUM_NUM_ANSWER_ROW.exec(line) ?? NUM_NUM_ROW.exec(line);
      if (nn) {
        deltas.add(Number(nn[2]) - Number(nn[1]));
        continue;
      }
      const trail = TRAILING_TASK_ROW.exec(line);
      if (trail) deltas.add(Number(trail[3]) - Number(trail[1]));
    }
  }
  if (deltas.size !== 1) return null;
  const d = [...deltas][0];
  return d > 0 ? d : null;
}

function parseTabTableKey(lines: string[]): Map<number, AnswerEntry> {
  // Find the header "Task ... Answer ..." then iterate the body.
  const headerIdx = lines.findIndex((l) => ANY_TABLE_HEADER.test(l));
  const twoColumn = headerIdx >= 0 && TAB_TABLE_HEADER.test(lines[headerIdx]);
  const body = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines;
  const delta = deriveColumnDelta(body, twoColumn);

  const byTask = new Map<number, AnswerEntry>();
  // Every task number whose row we have seen — including tasks whose answer
  // is absent from the text layer. Drives the SPACE_ROW guard and lets
  // empty commits still mark the task as encountered.
  const started = new Set<number>();

  // Pending multi-line answer accumulator for tasks whose answer wraps
  // onto subsequent lines (Q4 "Ethan is first in the / queue."; Q11
  // "35 – 7 = 28 / Her brother gave her / 28 apples.").
  let pending: { task: number; parts: string[] } | null = null;

  function smallestUnseen(): number {
    let k = 1;
    while (started.has(k)) k += 1;
    return k;
  }

  function openPending(task: number, parts: string[]): { task: number; parts: string[] } {
    started.add(task);
    return { task, parts };
  }

  function commitPending(): void {
    if (!pending) return;
    const raw_answer = pending.parts.join("\n").trim();
    if (raw_answer.length > 0) {
      byTask.set(pending.task, buildAnswerEntry(raw_answer));
    }
    pending = null;
  }

  for (const rawLine of body) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim().length === 0) continue;

    const full = FULL_ROW.exec(line);
    if (full) {
      // First close out any in-progress multi-line answer.
      commitPending();
      const [, n1, a1, n2, a2] = full;
      byTask.set(Number(n1), buildAnswerEntry(a1.trim()));
      started.add(Number(n1));
      // The RIGHT column's answer may continue on the following lines
      // (multi-line worked solutions) — open the continuation accumulator
      // instead of committing immediately.
      pending = openPending(Number(n2), [a2.trim()]);
      continue;
    }

    if (delta !== null) {
      const nna = NUM_NUM_ANSWER_ROW.exec(line);
      if (nna && Number(nna[2]) - Number(nna[1]) === delta) {
        // Left task's answer is lost from the text layer (no entry — it
        // surfaces as the normal missing-entry warning); the line's tail
        // belongs to the right task.
        commitPending();
        started.add(Number(nna[1]));
        pending = openPending(Number(nna[2]), [nna[3].trim()]);
        continue;
      }
      const trail = TRAILING_TASK_ROW.exec(line);
      if (trail && Number(trail[3]) - Number(trail[1]) === delta) {
        commitPending();
        byTask.set(Number(trail[1]), buildAnswerEntry(trail[2].trim()));
        started.add(Number(trail[1]));
        pending = openPending(Number(trail[3]), []);
        continue;
      }
      const nn = NUM_NUM_ROW.exec(line);
      if (nn && Number(nn[2]) - Number(nn[1]) === delta) {
        commitPending();
        started.add(Number(nn[1]));
        pending = openPending(Number(nn[2]), []);
        continue;
      }
    }

    const half = HALF_ROW.exec(line);
    if (half) {
      commitPending();
      pending = openPending(Number(half[1]), [half[2].trim()]);
      continue;
    }
    const bare = BARE_NUM.exec(line);
    if (bare) {
      commitPending();
      pending = openPending(Number(bare[1]), []);
      continue;
    }
    const space = SPACE_ROW.exec(line);
    if (space && Number(space[1]) === smallestUnseen()) {
      commitPending();
      pending = openPending(Number(space[1]), [space[2].trim()]);
      continue;
    }

    if (!pending) continue;
    // Orphan line outside any task would have been skipped above (e.g.
    // stray diagram block "Beth \tDave" after Q22 stays in answer_key_raw
    // for human review). From here on the line belongs to the open entry.

    const trimmed = line.trim();
    // Footer/header noise (e.g. the trailing "Seriously Addictive
    // Maths" line) must not be absorbed into an open accumulator —
    // commit and drop the noise line.
    if (KEY_NOISE.test(trimmed)) {
      commitPending();
      continue;
    }
    if (delta !== null) {
      const emb = EMBEDDED_TASK_SPLIT.exec(line);
      if (emb && Number(emb[2]) === pending.task + delta) {
        if (emb[1].trim().length > 0) pending.parts.push(emb[1].trim());
        commitPending();
        pending = openPending(Number(emb[2]), [emb[3].trim()]);
        continue;
      }
    }
    pending.parts.push(trimmed);
  }
  commitPending();

  return byTask;
}

function buildAnswerEntry(rawAnswer: string): AnswerEntry {
  // OPTION shape: a parenthesised digit, possibly with surrounding whitespace.
  const optionMatch = /^\(\s*(\d+)\s*\)$/.exec(rawAnswer.trim());
  if (optionMatch) {
    return {
      raw_answer: rawAnswer,
      answer_kind: "OPTION",
      answer_value: Number(optionMatch[1]),
    };
  }
  return {
    raw_answer: rawAnswer,
    answer_kind: "VALUE",
    answer_value: cleanValue(rawAnswer),
  };
}

function cleanValue(rawAnswer: string): string | null {
  // Strip worked-solution prose. Heuristics:
  //   * "35 – 7 = 28\nHer brother gave her\n28 apples." -> "28" (last number)
  //   * "Ninety-six" -> "Ninety-six" (single short word/phrase, no maths)
  //   * "9, 68, 81" -> "9, 68, 81"
  //   * "716, 708, 652, 629" -> "716, 708, 652, 629"
  //   * "$16" or "16" -> "16"
  //   * "780\nBeth \tDave..." -> "780" (first bare-number line; the rest is
  //     a stray diagram/footer block that bled into Q22's accumulator)
  //   * "Ethan is first in the\nqueue." -> null (prose-only, no clean value)
  for (const line of rawAnswer.split("\n")) {
    const trimmed = line.trim();
    if (/^\$?-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return trimmed.replace(/^\$/, "");
    }
    // Space-grouped thousands ("162 000", "2 000 000" — the S.A.M. number
    // style on the L5/L6 keys): collapse the group separators.
    if (/^\$?-?\d{1,3}(?: \d{3})+$/.test(trimmed)) {
      return trimmed.replace(/^\$/, "").replace(/ /g, "");
    }
  }
  const collapsed = rawAnswer.replace(/\s+/g, " ").trim();

  // Sequence-of-numbers (drag-drop ordering answers).
  if (/^\d[\d,\s]*\d$/.test(collapsed) && /,/.test(collapsed)) {
    return collapsed.replace(/\s+/g, " ");
  }

  // Single bare number (possibly with $ prefix).
  const bare = /^\$?(-?\d+(?:\.\d+)?)$/.exec(collapsed);
  if (bare) return bare[1];

  // "= <number>" or "...= <number>" pattern (worked solution): take the
  // last "= N" then prefer the bare-number line if any later line is
  // just a number.
  const equalsMatch = collapsed.match(/=\s*(\d+(?:\.\d+)?)/g);
  if (equalsMatch && equalsMatch.length > 0) {
    const last = equalsMatch[equalsMatch.length - 1];
    const n = /=\s*(\d+(?:\.\d+)?)/.exec(last);
    if (n) return n[1];
  }

  // Single short word answer (e.g. "Ninety-six"). Heuristic: <= 30 chars,
  // no digits, no period.
  if (
    collapsed.length <= 30 &&
    !/\d/.test(collapsed) &&
    !/\./.test(collapsed) &&
    /^[A-Za-z][A-Za-z\- ]*$/.test(collapsed)
  ) {
    return collapsed;
  }

  return null;
}

// ---------------------------------------------------------------------------
// 4. Boilerplate strip + non-question-page classification
// ---------------------------------------------------------------------------

type PageKind = "CONTENT" | "COVER" | "INSTRUCTIONS" | "EVAL_RESULTS";

interface CleanedPage {
  page: number;
  image: string;
  kind: PageKind;
  text: string; // boilerplate already removed
  rawText: string; // original
}

function stripBoilerplate(rawText: string): string {
  const lines = rawText.split("\n");
  const out: string[] = [];

  let i = 0;
  // Copyright block: 3 lines from "Copyright ©" through "permission of the
  // copyright owner.". Stripped by pattern, not by fixed count.
  if (i < lines.length && /Copyright\s+©/.test(lines[i])) {
    while (i < lines.length) {
      const consumed = lines[i];
      i += 1;
      if (/permission of the copyright owner\./i.test(consumed)) break;
    }
  }

  // Running header: "Level <n>" (or 0A/0B/0C) then "Placement Worksheet"
  // (L5 prints "Placement Worksheet WS") then bare page number, in that
  // order, immediately after the copyright block. Strip each only if it
  // matches.
  if (i < lines.length && /^Level\s+(?:0A|0B|0C|\d+)$/i.test(lines[i].trim())) i += 1;
  if (i < lines.length && /^Placement\s+Worksheet(?:\s+WS)?$/.test(lines[i].trim())) i += 1;
  if (i < lines.length && /^\d+$/.test(lines[i].trim())) i += 1;

  for (; i < lines.length; i += 1) out.push(lines[i]);
  return out.join("\n");
}

function classifyPage(text: string): PageKind {
  if (/^\s*Instructions\s*$/m.test(text)) return "INSTRUCTIONS";
  if (/Evaluation\s+Results/i.test(text)) return "EVAL_RESULTS";
  if (/Recommended\s+for\s+ages/i.test(text)) return "COVER";
  if (/Name:.*Date:/s.test(text) && /Time:/.test(text)) return "COVER";
  return "CONTENT";
}

function cleanWorksheetPages(extraction: Stage1Extraction): CleanedPage[] {
  return extraction.pages.map((p) => {
    const stripped = stripBoilerplate(p.text);
    return {
      page: p.page,
      image: p.image,
      kind: classifyPage(stripped),
      text: stripped,
      rawText: p.text,
    };
  });
}

// ---------------------------------------------------------------------------
// 5. Segmentation
// ---------------------------------------------------------------------------

interface PageLine {
  page: number;
  image: string;
  line: string;
}

function buildContentStream(pages: CleanedPage[]): PageLine[] {
  const out: PageLine[] = [];
  for (const p of pages) {
    if (p.kind !== "CONTENT") continue;
    for (const line of p.text.split("\n")) {
      out.push({ page: p.page, image: p.image, line });
    }
  }
  return out;
}

// Task-stem opener "N. " — tolerates a single space/tab between the number
// and the period: the L5 worksheet prints task 2 as "2 . Which is greater…"
// (PDF text layer inserts a space), which the strict form missed, dropping
// the whole task. Decimal-looking lines ("3.716, …") still do NOT match —
// the period must be followed by whitespace.
export const QUESTION_MARKER = /^\s*(\d+)[ \t]?\.\s/;

export interface SegmentedQuestion {
  task_number: number;
  pages: number[];
  page_images: string[];
  raw_text: string;
}

function segmentQuestions(stream: PageLine[]): SegmentedQuestion[] {
  const segments: SegmentedQuestion[] = [];
  let current: SegmentedQuestion | null = null;
  const seenPages = new Set<number>();

  function pushCurrent(): void {
    if (!current) return;
    current.raw_text = current.raw_text.replace(/\s+$/g, "");
    segments.push(current);
    current = null;
  }

  for (const entry of stream) {
    const match = QUESTION_MARKER.exec(entry.line);
    if (match) {
      pushCurrent();
      seenPages.clear();
      current = {
        task_number: Number(match[1]),
        pages: [entry.page],
        page_images: [entry.image],
        raw_text: `${entry.line}\n`,
      };
      seenPages.add(entry.page);
      continue;
    }
    if (!current) continue; // text before first question marker; drop
    if (!seenPages.has(entry.page)) {
      current.pages.push(entry.page);
      current.page_images.push(entry.image);
      seenPages.add(entry.page);
    }
    current.raw_text += `${entry.line}\n`;
  }
  pushCurrent();

  // Sequence validation: warn on gaps or repeats; do not crash.
  for (let i = 0; i < segments.length; i += 1) {
    const expected = i + 1;
    if (segments[i].task_number !== expected) {
      warn(
        `task sequence: expected ${expected} at index ${i}, got ${segments[i].task_number}`,
      );
    }
  }
  return segments;
}

// ---------------------------------------------------------------------------
// 5b. Orphan option-block re-attribution (root-cause memo M2).
//
// PDF text reading order can emit a task's option block AFTER the next
// task's stem opener (observed twice: L3 page 14, where task 22's
// "(1) 1000 … (4) 9999 ( )" landed inside task 23's block; L3 page 4,
// same shape for tasks 3/4). Segmentation then attributes the options to
// the WRONG task: the real MC task loses its options and the absorbing
// task fails downstream checks.
//
// Observed orphan signature (deliberately conservative — both real cases
// match all conditions, and a legitimate MC task matches none):
//   1. Inside a task block, a CONTIGUOUS run of option-marker lines whose
//      markers are exactly (1)..(4) in order…
//   2. …immediately preceded by an "Answer:" line — a genuine MC task in
//      these worksheets never prints "Answer:" before its options (it
//      uses the trailing "( )" circle instead), while a numeric/ordering
//      task's own block ends at its answer blank.
//   3. The PREVIOUS task shares a page with the current one and contains
//      NO option markers of its own (it is exactly the option-less task
//      the orphan block belongs to).
// When all three hold, the run is moved to the end of the previous task's
// raw_text. (The hypothesized "block BEGINS with option markers" shape
// cannot occur: segmentation only opens a block at an "N." stem line.)
// Mutates `segments` in place; returns the moves for warn() reporting.
// ---------------------------------------------------------------------------

const OPTION_MARKER_LINE = /^\s*\(\s*\d\s*\)/;
const ANSWER_LABEL_LINE = /^\s*Answer\s*:/i;

export interface OptionBlockMove {
  from_task: number;
  to_task: number;
  lines: string[];
}

export function reattributeOrphanOptionBlocks(
  segments: SegmentedQuestion[],
): OptionBlockMove[] {
  const moves: OptionBlockMove[] = [];
  for (let s = 1; s < segments.length; s += 1) {
    const current = segments[s];
    const previous = segments[s - 1];

    // Condition 3 — previous task: shares a page, has no option markers.
    if (!previous.pages.some((p) => current.pages.includes(p))) continue;
    if (/\(\s*[1-4]\s*\)/.test(previous.raw_text)) continue;

    const lines = current.raw_text.split("\n");

    // Find a contiguous option-marker run immediately after an "Answer:" line.
    let runStart = -1;
    for (let i = 1; i < lines.length; i += 1) {
      if (OPTION_MARKER_LINE.test(lines[i]) && ANSWER_LABEL_LINE.test(lines[i - 1])) {
        runStart = i;
        break;
      }
    }
    if (runStart === -1) continue;
    let runEnd = runStart;
    while (runEnd + 1 < lines.length && OPTION_MARKER_LINE.test(lines[runEnd + 1])) {
      runEnd += 1;
    }
    const run = lines.slice(runStart, runEnd + 1);

    // Condition 1 — the run's markers are exactly (1)..(4), in order.
    const markers = run
      .flatMap((l) => [...l.matchAll(/\(\s*(\d)\s*\)/g)])
      .map((m) => Number(m[1]));
    if (markers.length !== 4 || markers.some((n, i) => n !== i + 1)) continue;

    // Re-attribute: move the run to the end of the previous task's block.
    previous.raw_text = `${previous.raw_text.replace(/\s+$/g, "")}\n${run.join("\n")}`;
    current.raw_text = [...lines.slice(0, runStart), ...lines.slice(runEnd + 1)]
      .join("\n")
      .replace(/\s+$/g, "");
    moves.push({ from_task: current.task_number, to_task: previous.task_number, lines: run });
  }
  return moves;
}

// ---------------------------------------------------------------------------
// 6. Per-question best-effort parse
// ---------------------------------------------------------------------------

const IMAGE_HINT = /\b(picture|graph|figure|clock|do you see)\b|below shows/i;
const MC_MARKERS = /\(\s*[1-4]\s*\)/g;
const DRAG_PHRASE = /Arrange the following numbers/i;
const NUM_ANSWER_PHRASE = /Answer\s*:/i;

interface GuessFields {
  stem_guess: string;
  format_guess: FormatGuess;
  options_guess?: string[];
  image_likely: boolean;
}

function guessFields(rawText: string): GuessFields {
  const image_likely = IMAGE_HINT.test(rawText);
  const hasMc = (rawText.match(MC_MARKERS) ?? []).length >= 2;
  const hasDrag = DRAG_PHRASE.test(rawText);
  const hasNumAnswer = NUM_ANSWER_PHRASE.test(rawText);

  let format_guess: FormatGuess = "UNKNOWN";
  if (hasMc) format_guess = "MULTIPLE_CHOICE";
  else if (hasDrag) format_guess = "DRAG_DROP";
  else if (hasNumAnswer) format_guess = "NUMERIC_ENTRY";

  const stripped = rawText
    // task number prefix "1.\t" (or "2 ." — spaced-period variant, see
    // QUESTION_MARKER)
    .replace(/^\s*\d+[ \t]?\.\s*/, "")
    // answer-key circle marker "( \t)" or "( )" — cut it AND everything
    // after it. Trailing diagram labels (e.g. Q2's "1 / 10 / ?") would
    // otherwise be captured as the tail of the last MC option.
    .replace(/\(\s*\)[\s\S]*$/, "")
    .trim();

  let stem_guess: string;
  let options_guess: string[] | undefined;

  if (format_guess === "MULTIPLE_CHOICE") {
    const parts = stripped.split(/\(\s*[1-4]\s*\)/);
    // parts[0] is the stem (before "(1)"); parts[1..4] are the options.
    stem_guess = (parts[0] ?? "").trim();
    const rawOpts = parts.slice(1, 5).map((o) => o.trim());
    if (rawOpts.length === 4 && rawOpts.every((o) => o.length > 0)) {
      options_guess = rawOpts.map((o) =>
        o.replace(/\(\s*\)$/, "").replace(/\s+/g, " ").trim(),
      );
    }
  } else {
    // Strip everything from "Answer:" onward as best-effort stem.
    const stemPart = stripped.split(/Answer\s*:/i)[0];
    stem_guess = (stemPart ?? stripped).replace(/\s+/g, " ").trim();
  }

  return { stem_guess, format_guess, options_guess, image_likely };
}

// ---------------------------------------------------------------------------
// 7. Evaluation Results parse
// ---------------------------------------------------------------------------

function findEvalResultsText(pages: CleanedPage[]): string | null {
  const evalPage = pages.find((p) => p.kind === "EVAL_RESULTS");
  if (!evalPage) return null;
  return evalPage.text;
}

function parseEvalResults(text: string): Map<number, EvalKeyEntry> {
  const out = new Map<number, EvalKeyEntry>();
  const lines = text.split("\n");
  // The eval table is irregular: some rows have all 4 tab-separated
  // fields, others wrap onto multiple lines. Strategy: walk lines, open
  // a record on a leading digit + tab, then accumulate continuation lines
  // (until the next leading-digit row) and best-effort split tab-separated
  // tail fields.
  let pending: { num: number; buffer: string[] } | null = null;

  function commit(): void {
    if (!pending) return;
    // Join with \t so cross-line continuations stay tab-separable, then
    // split on \t and only THEN normalise inner whitespace inside each cell.
    // (Earlier bug: a /\s+/g collapse before the split killed the tabs.)
    const joined = pending.buffer.join("\t");
    const parts = joined
      .split("\t")
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 0);
    // After split-on-tab, parts is typically:
    //   [concepts]  -> concepts only (topic + level missing)
    //   [concepts, topic]                 -> level missing
    //   [concepts, topic, level]          -> full
    // The level field, when present, is a single digit (1 or 2 in v1 keys).
    let concepts: string | null = null;
    let topic: string | null = null;
    let level: number | null = null;

    if (parts.length >= 1) concepts = parts[0] || null;
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      if (/^\d$/.test(last)) {
        level = Number(last);
        // When the topic wrapped onto multiple lines (e.g. Q4 "Ordinal
        // Numbers\nand Positions"), parts[1..len-2] all belong to the
        // topic field. parts >= 3 -> join everything between concepts
        // and the level cell.
        if (parts.length >= 3) {
          topic = parts.slice(1, -1).join(" ") || null;
        }
      } else {
        topic = parts[parts.length - 1] || null;
      }
    }
    out.set(pending.num, {
      task_number: pending.num,
      concepts_and_skills: concepts,
      topic,
      level,
    });
    pending = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    const m = /^\s*(\d+)\s*\t(.*)$/.exec(line);
    if (m) {
      commit();
      pending = { num: Number(m[1]), buffer: [m[2]] };
    } else if (pending) {
      pending.buffer.push(line);
    }
  }
  commit();
  return out;
}

// ---------------------------------------------------------------------------
// 8. Assemble + consistency check
// ---------------------------------------------------------------------------

function attachAnswer(
  q: SegmentedQuestion,
  guess: GuessFields,
  evalKey: EvalKeyEntry | null,
  ansByTask: Map<number, AnswerEntry>,
): QuestionRecord {
  const ans = ansByTask.get(q.task_number) ?? null;
  let answer_format_mismatch = false;
  if (ans) {
    if (guess.format_guess === "MULTIPLE_CHOICE" && ans.answer_kind !== "OPTION") {
      answer_format_mismatch = true;
      warn(
        `task ${q.task_number}: format_guess=MULTIPLE_CHOICE but answer_kind=${ans.answer_kind}`,
      );
    } else if (
      (guess.format_guess === "NUMERIC_ENTRY" ||
        guess.format_guess === "DRAG_DROP") &&
      ans.answer_kind !== "VALUE"
    ) {
      answer_format_mismatch = true;
      warn(
        `task ${q.task_number}: format_guess=${guess.format_guess} but answer_kind=${ans.answer_kind}`,
      );
    }
  }
  const record: QuestionRecord = {
    task_number: q.task_number,
    pages: q.pages,
    page_images: q.page_images,
    raw_text: q.raw_text,
    stem_guess: guess.stem_guess,
    format_guess: guess.format_guess,
    image_likely: guess.image_likely,
    eval_key: evalKey,
    correct_answer: ans ? { ...ans, source: "answer_key" } : null,
    answer_format_mismatch,
  };
  if (guess.options_guess) record.options_guess = guess.options_guess;
  return record;
}

// ---------------------------------------------------------------------------
// Main per-worksheet flow
// ---------------------------------------------------------------------------

async function processWorksheet(
  ws: ClassifiedDoc,
  key: ClassifiedDoc | null,
): Promise<void> {
  console.log(`\nProcessing ${ws.extraction.source}`);
  if (key) {
    console.log(
      `  paired with answer key: ${key.extraction.source}` +
        (ws.levelLabel ? ` (${ws.levelLabel})` : ""),
    );
  } else {
    console.log(`  no answer key paired — answers will be null`);
  }

  let answer_key_raw: string | null = null;
  let ansByTask = new Map<number, AnswerEntry>();
  if (key) {
    const parsed = parseAnswerKey(key.extraction);
    answer_key_raw = parsed.raw;
    ansByTask = parsed.byTask;
  }

  const cleanedPages = cleanWorksheetPages(ws.extraction);
  const stream = buildContentStream(cleanedPages);
  const segments = segmentQuestions(stream);

  // Re-attach orphan option blocks the PDF reading order misplaced
  // (memo M2 — the L3 Q22/Q23 and Q03/Q04 shape). Loud via warn(), so
  // every move lands in conversion.log for human review.
  for (const move of reattributeOrphanOptionBlocks(segments)) {
    warn(
      `task ${move.from_task}: re-attributed ${move.lines.length} orphan option line(s) ` +
        `to task ${move.to_task} (PDF reading-order interleave)`,
    );
  }

  const evalText = findEvalResultsText(cleanedPages);
  const evalByTask = evalText ? parseEvalResults(evalText) : new Map<number, EvalKeyEntry>();

  const questions = segments.map((seg) => {
    const guess = guessFields(seg.raw_text);
    return attachAnswer(seg, guess, evalByTask.get(seg.task_number) ?? null, ansByTask);
  });

  if (key) {
    const total = segments.length;
    const present = new Set(ansByTask.keys());
    for (let n = 1; n <= total; n += 1) {
      if (!present.has(n)) warn(`answer key missing entry for task ${n}`);
    }
  }

  const output: Stage2Output = {
    source: ws.extraction.source,
    answer_key_source: key?.extraction.source ?? null,
    test_level_label: ws.levelLabel,
    segmentedAt: new Date().toISOString(),
    question_count: questions.length,
    eval_results_raw: evalText,
    answer_key_raw,
    questions,
  };

  const outPath = path.join(OUTPUT_DIR, ws.folder, "stage2-questions.json");
  await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const imageLikelyCount = questions.filter((q) => q.image_likely).length;
  const mismatchCount = questions.filter((q) => q.answer_format_mismatch).length;
  console.log(
    `  questions: ${questions.length}  image_likely: ${imageLikelyCount}  answer_format_mismatch: ${mismatchCount}`,
  );
  console.log(`  -> ${path.relative(process.cwd(), outPath)}`);

  await appendAuditLine(
    ws.extraction.source,
    questions.length,
    key?.extraction.source ?? null,
  );
}

async function main(): Promise<void> {
  const docs = await discoverDocs();
  if (docs.length === 0) {
    console.log(
      `No Stage 1 extractions found under ${path.relative(process.cwd(), OUTPUT_DIR)}/. Run pnpm convert:extract first.`,
    );
    return;
  }

  console.log(`Found ${docs.length} Stage 1 extraction(s):`);
  for (const d of docs) {
    console.log(`  - ${d.folder} [${d.kind}${d.levelLabel ? ` / ${d.levelLabel}` : ""}]`);
  }

  const worksheets = docs.filter((d) => d.kind === "WORKSHEET");
  if (worksheets.length === 0) {
    console.log("No worksheets to segment (only answer keys found).");
    return;
  }

  // Skip-existing guard for per-level sequential runs: Stage 2 is
  // deterministic/free, but re-segmenting rewrites stage2-questions.json and
  // appends duplicate audit lines. `--force` re-segments everything.
  const force = process.argv.includes("--force");
  const pairing = pairDocs(docs);
  let segmented = 0;
  for (const ws of worksheets) {
    const outPath = path.join(OUTPUT_DIR, ws.folder, "stage2-questions.json");
    const exists = await access(outPath).then(() => true, () => false);
    if (!force && exists) {
      console.log(`[skip] ${ws.folder} — stage2-questions.json exists (use --force to re-segment)`);
      continue;
    }
    const key = pairing.get(ws.folder) ?? null;
    await processWorksheet(ws, key);
    segmented += 1;
  }

  console.log(
    `\nStage 2 done: ${segmented} worksheet(s) segmented, ${worksheets.length - segmented} skipped.`,
  );
  if (warnings.length > 0) {
    console.log(`(${warnings.length} warning(s) — see above and conversion.log)`);
    const lines = warnings
      .map((w) => `${new Date().toISOString()} | stage2-warn | ${w}\n`)
      .join("");
    await appendFile(LOG_FILE, lines, "utf8");
  }
}

// Only run when executed directly (pnpm convert:segment / tsx) — the module
// is also imported by unit tests for parseAnswerKey.
const isDirectRun =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error("Stage 2 failed:", message);
    process.exit(1);
  });
}
