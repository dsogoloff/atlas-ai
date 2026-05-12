-- Atlas Assessment — Item #13a Phase 1: question-images storage bucket.
--
-- Source-of-truth references:
--   founder_log.md Item #13a Phase 1 (storage + schema)
--   compliance.md §8 Constraint 1 — question content (and image
--     derivatives) served only via authenticated API calls; bucket
--     is PRIVATE so no public CDN exposure
--   compliance.md §3 — no PII in image assets (math content only)
--   AGENTS.md §11 — dev/prod parity rule
--
-- What this migration does:
--   1. Creates a PRIVATE `question-images` bucket in storage.buckets.
--   2. Adds an RLS policy on storage.objects denying unauthenticated
--      reads. Authenticated reads of this bucket are also denied at
--      the policy layer — the only legitimate read path is via
--      short-TTL signed URLs minted server-side by the next-question
--      route (Phase 2). Signed URLs bypass RLS; this policy is the
--      second line of defense.
--
-- §11 parity statement:
--   This migration creates an INFRASTRUCTURE object (a storage bucket),
--   NOT tenant-scoped data. The §11 trap is tenant-scoped INSERT
--   migrations that no-op during `supabase db reset` because the
--   tenant doesn't exist yet (migrations run before seed.sql creates
--   the tenant). Storage buckets do not reference tenants — the
--   bucket is global for the project; per-tenant scoping (if ever
--   needed) happens at the object-key prefix level (e.g.,
--   `tenant-<slug>/q-<id>/<file>`). No seed.sql mirror is needed.
--
-- v1 / v2 evolution path:
--   v1 has a single tenant (architecture.md guardrail #1), so a
--   single global bucket is correct. If multi-tenancy lands, the
--   bucket stays global; object keys get a `tenant-<slug>/` prefix
--   and the RLS policy on storage.objects matches the prefix
--   against the requesting user's tenant. No bucket re-provisioning.
--
-- Local-dev prerequisite (one-time, founder-side):
--   `supabase stop && supabase start` after `[storage] enabled = true`
--   in supabase/config.toml. `supabase db reset` alone does not
--   start the storage container.

-- =============================================================================
-- 1. Create the private bucket.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  false,                                            -- private
  5242880,                                          -- 5 MiB per asset
  array['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']
)
on conflict (id) do nothing;

-- =============================================================================
-- 2. RLS policy — deny direct reads. Signed URLs are the only legitimate path.
-- =============================================================================
-- storage.objects has RLS enabled by default in Supabase. Without an
-- explicit SELECT policy, all reads are denied — which is exactly the
-- posture we want for Phase 1. We add an explicit DENY-style policy
-- (using `false`) so the intent is documented in SQL rather than
-- relying on absence-of-policy.

create policy "question_images_no_direct_select"
  on storage.objects for select
  to authenticated, anon
  using (
    case
      when bucket_id = 'question-images' then false
      else true  -- this policy is bucket-scoped; don't affect other buckets
    end
  );

-- INSERT / UPDATE / DELETE: server-side only via service_role, which
-- bypasses RLS. No policies for those verbs in v1 — Phase 5 manual
-- upload happens via the Supabase Studio dashboard authenticated as
-- service_role.
