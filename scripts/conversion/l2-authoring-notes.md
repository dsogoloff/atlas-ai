# Level 2 authoring — founder handoff notes (lane/l2-authoring)

Authored from `Level_2_Placement_Worksheet.docx` + the founder's pre-exported
`l2-art/` images, into a **separate** overlay `overlay/l2-authoring.json`
(L1 rows untouched). Generated additively via `pnpm convert:apply-l2-overlay`:
migration `supabase/migrations/20260614120000_l2_overlay_load.sql` + a mirrored
`-- BEGIN l2-overlay` block appended to `supabase/seed.sql`. The existing 11
SAM-L2 rows stay byte-for-byte; the applier asserts every emitted statement
references only `SAM-L2-*` ids.

## Result
- **21 ACTIVE** — 11 existing (kept) + **10 new** (Q02, Q03, Q04, Q05, Q08, Q12, Q13, Q15, Q16, Q18)
- **1 HELD** — Q06 (image-option / click-on-image MC; flips active when that input format is wired on lane/answer-input-wiring)
- **0 skipped** (no oral-only or draw-your-own items in L2)

## ⬆ Images you (founder) must upload before the live items render
Bucket: **`question-images`** (private). The object key = the `image_path` value.
ACTIVE image-essential items render a "picture couldn't load / Try again" box
until the file exists. Source files are in `scripts/conversion/input/l2-art/`
(rename on upload to the key below):

| upload as (bucket key) | from | for |
|---|---|---|
| `q-sam-l2-q02-triangles.png` | `L2-2.png` | Q02 count triangles |
| `q-sam-l2-q03-composite-shape.png` | `L2-3.png` | Q03 two shapes |
| `q-sam-l2-q05-seashell-graph.png` | **GENERATED** `output/l2-art-generated/q-sam-l2-q05-seashell-graph.png` | Q05 picture graph |
| `q-sam-l2-q12-toy-car-ruler.png` | `L2-12.png` | Q12 length on ruler |
| `q-sam-l2-q15-clock.png` | `L2-15.png` | Q15 read clock |
| `q-sam-l2-q16-coins.png` | `L2-16.png` | Q16 count money |
| `q-sam-l2-q18-base-ten.png` | `L2-18.png` | Q18 base-ten count |

Q05's graph was **generated** by tiling your single-shell tile (`L2-5.png`) per
the counts you gave (Jimmy 9, Adam 6, Tom 11, Mark 15) — see
`gen_l2_q05_graph.py`. Re-run `python scripts/conversion/gen_l2_q05_graph.py`
to regenerate. (`output/` is gitignored, so the PNG is local-only — it lives in
your worktree at the path above.)

Decorative-only art (NOT required; existing rows unchanged, not attached this
pass): L2-4 bank teller (Q04), L2-10 folders (Q10), L2-11 apples (Q11),
L2-14 birds (Q14).

## QA click-path (live L2 items)
After `supabase db reset` (yours) **and** uploading the 7 images above:
1. Start a fresh assessment for a Grade 1–2 child profile.
2. The picker draws from the active bank; you should be able to reach L2 items
   banded 1A/2A. Verify each renders + grades:
   - **Q03** (MC, image): figure of half-circle + triangle → pick **"half circle and triangle"** → correct.
   - **Q04** (text): the bank-queue logic → type **`Ethan`** (also `ethan` works) → correct.
   - **Q05** (numeric, image): seashell graph → type **`9`** (Mark 15 − Adam 6) → correct.
   - **Q08** (text): "Type 96 in words" → type **`ninety-six`** (or `ninety six`) → correct.
   - **Q12** (numeric, image): car on ruler → type **`7`** → correct.
   - **Q13** (MC): "3 × 4 is" → pick **"4 + 4 + 4"** → correct.
   - **Q15** (MC, image): clock → pick **"2:55 pm"** → correct.
   - **Q16** (MC, image): coins → pick **"85¢"** → correct.
   - **Q18** (numeric, image): base-ten blocks → type **`204`** → correct.
   - **Q02** (MC, image): triangle figure → pick **"5"** → correct.
3. Confirm the picture loads for every image-required item (no red "couldn't
   load" box) — if you see that box, the image isn't uploaded yet.

## Decisions made this pass (all reversible; recorded for the PR)
- **MC answers = option number.** Your answer keys express MC answers as the
  option number (1–4). Stored the app way: `options[]` + `correct_index`
  (0-based); the child taps the option, the server grades by the option's text.
  So "answer 2" → `correct_index: 1`. No typed-number input was introduced.
- **Banding.** The eval table bands Tasks 1–17 → S.A.M. Level 1, Tasks 18–22 →
  Level 2, and gives only an integer (no A/B). New rows: Level 1 → **1A**,
  Level 2 → **2A** (you approved). Existing 11 rows keep their banked
  half-grades (no re-band; the applier can't change level anyway).
- **Q04** — dropped the "In the circles, write the names…" sentence from the
  live stem (your call); live answer is "who is first" = **Ethan**. The
  name-placement task is recorded as the future richer interaction.
- **Q05** — rebuilt the picture graph from your shell tile + counts; answer **9**.
- **Answer keys** confirmed by you in-session: Q02 = 5, Q13 = 4+4+4, Q18 = 204.
  (The L2 answer-key PDF is password-protected; if you later unprotect it I'll
  do a full cross-check, but nothing is blocked on it.)
- **Q04 `content_id` is NULL** — no ordinal/position code exists in the V2026
  taxonomy, so it won't feed the radar sub-strand. Acceptable (many rows are
  NULL); not worth inventing a fake tag.

## Parked / follow-ups (not blocking)
- **Q06 activation** — held until image-option / click-on-image MC input is
  wired (lane/answer-input-wiring). Then: add the format, set the 4 option
  images (`q-sam-l2-q06-opt1..4.png` from `L2-6_1..4.png`; correct = opt3 = 37),
  clear `requires_format_swap`, set `is_active=true`.
- **Misconception tags** — new rows carry minimal/empty `misconception_tags`
  and no `distractor_misconceptions` maps. Enrich later if desired (reversible).
- **Decorative art** — optional; can be attached to Q04/Q10/Q11/Q14 later as
  `image_required=false` if you want the illustrations shown.
