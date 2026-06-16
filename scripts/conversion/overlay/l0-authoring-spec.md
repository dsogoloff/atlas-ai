# L0 authoring spec (lane/l0-authoring) — READ THIS FIRST

You are authoring ONE overlay JSON for one S.A.M. pre-Kindergarten worksheet
(Level 0A, 0B, or 0C). The applier `scripts/conversion/apply-l0-overlay.ts`
consumes it. Mirror exactly the proven shape of
`scripts/conversion/overlay/l2-authoring.json` (read it for reference), with the
L0 additions below. Output is a single file:
`scripts/conversion/overlay/l0{a,b,c}-authoring.json`.

## Sources (READ-ONLY — licensed S.A.M. content, do NOT copy whole files anywhere)
- Verbatim stems: the docx, dumped already. Use the verbatim "Tap/…"-adapted
  text given to you in your task prompt (it came from
  `C:/Users/Acer/PROJECTS/atlas-ai-trunk/scripts/conversion/source/0X/Level 0X Placement Worksheet.docx`).
- Per-question cropped images: `…/source/0X/0X-<task>[_n].png`. READ them (the
  Read tool shows images) to (a) write NON-revealing `image_alt`, and (b)
  confirm the correct answer for image-dependent items.
- Answer key + the Question Summary table (Task | Concepts/Skills | Topic |
  Level | Short) are given to you in your task prompt.

## HARD RULES (founder, non-negotiable)
1. **Band by the Summary table's LEVEL column, not the doc name.** 0B/0C booklets
   ramp: they start with items from the level below. `level` ∈ {"0A","0B","0C"}
   exactly as the Summary table says.
2. **Map by CONTENT, not printed number.** The existing SAM-L0X-Q<N> ids were
   assigned by printed task number and the number→task mapping is correct, but
   the CONTENT was model-reconstructed and is wrong. Re-author content from the
   docx/crops; never trust the old content.
3. **Verbatim-or-skip.** Transcribe the stem exactly from the docx (digital
   "Tap" wording). Trim trailing answer-lines into the answer model. NEVER
   model-reconstruct options or content. If an item has no clean auto-grade
   shape, do not force it active — author it inactive and say why.
4. Authored interaction key is `target_interaction` (inside `authoring`).
5. Partition/sort tasks → multi-select tap or number entry. Drag-to-target is
   not built.
6. **Short flag:** put `"short_eligible": true|false` INSIDE the `content`
   object of every row (insert `row.content`, update `update.content`), taken
   from the Summary "Short" column (Y→true, N→false).
7. **Image-tap rows are HELD** (see classification). Author fully but inactive.
8. Activation is a later atomic step — you only author HELD state here.

## Classification — pick exactly one per task
- **ACTIVE (blocker "none"):** the answer is derivable from the STEM TEXT ALONE
  (no picture needed) AND the format is wired (NUMERIC_ENTRY / TEXT_ENTRY /
  MULTIPLE_CHOICE with text options). Word-problem add/sub with the numbers in
  the text, e.g. "4 + 6 = ?" → 10. `is_active: true`, `held: false`,
  `requires_format_swap: false`. Active rows' content is CLEAN (no `_authoring`
  — the applier omits it).
- **HELD-A (blocker "A"):** answer DEPENDS ON AN IMAGE but the format would be
  wired (count-the-picture → NUMERIC, pick-named-option-about-a-picture → MC).
  Per founder "every ACTIVE item must be auto-gradeable; any item whose answer
  depends on an unseen picture MUST stay inactive." So `is_active: false`,
  `held: true`, `requires_format_swap: false`. Use the real wired `format`
  (NUMERIC_ENTRY/MULTIPLE_CHOICE/TEXT_ENTRY) and put `image_alt` (non-revealing)
  in content; do NOT set image_path (founder uploads later). List the crop
  filename in `authoring.image`.
- **HELD-C (blocker "C"):** the real interaction is NOT a wired format —
  click-image tap (one/many), image/text ordering, matching, multi-blank
  (distinct blanks), equation/fact-family, select-multiple. `is_active: false`,
  `held: true`, `requires_format_swap: true`. Set `format: "MULTIPLE_CHOICE"`
  as a neutral placeholder (the real format is swapped in at activation).
  Record the real interaction in `authoring.target_interaction` (one of:
  click-image-single, click-image-multi, image-ordering, visual-matching,
  multi-blank, equation-set, select-multiple) and the full answer model in
  `authoring.answer_model` (audit-only; not emitted to SQL).
- **INACTIVE-MANUAL (blocker "none-manual"):** drawing / colouring-to-create /
  tracing / maze — no auto-grade path EVER. `is_active: false`, `held: true`,
  `requires_format_swap: false`, `format: "MULTIPLE_CHOICE"` placeholder.
- **INACTIVE-ORAL (blocker "none-oral"):** "say/read aloud" — oral only.
  Same flags as manual.

