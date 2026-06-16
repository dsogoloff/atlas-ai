# L0/L1/L2 held-row activation — founder handoff (lane/l0-l2-activation)

After #71 (three click-image formats) + #77 (serve-time per-tile minting), every answer
format is wired end-to-end. This lane activates the **flip-ready** held rows in one atomic
UPDATE each (real format + full render/answer content + is_active, guarded on is_active=false).

- Migration: `supabase/migrations/20260617120000_l0_l2_activation.sql` (+ mirrored
  `-- BEGIN l0-l2-activation` block in `seed.sql`, +214/−0 additive).
- Applier: `scripts/conversion/apply-activation.ts` (`pnpm convert:apply-activation`) — reads
  the per-level `overlay/l*-activation.json`; asserts only the targeted ids change.
- Verify GREEN: 1091 tests / 76 files, tsc 0, lint 0 errors (2 known warnings), build OK.
- **No merge.** Founder reviews + uploads the manifest images BEFORE merge (an activated
  image row whose file is missing 500s at serve), then `supabase db reset`.

## FLIP-READY — 19 rows activated
| Row | Format | Answer |
|---|---|---|
| SAM-L0A-Q08 | CLICK_IMAGE_SINGLE | tap the car (t4) |
| SAM-L0A-Q11 | CLICK_IMAGE_SINGLE | tap the blue flower (t2) |
| SAM-L0B-Q02 | CLICK_IMAGE_SINGLE | tap the magnet (t4) |
| SAM-L0C-Q03 | SELECT_MULTIPLE | the boxes that make 10 (5+5,3+7,2+8,1+9,6+4) |
| SAM-L0C-Q04 | EQUATION_SET | fact family 6/3/9 (set-equality, commutative) |
| SAM-L0C-Q08 | MULTI_BLANK | skip-count 4, 8, 16, 20 |
| SAM-L0C-Q11 | MULTI_BLANK | after, greater, before, smaller (+ number-line image) |
| SAM-L0C-Q14 | NUMERIC_ENTRY | 4 pairs (+ image) |
| SAM-L0C-Q16 | MULTI_BLANK | 30 + 2 |
| SAM-L1-Q02 | MULTIPLE_CHOICE | bigger animal = elephant (+ image) |
| SAM-L1-Q03 | MULTIPLE_CHOICE | longer toy = plane (+ image) |
| SAM-L1-Q11 | VISUAL_MATCHING | number↔word 1–10 (text tiles, no image) |
| SAM-L1-Q13 | VISUAL_MATCHING | shape pictures → names (+ images) |
| SAM-L1-Q14 | MULTI_BLANK | 5 and 3 make 8 (+ image) |
| SAM-L1-Q15 | VISUAL_MATCHING | solid pictures → names (+ images) |
| SAM-L1-Q16 | MULTIPLE_CHOICE | in front of tree = Andy (+ image) |
| SAM-L1-Q17 | IMAGE_ORDERING | day order: brushing → walking → studying → sleeping (+ images) |
| SAM-L1-Q27 | VISUAL_MATCHING | number↔word 11–20 (text tiles, no image) |
| SAM-L2-Q06 | CLICK_IMAGE_SINGLE | base-ten 37 = opt3 (t3) |

## BLOCKED — one founder image away (NOT activated)
- **SAM-L0A-Q17** (count balloons) — only single-balloon crops exist (0A-17_1/_2); needs a
  curated group-of-5-balloons image at `l0/sam-l0a-q17.png`, then it flips (MULTIPLE_CHOICE,
  answer 5).
- **SAM-L0B-Q07** (how are shapes sorted) — two part-crops exist (0B-07_1 pink, 0B-07_2
  green); they must be composited into one stimulus at `l0/sam-l0b-q07.png`, then it flips
  (MULTIPLE_CHOICE, answer "color").

## BLOCKED — needs founder content decision (NOT activated)
- **SAM-L0B-Q06 (0B Task 6)** — DISPOSITION: held. Crop `0B-06.png` is a bare number line
  (no printed numbers) so the on-page tiles are unreadable, AND the answer key "Color 7 and
  6" contradicts the stem "greater than 6" (6 is not > 6). Needs the real number tiles + the
  intended subset confirmed.
- **SAM-L0B-Q03** (missing cake part) — no cake-with-gap reference and no answer key in the
  overlay; correct option not verifiable.
