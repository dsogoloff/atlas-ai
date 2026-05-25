-- Atlas Assessment — bridge questions to tax_content (Item #12 Phase 7 Part B).
--
-- Adds a nullable content_id FK from questions to tax_content, then
-- back-fills it for the (strand, level) combinations where the V2026
-- mapping is unambiguous.
--
-- The existing `level` half-grade-enum column (KA…8B, the engine's
-- placement axis) is UNCHANGED. The two axes coexist — tax_content keys
-- the S.A.M. Level axis; questions.level remains the engine's grade-half
-- placement target.
--
-- Backfill philosophy: do NOT guess. Where the (strand, level) on a
-- question doesn't uniquely identify a tax_content row, content_id stays
-- NULL. The remaining NULLs get resolved when the question bank is
-- rebuilt against the new taxonomy (later work). Tightening this column
-- to NOT NULL now would block that rebuild — so it stays nullable.
--
-- ── Unambiguous strand → sub_strand mapping (1:1, no interpretation) ──
--     geometry         → geometry
--     measurement      → measurement
--     data_statistics  → data_representation
-- ── Ambiguous strands left UNMAPPED (kept as NULL) ────────────────────
--     number_sense           — V2026 has no exact analogue; spans whole_numbers
--                              + percentage + others depending on grade
--     operations_algorithms  — operations apply across many V2026 sub_strands
--                              (also absorbed the legacy WORD_PROBLEMS rows)
--     fractions_decimals     — V2026 splits this into fractions vs decimals
--
-- ── Half-grade → tax_level mapping (1A/1B→l1, …, 6A/6B→l6) ────────────
--     KA, KB, 7A-8B → no mapping (outside V2026 L0-L6 range)
--
-- ── Final ambiguity filter ────────────────────────────────────────────
--     Even with the above 1:1 mappings, content_id is only assigned when
--     the resolved (tax_level, sub_strand) has EXACTLY ONE tax_content
--     row. (level, sub_strand) pairs with one row at time of writing:
--         (l1, geometry)             "Introduction to Basic Shapes"
--         (l1, data_representation)  "Picture Graphs"
--         (l3, data_representation)  "Bar Graphs"
--         (l6, geometry)             "Angles in Geometric Shapes"
--     All other (l1-l6, mapped-sub_strand) pairs leave content_id NULL.

alter table questions
  add column content_id uuid references tax_content(id);

create index questions_content_id_idx on questions(content_id);

-- Backfill — only assigns content_id when the mapping is unambiguous.
update questions q
set content_id = tc.id
from tax_content tc
join tax_sub_strands ss
  on ss.id = tc.sub_strand_id and ss.tenant_id = tc.tenant_id
join tax_levels tl
  on tl.id = tc.level_id and tl.tenant_id = tc.tenant_id
where tc.tenant_id = q.tenant_id
  and ss.code = case q.strand::text
    when 'geometry'        then 'geometry'
    when 'measurement'     then 'measurement'
    when 'data_statistics' then 'data_representation'
  end
  and tl.code = case q.level::text
    when '1A' then 'l1' when '1B' then 'l1'
    when '2A' then 'l2' when '2B' then 'l2'
    when '3A' then 'l3' when '3B' then 'l3'
    when '4A' then 'l4' when '4B' then 'l4'
    when '5A' then 'l5' when '5B' then 'l5'
    when '6A' then 'l6' when '6B' then 'l6'
  end
  and 1 = (
    select count(*) from tax_content tc2
    where tc2.tenant_id = q.tenant_id
      and tc2.level_id = tl.id
      and tc2.sub_strand_id = ss.id
  );

-- Print backfill summary. Visible in `supabase db reset` output.
do $$
declare
  total_count        int;
  matched_count      int;
  null_count         int;
  null_strand_skip   int;  -- strand not in {geometry, measurement, data_statistics}
  null_level_oor     int;  -- mapped strand but level outside L1-L6
  null_pair_ambig    int;  -- mapped strand + mapped level, but (level,sub_strand) has >1 row
begin
  select count(*) into total_count   from questions;
  select count(*) into matched_count from questions where content_id is not null;
  null_count := total_count - matched_count;

  select count(*) into null_strand_skip
    from questions
    where content_id is null
      and strand::text not in ('geometry','measurement','data_statistics');

  select count(*) into null_level_oor
    from questions
    where content_id is null
      and strand::text in ('geometry','measurement','data_statistics')
      and level::text not in ('1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B');

  null_pair_ambig := null_count - null_strand_skip - null_level_oor;

  raise notice '[questions content_id backfill] total=% matched=% null=%',
    total_count, matched_count, null_count;
  raise notice '[questions content_id backfill] null breakdown: strand-not-mapped=% level-out-of-range=% pair-has-multiple-content=%',
    null_strand_skip, null_level_oor, null_pair_ambig;
end
$$;
