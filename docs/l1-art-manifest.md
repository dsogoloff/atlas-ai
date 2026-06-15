# L1 Art Manifest — extraction + contact-sheet phase (rev 2)

**Lane:** `lane/l1-art-curation` · **Worktree:** `C:\Users\Acer\PROJECTS\atlas-ai-l1-art`
**Source:** `scripts/conversion/input/Level 1 Placement Worksheet.docx` (founder Word file)
**Build:** `l1_render_pages.py` (Word→PDF→200 DPI pages) → `l1_crop.py` + `l1_recrop.py`
(crops) → `l1_contact_sheet.py` (review grid).

Rev 2 applies the founder's contact-sheet review:
- **Q02/Q03** rebuilt **watermark-free** from the raw embedded media (the S.A.M. mark is a
  page overlay, not baked into the art — §7.5 licensed-brand: not shipped).
- **Q13/Q15** exported **per-shape** (one file per match stimulus, keyed by option-id).
- **Q07/Q17** exported **per-element** (scene + each candidate; each day-scene).
- **Q23** kept as one decorative unit; **Q05/Q08/Q16/Q19/Q22** kept as single units.

Extraction only — founder uploads; image wiring + activation is the next phase.

---

## Where the crops live
```
scripts/conversion/output/l1-art/
├── sam-l1-*.png            ← 30 files to upload (see table)
├── _contact-sheet.png      ← review grid (all 30, labelled)
├── _pages/  _raw/  _l1_rendered.pdf   ← reference only, DO NOT upload / can be gitignored
```

## Storage target (read from `src/lib/questionPicker/mintImage.ts` — not guessed)
- **Bucket:** `question-images` — **private**, signed-URL access only
  (`20260512000000_add_question_images_bucket.sql`).
- `image_path` is the **exact object key**, no prefix added by the app.
- **Convention:** per-level folder `l1/` → upload everything into `question-images/l1/`,
  so e.g. `image_path = "l1/sam-l1-q04.png"`.

---

## Crop inventory — 30 files across 19 visual questions
`external_id` number = the worksheet **Evaluation-Results task number** (page 18),
verified against each seeded stem.

### A. Single-image questions (15 files)
| external_id | file → `l1/…` | art | status / activation gate |
|---|---|---|---|
| Q01 | sam-l1-q01.png | 6 objects to sort by colour | staged-inactive · blocker D (select-multiple) + art |
| Q02 | sam-l1-q02.png | elephant vs bear (bigger) — **watermark-free, from raw media** | staged-inactive · blocker A (single-MC) + art |
| Q03 | sam-l1-q03.png | toy car over toy plane (longer) — **watermark-free, from raw media** | staged-inactive · blocker A (single-MC) + art |
| Q04 | sam-l1-q04.png | Lin + George on a baseline (shorter) | **inactive, image-essential — wireable now** |
| Q05 | sam-l1-q05.png | Group A (land) + Group B (sea) boxes + stingray target | **inactive, image-essential — wireable now** · composite (confirmed) |
| Q06 | sam-l1-q06.png | flower pattern row + 3 choice flowers | staged-inactive · blocker A (click-on-visual) + art |
| Q08 | sam-l1-q08.png | shelf with ball / box / shoe | staged-inactive · blocker E (multi-blank) + art · composite (confirmed) |
| Q10 | sam-l1-q10.png | 9 grey dots to count | **inactive, image-essential — wireable now** |
| Q12 | sam-l1-q12.png | Set A (7) + Set B (6) circles | **inactive, image-essential — wireable now** |
| Q14 | sam-l1-q14.png | two boxes of apples (5 + 3) | staged-inactive · blocker E (multi-blank) + art |
| Q16 | sam-l1-q16.png | tree + Louis/Andy figures + names | staged-inactive · blocker A (single-MC) + art · composite (confirmed) |
| Q19 | sam-l1-q19.png | cherries: box of 9 + box of 9 | **inactive, image-essential — wireable now** · composite (confirmed) |
| Q22 | sam-l1-q22.png | number bonds: study (6,3→9) + complete (2,6→?) | ⚠ **already ACTIVE as a TEXT item** — l1-overlay (20260613120100) reworded the stem to state the numbers; NOT wired in the activation migration; image unused **pending founder decision** (keep text vs re-image) |
| Q23 | sam-l1-q23.png | 7 blue + 3 red ribbons | **active text-only** — decorative art (one unit, confirmed) |
| Q26 | sam-l1-q26.png | candies cluster (select 10) | staged-inactive · blocker C (select-multiple) + art |

