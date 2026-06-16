# L0/L1/L2 activation spec (lane/l0-l2-activation) — READ FIRST

ATLAS merged the three click-image formats (#71) + serve-time per-tile minting (#77).
ALL answer formats are now wired end-to-end (input component + serializer + grading +
minting): MULTIPLE_CHOICE, NUMERIC_ENTRY, TEXT_ENTRY, DRAG_DROP, SELECT_MULTIPLE,
VISUAL_MATCHING, MULTI_BLANK, EQUATION_SET, CLICK_IMAGE_SINGLE/MULTI, IMAGE_ORDERING.

Your job: produce ONE activation overlay file for your level —
`scripts/conversion/overlay/l{0a,0b,0c,1,2}-activation.json` — containing ONLY the
FLIP-READY held rows for that level, each with the FULL activated `content`. Also return a
classification table (flip-ready vs blocked + reason) and an image upload manifest.

## FLIP-READY (all four must hold)
1. The row is currently HELD (is_active=false; held image/format row).
2. `content_id` is NOT NULL — i.e. the authoring overlay's `content_key` for the row is a
   real tax_content code (taxonomy-mapped). **content_key=null ⇒ BLOCKED (taxonomy gap).**
3. No content conflict (e.g. 0B Task 6 answer-key conflict — see below).
4. Every image the format needs EXISTS as a source crop (listed per level below). A
   click-image/visual-matching tile that needs a picture but has no crop ⇒ BLOCKED
   (missing image). A single-scene image cannot become discrete tap tiles ⇒ BLOCKED.

BLOCKED reasons to use verbatim: `content_id NULL (taxonomy gap)`, `content conflict`,
`oral/drawing (permanently inactive)`, `missing source image`, `single-scene (no discrete tiles)`.
Do NOT put blocked rows in the activation overlay; list them in your report only.

## Activation is ATOMIC (one UPDATE): the applier emits
`update questions set format=<target>, content=<full jsonb>, is_active=true
 where external_id=<id> and is_active=false`. You only author `format` + `content`. The
guardrail `questions_held_rows_inactive` forbids is_active=true while
`content._authoring.requires_format_swap=true`, so your activated content must NOT carry
`requires_format_swap` (drop the old `_authoring` stub; for image formats keep ONLY
`_authoring.answer_model`).

Do NOT put `short_test_eligible` in content (it is a real column, left untouched).

## Exact `content` shape per target format (the serializer + grader are STRICT)
- **CLICK_IMAGE_SINGLE**: `{ "stem", "tiles":[{"id","label","image_path","image_alt"}…],
  "_authoring":{"answer_model":{"rule":"select-one","correct":"<tileId>"}} }`
- **CLICK_IMAGE_MULTI**: tiles[] as above; `_authoring.answer_model={"rule":"select-all","correct":["<id>",…]}`
- **IMAGE_ORDERING**: tiles[] as above; `_authoring.answer_model={"rule":"order-equality","order":["<id>",…]}`
- **VISUAL_MATCHING** (answer is TOP-LEVEL, not _authoring): `{ "stem",
  "left":[{"id","label","image_path","image_alt"}…], "right":[{"id","label"}…],
  "pairs":{"<leftId>":"<rightId>",…} }` (left = the picture tiles; right = text names)
- **SELECT_MULTIPLE** (top-level): `{ "stem","select_rule":"all",
  "options":[{"id","label"}…],"correct":["<id>",…] }`  (or "count" rule + "count":N)
- **MULTI_BLANK** (top-level): `{ "stem","tokens":[{"t":"text","value":"…"}|{"t":"blank","id":"b1"}…],
  "blanks":{"b1":{"value":"4","numeric":true},…} }`
- **EQUATION_SET** (top-level): `{ "stem","rows":N,"answer_rule":"set-equality",
  "canonical":[{"a":6,"op":"+","b":3,"result":9}…],"allowCommutative":true }` (ops ∈ + - x /)
- **HELD-A → MULTIPLE_CHOICE** (single stimulus image, NOT tiles): `{ "stem",
  "options":["…"],"correct_index":N,"image_path","image_alt","image_required":true }` (no _authoring)
- **HELD-A → NUMERIC_ENTRY**: `{ "stem","correct_answer":"…","image_path","image_alt","image_required":true }`

Tile/option `id`s are short stable strings ("t1","t2"…). `label` is render-safe text shown
if an image is missing (keep NON-revealing for image tiles, e.g. "Picture 1"). Per-tile
`image_alt` non-revealing; it falls back to `label` if omitted.

## Bucket path convention (content image_path / tile image_path)
`l0/<id-lower>.png` for L0, `l1/…` for L1, `l2/…` for L2. Per-tile keys append a suffix,
e.g. `l0/sam-l0a-q08-t1.png`, `l1/sam-l1-q13-circle.png`. The MANIFEST maps each existing
SOURCE crop filename → this exact bucket path. The founder uploads per the manifest BEFORE
merge (an activated row whose image_path has no uploaded file 500s at serve — minting throws).

## Activation overlay JSON schema (what the applier consumes)
```
{ "meta": { "level": "...", "flip_ready_ids": [...] },
  "tasks": {
    "SAM-L0A-Q08": { "level":"0A", "format":"CLICK_IMAGE_SINGLE",
      "content": { …full shape above… },
      "guard": { "is_active": false } }
  } }
```

## Source-image inventory
- L0: `C:/Users/Acer/PROJECTS/atlas-ai-trunk/scripts/conversion/source/0{a,b,c}/` — crops
  named `0A-<task>[_n].png` (the `_1/_2/_3/_4` are the per-tile option pictures). READ them.
- L1: `C:/Users/Acer/PROJECTS/atlas-ai-l1-art/scripts/conversion/output/l1-art/` — crops
  `sam-l1-q<NN>[-<tile>].png` (e.g. q13-circle/-rectangle/-square/-triangle;
  q15-cone/-cube/-cylinder/-sphere; q17-brushing-teeth/-sleeping/-studying/-walking-to-school;
  q07-scene/-option-a/-option-b). READ them.
- L2 Q06: `C:/Users/Acer/PROJECTS/atlas-ai-l2/scripts/conversion/input/l2-art/` — `L2-6_1..4.png`
  (the four base-ten option pictures). READ them.

## Source of the answer model / stem
The held row's authored answer model + verbatim stem live in the level's authoring overlay
(`overlay/l{0a,0b,0c,1,2}-authoring.json`, `authoring.answer_model` + `row.content.stem`).
Use those; confirm correct tile/option against the crop. Keep the stem verbatim.
