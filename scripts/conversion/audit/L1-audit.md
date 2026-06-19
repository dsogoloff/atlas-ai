# L1 source-vs-authored audit (2026-06-19)

Audit of EVERY SAM-L1 row (active and held) against the per-question source crops in
`atlas-ai-l1-art/scripts/conversion/output/l1-art/`. Every item with a crop was opened
and viewed before judging. Authored intent: `overlay/l1-authoring.json` +
`overlay/l1-activation.json`. Current state: `supabase/seed.sql` at
origin/ATLAS-ASSESSMENT head.

Result: all active L1 rows are faithful to source; all held rows are correctly held on a
real capability/art blocker. **Zero clear-cut SQL fixes** were found, so no migration was
emitted (per FIX MECHANICS: zero fixes → no migration). The one candidate fix originally
suspected — the 5 L1 art-curation images (Q04/Q05/Q10/Q12/Q19) missing from the
`upload-activation-images.ts` MANIFEST — is **already fixed at origin head** (manifest
lines 113–121), so no edit was needed.

| external_id | source interaction | authored format | faithful | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L1-Q01 | select-multiple (click same-color objects) | NUMERIC_ENTRY held (`_authoring` select-multiple-MC) | yes | none — single scene, no select-multiple input shipped | BLOCKED (capability: select-multiple; single-scene, no discrete tiles) |
| SAM-L1-Q02 | single-MC, click bigger animal | MULTIPLE_CHOICE active, image l1/sam-l1-q02.png | yes | elephant>bear; correct_index 0 = "the elephant" matches crop | FAITHFUL (active) |
| SAM-L1-Q03 | single-MC, longer toy | MULTIPLE_CHOICE active, image l1/sam-l1-q03.png | yes | plane longer than car; correct_index 1 = "the toy plane" matches crop | FAITHFUL (active) |
| SAM-L1-Q04 | single-MC height compare | NUMERIC_ENTRY active, image l1/sam-l1-q04.png, ans "Lin" | yes | crop: Lin shorter than George; stem "Who is shorter…" → Lin | FAITHFUL (active) |
| SAM-L1-Q05 | single-MC group membership | NUMERIC_ENTRY active, image l1/sam-l1-q05.png, ans "B" | yes | Group A=land, Group B=sea, target=stingray→Group B; dead "[object]" already dropped to "it" | FAITHFUL (active) |
| SAM-L1-Q06 | click-on-visual, next in pattern | MULTIPLE_CHOICE held (placeholder options) | yes | AB flower pattern, next term = purple; choices are placeholders, not rendered | BLOCKED (capability: rendered click choices; single-scene) |
| SAM-L1-Q07 | ordering/matching (picture assembly) | NUMERIC_ENTRY held | yes | scene + 2 tiles; authoring answer_model has NO defined correct (genuinely ambiguous) | BLOCKED (ambiguous: no correct option in model; low tractability) |
| SAM-L1-Q08 | multi-blank position words | NUMERIC_ENTRY held | yes | shelf crop: ball=right, box=top, shoe=left match authoring blanks; no multi-part/partial-credit format | BLOCKED (capability: multi-part /3 scoring; blocker E) |
| SAM-L1-Q09 | oral rote count 1–10 | NUMERIC_ENTRY held (oral) | n/a | no crop; oral "observe pronunciation", no auto-grade path | BLOCKED-permanently-inactive (oral) |
| SAM-L1-Q10 | numeric-single, count dots | NUMERIC_ENTRY active, image l1/sam-l1-q10.png, ans "9" | yes | crop: 9 grey dots; matches | FAITHFUL (active) |
| SAM-L1-Q11 | matching, number↔number-word (1–10) | VISUAL_MATCHING active (no image; text labels) | yes | no crop needed (text); pairs 1↔one…10↔ten correct | FAITHFUL (active) |
| SAM-L1-Q12 | single-MC, which set has more | NUMERIC_ENTRY active, image l1/sam-l1-q12.png, ans "A" | yes | crop: Set A (8 circles) > Set B (6); answer "A" correct. Authoring note "Set A=7" is stale but not in shipped content; dead "[image]" placeholders already dropped | FAITHFUL (active) |
| SAM-L1-Q13 | matching, 2D shapes | VISUAL_MATCHING active, 4 shape tiles | yes | circle/rectangle/square/triangle tiles each match their name pair | FAITHFUL (active) |
| SAM-L1-Q14 | multi-blank, 5 and 3 make 8 | MULTI_BLANK active, image l1/sam-l1-q14.png | yes | crop: left box 5 apples, right box 3 apples; blanks b1=5,b2=3 | FAITHFUL (active) |
| SAM-L1-Q15 | matching, 3D solids | VISUAL_MATCHING active, 4 solid tiles | yes | sphere/cylinder/cube/cone tiles each match their name pair | FAITHFUL (active) |
| SAM-L1-Q16 | single-MC, in front of tree | MULTIPLE_CHOICE active, image l1/sam-l1-q16.png, idx 1=Andy | yes | crop: Andy at the trunk (in front), Louis to the side; "Andy" correct. Crop header reads "in front of" verbatim with stem | FAITHFUL (active) |
| SAM-L1-Q17 | image-ordering, day sequence | IMAGE_ORDERING active, 4 day tiles | yes | brushing→walking→studying→sleeping; tiles t1..t4 with order [t1,t2,t3,t4] match crops | FAITHFUL (active) |
| SAM-L1-Q18 | oral count + mark | NUMERIC_ENTRY held (oral) | n/a | no crop; oral, no clean auto-grade; "Colour"→"Color" already applied | BLOCKED-permanently-inactive (oral) |
| SAM-L1-Q19 | multi-blank count + yes/no | NUMERIC_ENTRY active, image l1/sam-l1-q19.png, ans "9; yes" | yes | crop: 9 cherries top, 9 cherries bottom → same = yes | FAITHFUL (active) |
| SAM-L1-Q20 | single-MC greater/smaller | MULTIPLE_CHOICE active | yes | no crop (symbolic); "5 is ___ 7" → smaller than (idx 1) | FAITHFUL (active) |
| SAM-L1-Q21 | numeric-single, 1 more than 7 | NUMERIC_ENTRY active, ans "8" | yes | no crop (symbolic) | FAITHFUL (active) |
| SAM-L1-Q22 | numeric-single, number bond | NUMERIC_ENTRY active, ans "8" | yes | crop: bond 1 = 6,3→9; bond 2 = 2,6→8; operands embedded in stem; answerable as text | FAITHFUL (active) |
| SAM-L1-Q23 | numeric-single, ribbons word problem | NUMERIC_ENTRY active, ans "10" | yes | crop: 7 blue + 3 red ribbons = 10; stem self-contained | FAITHFUL (active) |
| SAM-L1-Q24 | numeric-single, apples word problem | NUMERIC_ENTRY active, ans "5" | n/a | no crop (text word problem); 10−5=5 self-contained | FAITHFUL (active) |
| SAM-L1-Q25 | equation-set, fact family 6,8,2 | NUMERIC_ENTRY deactivated, `_authoring` set-equality | n/a | no crop; deactivated + requires_format_swap so guardrail forbids bare activate until equation-set wired | BLOCKED (capability: equation-set input; correctly deactivated) |
| SAM-L1-Q26 | select-multiple, pick 10 candies | NUMERIC_ENTRY held | yes (intent) | crop shows 17 candies (5+6+6), authoring note says "15" — stale note, but no count shipped in content; no select-multiple input | BLOCKED (capability: select-multiple) + FLAG: authoring total 15 vs source 17 |
| SAM-L1-Q27 | matching, number↔number-word (11–20) | VISUAL_MATCHING active (text labels) | yes | no crop needed (text); pairs 11↔eleven,12↔twelve,13↔thirteen,20↔twenty correct | FAITHFUL (active) |
| SAM-L1-Q28 | image/text ordering smallest→largest | DRAG_DROP active | yes | no crop (symbolic); order 10,17,20 correct | FAITHFUL (active) |

