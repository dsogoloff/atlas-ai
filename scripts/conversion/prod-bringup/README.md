# Prod bring-up — schema reconciliation (review artifacts)

**Analysis only. Nothing here was run against prod.** These are SQL artifacts for the
founder to run/apply manually in the **prod** Studio SQL editor, in order, with review
between steps.

- **Target:** `atlas-assessment` = `ntfaqzueppqymfkefadm` — the **LIVE** DB. **NOT**
  `atlas-assessment-2` (dead).
- Prod was hand-applied via Studio (no CI). Confirmed 2026-06-27 it has **no migration
  log** (`supabase_migrations.schema_migrations` absent), so the inspection **trusts
  `information_schema` / `pg_catalog`, not the migration log.**
- Confirmed gaps (per ATLAS): `questions.short_test_eligible` column missing;
  `question-images` storage bucket missing.

## Chosen path: **Option B** — rebuild prod schema to repo HEAD, discard junk, then audited bank load

The founder chose Option B over the additive-only catch-up (Option A, `02-…`, kept for
reference). Option B reconciles the schema **including** the non-additive `strand` enum
recast, then clears the placeholder question rows so the Step-4 audited load starts clean.
Because Option B is destructive, it is **gated on a user-data safety proof** (`03-…`):
nothing destructive runs until prod is shown to hold zero real families.

## Files

1. **`01-inspect-prod-schema.sql`** — 100% read-only **schema** inspection. Enum types +
   values (esp. `strand` — the high-risk one), `questions` columns, serve/report tables,
   `assessment_sessions` columns, constraints, active question counts by level, taxonomy
   row count, storage bucket + image-object count. Migration-log read is guarded (prod has
   none). **Zero writes.**

2. **`02-catchup-additive-schema.sql`** — *(Option A, SUPERSEDED by `04` for the chosen
   path)* additive-only catch-up (no DROP, no recast). Retained as the reference for the
   purely-additive subset.

3. **`03-inspect-prod-userdata.sql`** — 100% read-only **user-data safety gate**. Row
   counts + tiny masked samples for `parents`, `children`, `assessment_sessions`,
   `responses`, `question_access_log`, `consent_records`, plus `auth.users` count if
   reachable. Classifies parent emails real-vs-test/seed and reports `created_at` ranges.
   **Must PASS (zero real families) before any destructive step.** Zero writes.

4. **`04-rebuild-prod-schema-optionB.sql`** — the Option B rebuild. Ordered
   types → enum reconciliation → tables → columns/FKs → constraints, each tagged with its
   source migration. **Section A1** is the non-additive `strand` recast (self-skips if prod
   is already lowercase). **Sections A2–A7** are additive/idempotent. **Section Z** is the
   single data-destructive step (clear placeholder question rows), fenced and safety-gated
   on `responses`/`question_access_log` being empty. *(Review artifact — DO NOT apply blindly.)*

5. **`05-load-bank-prod.ts`** — the audited bank loader (the final content step). It does
   NOT replay seed.sql (no `exec_sql` RPC / no prod DB password). Instead it reads the
   **audited LOCAL DB** (the source of truth — final `is_active`/`short_test_eligible`/
   `content`/`content_id` exist only as the materialized seed result) and **upserts**
   `tax_*` then `questions` into prod via PostgREST. Reading only those tables structurally
   excludes every parent/child/session/consent/QA row; the one dev artifact in `questions`
   (`PLACEHOLDER-Q-IMG-GRID-001`) is dropped by prefix. FKs + `content_id` are remapped by
   natural CODE across DBs; upserts key on `(tenant_id, code)` / `(tenant_id, external_id)`
   so re-runs converge. Default = **DRY/COUNT** (reads local + prod read-only, prints the
   per-level parity table, NO writes); `--prod` performs the live upsert behind the same
   `.env.prod.local` gate + PROD-TARGET banner as the image uploader.
   - `pnpm convert:load-bank:prod:dry` — dry run / parity table (no writes).
   - `pnpm convert:load-bank:prod` — live prod upsert (founder-gated; run after review).

## Order of the wider bring-up (Option B)

1. **Inspect schema** — run `01-…`. Confirm the `strand` enum case + which gaps exist.
2. **Prove no real data** — run `03-…`. Must show zero real families (see its decision rule).
3. **Rebuild schema** — run `04-…` section by section (A1 recast → A2–A7 additive).
4. **Clear placeholders** — run `04-…` **Section Z** only after steps 2–3 are clear.
5. **Create the `question-images` bucket** in prod (DDL: `20260512000000`). *(not in these files)*
6. **Retarget the uploader to prod** + upload crops. *(founder-gated on creds)*
7. **Audited bank load (0A–L4)** — taxonomy reference rows first, then images, then activate
   image-essential rows. *(audited prod load, never a dev `seed.sql` run)*
