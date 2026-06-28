-- ============================================================================
-- Atlas Assessment — PROD BANK flag remediation (GENERATED, flag-corrective, idempotent)
-- Generated: 2026-06-28T03:05:16.758Z
-- Source (canonical, invariant-normalized): LOCAL 127.0.0.1:54322
-- Target: PROD atlas-assessment / ntfaqzueppqymfkefadm
--
-- APPLY IN PROD STUDIO (founder, attended). NEVER `supabase db push` to prod.
-- FLAG-corrective ONLY — never deletes or rewrites question content. Every statement
-- is guarded (IN-list + flag predicate / IS DISTINCT FROM) so re-runs are no-ops.
-- Lossy/ambiguous items are in bank-remediation.review.md (human decision).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ADD question_format column + backfill (only if absent in prod)
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- HELD / INACTIVE — force both flags false (invariant)
-- ---------------------------------------------------------------------------
-- force both flags false for 4 LOCAL-inactive id(s)
UPDATE public.questions q
SET is_active=false, short_test_eligible=false
FROM tenants t WHERE t.slug='inspirea_singapore_math' AND q.tenant_id=t.id
  AND q.external_id IN ('SAM-L0C-Q11', 'SAM-L2-Q04', 'SAM-L5-Q08', 'SAM-L6-Q26')
  AND (q.is_active IS TRUE OR q.short_test_eligible IS TRUE);


-- ---------------------------------------------------------------------------
-- ACTIVE-ITEM flag drift — targeted per-external_id UPDATE to local
-- ---------------------------------------------------------------------------
-- (none)