## Flags (non-fix, judgment / cosmetic — left as-is)

- **Q26 authoring total mismatch:** `l1-authoring.json` records `total: 15` ("any 10 of
  15 candies") but the source crop shows **17** candies (rows of 5 + 6 + 6). The row is
  held (no select-multiple capability) and the shipped `content` carries no count/options,
  so nothing serve-facing is wrong. Left as a FLAG for whoever activates Q26 to set the
  correct total from the crop. Not a clear-cut fix (the answer model is not yet shipped).
- **British spelling in image_alt (Q13/Q15):** image_alt reads "A coloured 2D shape" /
  "A coloured 3D solid" (British "coloured"). This matches existing sibling convention
  (e.g. L2-Q03 "two-colour figure") and is non-revealing alt text, not the child-facing
  stem; the L1 stems themselves are already Americanized. Left as-is to avoid introducing
  an L1-only inconsistency; flagged for a future cross-level alt-text spelling sweep.
- **Q05 / Q12 active correct_answer semantics:** these single-image rows are
  NUMERIC_ENTRY at head but their answers ("B", "A") are short letter strings, not
  numbers. The founder end-state is single-MC. Not re-modeled here (no clear-cut wiring;
  the rows are already active and gradeable as exact text). Recorded for the eventual
  MC conversion pass.

**Counts:** 28 items / 20 faithful / 0 fixed / 8 blocked.

Faithful + active (20): Q02, Q03, Q04, Q05, Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q19,
Q20, Q21, Q22, Q23, Q24, Q27, Q28.

**Blocked detail (8 — all correctly held; no clear-cut fix available):**
- SAM-L1-Q01 — capability: select-multiple input not shipped (single scene, no tiles).
- SAM-L1-Q06 — capability: rendered click-choices for pattern-next not wired.
- SAM-L1-Q07 — ambiguous: authoring answer_model defines no correct option; low tractability.
- SAM-L1-Q08 — capability: multi-part / partial-credit (/3) format not in schema (blocker E).
- SAM-L1-Q09 — permanently inactive: oral rote count, no auto-grade path.
- SAM-L1-Q18 — permanently inactive: oral count + marking, no clean auto-grade.
- SAM-L1-Q25 — capability: equation-set input not wired; correctly deactivated under guardrail.
- SAM-L1-Q26 — capability: select-multiple input not shipped (+ source-vs-authoring count FLAG: crop shows 17 candies, authoring note says 15).
