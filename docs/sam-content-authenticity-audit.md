# S.A.M. content-authenticity audit — 2026-06-12

**Read-only content-integrity audit.** This document is for the founder and the CONVERSION
session. **No fixes were made by this audit** — it only enumerates which loaded `SAM-*`
question rows had their `content` / `options` / `answer` / `format` / `is_active` touched by
a post-load *fix / reconstruction / mojibake / reclassify / vision-recovery* migration, and
flags rows whose stored content **may not match the source S.A.M. placement-worksheet PDF**.
The question bank itself (the loaded rows, the seed mirror, and any corrective migration) is
**owned by the CONVERSION session** — this audit hands that session a review surface; it does
not change the bank.

Companion docs: `docs/question-bank-provenance-2026-06-10.md` (where each row came from),
`docs/question-bank-audit-2026-06-10.md` (answer-key correctness), and the root-cause memo
`docs/conversion-root-cause-memo-2026-06-10.md`.

## No provenance/rights column exists

The `questions` table has **no provenance, source-PDF, rights, or "model-reconstructed"
column.** Provenance is inferable only from the `external_id` (`SAM-L<level>-Q<task>`) and
from the prose comments inside the load/fix migrations. The schema's only acknowledgement of
provenance is the `external_id` column comment:

> `external_id text,` / `-- S.A.M. catalog ID (when present) for licensing audit and provenance`
> — `supabase/migrations/20260426000000_initial_schema.sql:207-208`

Because there is no rights/authenticity column, "this option text was model-reconstructed and
may not exist in the source PDF" is recorded **only** in migration comments — it is invisible
to any query against `questions`. That is the core integrity gap this audit surfaces.

## Migrations that FIX / RECONSTRUCT / RECLASSIFY existing content

Enumerated by grepping every file under `supabase/migrations/` for content/`is_active`
UPDATEs against `questions` (excluding the two pure-load migrations
`20260610151306_load_sam_questions.sql` and `20260611134158_load_sam_questions.sql`, which
are the *original* load, and the schema/index/backfill migrations that do not touch question
content). The content-touching set is:

| migration | purpose |
|---|---|
| `20260610170000_add_text_entry_format.sql` | enum DDL only — adds `TEXT_ENTRY` to `question_format` (no row data). |
| `20260610170100_reclassify_format_misclassified_questions.sql` | QA Bucket 2 — reclassify 11 mis-formatted ACTIVE rows (mostly format-only; 2 content rebuilds). |
| `20260610180000_fix_sam_question_content.sql` | founder-confirmed content fixes round 1 (L3-Q11 index, L3-Q22 restore-to-MC, L3-Q03 verbatim options). |
| `20260610190000_fix_mojibake_rows.sql` | founder-verified fixes round 2 — the two **mojibake-page** rows (L3-Q15, L4-Q18). |
| `20260611014520_prerun_q4_q15.sql` | pre-conversion data fixes — L2-Q04 deactivate, L3-Q15 → TEXT_ENTRY + reactivate. |
| `20260611140000_reclassify_l6_recovered_text_entry.sql` | reclassify 3 **vision-recovered** L6 fraction answers NUMERIC_ENTRY → TEXT_ENTRY. |

All UPDATEs are tenant-scoped (`inspirea_singapore_math`) and idempotent (guarded on the
pre-change value). Each production migration is mirrored into `supabase/seed.sql` for the
dev/CI path (AGENTS.md §11), so the dev bank reaches the same final state.

## Touched-row table

`is_active` below is the **final** state after tracing the full migration + seed ordering.
"Model-reconstructed?" = does the migration's own comment admit the stored content was
generated/reconstructed/vision-recovered and may not exist verbatim in the source PDF.

