# Question conversion pipeline

Turns S.A.M. placement-test PDFs into question records the Atlas DB can ingest.
This is a standalone CLI tool — **not** wired into the Next.js app, routes, or
build. Run from the repo root.

## The 5 stages

| Stage | Purpose | Status |
|-------|---------|--------|
| 0 | Audit (read-only) — confirm DB shapes and target schema | done |
| 1 | **Extract** — PDF → per-page PNG + per-page text | **this script** |
| 2 | Structure — segment pages into individual question records | not yet |
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

## Why `input/` and `output/` are gitignored

Both directories hold **licensed third-party PDF content** (S.A.M. placement
tests) and the renders/extractions derived from them. They must never enter
git history. Only `input/.gitkeep` and the script itself are tracked.

## Dependencies

- `pdf-to-img` — page → PNG render (pdfjs-dist under the hood). `scale = 200/72`
  for ~200 DPI output.
- `pdf-parse` — text-layer extraction per page. `pageJoiner: ''` so the
  per-page text doesn't carry the default `-- N of M --` boundary marker.
- `tsx` — runs the TypeScript script directly.

All three are dev dependencies. Run `pnpm install` if missing.
