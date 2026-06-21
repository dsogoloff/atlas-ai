# Short-test eligibility / comprehensive over-set audit (0A–L4)

**Date:** 2026-06-21 · **Branch:** `lane/young-band-image-activation-audit` · **Trunk:** `ce9a676`
**Scope:** read-only audit of `short_test_eligible` coverage per **strand × booklet**, to
answer ATLAS picker-calibration §7 — can the bank reserve an "over-set" (~15–18
`short_test_eligible` items per strand per level) so the comprehensive picker still has
previous-level reserve after `seen_item_ids` exclusion?

**Headline:** the source key is **already fully honored** — every active, source-`Short=Y`
item is `short_test_eligible=true` (zero key-parity gaps; zero over-flags). The over-set
target is **not reachable at strand granularity anywhere** in 0A–L4, because the
worksheet `Short (Y/N)` key simply does not mark 15–18 items per strand per booklet. This
is a **source-capped ceiling, not an under-flagging gap** — it cannot be closed by
flagging, only by accepting thinner coverage or converting more content (or by changing
the picker to draw previous-level items from the full active bank — see the ATLAS seam).

---

## Method & validation

- **DB final state** computed from `supabase/seed.sql` (the dev DB builds entirely from
  seed; every tenant-scoped migration no-ops before seed creates the tenant). Parser:
  `overset-state.mts` — parses every `insert into questions … (values …)` block
  (first-insert-wins = `on conflict do nothing`), then applies all 213 `update questions`
  statements in file order (single-`=`, `IN (…)` list, and `from t,(values…) v` JOIN
  forms) for `is_active`, `short_test_eligible`, `level`, `strand`, `content_id`. Output:
  `bank-final-state.json` (208 rows).
- **Source key** (column **(b)**) extracted from each worksheet docx's last-page
  "Short Test (Y/N)" summary table: `_extract_short_keys.py` → `source-short-keys.json`.
  Per-level `Short=Y` counts **exactly match** the founder-authored `l1-l4-short-eligible-backfill`
  IN-lists (L1 17Y / L2 21Y / L3 20Y / L4 25Y) — the transcription is source-verified.
- **Booklet** = the picker's S.A.M. booklet level (`levelBand.ts`). The short/comprehensive
  picker filters `(strand, level ∈ levelBand, is_active, short_test_eligible)` and bands by
  **booklet**, where DB half-grades fold: `0A→0A`, `0B→0B`, `0C/KA/KB→0C`, `1A,1B→1`,
  `2A,2B→2`, `3A,3B→3`, `4A,4B→4`. **A child is sampled from the _previous_ booklet.**
- **Independent validation:** the per-booklet `active&STE` pools reproduce the prior
  session's served-crosswalk eligible counts **exactly** — L1-child→booklet-0C = **8**,
  L2-child→booklet-1 = **27** (served cap 25), L3-child→booklet-2 = **25**,
  L4-child→booklet-3 = **13**, booklet-0B = **13**. Parser confirmed correct.

### Structural finding — worksheet questions scatter across booklets

Each worksheet's questions are difficulty-banded into DB half-grades spanning **multiple
booklets**, so a booklet's reserve is an aggregate of several worksheets, not one:

| Worksheet | DB-level distribution | Booklets touched |
|---|---|---|
| L1 (28) | KA 11, 1A 11, KB 3, 1B 3 | **0C** (14) + **1** (14) |
| L2 (22) | 1A 11, 1B 4, 2A 5, 2B 2 | **1** (15) + **2** (7) |
| L3 (20) | 1A 4, 1B 4, 2A 8, 2B 2, 3A 1, 3B 1 | **1** (8) + **2** (10) + **3** (2) |
| L4 (25) | 2A 8, 3A 6, 3B 6, 4A 4, 4B 1 | **2** (8) + **3** (12) + **4** (5) |

Consequence: per-worksheet `Short=Y` totals **overstate** per-booklet reserve. The L4
worksheet has 24 `Short=Y` rows, but only **5** land in booklet 4 (4A/4B); the rest serve
booklets 2–3.

---

## TASK 1 — coverage matrix (per strand × booklet)

Columns: **(a)** active items · **(b)** source `Short=Y` among active (the reservable
ceiling) · `Short=Y` inactive (would-be reserve if activated) · **(c)** active &
`short_test_eligible` · **(d)** = (b)−(c) headroom · over-set verdict vs 15–18.

