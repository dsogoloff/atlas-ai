# Young-band + L3 QA defects — findings & fixes (2026-06-22)

Founder QA on the short tests. Q-numbers are **served order** (mixes bands); each
defect was pinned to its row **by content** against the source worksheet, cross-checked
with the served-order crosswalk (`build-served-crosswalk.ts`, extended this session with
a band-{0A} child "QA Zero-A"). Every fix was source-verified against the rendered
worksheet page + the last-page Question Summary key **and** every relevant PNG (pages
rendered via `gen_young_qa_stimuli.py`'s Word→PDF→PNG path).

## Served-order → row map (by content)
| founder note | session (band) | served pos | external_id | source task |
|---|---|---|---|---|
| L0A pattern #1 (Q3) | band {0A} (Pre-K age 5) | 3 | **SAM-L0A-Q11** | 0A Task 11 "Look at the pattern" |
| L0A pattern #2 (Q6) | band {0A} | 6 | **SAM-L0B-Q02** | 0B Task 2 "comes next in the pattern" |
| L0A cake (Q5) | band {0A} | 5 | **SAM-L0B-Q03** | 0B Task 3 "part missing from the cake" |
| L0C days-of-week (Q3) | band {0B} (Pre-K) | 3 | **SAM-L0C-Q13** | 0C Task 13 "missing day" |
| L0C fact-family (Q5) | band {0B} | (≈11) | **SAM-L0C-Q04** | 0C Task 4 "complete the fact family" |
| L3 rectangle (Q5) | band {2A,2B} (Grade 3) | 5 | **SAM-L4-Q21** | L4 "area of the rectangle" |

> Note: the founder grouped two band-{0A} pattern items + a band-{0A} L0B cake under
> "L0A", and two band-{0B} L0C items under "L0C" — exactly the served-order-mixes-bands
> caveat. The cake and pattern #2 are L0B rows served in the band-{0A} session.

## Defects & fixes

### SAM-L0A-Q11 — pattern, served pictureless  → FIXED (image wired)
- **Doc:** five flowers red,blue,red,blue,red + a `?` box; "Tap what comes next." →
  answer **blue** (t2). Stem already matches the doc.
- **Root cause:** content carried only the two CHOICE tiles; the repeating pattern strip
  was never wired (no `image_path`). Child saw "Look at the pattern below" with nothing.
- **Fix:** UPDATE content to add `image_path: l0/sam-l0a-q11-stimulus.png` (doc crop).
  Migration `20260622120000` + seed mirror; `SOURCE_MAP` entry added.

### SAM-L0B-Q02 — pattern, served pictureless  → FIXED (image wired)
- **Doc:** magnet,baseball,magnet,baseball,magnet,baseball; "Tap the object that comes
  next" → answer **magnet** (t4). Stem matches the doc.
- **Root cause:** content carried only the four choice tiles; the pattern strip was
  never wired.
- **Fix:** add `image_path: l0/sam-l0b-q02-stimulus.png` (doc crop). Same migration + seed.

### SAM-L0B-Q03 — cake, wrong stimulus  → FIXED (asset re-pointed)
- **Doc:** the cake is shown WITH a triangular wedge missing (gray `?` overlay); four
  triangular pieces are the choices.
- **Root cause:** the wired stimulus key `l0/sam-l0b-q03-stimulus.png` pointed at
  `0B-03_1.png` = the **whole** cake (the choice-set's reference image), so the served
  stem showed a whole cake.
- **Fix:** re-point `SOURCE_MAP[l0/sam-l0b-q03-stimulus.png]` to the doc-faithful crop
  `source/0b/sam-l0b-q03-stimulus.png` (cake-with-wedge). Bucket key unchanged → **no DB
  change**; founder re-uploads on the next image push.

### SAM-L0C-Q13 — days-of-week, missing image + stem mismatch  → FIXED
- **Doc stem (verbatim):** "Read aloud the days of the week from Monday. A part of the
  page is torn. What is the missing day? Tap your answer."
- **Doc image:** open planner — left Mon/Tue/Wed/Thu, right Sat/Sun, the line above
  Saturday torn (Friday gone). **Choices:** "Fryday" vs "Friday" (spelling). Answer Friday.
- **Root cause:** (a) the torn-calendar stimulus was never wired; (b) the stem had been
  reworded into an inline day-list ("…Thursday, ___, Saturday…  Tap the correctly spelled
  missing day") to compensate, with 4 word-tiles (Thursday/Friday/Saturday/Fryday).
- **Fix:** UPDATE content — verbatim stem, wire `l0/sam-l0c-q13-stimulus.png`, reduce to
  the doc's two tiles Friday (correct) / Fryday (reusing existing q13-t2 / q13-t4 word
  crops). Migration + seed mirror; `SOURCE_MAP` entry added.

### SAM-L0C-Q04 — fact-family, rendered blank  → FIXED (re-authored to MULTI_BLANK)
- **Doc (page 6, key Task 4):** "Complete the fact family." with the operands **given**:
  `3+6=▢ 6+3=▢ 9-3=▢ 9-6=▢` (child fills the four results; answers 9, 9, 6, 3). No picture.
- **Root cause:** authored as EQUATION_SET, whose input (`EquationSet.tsx`) renders N
  **fully-blank** number sentences (a/op/b/result all editable, seeded empty) — so the
  given operands never appeared and the grid rendered blank. The operands lived only in
  `content.canonical` (set-equality grading).
- **Fix (no new prefill concept — founder's Option-A path):** re-authored to **MULTI_BLANK**,
  which renders an inline template of `tokens` (text + blank slots). The operands are
  visible `text` tokens; each result is its own `blank` slot. Per-blank numeric grading
  reuses the same answers (`b1=9 b2=9 b3=6 b4=3`). `serialize.ts` serves stem+tokens only
  and never leaks `blanks`. Migration `20260622130000` + seed mirror (overrides the earlier
  EQUATION_SET activation block for this id, last-write-wins).
  > Supersedes the earlier "EQUATION_SET prefill gap" flag — that framing was over-scoped;
  > MULTI_BLANK already provides per-blank slots with the operands shown as text.

### SAM-L4-Q21 — L3-session rectangle, missing dimension labels  → FOUNDER RE-UPLOAD
- **Item:** `SAM-L4-Q21` "What is the area of the rectangle below?" (served in the
  Grade-3 / band {2A,2B} session).
- **Current asset:** bucket key **`l4/sam-l4-q21.png`** ←
  `scripts/conversion/source/4/L4-21.png`. That source crop is a **solid blue rectangle
  with no length/width labels** — so area is unanswerable as served.
- **Action:** founder to re-upload a corrected `L4-21.png` with the dimensions baked in
  (per founder: do NOT overlay/fabricate dimensions). No DB change; once the corrected
  file replaces `source/4/L4-21.png`, re-run the image upload. The numeric answer/options
  in the row are unchanged and were not touched.

## Founder actions after merge
1. Upload the new/changed young-band stimulus images to the private `question-images`
   bucket: `pnpm convert:upload-activation-images` (picks up the 3 new keys + the
   re-pointed cake key from `SOURCE_MAP`).
2. Re-upload a corrected `source/4/L4-21.png` (rectangle WITH dimension labels), then
   re-run the image upload for `l4/sam-l4-q21.png`.
3. `supabase db reset` to apply migrations `20260622120000` + `20260622130000`
   (+ seed mirrors) locally.

(The earlier "EQUATION_SET given/prefill lane" backlog item is RESOLVED — L0C-Q04 is now
fixed via MULTI_BLANK in `20260622130000`; no separate lane needed.)
