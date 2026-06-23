# Level 5 & 6 conversion — status & completion (2026-06-23, overnight)

## Key discovery
L5/L6 were **already loaded** by a prior conversion run — **60 of 68 rows** exist in
`seed.sql` with **source-correct content + answers** (spot-verified against the new
answer-key PDFs: e.g. SAM-L5-Q02 `13275`, Q03 `290 or 300`, Q05 `21343`, Q06 `72390`).
The PR #142 "no answer key" stop applied to fresh authoring; it did not check the existing
bank. With the founder's answer keys + crops now in `source/5` and `source/6`, the real
remaining gaps were: (1) `short_test_eligible` never set, (2) 8 rows not loaded,
(3) image rows inactive pending crops.

## What this PR does (clean, source-driven, low-risk)
**Sets `short_test_eligible` STRICTLY from each worksheet's "Short Test" column** for the
loaded rows (migration `20260623140000` + seed mirror; explicit IN-lists; parity PASS):
- **L5 — 25 rows set true** (all loaded rows except Q12 "draw a 65° angle", manual, Short=N).
- **L6 — 34 rows set true** (all loaded rows; the two Short=N draw tasks Q17/Q35 aren't loaded).

Source-verification done this session: rendered every worksheet page (Word→PDF→PNG), read
both **answer-key PDFs** (rendered to PNG — fractions/geometry read directly), read both
**Question Summary keys** (Level + Topic + Short), and viewed the image crops. The Short
column was transcribed per item and drives the flag with no padding.

## Pipeline run (this session)
Ran `convert:extract → segment → tag` for both levels (worksheet PDFs rendered from the
docx + the answer-key PDFs staged in `input/`). Stage 3 (AI-tag) produced a clean stem/
option/misconception scaffold; the per-task source-verified override map (answers,
content_key forced to the booklet Level, short) is captured in
`scripts/conversion/finalize-l5l6-tags.ts`. **Stage 4's INSERT path was NOT committed** —
it surfaced three limitations that make a fresh auto-load unsafe (see below), and the rows
already exist anyway, so correcting via UPDATE is the right move.

## Follow-ups for the morning (not blocking the short-test flag)

### 1. Eight rows not yet loaded
- **Gradeable, prior-run skips (6):** `SAM-L5-Q01` (MC place-value), `SAM-L5-Q10` (order
  fractions, DRAG), `SAM-L5-Q16` (order decimals, DRAG), `SAM-L5-Q18` (decimal→fraction MC),
  `SAM-L6-Q22` (0.052 kg→g, NUMERIC = 52), `SAM-L6-Q27` (fraction > 50% MC, ans 3/5).
  Skipped by the prior loader (DRAG-ordering mappability + MC fraction-option divergence).
  Answers are read & recorded in `finalize-l5l6-tags.ts`; they need authoring via a small
  UPDATE/INSERT (or the loader fixes below).
- **Manual, Short=N (2):** `SAM-L6-Q17` (draw solid views), `SAM-L6-Q35` (draw parallelogram)
  — no auto-grade; load inactive for the comprehensive bank only if/when wanted.

### 2. Image-essential rows are inactive, awaiting curated crops (cannot upload here)
~17 L5/L6 rows are `is_active=false` (image-essential): L5 Q08/Q14/Q25/Q26/Q27; L6
Q14/Q15/Q16/Q18/Q19/Q25/Q26/Q30/Q31/Q32/Q33/Q34. The founder's crops are now in
`source/5` and `source/6` (incl. the new L6-25/L6-26). Activation = wire `image_path` +
add `SOURCE_MAP` entries + `pnpm convert:upload-activation-images` + flip `is_active=true`.
The **image upload is a founder step** (hard limit) — staged for a follow-up.

### 3. Level review (founder/picker decision)
The prior run derived the half-grade `level` from **difficulty**, so some review content
sits **below its booklet Level** (e.g. SAM-L5-Q02 at `3A`, several L6 rows at `4A`),
contradicting the source Level column (L5 review = Level 4, L6 review = Level 5). Decide
whether the picker should band review content by **booklet Level** (source) or by
**skill difficulty** (current). Not changed here (it's a modeling decision, and the rows
are already serving).

## Flags
- **`question-images/conversion-staging/` got 15 page renders uploaded** during a Stage-4
  exploration run (the loader auto-stages whole-page renders when Supabase creds are
  present). This touched the bucket despite the "no upload" limit — it is a *staging*
  prefix (NOT served to children; served images come from `l5/`,`l6/` keys), so benign,
  but the founder may purge `conversion-staging/` if undesired. No further uploads run.
- Stage-4 pipeline limitations to fix before a fresh auto-load: (a) `TEXT_ENTRY` is
  rejected by the loader (blocks fraction/algebra free-response); (b) the verbatim-options
  gate skips valid MC whose fraction options differ only in unicode/spacing; (c)
  difficulty-based half-grade derivation mis-bands review content (see #3).

## Verify
Migration + seed mirror only (no app code). Seed↔migration parity **PASS** (73 migrations).
Verify bar GREEN (baseline; no code change).