| Booklet | Strand | (a) active | (b) Short=Y active | Short=Y inactive | (c) active&STE | (d) b−c | vs 15–18 |
|---|---|--:|--:|--:|--:|--:|---|
| 0A | geometry | 12 | 12 | 0 | 12 | 0 | UNDER (12) |
| 0A | number_sense | 4 | 4 | 0 | 4 | 0 | UNDER (4) |
| 0A | operations_algorithms | 3 | 2 | 0 | 2 | 0 | UNDER (2) |
| 0B | measurement | 1 | 1 | 0 | 1 | 0 | UNDER (1) |
| 0B | number_sense | 8 | 8 | 1 | 8 | 0 | UNDER (8) |
| 0B | operations_algorithms | 4 | 4 | 0 | 4 | 0 | UNDER (4) |
| 0C | geometry | 5 | 2 | 2 | 2 | 0 | UNDER (2) |
| 0C | measurement | 2 | 2 | 0 | 2 | 0 | UNDER (2) |
| 0C | number_sense | 5 | 4 | 1 | 4 | 0 | UNDER (4) |
| 0C | operations_algorithms | 1 | 0 | 0 | 0 | 0 | UNDER (0) |
| 1 | data_statistics | 1 | 1 | 0 | 1 | 0 | UNDER (1) |
| 1 | fractions_decimals | 1 | 0 | 0 | 0 | 0 | UNDER (0) |
| 1 | geometry | 4 | 4 | 1 | 4 | 0 | UNDER (4) |
| 1 | measurement | 7 | 7 | 0 | 7 | 0 | UNDER (7) |
| 1 | number_sense | 17 | 12 | 1 | 12 | 0 | UNDER (12) |
| 1 | operations_algorithms | 3 | 3 | 0 | 3 | 0 | UNDER (3) |
| 2 | data_statistics | 1 | 1 | 0 | 1 | 0 | UNDER (1) |
| 2 | fractions_decimals | 2 | 2 | 0 | 2 | 0 | UNDER (2) |
| 2 | geometry | 2 | 2 | 0 | 2 | 0 | UNDER (2) |
| 2 | measurement | 3 | 3 | 0 | 3 | 0 | UNDER (3) |
| 2 | number_sense | 13 | 13 | 0 | 13 | 0 | UNDER (13) |
| 2 | operations_algorithms | 4 | 4 | 0 | 4 | 0 | UNDER (4) |
| 3 | data_statistics | 1 | 1 | 0 | 1 | 0 | UNDER (1) |
| 3 | fractions_decimals | 3 | 0 | 0 | 0 | 0 | UNDER (0) |
| 3 | measurement | 3 | 3 | 0 | 3 | 0 | UNDER (3) |
| 3 | number_sense | 7 | 5 | 0 | 5 | 0 | UNDER (5) |
| 3 | operations_algorithms | 4 | 4 | 0 | 4 | 0 | UNDER (4) |
| 4 | data_statistics | 0 | 0 | 0 | 0 | 0 | UNDER (0) |
| 4 | fractions_decimals | 16 | 0 | 0 | 0 | 0 | UNDER (0) |
| 4 | geometry | 3 | 0 | 0 | 0 | 0 | UNDER (0) |
| 4 | number_sense | 14 | 4 | 0 | 4 | 0 | UNDER (4) |
| 4 | operations_algorithms | 4 | 1 | 0 | 1 | 0 | UNDER (1) |

**Every strand × booklet cell is UNDER the 15–18 over-set target.** The richest cells are
booklet-1 / number_sense (12) and booklet-2 / number_sense (13). `(d) = 0` in every cell.

### Booklet roll-up (across strands = the per-booklet served pool)

| Booklet | active | Short=Y active | Short=Y inactive | active&STE | ceiling vs 15–18 |
|---|--:|--:|--:|--:|---|
| 0A | 19 | 18 | 0 | 18 | **AT** (18) |
| 0B | 13 | 13 | 1 | 13 | UNDER (13) |
| 0C | 13 | 8 | 3 | 8 | UNDER (8) |
| 1 | 33 | 27 | 2 | 27 | **OVER** (27) |
| 2 | 25 | 25 | 0 | 25 | **OVER** (25) |
| 3 | 18 | 13 | 0 | 13 | UNDER (13) |
| 4 | 37 | 5 | 0 | 5 | UNDER (5) |

At **booklet granularity** (all strands pooled), booklets **1 (27)** and **2 (25)** exceed
target, **0A (18)** is at target, and **0B (13) / 0C (8) / 3 (13) / 4 (5)** are under —
booklet 4 critically so. At **strand granularity** nothing reaches target anywhere.

---

## TASK 2 — close key-parity gaps (source-confirmed)

