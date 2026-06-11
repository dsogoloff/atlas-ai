# Conversion root-cause memo — 2026-06-10

Root-cause diagnosis of the L1–4 question-bank conversion errors. Read-only investigation: no data, content, or code was changed. Evidence: Stage 1–4 artifacts under `scripts/conversion/output/` (gitignored, local), the loaded bank in `supabase/migrations/20260610151306_load_sam_questions.sql`, the pipeline source, and the three prior QA lanes (stage5 audit, B1 MC re-derivation, B3 shortlist).

**The verdict in two sentences:** every traced error originates in deterministic Stage 1/2 parsing (PDF text reading order, the two-column answer-key parser, the answer-cleaning heuristic) or in one bounded Stage 3 emission slip that the model itself announced in its review flags — measured model emission error is 1/71 answers (1 of 31 MC, 0 of 40 numeric). The bank is salvageable with parser fixes plus deterministic Stage 4 gates and a re-run; Stage 3 tagging reliability is **not** the blocker.

---

## 1. The three traces

### SAM-L3-Q11 — wrong answer stored (the one genuinely wrong answer)

| Stage | Evidence (verbatim) | Verdict |
|---|---|---|
| 1 (key extraction) | `11. \t1` | correct |
| 2 (segment/parse) | `"raw_answer": "1", "answer_kind": "VALUE", "answer_value": "1"`; `options_guess: ["9 × 2","9 × 3","9 ÷ 2","6 ÷ 3"]`; `format_guess: MULTIPLE_CHOICE`; `answer_format_mismatch: true` | faithful |
| 3 (model tag) | reasoning: *"The answer key says \"1\", which means option (1), i.e., correct_index = 0 (0-based). 9 × 2 = 18 is correct."* review flag: *"correct_index corrected to 0 (option 1 in answer key = 9×2=18)"* — but emitted field `"correct_index": 1` | **ERROR — reasoning right, emitted field wrong** |
| 4 (load) | `('SAM-L3-Q11', …, '{"stem":"Which of the following is equal to 18?","options":["9 × 2","9 × 3","9 ÷ 2","6 ÷ 3"],"correct_index":1,…}'` | copied the bad field; review flags only counted, never read (stage4-load.ts:1196) |

**Transition where it broke:** Stage 3 reasoning → structured-output emission. **Cause class (b)** model emission error, with a contributing deterministic gap: Stage 4 has no mechanism to act on a review flag that literally states the stored field is wrong. Prior hypothesis **confirmed**.

### SAM-L3-Q22 — format changed MC → numeric (stored value right)

| Stage | Evidence (verbatim) | Verdict |
|---|---|---|
| 1 (worksheet extraction, page 14) | `22. \tWhat is the greatest 4-digit even number?` … `23. What is the missing number in the pattern below.` / `Answer:` / `(1) 1000 \t(2) \t1001` / `(3) 9998 \t(4) \t9999 \t( \t)` — **the options ARE extracted, but the PDF text reading order put them after task 23's stem** | extraction complete but out of order |
| 2 (segment) | Q22 `raw_text` = stem only, `format_guess: UNKNOWN`; the option block landed in **Q23's** `raw_text`; key entry `"raw_answer": "3"` (VALUE) | **ERROR — options attributed to the wrong task** |
| 3 (model tag) | Q22: format NUMERIC_ENTRY, `correct_answer: "9998"`, flags: *"answer key value '3' may indicate option index 3 in an unrecorded MC question — verify format and options"*, *"correct_answer set to 9998 based on mathematical reasoning, not answer key"* | best possible given inputs; loudly flagged |
| 4 (load) | `('SAM-L3-Q22', …, '{"stem":"What is the greatest 4-digit even number?","correct_answer":"9998"}'` | loaded despite the flags |

**Collateral:** SAM-L3-Q23 received Q22's options, the model kept format MC with `correct_index: null` (its key value 1030 matched no option), and Stage 4's structural check skipped it — **Q23 was silently lost from the bank** (visible only in stage4-skipped.json).

**Transition where it broke:** Stage 1 text reading order → Stage 2 line-stream attribution. **Cause class (a)** deterministic. Prior hypothesis **corrected**: Stage 2 did not "miss" options absent from extraction — they were extracted out of order and attached to task 23, which also cost us Q23.

### SAM-L4-Q15 — key truncated; correct value recovered by the model

