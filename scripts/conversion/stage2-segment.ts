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

interface Stage1Extraction {
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

interface AnswerEntry {
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

function extractLevelLabel(extraction: Stage1Extraction): string | null {
  // Probe page 1 for "Level <n>" — matches both worksheet covers and the
  // answer-key header.
  for (const p of extraction.pages) {
    const m = /\bLevel\s+(\d+)\b/.exec(p.text);
    if (m) return `Level ${m[1]}`;
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

function parseAnswerKey(
  keyExtraction: Stage1Extraction,
): { raw: string; byTask: Map<number, AnswerEntry> } {
  const raw = keyExtraction.pages.map((p) => p.text).join("\n");
  const lines = raw.split("\n");

  // Find the header "Task ... Answer ... Task ... Answer" then iterate.
  const headerIdx = lines.findIndex((l) =>
    /Task\s*\t.*Answer.*Task\s*\t.*Answer/i.test(l),
  );
  const body = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines;

  const byTask = new Map<number, AnswerEntry>();

  // Pending multi-line answer accumulator for tasks whose answer wraps
  // onto subsequent lines (Q4 "Ethan is first in the / queue."; Q11
  // "35 – 7 = 28 / Her brother gave her / 28 apples.").
  let pending: { task: number; parts: string[] } | null = null;

  const fullRow = /^\s*(\d+)\s*\t\s*(.+?)\s*\t\s*(\d+)\s*\t\s*(.+?)\s*$/;
  const halfRow = /^\s*(\d+)\s*\t\s*(.+?)\s*$/;
  const bareNum = /^\s*(\d+)\s*$/;
  const isTaskStart = (line: string): boolean =>
    fullRow.test(line) || halfRow.test(line) || bareNum.test(line);

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

    if (isTaskStart(line)) {
      // First close out any in-progress multi-line answer.
      commitPending();

      const full = fullRow.exec(line);
      if (full) {
        const [, n1, a1, n2, a2] = full;
        byTask.set(Number(n1), buildAnswerEntry(a1.trim()));
        byTask.set(Number(n2), buildAnswerEntry(a2.trim()));
        continue;
      }
      const half = halfRow.exec(line);
      if (half) {
        const [, n1, a1] = half;
        pending = { task: Number(n1), parts: [a1.trim()] };
        continue;
      }
      const bare = bareNum.exec(line);
      if (bare) {
        pending = { task: Number(bare[1]), parts: [] };
        continue;
      }
    } else if (pending) {
      pending.parts.push(line.trim());
    }
    // Otherwise: orphan line outside any task (e.g. stray diagram block
    // "Beth \tDave \tAbel / Cary / Ethan" after Q22). Ignore for the
    // task-number map; it stays in answer_key_raw for human review.
  }
  commitPending();

  return { raw, byTask };
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

  // Running header: "Level <n>" then "Placement Worksheet" then bare page
  // number, in that order, immediately after the copyright block. Strip
  // each only if it matches.
  if (i < lines.length && /^Level\s+\d+$/.test(lines[i].trim())) i += 1;
  if (i < lines.length && /^Placement\s+Worksheet$/.test(lines[i].trim())) i += 1;
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

const QUESTION_MARKER = /^\s*(\d+)\.\s/;

interface SegmentedQuestion {
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
    // task number prefix "1.\t"
    .replace(/^\s*\d+\.\s*/, "")
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

main().catch((err: unknown) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error("Stage 2 failed:", message);
  process.exit(1);
});