- **SAM-L0B-Q05** (count back from 10) — the overlay's given (4,5,6,7,8) and blanks
  (9,7,6,4,3,2,1) overlap on 6 and 7 and there is no crop; the blank layout is ambiguous.
- **SAM-L1-Q07** (complete the picture) — authoring model gives no correct option; not
  determinable from crops.
- **SAM-L1-Q25** (fact family) — equation-set is now wired, but the verbatim stem lives only
  at DB head (neither overlay); flipping it would require guessing graded text. Pull the head
  stem to flip.
- **SAM-L1-Q08** (position words, founder-parked) — multi-axis (right/top/left) is not a clean
  binary auto-grade.

## BLOCKED — structural (NOT activatable as-is)
- **Single-scene, no discrete tiles** (a tap/select needs separate tiles, only one scene
  image exists): SAM-L1-Q01 (spot 3 differences), SAM-L1-Q06 (pattern), SAM-L1-Q26 (select 10
  of 15 candies).
- **Missing source image**: SAM-L0A-Q12 (match tails), SAM-L0B-Q08 (toy cars), SAM-L0B-Q12
  (bee number-path), SAM-L0B-Q13 (front/behind animals), SAM-L0C-Q01 (ordinal birds),
  SAM-L0C-Q06 (colour pattern), SAM-L0C-Q12 (cubes).
- **Taxonomy gap (content_id NULL)** — stay blocked until the taxonomy is extended (founder/
  S.A.M.): SAM-L0A-Q03/Q05/Q06/Q07/Q09/Q10/Q13/Q14/Q15/Q16, SAM-L0B-Q01/Q04,
  SAM-L0C-Q05/Q15.
- **Oral / drawing (permanently inactive)**: SAM-L0A-Q01/Q02/Q04/Q16/Q18, SAM-L0C-Q02/Q07,
  SAM-L1-Q09/Q18.

## IMAGE UPLOAD MANIFEST (do this BEFORE merge)
Upload each source PNG to the private **`question-images`** bucket at the exact key shown.
Source crops: L0 = `atlas-ai-trunk/scripts/conversion/source/0{a,b,c}/`; L1 =
`atlas-ai-l1-art/scripts/conversion/output/l1-art/`; L2 =
`atlas-ai-l2/scripts/conversion/input/l2-art/`.

**Bucket folder `l0/`**
| source crop | upload as |
|---|---|
| 0A-08_1.png / _2 / _3 / _4 | l0/sam-l0a-q08-t1.png / -t2 / -t3 / -t4.png |
| 0A-11_1.png / _2 | l0/sam-l0a-q11-t1.png / -t2.png |
| 0B-02_1.png / _2 / _3 / _4 | l0/sam-l0b-q02-t1.png / -t2 / -t3 / -t4.png |
| 0C-11.png | l0/sam-l0c-q11.png |
| 0C-14.png | l0/sam-l0c-q14.png |
(0C Q03/Q04/Q08/Q16 are text-only — no image.)

**Bucket folder `l1/`**
| source crop | upload as |
|---|---|
| sam-l1-q13-circle/-rectangle/-square/-triangle.png | l1/sam-l1-q13-circle.png … (same names) |
| sam-l1-q15-sphere/-cylinder/-cube/-cone.png | l1/sam-l1-q15-sphere.png … (same names) |
| sam-l1-q17-brushing-teeth/-walking-to-school/-studying/-sleeping.png | l1/… (same names) |
| sam-l1-q02.png / q03.png / q14.png / q16.png | l1/sam-l1-q02.png … (same names) |
(Q11/Q27 are text-tile matching — no image.)

**Bucket folder `l2/`**
| source crop | upload as |
|---|---|
| L2-6_1.png / _2 / _3 / _4 | l2/sam-l2-q06-opt1.png / -opt2 / -opt3 / -opt4.png |

Also confirm the 7 already-active L2 images are present (q-sam-l2-q02-triangles.png,
-q03-composite-shape.png, -q05-seashell-graph.png, -q12-toy-car-ruler.png, -q15-clock.png,
-q16-coins.png, -q18-base-ten.png) — they were uploaded for the L2 active set.

## Notes
- SAM-L1-Q16's crop has baked-in question-number/name text; it still serves as the stimulus
  and the answer is correct, but flag if undesirable for the parent-facing render.
- content image keys are read server-side and minted to short-TTL signed URLs; the raw bucket
  path never crosses to the client.