8. **Verify a clean serve path** — no missing-image 500s, no QA-seed contamination.

## What the Option B rebuild (`04-…`) covers (repo migration → object)

| Object | Source migration |
| --- | --- |
| **`strand` enum recast** uppercase→lowercase (questions / misconceptions / curriculum_recommendations) | `20260511000200` |
| `operation_type`, `representation_kind`, `assessment_test_type` enums (guarded) | `20260507000000`, `20260611090000` |
| `questions` norm columns (`word_count`/`operation_type`/`num_operations`/`representation`) + checks | `20260507000000` |
| `question_format` += `TEXT_ENTRY` | `20260610170000` |
| `question_format` += `SELECT_MULTIPLE`/`VISUAL_MATCHING`/`MULTI_BLANK`/`EQUATION_SET` | `20260614120000` |
| `question_format` += `CLICK_IMAGE_SINGLE`/`CLICK_IMAGE_MULTI`/`IMAGE_ORDERING` | `20260615120000` |
| `half_grade_level` += `0A`/`0B`/`0C` | `20260616120000` |
| `questions.short_test_eligible` **(confirmed missing)** | `20260616120050` |
| `tax_strands`/`tax_sub_strands`/`tax_levels`/`tax_content` (+ indexes + RLS SELECT) | `20260525000001` |
| `questions.content_id` FK → `tax_content` | `20260525000003` |
| `assessment_sessions.test_type` | `20260611090000` |
| `assessment_sessions.short_test_outcome` | `20260621130000` |
| `assessment_sessions.engine_prior_version` | `20260510000000` |
| `responses_session_question_unique` constraint | `20260612090000` |
| `questions_held_rows_inactive` CHECK | `20260613120000` |
| `report_narrations` (+ `findings_strengths`/`findings_growth_areas`) | `20260525000000`, `20260526000000` |
| `consent_records` (+ indexes + RLS SELECT) | `20260528000000` |

Where the **strand recast** sits: **Section A1**, first, as a single atomic self-guarding
`DO` block — it recasts only if prod still holds the old uppercase labels and otherwise
changes nothing, so the bank's lowercase strand values will load.

**Strand collapse-collision pre-clear (A1):** the recast collapses both `OPERATIONS` and
`WORD_PROBLEMS` into `operations_algorithms`. The only unique/PK constraint on a
strand-typed column anywhere in the schema is `curriculum_recommendations
UNIQUE(tenant_id, strand, level)`, so two placeholder rows (`OPERATIONS@2B`,
`WORD_PROBLEMS@2B`) would collapse to the same key and the index rebuild fails with
`23505` (observed in prod). A1 therefore `DELETE`s `curriculum_recommendations`
(pre-load scaffolding Option B discards) **before** the cast, gated on the same
prod-empty predicate as Section Z. Collision check of the other strand-typed tables:
`questions` — unique is `(tenant_id, external_id)`, its strand index is non-unique → no
collision; `misconceptions` — unique is `(tenant_id, code)` → no collision.

What the **destructive sections** do: **A1** clears `curriculum_recommendations`
placeholder rows (above); **Section Z** previews then `DELETE`s the existing placeholder
`questions` rows (expected ~5 per inspection §8). Both refuse to run unless `responses`
and `question_access_log` are empty. They are the only data-destructive statements in the
file and clear the bank for the Step-7 audited load.

## Not in `04-…` (separate steps)

- **`question-images` bucket** (`20260512000000`) — storage creation = bring-up step 5.
- **Taxonomy reference rows + question-bank rows** — DATA (bring-up step 7), not schema.
  `content_id` stays NULL until the `tax_content` rows exist.
- **`admins` table** (`20260625120400`) — likely already live; see `02-…` Section 6 if not.
- **`image_path` / `image_required` / `image_alt`** — NOT columns; they are keys inside the
  `questions.content` JSONB and arrive with the bank load, so they need no schema change.

## L5/L6

No L5/L6-specific schema exists — L5/L6 reuses the same columns, enum values (`5A`/`6A`
are base `half_grade_level`), taxonomy, and constraints as 0A–L4. L5/L6 bring-up is
**data-only** (load + image upload + the held geometry activation), handled in the load
step.
