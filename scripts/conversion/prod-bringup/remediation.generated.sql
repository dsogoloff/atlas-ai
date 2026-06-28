-- ============================================================================
-- Atlas Assessment — PROD type/constraint REMEDIATION (GENERATED, AUTO-SAFE only)
-- Generated: 2026-06-28T02:40:11.401Z
-- Source (canonical EXPECTED): LOCAL 127.0.0.1:54322 (post-reset full migration set)
-- Target: PROD atlas-assessment / ntfaqzueppqymfkefadm
--
-- APPLY IN PROD STUDIO (founder, attended). NEVER `supabase db push` to prod.
-- Only AUTO-SAFE drifts are here: widening/lossless type casts, loosened NOT NULL,
-- and added-missing defaults — none can fail on existing rows or lose data. Each is
-- idempotent (type casts are guarded to skip if already applied). Lossy/narrowing/
-- tightening/default-change drifts are in remediation.review.md (human decision).
-- NOTE: ALTER COLUMN TYPE may rewrite the table (ACCESS EXCLUSIVE lock) but is safe.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Type WIDENING (lossless cast)
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- Loosen NOT NULL -> NULL
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- Add MISSING default
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- Missing enum VALUES (additive)
-- ---------------------------------------------------------------------------
-- (none)
