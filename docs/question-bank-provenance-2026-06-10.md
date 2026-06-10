# Question-bank provenance report — 2026-06-10

Every question in the loaded bank (active AND inactive), where it came from, and how it
entered. Provenance was determined MECHANICALLY: the bank was parsed out of the committed
SQL (the hand-seeded block in `supabase/seed.sql`, the Stage 4 generated block in
`supabase/migrations/20260610151306_load_sam_questions.sql`, and the dev placeholder
insert), and every row was traced back to its `stage3-tagged.json` record under
`scripts/conversion/output/<worksheet>/`, which carries the source PDF name. Companion
correctness audit: `docs/question-bank-audit-2026-06-10.md` (`pnpm convert:audit`).

## Summary

| origin | rows | active | inactive | source |
|---|---:|---:|---:|---|
| Hand-curated transcription (Item #11) | 11 | 11 | 0 | Level 2 Placement Worksheet.pdf |
| Pipeline Stage 1–4 conversion | 68 | 38 | 30 | Level 1–4 Placement Worksheet PDFs |
| Synthetic dev fixture | 1 | 0 | 1 | none (hand-written placeholder) |
| **Effective bank total** | **80** | **49** | **31** | |

Additionally, 11 pipeline-converted rows were generated but are **shadowed** (never land
in the DB) because their external_ids collide with the hand-seeded rows — see
"'Generated duplicates' clarified" below.

**Every question in the bank traces to a S.A.M. placement-worksheet PDF except the one
dev placeholder.** No AI-authored question content exists anywhere in the bank.

## Red flags

None. Specifically:

* All 79 pipeline-generated rows (68 effective + 11 shadowed) have a matching
  `stage3-tagged.json` record naming a S.A.M. source PDF — zero untraceable rows.
* The generated INSERT is byte-identical between the migration and the seed.sql mirror
  (§11 parity, asserted by the audit script).
* The dev placeholder is the only row with no S.A.M. source, and it is fenced off from
  production (verified below).

(Answer-key CORRECTNESS is a separate question — the companion audit found 19 suspects
that need founder review before the bank is trusted.)

## "Generated duplicates" clarified

The Stage 4 load summary mentioned "generated duplicates". Verified against the
artifacts, this means exactly the following — **it does NOT mean AI-authored content**:

* The pipeline converted the full "Level 2 Placement Worksheet.pdf" (22 questions,
  external_ids `SAM-L2-Q01`…`SAM-L2-Q22`).
* 11 of those external_ids (`Q01, Q07, Q09, Q10, Q11, Q14, Q17, Q19, Q20, Q21, Q22`)
  were ALREADY in the bank — hand-transcribed by the founder workflow from the **same
  PDF** back in Item #11 (migration `20260511000100_sam_l2_content_v1.sql`, mirrored in
  seed.sql).
* Both inserts use `on conflict (tenant_id, external_id) do nothing`, and the
  hand-curated insert runs first on both the prod path (its migration predates the
  Stage 4 migration) and the dev path (its seed block precedes the generated mirror), so
  **the hand-curated versions won**; the 11 pipeline-converted twins never land.
* These are the same physical questions transcribed twice from the same licensed S.A.M.
  PDF — once by hand, once by the pipeline. The audit cross-compared the two
  transcriptions mechanically: **11/11 agree** on options/correct answers (table in
  `docs/question-bank-audit-2026-06-10.md` §"Hand-seeded vs pipeline duplicates"),
  independent evidence that both derive from the same source document.

## Dev placeholder verification

