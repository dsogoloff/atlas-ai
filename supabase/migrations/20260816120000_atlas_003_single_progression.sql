-- ATLAS-003 (subset) — one linear progression per session.
--
-- WHAT WAS ALREADY SAFE, AND WHAT WAS NOT
-- ---------------------------------------
-- The submit path already serialises the RESPONSE: responses carries
-- UNIQUE(session_id, question_id) (migration 20260612090000), so of two
-- concurrent submits of the same served question exactly one INSERT lands and
-- the loser takes the 23505 branch into duplicateResult(). That half is sound
-- and is not touched here.
--
-- The PROGRESSION was not serialised. After winning the insert, the winner
-- picks the next question and writes a question_access_log row. The loser, in
-- duplicateResult(), looks for an outstanding served question — and if the
-- winner has not committed its log row yet, finds none and falls through to
-- "pick and log" itself. Both then serve, and the two callers receive DIFFERENT
-- next questions with two access-log rows behind them. That is the divergence:
-- not a double response, but a forked assessment.
--
-- THE MECHANISM
-- -------------
-- A compare-and-swap on a new assessment_sessions.expected_question_id, applied
-- inside a SECURITY DEFINER function that holds a row lock for the duration.
-- The function is one transaction, so `for update` genuinely serialises: the
-- second caller blocks, then observes the winner's value and is handed it back.
--
-- Advisory locks were considered and rejected: pg_advisory_lock is
-- session-scoped and PostgREST pools connections (so it would leak across
-- unrelated requests), while pg_advisory_xact_lock releases at the end of each
-- PostgREST statement — neither survives the multi-round-trip shape of this
-- handler. Rewriting the whole read-decide-write core into SQL was also
-- rejected: the engine, picker and termination logic are substantial TypeScript,
-- and porting them to plpgsql to win a lock would be a far larger change with
-- far more risk than the one narrow step that actually races.
--
-- So the lock is scoped to exactly the step that needs it — claiming the next
-- question — rather than the whole handler. The picker runs outside it and is a
-- pure read, so a discarded pick costs nothing.
--
-- NULL IS PERMISSIVE, ON PURPOSE
-- ------------------------------
-- Sessions that already exist when this ships have expected_question_id NULL,
-- and a NULL is accepted as "no claim recorded yet" so an in-flight assessment
-- is not bricked mid-question. The column becomes authoritative from the next
-- serve onward. No backfill is attempted: reconstructing the expected question
-- for a live session from the access log is guesswork, and guessing wrong would
-- reject a legitimate answer.
--
-- SCOPE. This closes the double-submit / two-tab / retry case at pilot scale.
-- The ~100-way concurrent stress proof and terminal-race hardening beyond the
-- basic case are Bar 2.
--
-- UPGRADE PATH (current prod schema -> this)
-- -----------------------------------------
-- Additive: one nullable column and one function. No existing row is written,
-- no constraint is added that could reject existing data (verified read-only
-- against live prod — every session simply starts NULL). Re-runnable.
--
-- ROLLBACK
-- --------
--   drop function if exists claim_next_question(uuid, uuid, uuid, uuid, uuid, text);
--   alter table assessment_sessions drop column if exists expected_question_id;
-- The handler tolerates the column's absence only if reverted with the code.

alter table assessment_sessions
  add column if not exists expected_question_id uuid;

comment on column assessment_sessions.expected_question_id is
  'ATLAS-003: the question this session is currently waiting on. NULL = no claim recorded (legacy or pre-first-serve) and is treated permissively.';

-- =============================================================================
-- claim_next_question — advance the session by exactly one question, once
-- =============================================================================
-- Returns the question id the session is NOW expecting:
--   * p_next_question_id when this caller won the claim (and the serve was
--     logged as part of the same transaction);
--   * the OTHER caller's question id when it lost, so it can serve that instead
--     of forking the assessment.
--
-- The access-log insert lives inside the same transaction as the CAS on
-- purpose: "the session advanced" and "a serve was recorded" must not be able
-- to disagree, which is exactly what happens when they are two round-trips.

create or replace function claim_next_question(
  p_session_id           uuid,
  p_answered_question_id uuid,
  p_next_question_id     uuid,
  p_tenant_id            uuid,
  p_child_id             uuid,
  p_ip                   text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current uuid;
  v_status  text;
begin
  -- The row lock IS the serialisation. A concurrent caller blocks here and
  -- proceeds only once this transaction commits, so it cannot observe stale
  -- state and claim a second progression.
  select s.expected_question_id, s.status::text
    into v_current, v_status
    from assessment_sessions s
   where s.id = p_session_id
   for update;

  if not found then
    raise exception 'claim_next_question: session % not found', p_session_id
      using errcode = 'no_data_found';
  end if;

  -- A completed session never advances again. The handler already rejects this
  -- earlier with a 409; this is the backstop for a concurrent completion.
  if v_status = 'COMPLETED' then
    return null;
  end if;

  -- Someone already advanced past the question this caller answered. Hand back
  -- what the session is actually waiting on rather than forking it.
  --
  -- NULL is permissive: a session created before this migration has no claim
  -- recorded, so the first caller through establishes it.
  if v_current is not null
     and p_answered_question_id is not null
     and v_current is distinct from p_answered_question_id
  then
    return v_current;
  end if;

  update assessment_sessions
     set expected_question_id = p_next_question_id
   where id = p_session_id;

  insert into question_access_log (
    tenant_id, session_id, child_id, question_id, ip_address
  ) values (
    p_tenant_id, p_session_id, p_child_id, p_next_question_id,
    nullif(btrim(coalesce(p_ip, '')), '')::inet
  );

  return p_next_question_id;
end;
$$;

-- Service role only. The submit handler runs service-role; a client that could
-- call this could advance someone else's assessment.
revoke all on function claim_next_question(uuid, uuid, uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function claim_next_question(uuid, uuid, uuid, uuid, uuid, text)
  to service_role;

comment on function claim_next_question(uuid, uuid, uuid, uuid, uuid, text) is
  'ATLAS-003: atomically claim the next question and log the serve. Returns the question the session is now expecting — the caller''s own when it won, the winner''s when it lost.';
