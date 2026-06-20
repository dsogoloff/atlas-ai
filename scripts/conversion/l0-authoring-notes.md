# Level 0A / 0B / 0C authoring — founder handoff notes (lane/l0-authoring)

Re-authored S.A.M. Levels 0A, 0B, 0C from source (`…/source/0{a,b,c}/Level 0X
Placement Worksheet.docx` + per-question crops) into three **separate** overlays
(`overlay/l0a-authoring.json`, `l0b-authoring.json`, `l0c-authoring.json`), one
per source doc. Generated additively via `pnpm convert:apply-l0-overlay`:

- `supabase/migrations/20260616120000_add_prek_grade_levels.sql` — widens the
  `half_grade_level` enum with **0A, 0B, 0C** (inserted before `KA`).
- `supabase/migrations/20260616120100_l0_overlay_load.sql` — 28 inserts +
  21 updates.
- mirrored `-- BEGIN l0-overlay` block appended to `supabase/seed.sql`
  (diff is +426 / −0 — purely additive; no pre-existing seed line changed).

The applier asserts every emitted statement references only `SAM-L0[ABC]-*` ids
(non-destruction). No L1/L2/L3+ row is touched; verify bar GREEN
(1074 tests / 75 files, tsc 0, lint 0 errors + 2 known warnings, build OK).

## Why this was a RE-author, not a fresh author
The 2026-06-11 full-library pipeline run (`20260611134158`) had already loaded
**21** `SAM-L0*` rows, but (a) banded them `KA/KB` because the enum had no pre-K
level, and (b) model-reconstructed stems/options (e.g. literal `"Option B
(unknown)"`). This lane re-bands all 21 to their true 0A/0B/0C level and replaces
the reconstructed content with verbatim-from-docx content; the 28 tasks the
pipeline skipped are inserted.

## Founder decisions applied (2026-06-15)
- **Banding:** 0A/0B/0C kept as DISTINCT levels (0A = age 3 / Nursery 3,
  0B = age 4 / pre-K, 0C = age 5 / K) via the enum widening above. Booklets ramp,
  so banding follows the Summary table's **Level** column, not the doc name
  (0B doc: tasks 1–12 are 0A, 13–15 are 0B; 0C doc: tasks 1–13 are 0B, 14–16 are 0C).
- **Short flag:** taken from the docx Summary "Short" column. ATLAS-authoritative
  field name is the real boolean column **`questions.short_test_eligible`** (added
  by migration `20260616120050`, default false). The applier sets it per row
  (true where Summary Short = Y); 31 of 49 are short-eligible. It is NOT stored
  inside `content` (the ATLAS short picker reads the column literally). Existing
  non-L0 rows keep the default false.

## Result (49 tasks: 28 insert, 21 update)
| | active | held-A (image) | held-C (format) | inactive (manual/oral) |
|---|---|---|---|---|
| 0A | 0 | 1 | 12 | 5 |
| 0B | 5 | 1 | 9 | 0 |
| 0C | 3 | 1 | 10 | 2 |
| **tot** | **8** | **3** | **31** | **7** |

- **ACTIVE (8)** — answerable from the stem TEXT alone, wired format, auto-gradeable
  now: `SAM-L0B-Q09` (8−5=3), `L0B-Q10` (3+5=8 MC), `L0B-Q11` (7−3=4 MC),
  `L0B-Q14` (4+6=10), `L0B-Q15` (10−7=3), `L0C-Q09` (14+5=19), `L0C-Q10` (18−6=12),
  `L0C-Q13` (missing day = Friday). All band to 0A or 0B; **no level-0C item is
  active** (0C's own-level tasks 14–16 are all held).
- **HELD-A (3)** — answer depends on an image; format is wired (MC/NUMERIC) but
  the row stays inactive per the rule "any item whose answer depends on an unseen
  picture MUST stay inactive": `L0A-Q17` (count balloons), `L0B-Q07` (how sorted),
  `L0C-Q14` (count pairs). Activate once the per-question image is curated/uploaded.
- **HELD-C (31)** — real interaction is not a wired format (click-image
  single/multi, image-ordering, visual-matching, multi-blank, select-multiple,
  equation/fact-family). Each carries `content._authoring.requires_format_swap=true`
  + `is_active=false` and satisfies the `questions_held_rows_inactive` CHECK.
- **INACTIVE (7)** — no auto-grade path EVER: tracing/maze (`L0A-Q01/Q02`),
  colouring-to-create (`L0A-Q04`, `L0C-Q02`), free drawing (`L0A-Q16`, `L0C-Q07`),
  oral naming (`L0A-Q18`). Authored verbatim + inactive for the record.

## 3 existing ACTIVE rows were DEACTIVATED (correctness, not regression)
`SAM-L0C-Q03` (was active `DRAG_DROP` — really a select-multiple), `L0C-Q08`
(was active `NUMERIC` — really a 4-blank skip-count sequence), `L0C-Q16` (was
active `NUMERIC` — really a 2-blank tens/ones split). Their pipeline content
mis-modeled the interaction; they are now correctly held until the real input is
wired. Net active-bank change for L0: was 6 mis-modeled actives → now 8 genuinely
auto-gradeable actives.

## INTERNAL-TAXONOMY (ours to finish) — codes to be created during conversion
These items had `content_id = NULL` (radar won't attribute them) only because our
INTERNAL Atlas taxonomy did not yet have a node for that Topic at that level. The
`content_id` scheme is OURS — Code creates the codes from the worksheet's own Topic
column; this is NOT a Sam/S.A.M. decision and was never externally gated.
- **0A "Same or different"** (big/small, thick/thin, long/short, tall/short,
  similar objects) and **0A position/direction words** (left/right, up/down,
  top/bottom, inside/outside).
- **0C "Comparing and Ordering"** (`L0C-Q05`), **0C "Odd and Even Numbers"**
  (`L0C-Q14`, `L0C-Q15`).
RESOLVED: these internal nodes were created during conversion (l0a-geometry-5
"Same or Different", l0a-geometry-6 "Positions", l0c-geometry-4 "Comparing and
Ordering", l0c-whole_numbers-6 "Odd and Even Numbers"; 0B position → existing
l0b-geometry-1) and the rows tagged + activated. Creating taxonomy nodes is an
internal Atlas task — not a founder/S.A.M. dependency.

## NEEDS FOUNDER — content question
- **0B Task 6** ("Tap the numbers greater than 6"): the answer key reads
  "Colour 7 and 6", which contradicts the stem (6 is not greater than 6). The
  crop is an unlabeled number line, so the on-page tiles can't be read from it.
  Held (`L0B-Q06`); resolve the correct subset before activation. See
  `SAM-L0B-Q06.authoring.answer_model.conflict`.

## Follow-ups (technical, not gating)
- **Activation of held image rows** needs the serve-time per-tile image minting
  for the 3 click-image formats (already flagged in NEXT_ACTIONS §3g) AND curated
  per-question images. Crops live in `…/source/0{a,b,c}/` (not committed —
  licensed content).
- **content_id on the 21 re-banded rows is unchanged** (the overlay UPDATE
  re-bands `level` but, like the L1/L2 appliers, does not re-resolve `content_id`).
  New inserts get `content_id` from their `content_key` at insert time.
- **Picker short-test filtering:** `questions.short_test_eligible` is now
  populated for L0; wiring the picker to read it (and back-filling L1/L2+ from
  their Summary "Short" columns) is a separate small lane.
- Held rows store the real interaction + answer model in
  `authoring.target_interaction` / `authoring.answer_model` (overlay = source of
  truth); the DB carries only the compact `_authoring` stub until activation.
