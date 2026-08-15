-- ATLAS-009 — updating a note requires CURRENT access, not just authorship.
--
-- THE FINDING
-- -----------
-- The UPDATE policy predicated on authorship alone:
--
--   create policy "pedagogical_notes_author_update" on pedagogical_notes
--     for update
--     using      (instructor_id = app_current_instructor_id())
--     with check (instructor_id = app_current_instructor_id());
--
-- Nothing in it looks at the CHILD. So an instructor kept write access to a
-- note forever, on the strength of having once written it:
--
--   * the child transfers to another centre -> the author still edits the note;
--   * the instructor transfers to another centre -> same;
--   * the child is inside the 30-day prior-centre grace window -> same, even
--     though grace is explicitly READ-ONLY everywhere else in the schema.
--
-- Deactivation was already handled — app_current_instructor_id() resolves only
-- ACTIVE rows, so an INACTIVE instructor gets NULL and the policy fails. The
-- gap was never "left the company"; it was "no longer has this child", which is
-- the far more likely real-world case and the one the audit named.
--
-- THE FIX
-- -------
-- Require BOTH conditions: allowed author AND current write access to that
-- child. The second condition REUSES app_instructor_can_write_for_child — the
-- exact predicate pedagogical_notes_instructor_insert already uses — rather
-- than inventing a second notion of access. Two consequences follow for free:
--
--   * write access means the instructor's centre matches the child's CURRENT
--     home centre, so a transfer on either side revokes editing immediately;
--   * grace is read-only, because that helper deliberately omits the
--     prior-centre branch that app_instructor_can_access_child includes.
--
-- This migration does NOT redefine the grace window. It inherits whatever
-- app_instructor_can_write_for_child already means, so if that predicate is
-- ever revised, note editing follows automatically.
--
-- SCOPE — what is deliberately unchanged
-- --------------------------------------
--   * SELECT (pedagogical_notes_instructor_select) — unchanged. Instructors at
--     the prior centre keep READING during grace, which is the documented
--     behaviour and not what the finding is about.
--   * INSERT (pedagogical_notes_instructor_insert) — unchanged. It already
--     required current write access; this migration makes UPDATE consistent
--     with it, which is arguably how it should have been written originally.
--   * ADMINS — unchanged. pedagogical_notes_admin_select grants SELECT only,
--     and there is no admin INSERT/UPDATE policy, so admins remain read-only on
--     notes exactly as before.
--   * DELETE — there is NO delete policy on pedagogical_notes, for any role.
--     Notes cannot be deleted through PostgREST at all, so the both-conditions
--     rule has nothing to apply to. Verified across every migration; if a
--     delete path is ever added it must carry the same two conditions.
--
-- UPGRADE PATH (current prod schema -> this)
-- -----------------------------------------
-- Replaces ONE policy. No table, column, index or function changes; no data is
-- written or read. Re-runnable (drop ... if exists, then create).
--
-- Behavioural change to expect after applying: an instructor who authored a
-- note for a child no longer at their centre will find that note read-only.
-- That is the intent. Nothing is deleted and no note becomes invisible — the
-- SELECT policy is untouched.
--
-- seed.sql declares no policies for this table (verified), so there is no seed
-- mirror to keep in step.
--
-- ROLLBACK
-- --------
--   drop policy if exists "pedagogical_notes_author_update" on pedagogical_notes;
--   create policy "pedagogical_notes_author_update" on pedagogical_notes
--     for update
--     using      (instructor_id = app_current_instructor_id())
--     with check (instructor_id = app_current_instructor_id());
-- (That restores the vulnerable authorship-only rule.)

drop policy if exists "pedagogical_notes_author_update" on pedagogical_notes;

create policy "pedagogical_notes_author_update" on pedagogical_notes
  for update
  using (
    instructor_id = app_current_instructor_id()
    and exists (
      select 1 from children c
      where c.id = pedagogical_notes.child_id
        and app_instructor_can_write_for_child(c.home_center_id, c.tenant_id)
    )
  )
  with check (
    instructor_id = app_current_instructor_id()
    and exists (
      select 1 from children c
      where c.id = pedagogical_notes.child_id
        and app_instructor_can_write_for_child(c.home_center_id, c.tenant_id)
    )
  );

comment on policy "pedagogical_notes_author_update" on pedagogical_notes is
  'ATLAS-009: author AND current write access to the child. Historical authorship alone does not confer edit rights.';
