-- Atlas Assessment — misconception classifier audit columns + MEASUREMENT_DATA
-- taxonomy seed.
--
-- Source-of-truth references:
--   features.md §3 — Misconception Detection (spec; silent on MEASUREMENT_DATA
--     codes — Item #9 fills the gap rather than contradicts the spec)
--   architecture.md #3 — Anthropic Claude Haiku for classification
--   compliance.md §12 — version-on-row pattern for derived classifications
--   src/lib/misconceptionClassifier/* — TS code that populates these columns
--     (lands alongside this migration in Item #9 Phase 2 / Phase 3)
--
-- Two responses columns:
--   misconception_classifier_method — which path produced detected_misconceptions
--   misconception_classifier_version — algorithm version stamp (NULL when method='none')
--
-- Plus four MEASUREMENT_DATA misconception rows. Without these, classifier
-- output on measurement responses has nowhere to land (the strand had zero
-- rows seeded in 20260426000000).

-- =============================================================================
-- Enum — mirror src/lib/misconceptionClassifier/types.ts ClassifierMethod exactly
-- =============================================================================

create type misconception_classifier_method as enum (
  'none',
  'distractor-map',
  'haiku',
  'failed'
);

-- =============================================================================
-- responses — add classifier audit columns.
-- =============================================================================
--
-- method  is NOT NULL with a permanent default of 'none'. Existing rows get
--   'none' on backfill, which is correct — they were inserted before any
--   classifier ran. Future inserts that omit the column also get 'none'
--   (matches the row's empty detected_misconceptions array).
-- version is nullable text. NULL means "no classifier ran" (method='none' or
--   'failed'); a value means "this version of this method produced these codes."
--   Per compliance.md §12 the version is stamped per-row at write time.

alter table responses
  add column misconception_classifier_method  misconception_classifier_method
                                                not null default 'none',
  add column misconception_classifier_version text;

-- =============================================================================
-- misconceptions — MEASUREMENT_DATA taxonomy seed.
-- =============================================================================
--
-- ON CONFLICT DO NOTHING for re-run safety. Mirrors seed.sql's
-- MEASUREMENT_DATA additions; both files must stay in sync (fresh-dev runs
-- seed.sql; incremental-dev runs this migration).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into misconceptions (tenant_id, code, strand, label, description)
select t.id, code, strand::strand, label, description
from t,
  (values
    ('MD_UNIT_CONFUSION',   'MEASUREMENT_DATA',
       'Unit confusion',
       'Mixes units when calculating, or omits the unit conversion when '
       'needed (e.g., adds centimetres to metres without converting).'),
    ('MD_RULER_ZERO_POINT', 'MEASUREMENT_DATA',
       'Ruler zero-point error',
       'Measures length starting from the 1 mark on the ruler instead of 0, '
       'or aligns the object with the wrong end of the ruler.'),
    ('MD_TIME_READING',     'MEASUREMENT_DATA',
       'Time-reading error',
       'Reads the wrong hand on an analog clock, or miscounts elapsed time '
       'across hour boundaries.'),
    ('MD_CHART_SCALE',      'MEASUREMENT_DATA',
       'Chart scale misreading',
       'Misreads the scale on a bar chart or pictogram (e.g., reads each '
       'picture as 1 when each represents 5).')
  ) as v(code, strand, label, description)
on conflict (tenant_id, code) do nothing;
