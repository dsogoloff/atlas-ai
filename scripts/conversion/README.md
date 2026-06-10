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
| 3 | **Tag** — AI-assisted: content_key / misconceptions / norm fields | done (DRAFT output) |
| 4 | **Load** — generate the `questions` migration + `seed.sql` mirror | done |

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

## How to run Stage 3

After Stage 2 has produced `output/<worksheet>/stage2-questions.json`:

1. Make sure `docs/sam-v2026-taxonomy.md` is saved in the repo (Stage 3 reads
   its fenced ` ```json ` block as the source of truth for strands /
   sub-strands / levels / content items).
2. Add your Anthropic key to `.env.local` at the repo root:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. From the repo root:
   ```bash
   pnpm convert:tag
   ```

Stage 3 calls the Anthropic API once per question (Claude Sonnet 4.6,
identifier `claude-sonnet-4-6` — reused from
`src/lib/report/narration/llmClient.ts`'s Gateway model string), passing the
question, the answer key, the verbatim Evaluation Results table, the
taxonomy content items for the worksheet's level (± 1), and the 21-code
misconception vocabulary. The model returns a single JSON object with
`content_key`, `format`, clean `stem`, `options` + `correct_index` for MC
(or `correct_answer` for the other formats), `distractor_misconceptions`,
`misconception_tags`, `operation_type` / `num_operations` /
`representation`, `difficulty_seed`, `image_required` + `image_alt`,
`confidence`, `reasoning`, and `review_flags`.

The script then validates the response (content_key must exist, codes must
be in the 21, format ↔ correct_answer agreement, …) and folds any
violations into `review_flags`. It derives `external_id`
(`SAM-L<n>-Q<NN>`), `sub_strand`, `strand`, and `word_count` from the
taxonomy and the final stem. Outputs in each worksheet folder:

- `stage3-tagged.json` — machine-readable, one record per question
- `stage3-review.md` — human-readable review sheet (the founder's gate)

**Output is DRAFT for human review.** No DB writes. Per-question failures
log the error and continue — Stage 3 never aborts a worksheet because of a
single bad call.

**Per-level sequential runs (skip-existing).** The pipeline is run
level-by-level (L1 → L4) with all earlier levels still present in
`output/`. Stage 3 therefore SKIPS any worksheet folder that already has a
`stage3-tagged.json` (`[skip] <folder> — stage3-tagged.json exists`), so
re-running never re-spends API calls on — or silently re-tags — worksheets
that were already tagged and loaded. Pass `--force` to re-tag everything,
or `--only "<folder-name>"` to restrict the run to a single output folder
(both pass straight through: `pnpm convert:tag --force`). Stage 2 applies
the same guard on `stage2-questions.json` (`pnpm convert:segment --force`
re-segments).

## How to run Stage 4

After Stage 3 has produced `output/<worksheet>/stage3-tagged.json` (and the
founder has reviewed `stage3-review.md`):

```bash
pnpm convert:load
```

No stage3 outputs → clear message, exit 0 (same convention as Stage 1).

Stage 4 validates every tagged record (content_key must exist in the
`docs/sam-v2026-taxonomy.md` §7 taxonomy, format ↔ answer agreement, the
four NOT-NULL norm fields, DRAG_DROP mappability, and every misconception
code) and emits:

- `supabase/migrations/<timestamp>_load_sam_questions.sql` — the questions
  INSERT in the established tenant-CTE pattern, `content_id` resolved at
  insert time via `tax_content.code = <content_key>`. **Prod path.**
- `supabase/seed.sql` — the identical INSERT mirrored between
  `-- BEGIN/END stage4-generated-questions` markers (AGENTS.md §11: the
  migration is a no-op on dev reset because migrations run before seed.sql
  creates the tenant; the seed mirror is the dev/CI path).
- `output/<worksheet>/stage4-skipped.json` — records that failed
  validation, with reasons. Skips never abort the run.
- `output/<worksheet>/stage4-upload-manifest.json` — image staging record
  (below).
- one `stage4` load-report line per worksheet in `conversion.log`:
  `loaded= content_id= review_flags= inactive_image= images_uploaded=
  images_deferred= skipped= (per-category breakdown)`.

**Misconception-code validation.** Every code in `misconception_tags` and
in `distractor_misconceptions` values must be one of the 21 codes seeded
into the `misconceptions` table (`supabase/seed.sql` "Misconception
taxonomy" insert; mirrored by migrations `20260509000000` and
`20260511000000`). The seeded set is parsed from seed.sql at run time and
cross-checked against `KNOWN_MISCONCEPTION_CODES` in `stage4-load.ts`
(drift aborts the run; a unit test also pins the two together). A record
referencing an unknown code goes to the skip list with a `console.error`
naming the code + external_id and is counted under
`unknown-misconception-code` in the load report — codes are never silently
dropped and never invented.

Column mapping (decided + documented in the Stage 4 PR): old `strand` enum
derived from the record's V2026 sub_strand (word-problem arithmetic in
`whole_numbers`/`money` → `operations_algorithms`, per the hand-seeded
SAM-L2-Q11/Q14/Q17 precedent); `level` (half-grade) derived from
`difficulty_seed` via a band-cut table anchored on the hand-seeded L2
difficulty ranges (a documented tunable in `stage4-load.ts`); DRAG_DROP
`items`/`correct_order` synthesized from Stage 3's `correct_answer` string
plus the stem (unmappable → skip list).

**Image staging.** `image_required=true` questions load with
`is_active=false`, carry `image_alt` in content jsonb, and get **no**
`image_path` — Stage 1 renders whole PAGES, and a full page would leak
neighboring questions/answers to the child, so it must never become the
displayed question image. The question's source-page PNGs are uploaded to
the private `question-images` bucket under
`conversion-staging/<external_id>/page-NN.png` as curation source material
(creds: `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY`, from `.env.local` or the environment). When
creds or the local stack are unavailable, uploads are skipped with a clear
message and the manifest records every pending upload — re-run
`pnpm convert:load` to retry. Upload staging is per-question best-effort:
a missing page render or a failed upload logs an error, defers that entry
to the manifest, and never blocks the batch — the question row still loads
(inactive) either way. Activating an image question is a separate,
manual curation step (curated crop → bucket → `image_path` → flip
`is_active`).

**Idempotency.** Re-running replaces the seed.sql marker block (never
duplicates, never touches hand-written blocks), rewrites the existing
generated migration in place (found by its `-- stage4-load:generated-migration`
marker rather than creating a second file), and uploads with `upsert`. The
DB layer is additionally protected by
`on conflict (tenant_id, external_id) do nothing`.

Unit tests for the pure mapping/SQL functions live at
`src/lib/taxonomy/stage4-load.test.ts` (vitest only discovers `src/**`).

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
- `@anthropic-ai/sdk` — direct Anthropic Messages API client used by Stage
  3. Reads `ANTHROPIC_API_KEY` from `.env.local`. Model identifier
  `claude-sonnet-4-6`.
- `tsx` — runs the TypeScript scripts directly.

All are dev dependencies. Run `pnpm install` if missing.
