-- Atlas Assessment — re-band L5/L6 to the BOOKLET level (2026-06-25, founder decision).
--
-- Founder decision (locked): L5/L6 review content bands at BOOKLET LEVEL — not difficulty,
-- and not the worksheet's per-question "Level" column. Every question physically in the
-- Level 5 Placement booklet bands to L5 (5A); every question in the Level 6 booklet bands
-- to L6 (6A). The booklet a child sits IS the band: a child taking the Level 5 booklet is
-- assessed at L5, even where individual items review Level 4 skills.
--
-- This SUPERSEDES 20260623150000_l5l6_releveling.sql, which banded review content by the
-- Question-Summary "Level" column (L5 review -> 4A/4B; L6 review -> 5A/5B) and preserved the
-- difficulty-derived A/B sub-letter. Per the founder that is the wrong axis. The A/B
-- distinction (which encoded difficulty) is dropped — collapsed to the booklet floor 5A/6A.
-- Skill is still carried by content_id (the l4-*/l5-* sub-strand nodes), which this migration
-- does NOT touch (SAM-L5-Q22 stays measurement/NULL; SAM-L6-Q09 stays l5-fractions-3).
--
-- Source: each worksheet's title page + Question Summary (Level 5 / Level 6 Placement
-- Worksheet), viewed 2026-06-25. UPDATEs only; idempotent; tenant-scoped (a no-op during
-- `supabase db reset` — the dev/CI path is the seed.sql mirror).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set level = '5A'::half_grade_level
from t
where q.tenant_id = t.id
  and q.external_id like 'SAM-L5-%';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set level = '6A'::half_grade_level
from t
where q.tenant_id = t.id
  and q.external_id like 'SAM-L6-%';
