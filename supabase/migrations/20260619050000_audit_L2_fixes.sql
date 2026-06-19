-- Atlas Assessment — L2 source-vs-authored audit fixes (lane/audit-L2, 2026-06-19).
--
-- ONE clear-cut fix: wire the curated/generated per-question images onto the 7
-- image-essential L2 rows and activate them. These rows were INSERTED INACTIVE by
-- the Stage 4 loader (20260610151306) carrying image_alt + image_required=true but
-- NO image_path; the later l2-overlay load (20260614130000) re-INSERTs the same
-- ids with the real image_path + is_active=true but uses
-- `on conflict (tenant_id, external_id) do nothing`, so against the pre-existing
-- Stage 4 rows it is a NO-OP — the image_path never lands and the rows stay held.
-- The images already exist at source and are wired into the local uploader
-- (scripts/conversion/upload-activation-images.ts PREEXISTING_L2_BACKFILL, using
-- the exact root-level object keys below). This is the same fix shape as the L1
-- art activation (20260614120001): image-essential rows held only for lack of a
-- wired image, now wired + activated.
--
-- Bucket keys are the EXACT root-level keys each row's authored content references
-- (overlay/l2-authoring.json; root convention, NOT the l2/ folder). Q05's graph is
-- GENERATED (gen_l2_q05_graph.py -> q-sam-l2-q05-seashell-graph.png); the rest are
-- the L2-*.png crops re-keyed. Source crops verified faithful in the audit table
-- (scripts/conversion/audit/L2-audit.md):
--   Q02 q-sam-l2-q02-triangles.png      (tangram figure; founder-confirmed = 5)
--   Q03 q-sam-l2-q03-composite-shape.png (green half-circle + orange triangle)
--   Q05 q-sam-l2-q05-seashell-graph.png  (Jimmy 9/Adam 6/Tom 11/Mark 15; 15-6=9)
--   Q12 q-sam-l2-q12-toy-car-ruler.png   (car spans 2->9 cm = 7 cm)
--   Q15 q-sam-l2-q15-clock.png           (hands at 2:55; lunch -> pm)
--   Q16 q-sam-l2-q16-coins.png           (5+10+20+50 = 85 cents)
--   Q18 q-sam-l2-q18-base-ten.png        (2 hundred-flats + 4 ones = 204)
--
-- These rows carry NO content._authoring key, so the questions_held_rows_inactive
-- guardrail (20260613120000) coalesces requires_format_swap to false and permits
-- activation. Format/options/answer/stem are unchanged; only image_path is added
-- (via `||` merge) and is_active flips to true. SAM-L2-Q04 stays INACTIVE
-- (founder-directed deactivation, 20260611014520) — intentionally NOT touched.
--
-- AGENTS.md §11 parity: prod path. On a dev `supabase db reset` this is a no-op
-- (migrations run before seed.sql creates the inspirea_singapore_math tenant); the
-- identical statement is mirrored into supabase/seed.sql. Idempotent: guarded on
-- is_active = false, so either path (or both) yields the same final state.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = true,
    content = q.content || jsonb_build_object('image_path', v.image_path)
from t,
  (values
    ('SAM-L2-Q02', 'q-sam-l2-q02-triangles.png'),
    ('SAM-L2-Q03', 'q-sam-l2-q03-composite-shape.png'),
    ('SAM-L2-Q05', 'q-sam-l2-q05-seashell-graph.png'),
    ('SAM-L2-Q12', 'q-sam-l2-q12-toy-car-ruler.png'),
    ('SAM-L2-Q15', 'q-sam-l2-q15-clock.png'),
    ('SAM-L2-Q16', 'q-sam-l2-q16-coins.png'),
    ('SAM-L2-Q18', 'q-sam-l2-q18-base-ten.png')
  ) as v(external_id, image_path)
where q.tenant_id = t.id
  and q.external_id = v.external_id
  and q.is_active = false;
