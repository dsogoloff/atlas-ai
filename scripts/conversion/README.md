# Question conversion pipeline

Turns S.A.M. placement-test PDFs into question records the Atlas DB can ingest.
This is a standalone CLI tool — **not** wired into the Next.js app, routes, or
build. Run from the repo root.

## The 5 stages

| Stage | Purpose | Status |
|-------|---------|--------|
| 0 | Audit (read-only) — confirm DB shapes and target schema | done |
| 1 | **Extract** — PDF → per-page PNG + per-page text | done |
| 2 | **Segment** — extraction → per-question records + answer-key pairing | done (DRAFT output) |
| 3 | Tag — attach strand / level / misconception codes | not yet |
| 4 | Load — write to `questions` (and mirror to `seed.sql`) | not yet |

## How to run Stage 1

1. Drop one or more `*.pdf` files into `scripts/conversion/input/`.
2. From the repo root:
   ```bash
   pnpm convert:extract
   ```
3. Results land in `scripts/conversion/output/<pdf-basename>/`:
   - `page-01.png`, `page-02.png`, … — page images rendered at ~200 DPI
   - `extraction.json` — `{ source, extractedAt, pageCount, pages: [{ page, image, text }, …] }`
4. One audit line per processed PDF is appended to
   `scripts/conversion/conversion.log` (committed; the I/O directories are not).

Empty input prints a clear message and exits 0. A corrupt or unreadable PDF
is logged with `[fail]` and skipped — the script continues with the rest.

## How to run Stage 2

After Stage 1 has produced `output/<basename>/extraction.json` for each PDF
(both worksheets AND their answer-key PDFs, as separate inputs):

```bash
pnpm convert:segment
```

Stage 2 classifies every `output/*/extraction.json` as `WORKSHEET` or
`ANSWER_KEY`, automatically pairs them by the level label found on page 1
("Level 2", "Level 3", …) — or 1:1 if exactly one of each exists — then
segments the worksheet into per-question records and attaches the answer
key. Output lands in each worksheet's folder as `stage2-questions.json`.
Per-task fields:

- `task_number`, `pages`, `page_images`, `raw_text`
- `stem_guess`, `format_guess` (MULTIPLE_CHOICE / NUMERIC_ENTRY / DRAG_DROP / UNKNOWN), `options_guess` (MC only), `image_likely`
- `eval_key` (from the worksheet's Evaluation Results page)
- `correct_answer` (from the paired answer key)
- `answer_format_mismatch` flag for human review in Stage 3

**Output is DRAFT.** All `*_guess` fields and per-task answer cleaning are
heuristic. Stage 3 will reconcile against the real S.A.M. content and apply
misconception/strand tagging.

## Why `input/` and `output/` are gitignored

Both directories hold **licensed third-party PDF content** (S.A.M. placement
tests) and the renders/extractions derived from them. They must never enter
git history. Only `input/.gitkeep` and the script itself are tracked.

## Dependencies

- `mupdf` — page → PNG render (pure-WASM). Originally tried `pdf-to-img`
  per the brief, but `pdf-to-img@6.1.0` builds pdfjs's `standardFontDataUrl`
  / `cMapUrl` by joining a Windows backslash path with `path/posix`, producing
  mixed-slash strings pdfjs rejects. Fell back to mupdf per the brief.
  `Matrix.scale(200/72, 200/72)` yields ~200 DPI output.
- `pdf-parse` — text-layer extraction per page. `pageJoiner: ''` so the
  per-page text doesn't carry the default `-- N of M --` boundary marker.
- `tsx` — runs the TypeScript script directly.

All three are dev dependencies. Run `pnpm install` if missing.
