# Prod bring-up — Step 1: schema analysis (review artifacts)

**Analysis only. Nothing here was run against prod.** These are SQL artifacts for the
founder to run/apply manually in the **prod** Studio SQL editor, in order, with review
between steps.

- **Target:** `atlas-assessment` = `ntfaqzueppqymfkefadm` — the **LIVE** DB. **NOT**
  `atlas-assessment-2` (dead).
- Prod was hand-applied via Studio (no CI), so its `supabase_migrations.schema_migrations`
  log may not match the real schema. The inspection **trusts `information_schema` /
  `pg_catalog`, not the migration log.**
- Confirmed gaps (per ATLAS): `questions.short_test_eligible` column missing;
  `question-images` storage bucket missing.

## Files

1. **`01-inspect-prod-schema.sql`** — 100% read-only. Reports prod's ACTUAL schema:
   enum types + values (esp. `strand` — the high-risk one), `questions` columns, serve/
   report tables, `assessment_sessions` columns, constraints, active question counts by
   level, taxonomy row count, and the storage bucket + image-object count. Run it first;
   copy results back. **Zero writes.**

2. **`02-catchup-additive-schema.sql`** — additive-only (`CREATE … IF NOT EXISTS` /
   `ADD VALUE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / guarded `ADD CONSTRAINT` /
   guarded `CREATE POLICY`), no DROP, no destructive ALTER, no data writes. Brings prod's
   **schema** up to what the 0A–L4 loader + child serve path + parent report expect.
   Run **after** the inspection, applying the sections the results show are needed (it is
   written to be safe to run wholesale, but review-then-apply on the live DB).

## Order of the wider bring-up (this PR = Step 1 only)

1. **Step 1 (this PR):** inspect → additive schema catch-up. *(analysis artifacts here)*
2. Step 2: create the `question-images` bucket in prod. *(not in these files)*
3. Step 3: retarget the uploader to prod + upload crops. *(founder-gated on creds)*
4. Step 4: load the bank (0A–L4) — images first, then activate image-essential rows;
   includes the taxonomy reference-data seed. *(audited prod load, never a dev seed.sql)*
5. Step 5: verify a clean serve path (no missing-image 500s), no QA-seed contamination.

## What the additive script covers (repo migration → object)

| Object | Source migration |
| --- | --- |
| `operation_type`, `representation_kind` enums (guarded) | `20260507000000` |
| `questions` norm columns (`word_count`/`operation_type`/`num_operations`/`representation`) + checks | `20260507000000` |
| `question_format` += `TEXT_ENTRY` | `20260610170000` |
| `question_format` += `SELECT_MULTIPLE`/`VISUAL_MATCHING`/`MULTI_BLANK`/`EQUATION_SET` | `20260614120000` |
| `question_format` += `CLICK_IMAGE_SINGLE`/`CLICK_IMAGE_MULTI`/`IMAGE_ORDERING` | `20260615120000` |
| `half_grade_level` += `0A`/`0B`/`0C` | `20260616120000` |
| `questions.short_test_eligible` **(confirmed missing)** | `20260616120050` |
| `tax_strands`/`tax_sub_strands`/`tax_levels`/`tax_content` (+ indexes + RLS SELECT) | `20260525000001` |
| `questions.content_id` FK → `tax_content` | `20260525000003` |
| `assessment_test_type` enum + `assessment_sessions.test_type` | `20260611090000` |
| `assessment_sessions.short_test_outcome` | `20260621130000` |
| `assessment_sessions.engine_prior_version` | `20260510000000` |
| `responses_session_question_unique` constraint | `20260612090000` |
| `questions_held_rows_inactive` CHECK | `20260613120000` |
| `report_narrations` (+ `findings_strengths`/`findings_growth_areas`) | `20260525000000`, `20260526000000` |
| `admins` table + `admin_status` (likely already live) | `20260625120400` |

## Deliberately NOT in the additive script (Section 7 of the catch-up)

- **`strand` enum recast** (`20260511000200`) — uppercase→lowercase. **Non-additive**
  (column-type recast + type drop/rename). The inspection reports prod's actual `strand`
  values; if they are still uppercase, this needs its own reviewed migration. The bank
  uses the lowercase values, so it would otherwise fail to load. *(Most likely prod is
  already on the lowercase enum, since the running app depends on it.)*
- **`question-images` bucket** (`20260512000000`) — storage object creation = bring-up
  Step 2.
- **Taxonomy reference rows + question-bank rows** — DATA (bring-up Step 4), not schema.
  `content_id` stays NULL until the `tax_content` rows exist.

## L5/L6

No L5/L6-specific schema exists — L5/L6 reuses the same columns, enum values (`5A`/`6A`
are base `half_grade_level`), taxonomy, and constraints as 0A–L4. L5/L6 bring-up is
**data-only** (load + image upload + the held geometry activation), handled in the load
step. The catch-up's L5/L6 tail is therefore intentionally empty.
