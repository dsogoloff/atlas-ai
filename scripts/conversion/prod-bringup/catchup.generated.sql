-- ============================================================================
-- Atlas Assessment — PROD schema catch-up (GENERATED, additive-only, idempotent)
-- Generated: 2026-06-28T02:40:34.281Z
-- Source (canonical EXPECTED): LOCAL 127.0.0.1:54322 (post-reset full migration set)
-- Target: PROD atlas-assessment / ntfaqzueppqymfkefadm
--
-- APPLY IN PROD STUDIO (founder, attended). NEVER `supabase db push` to prod.
-- Every statement is guarded (IF NOT EXISTS / DO-block pg_policies check) so re-runs
-- converge and nothing fails on existing objects/rows. No DROP, no retype, no
-- NOT NULL tightening of existing columns. Divergences are in catchup.review.md.
--
-- Prod is read via DIRECT Postgres (PROD_DATABASE_URL) — real pg_catalog/pg_policies.
-- Section 5 emits only the RLS-enables and policies prod is actually MISSING (still
-- guarded, so safe to re-run). Attribute-level drift (type/nullable/default) is out of
-- scope here — that is 07 (verify) + 09 (remediation).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 — Missing enum TYPES (DO-guarded CREATE TYPE)
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- SECTION 2 — Missing enum VALUES (ALTER TYPE ... ADD VALUE IF NOT EXISTS)
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- SECTION 3 — Missing TABLES (CREATE TABLE IF NOT EXISTS + ENABLE RLS)
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- SECTION 4 — Missing COLUMNS (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- SECTION 5 — RLS: ENABLE (missing only) + guarded CREATE POLICY (missing only)
-- ---------------------------------------------------------------------------
-- (RLS already enabled on all expected tables)

-- (all local policies already present in prod)
-- ---------------------------------------------------------------------------
-- SECTION 6 — Best-effort additive constraints & indexes for NEW tables (guarded)
-- (existing-table constraints/indexes are NOT reconciled here — see catchup.review.md)
-- ---------------------------------------------------------------------------
-- (none)
