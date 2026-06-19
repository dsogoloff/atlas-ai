# Source-vs-authored faithfulness audit — SUMMARY (2026-06-19)

Autonomous overnight run. Every converted level audited row-by-row against the
**actual source** (each crop/page opened and viewed), with clear-cut fixes applied
in-pass and everything else recorded BLOCKED/FLAGGED. One PR per level; per-level
tables in `scripts/conversion/audit/<level>-audit.md`.

## Per-level results

| Level | Items | Faithful | Fixed | Blocked/flagged | PR | Migration |
|---|---|---|---|---|---|---|
| 0A | 18 | 12 | 0 | 6 | #90 | none (zero fixes) |
| 0B | 15 | 15 | 0 | 1 | #91 | none |
| 0C | 16 | 13 | 0 | 3 | #92 | none |
| L1 | 28 | 20 | 0 | 8 | #93 | none |
| L2 | 22 | 22 | **7** | 0 | #94 | 20260619050000 |
| L3+ (L3–L6) | 114 | 107 | **3** | ~4 | #95 | 20260619060000 |
| **Total** | **213** | **189** | **10** | **~23** | — | — |

Plus **PR #89** — re-land of `SAM-L0C-Q11 → Q11A–D` (4× CLICK_IMAGE_SINGLE), which
missed the #88 merge (merged at lane head `2e59c15`, before that commit). 0C's
Q11 is "FIXED-elsewhere" in #89.

## Fixes applied (10, all source-verified; L2 & L3+ verify-bar GREEN)

**L2 (PR #94) — 7 rows activated + imaged.** Q02/Q03/Q05/Q12/Q15/Q16/Q18 were
authored active+imaged in `l2-authoring`, but the l2-overlay's
`INSERT … on conflict do nothing` no-opped against the pre-existing Stage-4 rows
(loaded inactive, `image_required` but **no `image_path`**), and no activation
UPDATE was ever written for them — so 7 faithful rows sat inactive/imageless.
Fixed via UPDATE migration (wire the already-uploaded root-bucket image key +
`is_active=true`; content otherwise unchanged). **Review this PR most carefully —
it changes the served pool.**

**L3+ (PR #95) — 3 verbatim corrections.**
- `SAM-L5-Q09` — stem fractions wrong (`1 1/4`,`1 1/6` → source `1 3/4`,`1 5/6`); stored answer `5 1/12` is correct for the source fractions, kept.
- `SAM-L6-Q07` — option[0] flipped operator (`4 ÷ 10` → source `4 × 10`); restored verbatim options, `correct_index` unchanged.
- `SAM-L6-Q20` — garbled options + `correct_index` on the wrong unsimplified value; restored source options so index 2 = `1 2/25` (answer key (3)).

## BLOCKED / FLAGGED — founder decision queue

**Content contradicts source (needs founder re-confirm — these were marked "founder-verified" but the now-available renders disagree):**
- `SAM-L3-Q15` — stored `1/6 + 3/6 = 4/6`; source page is `3/5 + 1/5 = 4/5`. **Also off-level** (1B fraction-addition reaching the young band). Re-confirm content **and** banding.
- `SAM-L4-Q18` — stored options `[1/2,3/4,5/3,1/12]` ans `5/3`; source is `[3/8,2/5,1/2,5/12]` ans `1/2`.
- `SAM-L3-Q17` — source is MC (key (3)=25); loaded as NUMERIC_ENTRY ans "3". Format/answer judgment (parallel to the founder-decided Q22). Parked.

**Answer-key / transcription conflicts:**
- `SAM-L0B-Q06` — stem "tap numbers greater than 6" vs key "Color 7 and 6"; bare-number-line crop (no printed numerals). Intended tiles + correct subset undetermined.
- `SAM-L0C-Q15` — option-set transcription error (docx circle set `{6,2,1,5,10,12,24,35,40,41}` vs authored `{1,10,26,5,12,24,35,41,40}` — phantom 26, missing 6/2). All correct odd answers still present, so nothing served is wrong; **durable fix lives in the overlay + a not-yet-existing Odd/Even taxonomy code**, so a one-off SQL edit would be overwritten by `apply-l0-overlay`.

**Taxonomy gaps (NULL content_id / no locked code) — content faithful, can't be cleanly placed:**
- `SAM-L0A-Q03`, `SAM-L0A-Q15` (size / position comparison at 0A); `SAM-L0C-Q05` (Comparing & Ordering); `SAM-L0C-Q15` (Odd & Even). `SAM-L0B-Q08` content_id mapping nuance (docx "Number Bonds to 5" vs authored `l0a-whole_numbers-2` = "to 10").

**Missing source art / no crop (need curated images before any change):**
- `SAM-L0A-Q09`, `SAM-L0A-Q12` (no source crop); `SAM-L0A-Q17` (no group-of-5-balloons stimulus; held-A).

**Held on unshipped player capability / oral / parked (correctly inactive — no action):**
- L1: `Q01`/`Q06`/`Q26` (select-multiple / pattern-pick), `Q07` (ambiguous, no correct in model), `Q08` (multi-part /3 format absent), `Q09`/`Q18` (oral), `Q25` (equation-set not wired — correctly deactivated).
- 0A held-C image-tap rows are single-scene (not discrete tiles) — correctly held.
- `SAM-L0C-Q11` interaction (number line + per-blank toggles) — handled as 4× single-select in #89; the ATLAS-side per-blank `options[]` capability remains the cleaner long-term fix.

**Pedagogy / answer-model flags (not clear-cut):**
- `SAM-L0A-Q08` — the box-reference object (car, `0A-08_1`) is included as a tappable tile alongside the 3 real choices; answer-model review.
- `SAM-L1-Q26` — authoring total 15 vs source crop 17 (not serve-facing).
- `SAM-L1-Q05`/`Q12` — letter-string answers on NUMERIC_ENTRY, pending the founder's single-MC end-state.

**Banding flags (recorded, NOT re-banded):** `SAM-L3-Q15` (1B), `SAM-L5-Q15` (3A), `SAM-L5-Q22` (3A), `SAM-L3-Q06`/`Q08` (1B).

**Minor spelling:** `SAM-L1-Q13`/`Q15` `image_alt` use British "coloured" (left for cross-level consistency; americanize in a follow-up if desired).

## Systemic findings (tech debt)

1. **Overlay activation pattern is structurally dead against pre-existing rows.**
   `INSERT … on conflict (tenant_id, external_id) do nothing` silently no-ops when
   the row already exists — so "activate via overlay re-insert" never takes effect
   (this is exactly why the 7 L2 rows were stuck inactive). **Activations must be
   `UPDATE`s.** Audit any other overlay that "activates" via re-INSERT.
2. **Merge-conflict note:** PRs #89–#95 each append to `supabase/seed.sql` (and #94
   touches the uploader manifest) near the same region; expect conflicts when
   merging the 2nd+ PR. Merge order is the founder's call; resolve by keeping all
   blocks. The audit-`.md` files don't conflict (distinct files).

## What was NOT done (by rule)
No re-banding, no taxonomy-code invention, no illustrated-art synthesis, no
not-yet-wired-format authoring, no merges/resets. When the faithful fix wasn't
unambiguous → BLOCKED, not a guess. Net: **10 clear-cut fixes; ~23 items routed to
the decision queue above; 189/213 already faithful.**