### B. Q13 — plane-shape matching, PER-SHAPE (4 files)
VISUAL_MATCHING. Each file keyed by the left-item id = the shape it depicts (maps 1:1 to
its right-side word). `l1/…`:
| file | shape (match target) |
|---|---|
| sam-l1-q13-rectangle.png | blue rectangle → "rectangle" |
| sam-l1-q13-triangle.png | pink triangle → "triangle" |
| sam-l1-q13-circle.png | lilac circle → "circle" |
| sam-l1-q13-square.png | orange square → "square" |

Status: staged-inactive · blocker A (VISUAL_MATCHING) + art.

### C. Q15 — solid-shape matching, PER-SHAPE (4 files)
| file | solid (match target) |
|---|---|
| sam-l1-q15-cylinder.png | purple cylinder → "cylinder" |
| sam-l1-q15-cone.png | pink cone → "cone" |
| sam-l1-q15-sphere.png | blue sphere → "sphere" |
| sam-l1-q15-cube.png | green cube → "cube" |

Status: staged-inactive · blocker F (VISUAL_MATCHING) + art.

### D. Q07 — match-to-complete, PER-ELEMENT (3 files) — STAYS HELD
| file | element |
|---|---|
| sam-l1-q07-scene.png | the seascape with the missing right-hand piece |
| sam-l1-q07-option-a.png | candidate tile A (house left / tree right) |
| sam-l1-q07-option-b.png | candidate tile B (tree left / house right) |

Status: staged-inactive · needs click/matching **display plumbing** before activation
(prep art only).

### E. Q17 — Tom's day ordering, PER-SCENE (4 files) — STAYS HELD
Each file keyed by the activity it depicts (maps to a `_authoring` item / `correct_order`).
| file | scene |
|---|---|
| sam-l1-q17-brushing-teeth.png | boy brushing teeth (1st) |
| sam-l1-q17-walking-to-school.png | child walking to school (2nd) |
| sam-l1-q17-studying.png | boy studying at desk (3rd) |
| sam-l1-q17-sleeping.png | child asleep, moon in window (4th) |

Status: staged-inactive · needs the **parked image-ordering lane** before activation
(prep art only).

### No crop (no real art — 9 items)
Oral: Q09, Q18. Text/numeral: Q20, Q21, Q24, Q25, Q28. Number↔word matching (text tiles):
Q11, Q27. (Say the word if you want Q11/Q27 numeral/word tiles as images.)

---

## ⚠ Integration flag for the wiring lane (please route to Track B)
The per-shape (Q13/Q15) and per-element (Q07) images are keyed by **option-id**
(`sam-l1-<qid>-<optionId>.png`). But `docs/l1-input-wiring-spec.md`'s `VISUAL_MATCHING`
shape defines left/right items as `{ id, label }` with only a **single** question-level
`image_path` — there is **no per-left-item image field** in the spec yet. To render these
as individual tiles, the content shape needs a per-item image reference, e.g.
`left: [{ id, label, image_path }]`. Filenames are pre-aligned to the option-id so that
mapping is mechanical once the field exists. **This is a spec gap to confirm with the
wiring lane — not something I'm wiring here.**

## Activation groups (next phase, after upload)
- **6 wireable immediately** (image-essential, inactive, alt-text seeded): Q04, Q05, Q10,
  Q12, Q19, Q22 — set `image_path` + `is_active=true`.
- **Held pending Track B**: Q01, Q02, Q03, Q06, Q08, Q14, Q26 (single-image inputs);
  Q13, Q15 (matching, + per-item image field); Q07 (display plumbing); Q17 (image-ordering lane).
- **Enhancement**: Q23 (already active; attach decorative ribbon art if you want it).

---

## Updated upload instructions
1. Supabase Studio: **local** `http://localhost:54323` (for `pnpm dev`) **or** the **cloud**
   project (for the Vercel preview). Use the environment you'll review in.
2. **Storage** → bucket **`question-images`** → **Create folder** `l1` (lowercase) → open it.
3. **Upload file(s)** — select all **30** `sam-l1-*.png` from
   `C:\Users\Acer\PROJECTS\atlas-ai-l1-art\scripts\conversion\output\l1-art\`
   (only the `sam-l1-*.png` files; none of the `_`-prefixed ones).
4. Spot-check a path reads e.g. `l1/sam-l1-q13-rectangle.png`.
5. Tell me it's done + which environment, and confirm the contact sheet — I'll then wire
   + activate the 6 wireable items.