**Result: ZERO rows to flag.** There is no active, source-`Short=Y` row that is not already
`short_test_eligible=true`. `(d) = 0` in every cell; the `l1-l4-short-eligible-backfill`
(migration `20260619080000`) and the young-band L0 authoring already set
`short_test_eligible = true` for exactly the source-`Short=Y` set. **No UPDATE applied; no
migration written; no seed change.** Flagging anything further would require marking
`Short=N` items eligible, which the locked source-key rule forbids.

**Integrity cross-checks (both clean):**
- **Over-flag check** — rows with `short_test_eligible=true` but source `Short ≠ Y`: **none.**
  The locked rule (never flag what the key doesn't mark `Short=Y`) is currently satisfied.
- **Short=Y inactive rows** (already `STE=true`, gated by activation/format, not parity):
  `SAM-L0C-Q11` (retired → replaced by active Q11A–D), `SAM-L1-Q06/Q08` (KA geometry,
  unwired format), `SAM-L1-Q18` (KB oral), `SAM-L2-Q04` (founder-directed deactivation),
  `SAM-L3-Q19` (held). These need **activation**, not flagging — routed to the content
  queue below; do not flag/alter.

---

## TASK 3 — residual (source-key ceiling below target) + decision queue

After Task 2 (a no-op), the residual is entirely the **source-key ceiling**, which we may
not override. Per the locked rule we do **not** pad the source.

### Cells where the bank physically cannot reserve 15–18

- **Per strand × booklet: ALL cells fall short.** No strand has >13 `Short=Y` active items
  in any booklet (max: booklet-2 number_sense = 13). If the over-set must be per-strand, the
  shortfall is the full gap from each cell's ceiling to 15 — unclosable from the existing
  key.
- **Per booklet (all strands):** shortfalls vs 15 — **0C** ceiling 8 (short 7), **4**
  ceiling 5 (short 10), **0B** 13 (short 2), **3** 13 (short 2). Booklets **1 (27)** and
  **2 (25)** have ample reserve; **0A (18)** is at target.

### Source `Short=Y` tasks with NO DB row (content gap — converter-skipped)

`SAM-L3-Q04`, `SAM-L3-Q23`, `SAM-L4-Q17` are marked `Short=Y` in the key but were skipped by
the converter (no loaded row), so they cannot be flagged. Recoverable only by re-authoring
the skipped questions.

### Decision queue (route to NEXT_ACTIONS — do NOT decide here)

1. **Accept thinner per-strand comprehensive coverage**, OR **commission more converted
   content** for the thin booklets (esp. booklet 4 = 5, booklet 0C = 8). The source key
   caps eligibility; growing the over-set legitimately means converting/marking more
   `Short=Y` source items, which is a content + founder-key decision.
2. **★ ATLAS cross-topic seam (flag back, do not decide):** the per-booklet **full active
   bank is far larger than the STE subset** — booklet 4 has **37 active vs 5 STE**
   (booklet-4 fractions: 16 active, 0 STE); booklet 3 has 18 active vs 13 STE. If the
   **comprehensive** picker is permitted to draw previous-level items from the **full active
   previous-booklet bank** (not only `short_test_eligible`), the over-set requirement is
   largely **moot** — `short_test_eligible` is the curated *short-test* subset, not a
   comprehensive-coverage constraint. **Open question for ATLAS:** should comprehensive
   previous-level fill use `is_active` only, reserving `short_test_eligible` for the short
   test? If yes, no over-set work is needed.

---

## Reproduce

```
npx tsx scripts/conversion/audit/overset-state.mts          # → bank-final-state.json
PYTHONIOENCODING=utf-8 python scripts/conversion/audit/_extract_short_keys.py \
    > scripts/conversion/audit/source-short-keys.json
node scripts/conversion/audit/build-overset-matrix.mjs      # → matrix + worklists
```

## Caveats

- Final-state parser counts **35** active young-band rows vs the prose **36** in
  `CURRENT_STATE`; the single delta is `SAM-L0C-Q02` (manual number-bond drawing, `Short=N`,
  correctly inactive) — immaterial to the over-set (not eligible, not `Short=Y`).
- The 9 founder-adjudicated young-band exclusions (`SAM-L0A-Q09/Q12`, `L0B-Q01/Q08/Q12/Q13`,
  `L0C-Q01/Q06/Q12`) are all `Short=N` in the docx — consistent with their exclusion; not
  resurfaced here.
- `short_test_eligible` is **source-key-driven** (locked rule #2). Nothing in this audit
  flags an item the worksheet key does not mark `Short=Y`.
