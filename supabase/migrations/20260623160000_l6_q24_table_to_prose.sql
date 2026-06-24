-- Atlas Assessment — fix SAM-L6-Q24: rate table flattened into the stem (2026-06-23).
--
-- DEFECT (founder QA, comprehensive pilot): the parking-charges item rendered its source
-- rate table as raw pipe text inside the stem ("...How much did he pay? | First hour |
-- $3.40 | | For every additional ½ hour or part thereof | $1.50 |").
--
-- ROOT CAUSE: the conversion loader stored the source 2x2 table as Markdown-pipe text
-- INSIDE content.stem. The stem renderer (QuestionShell `<h1>{prompt}</h1>`) shows the
-- string as plain inline text — it does not parse Markdown and collapses newlines — so
-- the pipes display raw. There is no structured table field/type in the content schema or
-- renderer, so adding one would be an app-code class change. Per the QA-fix scope, the MVP
-- correct path is to restructure the stem into clean prose (no raw pipes).
--
-- SWEEP: SAM-L6-Q24 is the only LIVE (served) instance. Two other rows carry pipes in their
-- ORIGINAL insert stems (SAM-L0C-Q03, SAM-L0C-Q11) but both are superseded at runtime —
-- L0C-Q03's effective content is structured SELECT_MULTIPLE, L0C-Q11 was retired (Q11A-D) —
-- so neither serves pipe text. No change needed for them.
--
-- Source-verified (L6 worksheet page 16 task 24 + Question Summary key row "Solving word
-- problems involving rate" / Rate / Level 5 / Short Y; no image — text table). All data
-- preserved: first hour $3.40; each additional ½ hour or part thereof $1.50; 11 am-1:15 pm.
-- correct_answer unchanged ($7.90 = 3.40 + 3 x 1.50). UPDATE only; tenant-scoped (no-ops on
-- `supabase db reset`; the dev/CI path is the seed mirror). Idempotent.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"Parking charges at a car park are shown below. The first hour costs $3.40, and every additional ½ hour (or part thereof) costs $1.50. Tom parked his car at the car park from 11 am to 1:15 pm. How much did he pay?","correct_answer":"$7.90"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q24';