`PLACEHOLDER-Q-IMG-GRID-001` is a synthetic dev fixture (Item #13a Phase 3 visual gate):

* `is_active = false` in its seed.sql insert (verified by parsing the insert).
* It exists ONLY in `supabase/seed.sql` (dev/CI path). No migration inserts it —
  `grep PLACEHOLDER supabase/migrations/` shows only (a) migration
  `20260511000100_sam_l2_content_v1.sql`, which DEACTIVATES any `PLACEHOLDER-Q-%` rows
  in prod, and (b) a comment in `20260610000000_backfill_question_content_ids.sql`. So
  it never ships on the production path.
* The PLACEHOLDER external_id prefix, stem text, and watermarked SVG asset make it
  self-identifying as non-content.

## Full bank table (80 rows)

"How it entered": **hand** = hand-curated transcription, founder-approved Item #11 import
(migration `20260511000100_sam_l2_content_v1.sql` + seed.sql mirror); **pipeline** =
Stage 1–4 conversion (`pnpm convert:extract/segment/tag/load`, migration
`20260610151306_load_sam_questions.sql` + seed.sql mirror). Inactive pipeline rows are
image-essential questions staged with `is_active=false` until a curated per-question
image lands (full-page renders would leak neighboring questions).

| external_id | source (worksheet PDF) | how it entered | active |
|---|---|---|---|
| SAM-L2-Q01 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q07 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q09 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q10 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q11 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q14 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q17 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q19 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q20 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q21 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L2-Q22 | Level 2 Placement Worksheet.pdf | hand (pipeline twin shadowed) | active |
| SAM-L1-Q04 | Level 1 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L1-Q05 | Level 1 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L1-Q10 | Level 1 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L1-Q12 | Level 1 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L1-Q19 | Level 1 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L1-Q20 | Level 1 Placement Worksheet.pdf | pipeline | active |
| SAM-L1-Q21 | Level 1 Placement Worksheet.pdf | pipeline | active |
| SAM-L1-Q22 | Level 1 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L1-Q23 | Level 1 Placement Worksheet.pdf | pipeline | active |
| SAM-L1-Q24 | Level 1 Placement Worksheet.pdf | pipeline | active |
| SAM-L1-Q25 | Level 1 Placement Worksheet.pdf | pipeline | active |
| SAM-L1-Q28 | Level 1 Placement Worksheet.pdf | pipeline | active |
| SAM-L2-Q02 | Level 2 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L2-Q03 | Level 2 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L2-Q04 | Level 2 Placement Worksheet.pdf | pipeline | active |
| SAM-L2-Q05 | Level 2 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L2-Q06 | Level 2 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L2-Q08 | Level 2 Placement Worksheet.pdf | pipeline | active |
| SAM-L2-Q12 | Level 2 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L2-Q13 | Level 2 Placement Worksheet.pdf | pipeline | active |
| SAM-L2-Q15 | Level 2 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L2-Q16 | Level 2 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L2-Q18 | Level 2 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q01 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q02 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q03 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q05 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q06 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q07 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q08 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q09 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q10 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q11 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q12 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q13 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q14 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q15 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q17 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q18 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q19 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q20 | Level 3 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L3-Q21 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L3-Q22 | Level 3 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q01 | Level 4 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L4-Q02 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q03 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q04 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q05 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q06 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q07 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q08 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q09 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q10 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q11 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q12 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q13 | Level 4 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L4-Q14 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q15 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q16 | Level 4 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L4-Q18 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q20 | Level 4 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L4-Q21 | Level 4 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L4-Q22 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q23 | Level 4 Placement Worksheet.pdf | pipeline | inactive |
| SAM-L4-Q24 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q25 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q26 | Level 4 Placement Worksheet.pdf | pipeline | active |
| SAM-L4-Q27 | Level 4 Placement Worksheet.pdf | pipeline | active |
| PLACEHOLDER-Q-IMG-GRID-001 | none — synthetic dev fixture | hand-written in seed.sql only (Item #13a visual gate); never mirrored to a migration | inactive |

Notes:

* Worksheet task numbers missing from the table (e.g. SAM-L1-Q01–Q03, SAM-L3-Q04/Q16/Q23,
  SAM-L4-Q17/Q19) were SKIPPED by Stage 4 validation (unmappable drag-drop answers,
  missing answers, out-of-range indexes — see each worksheet's `stage4-skipped.json`)
  and are NOT in the bank; they are listed here only by omission.
* Counts cross-checked against `scripts/conversion/conversion.log` stage4 lines
  (L1 loaded=12, L2 loaded=22 of which 11 shadowed, L3 loaded=20, L4 loaded=25) and the
  audit run (`checked=80` total).
