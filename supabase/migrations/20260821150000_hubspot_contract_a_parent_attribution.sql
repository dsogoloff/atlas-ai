-- HubSpot Contract A — account-level marketing attribution on parents.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- Adds one nullable column, `parents.attribution jsonb`, that persists the
-- first-touch marketing attribution (the five utm_* keys + first_seen) at
-- signup time so it survives to the email-confirm ("account created") moment,
-- where src/lib/hubspot/syncContact.ts forwards it onto the HubSpot contact.
--
-- Shape mirrors src/lib/marketing/attribution.ts's `Attribution` type exactly:
--   { utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?,
--     first_seen? } — all strings, all optional. NULL means "no attribution
--   captured at signup" (untagged visit, or attribution cookie absent/blocked)
--   and is stored as SQL NULL, never as `{}` (src/app/(auth)/signup/actions.ts
--   is responsible for that null-vs-empty-object distinction on write).
--
-- SCOPE. Account-level only — no child data of any kind touches this column,
-- consistent with HubSpot Contract A (parent contact sync on account-created).
-- See CLAUDE.md guardrails 1-3.
--
-- UPGRADE PATH (current prod schema -> this)
-- -----------------------------------------
-- Purely additive: one nullable column, no default, no backfill, no existing
-- row touched. Re-runnable (IF NOT EXISTS).
--
-- ROLLBACK
-- --------
--   alter table parents drop column if exists attribution;

alter table parents
  add column if not exists attribution jsonb;

comment on column parents.attribution is
  'HubSpot Contract A: first-touch marketing attribution captured at signup (utm_source/medium/campaign/content/term + first_seen), mirroring src/lib/marketing/attribution.ts''s Attribution type. NULL when the visitor arrived untagged. Account-level only — never child data.';