| Stage | Evidence (verbatim) | Verdict |
|---|---|---|
| 1 (key extraction) | `1 \t(4) \t15 \t5 km 250 m = 5250 m` / `5250 ÷ 3 = 1750` / `1750 = 1 km 750 m` / `Billy had run 1 km 750 m.` — full worked solution present | correct |
| 2 (key parse) | `"raw_answer": "5 km 250 m = 5250 m", "answer_value": "5250"` — `parseTabTableKey`'s fullRow branch (stage2-segment.ts:333-339) commits a right-column answer immediately and opens **no continuation accumulator**, so the next three lines are dropped; `cleanValue`'s last-"=N" heuristic then extracts **5250, the conversion step** | **ERROR — truncation + wrong cleaned value** |
| 3 (model tag) | `correct_answer: "1 km 750 m"`; reasoning: *"The answer key raw value is 5250 (the conversion step), but the actual answer to the question is 1 km 750 m (1750 m)."* + flag *"answer key shows conversion step (5250 m) as the raw value but final answer is 1 km 750 m — verify"* | recovered |
| 4 (load) | `('SAM-L4-Q15', …, '…"correct_answer":"1 km 750 m"}'` | correct value stored |

**Where did Stage 3 get the right value?** Not from the key. `buildUserPrompt` (stage3-tag.ts:533) sends only Stage 2's parsed `correct_answer` entry — `answer_key_raw` is never in the prompt — so the model **could not see** the full worked solution. It re-derived 1 km 750 m by computing 5250 ÷ 3 from the stem. **Transition:** Stage 2 key parse. **Cause class (a)** deterministic. Prior hypothesis **refined**: recovery was independent computation, not "the full key text".

---

## 2. Failure modes and silent exposure

68 effective generated rows (38 active, 30 inactive image-gated); 11 generated rows shadowed by hand-seeded duplicates.

| Mode | Mechanism | Stage | Deterministic or model? | Caught by existing checks? | Silent exposure |
|---|---|---|---|---|---|
| **M1** | Structured-output emission differs from the model's own reasoning | 3 | model | YES — stage5 arithmetic + key-trace and B1 re-derivation both caught Q11 | **0 found.** MC: 1/31 mismatch (Q11), 0 ambiguous. Numeric: emitted answer vs reasoning compared for all 40 loaded NUMERIC_ENTRY rows — 6 non-verbatim hits, all 6 value-consistent on inspection → **0/40 divergence** |
| **M2** | PDF reading-order interleave → Stage 2 attributes option blocks to the wrong task | 1→2 | deterministic | partially — Q22 flagged by key-trace; Q23/Q04 visible as stage4 skips; **Q03 not caught** | loaded victims: SAM-L3-Q22 (format), SAM-L3-Q03 (fabricated options, see M4). Page-marker scan over every loaded non-MC row's pages: **no further orphan option blocks**. Remaining bare-integer-key non-MC rows checked: SAM-L3-Q17 verified genuinely numeric (inactive) |
| **M3** | Answer-key parser defects: fullRow right-column truncation (Q15), task swallowing (`9 \t(4) \t22` absorbed task 22's label+answer into task 9's entry), mojibake cells (task 19 = `!`), cleanValue extracting intermediate "=N" values | 2 | deterministic | mostly — key-trace flagged Q15; L4-Q22 only flagged for answer-format (its key entry was destroyed, so no trace possible); L4-Q19 skipped | 20 loaded rows had worked-solution / multi-line / uncleanable key entries. 4 stored the parser-cleaned value (L3-Q13, L3-Q14, L4-Q07, L4-Q12) — all equal the key's final line, correct. 1 stored a model-derived value with no key cross-check possible: **SAM-L4-Q22** ("9:25 am", verified correct by hand here: 4:15 pm − 6 h 50 min). **0 confirmed wrong, 1 previously unverifiable** |
| **M4** | Model reconstructs content the extractor lost (option text, image-dependent answers) — plausible, ordinal-consistent with the key, so index checks pass | 3 (induced by 1/2 input loss) | model behavior, deterministic trigger | **NO** — audit + B1 verify the index against the key, not the option text; stage3 flags announce it but nothing enforces flags | verbatim-options check across all 26 loaded MC rows: **6 rows** with stored options not present in Stage 2 raw_text. ACTIVE: **SAM-L3-Q03** (printed options are `8 ones / 8 tens / 8 hundreds / 8 thousands` — page 4 text — stored as `8/80/800/8000`: confirmed divergent, value-equivalent), **SAM-L3-Q15** (reconstructed from garbled fractions), **SAM-L4-Q18** (guessed; under the observed digit-substitution cipher option (4) reads 1/23, stored 1/12 — likely wrong option text). INACTIVE (image-gated): SAM-L3-Q10, SAM-L4-Q16, SAM-L4-Q21 |