| external_id | touched by | what changed | model-reconstructed? (quote) | current is_active |
|---|---|---|---|---|
| SAM-L1-Q20 | `…170100` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **No** — format-only; answer "smaller than" (`…170100:10`) | **active** |
| SAM-L1-Q25 | `…170100` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **No** — format-only (`…170100:11-12`) | **active** |
| SAM-L1-Q28 | `…170100` | format NUMERIC_ENTRY→DRAG_DROP; **content rebuilt** into items[]/correct_order | **Partial** — content reshaped from the parsed key, not new text: "content rebuilt: correct_answer \"10, 17, 20\" becomes items [\"17\",\"20\",\"10\"] … + correct_order [\"10\",\"17\",\"20\"]" (`…170100:13-16,57-70`) | **active** |
| SAM-L2-Q04 | `…170100`, `…014520` | `…170100` format NUMERIC_ENTRY→TEXT_ENTRY; `…014520` **is_active true→false** (image_required) | **No** — format-only; answer "Ethan" (`…170100:17`; `…014520:27-28,43-49`) | **inactive** |
| SAM-L2-Q08 | `…170100` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **No** — answer "Ninety-six" (`…170100:18`) | **active** |
| SAM-L3-Q02 | `…170100` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **No** — answer "Five hundred and eight" (`…170100:19`) | **active** |
| SAM-L3-Q03 | `…180000` | options replaced with verbatim page text | **Yes (now corrected)** — "model reconstructed value-equivalent options … replace the model-reconstructed value-equivalent options with the verbatim printed option text" (`…180000:17,60-74`) | **active** |
| SAM-L3-Q11 | `…180000` | correct_index 1→0; dropped distractor code on new-correct option | **No** — answer-key index fix confirmed by founder (`…180000:13-14,30-42`) | **active** |
| SAM-L3-Q15 | `…180000`(MC, no), `…190000`, `…014520` | `…190000`: MC→NUMERIC_ENTRY, **invented options dropped**, is_active true→false; `…014520`: →TEXT_ENTRY, is_active false→true | **Yes** — "the MC options [\"4/12\",\"6/12\",\"4/6\",\"5/6\"] were model-reconstructed from a mojibake page and do not exist in the source" (`…190000:19-21,32-50`); reactivated (`…014520:29-30,56-64`) | **active** |
| SAM-L3-Q18 | `…170100` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **No** — answer "cylinder" (`…170100:20`) | **active** |
| SAM-L3-Q22 | `…180000` | format NUMERIC_ENTRY→MULTIPLE_CHOICE; options + correct_index added | **No** — "Options transcribed VERBATIM from page-14 extraction text" (`…180000:15-16,44-58`) | **active** |
| SAM-L4-Q15 | `…170100` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **Flagged-suspect** — answer "1 km 750 m" "value contradicts the parsed key trace and is pending founder PDF check" (`…170100:21-23`) | **active** |
| SAM-L4-Q18 | `…190000` | UPDATE pins founder-verified options/index; **no-op on current bank** | **No (verified clean)** — "the stored row already matches verbatim … its divergence guard matches zero rows" (`…190000:22,52-68`) | **active** |
| SAM-L4-Q22 | `…170100` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **No** — answer "9:25 am" (`…170100:24`) | **active** |
| SAM-L4-Q26 | `…170100` | excluded (stays NUMERIC_ENTRY); no change | **No** — "42 800", normalizer already grades it (`…170100:25-27`) | **active** |
| SAM-L4-Q27 | `…170100` | stays NUMERIC_ENTRY; **correct_answer rewritten** + accepted_answers added | **No** — answer-key instruction "Accept 1, 2, 3, 6, 9 or 18"→"1, 2, 3, 6, 9 or 18" + any-of key (`…170100:28-33,72-86`) | **active** |
| SAM-L6-Q09 | `…140000` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **Yes (answer)** — "vision-recovered from the Level 6 answer key (symbol-font fractions the PDF text layer could not extract)"; answer "8 1/28" (`…140000:4-9`) | **active** |
| SAM-L6-Q11 | `…140000` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **Yes (answer)** — same vision-recovery note; answer "88 1/2" (`…140000:4-9`) | **active** |
| SAM-L6-Q12 | `…140000` | format NUMERIC_ENTRY→TEXT_ENTRY; content unchanged | **Yes (answer)** — same vision-recovery note; answer "5/18" (`…140000:4-9`) | **active** |

