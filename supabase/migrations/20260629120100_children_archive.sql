-- Parent soft-delete (archive) for children.
--
-- "Delete" from the parent dashboard is a SOFT delete: the row, its assessment
-- sessions, and its report are RETAINED for staff (admin) — only the parent's
-- own views hide it. Parent-side reads filter `archived_at IS NULL`; the
-- instructor/admin roster keeps archived children visible with a badge.
--
-- Additive + idempotent (IF NOT EXISTS) so the same statement is safe to run on
-- prod via Studio. No RLS change: the existing role-scoped policies
-- (children_parent_all / _instructor_select / _admin_select) keep working; the
-- archived filter is applied at the application read layer.
--
--   archived_at  — when the parent archived the child (NULL = active).
--   archived_by  — the parents.id who archived (audit pointer; app-enforced, no FK).

alter table children
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid;

comment on column children.archived_at is
  'Parent soft-delete timestamp. NULL = active. Parent-side reads filter archived_at IS NULL; staff retain visibility.';
comment on column children.archived_by is
  'parents.id of the parent who archived this child (audit pointer).';