**Stem fidelity:** mojibake/placeholder scan over all 68 loaded stems: 0 hits; the one known reconstructed stem is SAM-L3-Q15's. Stems are model transcriptions of extracted text, so scale verification needs a one-off vision pass (page render vs stored stem) — the page PNGs already exist in the output folders.

**Image-gated answers:** 13 inactive rows carry answers "assumed from answer key" with the deciding image unseen (L1-Q12, L1-Q22, L2-Q02, L2-Q06, L2-Q16, L3-Q08, L3-Q10, L3-Q12, L3-Q17, L3-Q19, L3-Q20, L4-Q13, L4-Q23). They cannot reach a child until image curation, which is a human step — gated, not silent. Watch item: SAM-L3-Q17's key answer "3" vs its "each symbol = 5 students" scale should be eyeballed at curation.

**Net silent exposure (active, no existing check fires):** **3 rows — SAM-L3-Q03, SAM-L3-Q15, SAM-L4-Q18** (option-text fidelity), plus the now-resolved SAM-L4-Q22 derived answer. No stored *correct answer value* beyond Q11 was found wrong.

---

## 3. The call

**Salvageable — by deterministic fixes plus re-run. Stage 3 reliability is not the blocker.**

Why: (1) the two stages that actually corrupted values/structure — reading-order attribution and the key parser — are plain code, and the corruption is reproducible and fixable; (2) model emission error is low and bounded by existing checks (1/71 emissions, and the one failure was caught twice downstream and announced by the model itself); (3) every model misstep that mattered was *flagged by the model in review_flags* — the pipeline's real gap is that Stage 4 loads rows while ignoring those flags.

Recommended actions, by leverage (recommendations only — no changes made this session):

1. **Stage 4 deterministic gates** (highest leverage, smallest change): (a) reject-to-review any MC row whose stored options are not verbatim (whitespace/mojibake-normalized) in Stage 2 raw_text — would have caught all 6 M4 rows; (b) reject-to-review any row whose review_flags announce a correction/derivation/reconstruction — would have caught Q11, Q22, Q15, Q03, Q18 before load; (c) cross-check stored answer against the parsed key entry at load time instead of post-hoc audit.
2. **Stage 2 key parser**: accumulate right-column continuation lines after a fullRow match; detect swallowed task labels (a bare integer equal to the next expected task number inside an answer cell); make cleanValue prefer the final answer sentence / unit-bearing value over the last bare "=N" (note: even un-truncated, `1750 = 1 km 750 m` cleans to "1" today).
3. **Stage 2 segmentation**: re-attach a trailing `(1)…(4) … ( )` option block to the nearest preceding option-less task on the same page (fixes the Q22/Q23 and Q03/Q04 class; recovers Q23 and Q04 into the bank).
4. **Stage 3 prompt**: include the task's raw key region (or `answer_key_raw`) so truncation is visible to the model; instruct it to never invent option text — emit null + flag instead.
5. **Re-run stages 2→4** with `--force` on the four worksheets, then re-run stage5 audit + B1 as regression checks.
6. **Founder PDF shortlist additions**: SAM-L3-Q03, SAM-L3-Q15, SAM-L4-Q18 (option text), alongside the existing three; SAM-L3-Q17 at image-curation time. A one-off vision pass (stored stem/options vs the existing page PNGs) would retire the transcription-fidelity question for the whole bank.

### Technical appendix — artifact pointers

* Stage 3 prompt assembly: `scripts/conversion/stage3-tag.ts` `buildUserPrompt` (answer key entry only, line 533); flags unenforced at load: `scripts/conversion/stage4-load.ts:1196` (counted into `loadedReviewFlags` only).
* Key parser defect: `scripts/conversion/stage2-segment.ts` `parseTabTableKey` fullRow branch (lines 333–339, no pending accumulator) and `cleanValue` (lines 380–429, last-"=N" heuristic).
* Reading-order evidence: `output/Level 3 Placement Worksheet/extraction.json` pages 4 and 14 (options after the following task's stem); victims in `stage2-questions.json` tasks 3/4 and 22/23.
* Q23/Q04 losses: `output/Level 3 Placement Worksheet/stage4-skipped.json`.
* Emission-rate measurements: B1 (29/31 MATCH, 1 MISMATCH, 0 AMBIGUOUS) `docs/mc-index-rederivation-2026-06-10.md` (atlas-b1-mcindex worktree); numeric 0/40 measured this session against `stage3-tagged.json` reasoning fields.