Migration short-names: `…170100` = `20260610170100_reclassify_format_misclassified_questions.sql`;
`…180000` = `20260610180000_fix_sam_question_content.sql`;
`…190000` = `20260610190000_fix_mojibake_rows.sql`;
`…014520` = `20260611014520_prerun_q4_q15.sql`;
`…140000` = `20260611140000_reclassify_l6_recovered_text_entry.sql`.

## ACTIVE candidates for founder / CONVERSION review against the PDFs

These are **currently `is_active=true`** (i.e. served) AND were touched by a fix/reconstruct/
vision-recovery migration. Ranked by authenticity risk:

**High — content was model-reconstructed or vision-recovered (may not match source verbatim):**
- **SAM-L3-Q15** — MC options were model-reconstructed from a *mojibake page* and "do not
  exist in the source"; now NUMERIC→TEXT_ENTRY `{stem, correct_answer:"4/6"}`. Founder
  checked the PDF (2026-06-10) and the stem/answer are verified; the *dropped* options are
  gone. Re-confirm the stem expression and "4/6" against the printed task. (`…190000`, `…014520`)
- **SAM-L3-Q03** — options were originally model-reconstructed value-equivalents; `…180000`
  replaced them with page-14 verbatim text. Confirm the verbatim option text + key. (`…180000`)
- **SAM-L6-Q09 / Q11 / Q12** — answers (`8 1/28`, `88 1/2`, `5/18`) were **vision-recovered**
  from symbol-font fractions the PDF text layer could not extract — i.e. not from a clean
  text source. Confirm each mixed-number/fraction answer against the L6 answer key. (`…140000`)

**Medium — answer/key flagged-suspect, format/content rebuilt from the parsed key:**
- **SAM-L4-Q15** — answer "1 km 750 m" self-flagged: "value contradicts the parsed key trace
  and is pending founder PDF check (Bucket 3)". Confirm the answer. (`…170100`)
- **SAM-L1-Q28** — DRAG_DROP items/correct_order were rebuilt from the parsed answer key
  (`10, 17, 20`) and the stem order; confirm presentation order + answer key. (`…170100`)
- **SAM-L4-Q27** — stored key was an answer-key instruction ("Accept 1, 2, 3, 6, 9 or 18")
  rewritten into a human-readable key + any-of `accepted_answers`; confirm the accepted set. (`…170100`)
- **SAM-L3-Q22** — restored to MULTIPLE_CHOICE; options "transcribed VERBATIM from page-14
  extraction text" (PDF reading-order scramble); confirm options + key. (`…180000`)
- **SAM-L3-Q11** — `correct_index` 1→0; answer-key/index fix; confirm correct option. (`…180000`)

**Low — verified clean or format-only (content unchanged, answer is plain text from key):**
- SAM-L4-Q18 (founder-verified, UPDATE was a no-op), SAM-L1-Q20, SAM-L1-Q25, SAM-L2-Q08,
  SAM-L3-Q02, SAM-L3-Q18, SAM-L4-Q22, SAM-L4-Q26. These changed format only (or not at all);
  no content was reconstructed.

## Already-deactivated (NOT currently served)

- **SAM-L2-Q04** — `is_active=true→false` in `20260611014520_prerun_q4_q15.sql:43-49`
  (image_required flipped true; needs a curated per-question crop). Its format change to
  TEXT_ENTRY stands but the row is not served. Lower priority for content review until/unless
  it is reactivated with an image.

*(SAM-L3-Q15 was deactivated by `…190000` then reactivated by `…014520`, so its FINAL state
is active — it is listed in the ACTIVE candidates above, not here.)*

## Method notes

- "Current is_active" was traced across the **full** migration ordering plus the seed mirror;
  the only row with a deactivate-then-reactivate path is SAM-L3-Q15 (inactive after `…190000`,
  active again after `…014520`). SAM-L2-Q04 is deactivated and stays deactivated.
- Pure-load migrations (`20260610151306`, `20260611134158`) and schema/index/backfill
  migrations were excluded — they establish the *original* content, not a fix. The L6 rows'
  original load values are in `20260611134158_load_sam_questions.sql:383-405`.
- This audit makes no claim about answer-key *correctness* beyond what the migration comments
  self-report; correctness suspects are in `docs/question-bank-audit-2026-06-10.md`.
