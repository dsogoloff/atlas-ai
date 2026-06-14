# L1 Re-authoring — Parked / Divergent Items

Lane: `lane/l1-reauthoring`. Generated alongside `pnpm convert:apply-overlay`
re-author pass (2026-06-14). Source of truth for the per-item metadata is
`scripts/conversion/overlay/l1-authoring.json`; this file is the plain-English
record of every item that is NOT live, and why.

After this pass: **6 active** (Q20, Q21, Q22, Q23, Q24, Q28), **1 deactivated**
(Q25), the rest held / parked / oral.

---

## (a) ART globally not attachable this pass — held though founder-targeted LIVE

Per-question art lives in a Supabase Storage bucket that cannot be uploaded to in
this environment, there is no page-render tool, and we do not guess image
fragments. Per the founder's locked rule "every ACTIVE item must be
auto-gradeable", any item whose answer depends on an unseen picture MUST stay
inactive (held, blocker A = awaiting curated image). The following are founder
targets for LIVE but are held on art:

- **Q03** — "Which is longer, the toy car or the toy plane?" Single-MC wired;
  the length is a visual fact unanswerable without the picture. Blocker A.
- **Q04** — Lin / George height compare. Single-MC target; art-blocked. Banked
  `is_active=false` (action `none`); stays level **1A** (level correction parked
  — see (e)). Blocker A.
- **Q05** — Group A (land animals) / Group B (sea animals); stingray → Group B.
  Single-MC target; art-blocked. Banked inactive (action `none`); stays **1A**.
  Blocker A.
- **Q06** — "Click on the flower that comes next in the pattern" (AB flower row +
  3 choice flowers; correct = purple). Click-on-visual target; art-blocked.
  Blocker A (also B, pattern-sequence render).
- **Q10** — count 9 grey dots. Numeric answer already wired; the count needs the
  dot picture. Banked inactive (action `none`); stays **1A**. Blocker A.
- **Q12** — Set A (7 items) vs Set B (6 items); correct Set A. Single-MC target;
  art-blocked. Banked inactive (action `none`); stays **1A**. Blocker A.
- **Q16** — "Who is in front of the tree, Louis or Andy?" (Andy). Single-MC
  wired; the spatial fact needs the picture. Blocker A.

## (b) Q08 — /3 multi-part unsupported

Founder target = three single-MC sub-items (ball / box / shoe positions) scored
/3, LIVE. Held because the schema has no multi-part / per-blank
`question_format`, and a /3 partial-credit item conflicts with the binary
correct/incorrect grading rule. Held until a multi-part format + partial-credit
scoring exists. `requires_format_swap=true`, blocker E (also A for the shelf
art).

## (c) Q15 — 3D solids, no primitive

Match each solid to its name (sphere, cylinder, cube, cone). PARKED (founder):
there is no 3D-solid primitive and no bespoke art, and we are not building a
primitive this pass. `requires_format_swap=true`, blocker F (also A, B).

## (d) Q11 / Q17 / Q27 — corrected from prior active-reframe to held

The prior pass had reframed these as LIVE text-only interactions; the founder
rejected those reframes. Corrected to their true tasks and held:

- **Q11** — number ↔ number-word **matching** (1–10), NOT a text-ordering task.
  `match-pairs` model. Held until a matching input exists.
  `requires_format_swap=true`, blocker C. Level mapped **KA** on insert.
- **Q17** — the original 4-**PICTURE** ordering of Tom's day (Brushing teeth →
  Walking to school → Studying in class → Sleeping), NOT a text-label ordering.
  Held until the 4 day-scene images are curated (art-blocked). Format stays
  DRAG_DROP; `requires_format_swap=false`; blocker A. Level mapped **KB**.
- **Q27** — number ↔ number-word **matching** (11–20), NOT a LIVE ordering task.
  This is the Q27 mis-author the founder flagged. `match-pairs` model. Held until
  a matching input exists. `requires_format_swap=true`, blocker C. Level **1B**.

## (e) Banked-row level corrections parked

Q04, Q05, Q10, Q12 carry their target metadata here but their banked rows stay
level **1A**. The applier's `update` action supports only
format/content/is_active/content_merge — it cannot set `level`. The intended
level corrections for these banked rows are therefore parked for a future pass
that can re-band banked rows.

## (f) Q26 — re-modeled

Re-modeled from the prior count-total(17) numeric item to the founder's actual
worksheet item: "Select 10 candies" — select-multiple-MC, any 10 of 15 candies
(`select-count`, count 10, total 15). Held until a select-multiple input exists.
`requires_format_swap=true`, blocker C. Kept level **1A**.

---

## Genuinely-inactive (oral) — no auto-grade path

- **Q09** — "Count aloud from 1 to 10." Oral rote count; answer model null.
  Instructor/print use only. Level mapped **KA** on insert.
- **Q18** — "Count aloud from 1 to 30. Then write the number 8. Which activity
  took a longer time to finish? Color the box." Oral count + marking; answer
  model null. Level mapped **KB** on insert.

## Other held inserts (input gaps, not art-only)

- **Q01** — "Click on the things that are the same color" (tulip, waterdrop, car,
  apple, hat, balloon; correct red set = tulip + car + hat). select-multiple-MC.
  `requires_format_swap=true`, blocker D (also A). Level **KA**.
- **Q02** — "Click on the bigger animal" (elephant vs bear; elephant). Single-MC;
  art-blocked. Blocker A. Level **KA**.
- **Q07** — "Match the pieces to complete the picture." Low-tractability
  picture-assembly/matching; needs curated visual + matching input.
  `requires_format_swap=true`, blocker A (also B). Level **KA**.
- **Q13** — match each 2D shape to its name. Needs shape glyphs rendered +
  matching input. `requires_format_swap=true`, blocker A (also B). Level **KA**.
- **Q14** — "___ apples and ___ apples make 8 apples" (5 and 3). Multi-blank +
  apple visual. `requires_format_swap=true`, blocker E (also A). Level **KA**.
- **Q19** — conservation-of-number: count (9) + same? (yes), two blanks. Banked
  inactive (action `none`); left byte-for-byte. `requires_format_swap=true`,
  blocker E (also A). Stays **1A**.

## Deactivated

- **Q25** — fact-family 6/8/2 equation-set. Deactivated this pass; carries the
  equation-set model in `content._authoring` + `requires_format_swap=true`, so
  the activation guardrail CHECK forbids a bare `is_active=true` until ATLAS
  wires an equation-set input. Blocker C.

---

## Level enum mapping note (INSERT rows only)

Levels 0A/0B/0C do not exist in the `half_grade_level` enum (KA / KB / 1A / ...).
For INSERT rows, early Level-1 worksheet items were mapped 0A→KA, 0B→KB, 0C→KB.
This is an enum mapping, NOT a re-band to grade 1. `action: none` / `action:
update` rows keep their banked level (the applier cannot set level on update).
