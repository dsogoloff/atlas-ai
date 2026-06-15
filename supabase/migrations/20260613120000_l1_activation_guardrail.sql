-- Atlas Assessment — L1 activation guardrail (lane/l1-reauthoring).
--
-- A staged row whose real interaction is not yet a wired question_format
-- (equation-set, select-multiple, multi-blank, visual-matching) carries
-- content._authoring.requires_format_swap = true. This CHECK makes a bare
-- is_active=true on such a row INVALID by construction: activation is the
-- atomic step (add the enum value -> set real format + content -> clear
-- requires_format_swap -> set is_active=true). Existing rows carry no
-- _authoring key, so the flag coalesces to false and they are unaffected.
-- Idempotent: drop-if-exists then add.

alter table questions drop constraint if exists questions_held_rows_inactive;

alter table questions add constraint questions_held_rows_inactive
  check (
    not (
      is_active
      and coalesce((content #>> '{_authoring,requires_format_swap}')::boolean, false)
    )
  );
