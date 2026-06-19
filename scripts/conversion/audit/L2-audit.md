# L2 source-vs-authored audit (2026-06-19)

Scope: every SAM-L2 row (Q01–Q22), active and held. Every image-bearing row's source
crop was opened and viewed (Read) before judging; text-only rows have no crop (the L2
worksheet item is text). Authored intent = `scripts/conversion/overlay/l2-authoring.json`
+ `l2-activation.json`; live state = final `supabase/seed.sql` DB state after the full
file runs (multiple layered blocks; later writers win). Source crops:
`atlas-ai-l2/scripts/conversion/input/l2-art/` + generated
`output/l2-art-generated/q-sam-l2-q05-seashell-graph.png`.

Key structural finding: the **l2-overlay activation INSERT** (seed.sql ~2481 /
migration 20260614130000) is a dead no-op — it re-INSERTs the 11 already-present ids
with `on conflict do nothing`, so its real `image_path` + `is_active=true` never land.
The 7 image-essential rows (Q02/Q03/Q05/Q12/Q15/Q16/Q18) were therefore stuck INACTIVE
with `image_required:true` but **no `image_path`**, even though their art exists at
source and is already wired into the uploader's PREEXISTING_L2_BACKFILL. Fixed by an
activation UPDATE mirroring the proven L1 art-activation pattern (20260614120001).

| external_id | source interaction | authored format | faithful | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L2-Q01 | text MC: 1 and __ make 10 | MULTIPLE_CHOICE | yes | none (text; no crop) | OK (existing active) |
| SAM-L2-Q02 | count triangles in figure | MULTIPLE_CHOICE +img | yes | held INACTIVE, no image_path (overlay no-op); crop L2-2 viewed, ans 5 founder-confirmed | FIXED: wire q-sam-l2-q02-triangles.png + activate |
| SAM-L2-Q03 | name 2 shapes of figure | MULTIPLE_CHOICE +img | yes | held INACTIVE, no image_path; crop L2-3 viewed = green half-circle + orange triangle → opt "half circle and triangle" | FIXED: wire q-sam-l2-q03-composite-shape.png + activate |
| SAM-L2-Q04 | name-ordering logic puzzle | TEXT_ENTRY | yes | INACTIVE by founder direction (20260611014520); crop L2-4 decorative bank scene; ans Ethan from text | OK (correctly held — founder-directed) |
| SAM-L2-Q05 | picture-graph difference | NUMERIC_ENTRY +img | yes | held INACTIVE, no image_path; generated graph viewed = Jimmy 9/Adam 6/Tom 11/Mark 15 → 15−6=9 | FIXED: wire q-sam-l2-q05-seashell-graph.png + activate |
| SAM-L2-Q06 | click base-ten picture = 37 | CLICK_IMAGE_SINGLE | yes | crops L2-6_1..4 viewed: opt1 loose ones, opt2 100, opt3 37 (correct=t3), opt4 73; live row active w/ tiles wired (l2/sam-l2-q06-opt*.png) | OK (active; capability now wired) |
| SAM-L2-Q07 | text MC: 76 = __ tens 6 ones | MULTIPLE_CHOICE | yes | none (text; no crop) | OK (existing active) |
| SAM-L2-Q08 | write 96 in words | TEXT_ENTRY | yes | text; no crop (authoring "Type"/"ninety-six" vs live "Write"/"Ninety-six" — wording, no source to arbitrate) | OK (active; non-verbatim wording BLOCKED-no-source, not fixed) |
| SAM-L2-Q09 | text MC: 3 more than 54 | MULTIPLE_CHOICE | yes | none (text; no crop) | OK (existing active) |
| SAM-L2-Q10 | order 68/81/9 ascending | DRAG_DROP | yes | crop L2-10 (folders) decorative, numbers in stem | OK (existing active) |
| SAM-L2-Q11 | 35 − 7 word problem | NUMERIC_ENTRY | yes | crop L2-11 (apples) decorative | OK (existing active) |
| SAM-L2-Q12 | read ruler length of car | NUMERIC_ENTRY +img | yes | held INACTIVE, no image_path; crop L2-12 viewed = car spans 2→9 cm = 7 | FIXED: wire q-sam-l2-q12-toy-car-ruler.png + activate |
| SAM-L2-Q13 | 3×4 = repeated addition | MULTIPLE_CHOICE | yes | none (text; no crop) | OK (active) |
| SAM-L2-Q14 | 12 birds / 3 cages | MULTIPLE_CHOICE | yes | crop L2-14 (12 birds) decorative | OK (existing active) |
| SAM-L2-Q15 | read clock time | MULTIPLE_CHOICE +img | yes | held INACTIVE, no image_path; crop L2-15 viewed = hands at 2:55 → 2:55 pm (opt 4) | FIXED: wire q-sam-l2-q15-clock.png + activate |
| SAM-L2-Q16 | count coins value | MULTIPLE_CHOICE +img | yes | held INACTIVE, no image_path; crop L2-16 viewed = 5+10+20+50 = 85¢ | FIXED: wire q-sam-l2-q16-coins.png + activate |
| SAM-L2-Q17 | $45 − $29 word problem | NUMERIC_ENTRY | yes | none (text; no crop) | OK (existing active) |
| SAM-L2-Q18 | count base-ten blocks | NUMERIC_ENTRY +img | yes | held INACTIVE, no image_path; crop L2-18 viewed = 2 hundred-flats + 4 ones = 204 | FIXED: wire q-sam-l2-q18-base-ten.png + activate |
| SAM-L2-Q19 | expanded → standard form | NUMERIC_ENTRY | yes | none (text; no crop) | OK (existing active) |
| SAM-L2-Q20 | 100 more than 504 | NUMERIC_ENTRY | yes | none (text; no crop) | OK (existing active) |
| SAM-L2-Q21 | order 4 numbers descending | DRAG_DROP | yes | none (text; no crop) | OK (existing active) |
| SAM-L2-Q22 | skip-count back pattern | NUMERIC_ENTRY | yes | none (text; no crop) | OK (existing active) |

**Counts:** 22 items / 22 faithful / 7 fixed / 0 blocked.

**Fixed detail:** Q02, Q03, Q05, Q12, Q15, Q16, Q18 — each was source-faithful but stuck
INACTIVE with no `image_path` because the l2-overlay activation INSERT no-opped against
the pre-existing Stage 4 rows. One migration (20260619050000_audit_L2_fixes.sql, mirrored
into seed.sql) wires the already-uploaded root-bucket image key onto each row (`||` merge,
content otherwise unchanged) and flips `is_active=true` (guarded `is_active=false`). The
guardrail `questions_held_rows_inactive` permits this (no `_authoring` key on these rows).

**Blocked detail:** none. (Q04 left INACTIVE per founder direction = correctly held, not a
defect. Q08 stem wording "Write" vs authoring "Type" is a no-source-to-arbitrate wording
nuance, not a clear-cut fix — left as-is.)