Note: a click-image item needs both an image and the format; classify it HELD-C
(the format is the binding blocker), and still write a non-revealing image_alt.

## Existing rows → action
The 21 pipeline rows (listed in your prompt) already exist with WRONG content and
KA/KB banding. For each task:
- If a SAM-L0X-Q<N> row already exists → `action: "update"`. Provide `update`
  (set `level` to the true 0A/0B/0C, `format`, `is_active`, and `content` = the
  full corrected content object incl. `short_eligible`) and `guard`
  (`{ "external_id": "SAM-L0X-Q<N>" }` is enough — the UPDATE is idempotent).
  The applier auto-injects the `_authoring` stub for held rows, so you do NOT put
  `_authoring` in `update.content`.
- If no row exists for that task → `action: "insert"` with a full `row`.
- Never use `action: "none"` here (every existing row needs at least re-banding).

## Row field reference (insert `row`, or mirror into `update`)
- `strand` ∈ number_sense | operations_algorithms | fractions_decimals |
  measurement | geometry | data_statistics  (lowercase).
- `level`: "0A" | "0B" | "0C".
- `difficulty`: number; keep the existing row's value if updating, else pick in
  [-2.6, -1.6] (lower = easier; 0A ≈ -2.5, 0B ≈ -2.1, 0C ≈ -1.9 as a guide).
- `format`: NUMERIC_ENTRY | TEXT_ENTRY | MULTIPLE_CHOICE (placeholder for held).
- `content`: `{ "stem": "<verbatim>", "short_eligible": <bool>, … }`. For MC:
  `options: [...]`, `correct_index`. For NUMERIC: `correct_answer: "<n>"`. For
  TEXT: `correct_answer: "<word>"`. For HELD-A add `image_alt`. Keep stems
  verbatim; fold "Fill in the blanks / Answer: ___" tails into the answer model.
- `misconception_tags`: [] unless an existing valid code clearly applies
  (reuse codes already present on the row).
- `word_count`: integer (count the stem words).
- `operation_type` ∈ ADDITION|SUBTRACTION|MULTIPLICATION|DIVISION|FRACTION_OP|
  DECIMAL_OP|PERCENT_OP|GEOMETRY|MEASUREMENT|PATTERN|ALGEBRA|COUNTING|IDENTIFY.
- `num_operations`: smallint.
- `representation` ∈ SYMBOLIC|PICTORIAL|BAR_MODEL_REQUIRED|WORD_PROBLEM_SINGLE|
  WORD_PROBLEM_MULTI.
- `content_key`: a tax_content code for THIS level if a CLEAN one exists, else
  `null`. DO NOT invent codes. Available codes:
  - 0A: l0a-whole_numbers-1 "Numbers to 20", l0a-whole_numbers-2 "Number Bonds
    to 10", l0a-whole_numbers-3 "Add/Sub Within 10", l0a-geometry-1 "Lines and
    Curves", l0a-geometry-2 "Parts and Whole", l0a-geometry-3 "Plane Shapes",
    l0a-geometry-4 "Patterns".
  - 0B: l0b-whole_numbers-1 "Numbers to 50", l0b-whole_numbers-2 "Number Bonds
    to 10", l0b-whole_numbers-3 "Add/Sub Within 20", l0b-whole_numbers-4
    "Ordinal Numbers", l0b-measurement-1 "Calendar and Time", l0b-geometry-1
    "Positions", l0b-geometry-2 "Plane Shapes", l0b-geometry-3 "Solid Shapes",
    l0b-geometry-4 "Patterns".
  - 0C: l0c-whole_numbers-1 "Numbers to 100", l0c-whole_numbers-2 "Tens and
    Ones", l0c-whole_numbers-3 "Add/Sub Within 100", l0c-whole_numbers-4
    "Multiplication", l0c-whole_numbers-5 "Division", l0c-measurement-1
    "Calendar and Time", l0c-measurement-2 "Money", l0c-geometry-1 "Plane
    Shapes", l0c-geometry-2 "Solid Shapes", l0c-geometry-3 "Patterns",
    l0c-data_representation-1 "Picture Graphs".
  - No clean code (→ null, and FLAG in your summary): "Same or different"
    (big/small, thick/thin, colours, similar objects), "Position and Direction
    Words" at 0A (left/right, up/down, top/bottom, inside/outside — note 0A has
    no position sub-strand; only 0B does).
- `authoring`: `{ target_interaction, blocker_code, held, requires_format_swap,
  answer_model?, image?, notes? }`. `answer_model`/`image`/`notes` are
  audit-only (not emitted as SQL).

## Output
Top-level JSON: `{ "$schema_note": "...", "meta": { ... counts, legend ... },
"tasks": { "SAM-L0X-Q01": { ... }, ... } }`. Order tasks by number. Include in
`meta` a per-status count and a list of taxonomy gaps (content_key=null) and any
skipped/oral/manual items with the reason. Validate the JSON parses.
