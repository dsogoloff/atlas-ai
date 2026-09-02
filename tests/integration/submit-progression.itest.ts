// ATLAS-003 (subset) — one linear progression per session.
//
// The mechanism under test is a ROW LOCK inside claim_next_question(). A mock
// cannot exhibit a lock, so these run against the real database and drive the
// function directly with genuinely concurrent calls. That is the only way to
// prove the property that matters: two callers racing to advance the same
// session end up on the SAME question, with ONE serve recorded.
//
// The response-insert half (UNIQUE(session_id, question_id) electing one
// winner) predates this work and is exercised by the handler's own suite; what
// was unserialised — and is fixed here — is the progression that follows it.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { serviceClient } from "./helpers/supabase";

let tenantId: string;
let centerId: string;
let parentId: string;
let childId: string;
let sessionId: string;
/** Three real question ids from the seeded bank: answered, and two rival picks. */
let qAnswered: string;
let qA: string;
let qB: string;

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: no data`);
  return res.data;
}

async function claim(answered: string | null, next: string) {
  const { data, error } = await serviceClient().rpc("claim_next_question", {
    p_session_id: sessionId,
    p_answered_question_id: answered,
    p_next_question_id: next,
    p_tenant_id: tenantId,
    p_child_id: childId,
    p_ip: "203.0.113.7",
  });
  if (error) throw new Error(`claim: ${error.message}`);
  return data as string | null;
}

async function expectedQuestion(): Promise<string | null> {
  const { data } = await serviceClient()
    .from("assessment_sessions")
    .select("expected_question_id")
    .eq("id", sessionId)
    .single();
  return (data as { expected_question_id: string | null }).expected_question_id;
}

async function serveLogCount(questionId?: string): Promise<number> {
  let q = serviceClient()
    .from("question_access_log")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (questionId) q = q.eq("question_id", questionId);
  const { count } = await q;
  return count ?? 0;
}

/** Reset the session to "waiting on qAnswered" with no serve history. */
async function resetSession() {
  const svc = serviceClient();
  await svc.from("question_access_log").delete().eq("session_id", sessionId);
  await svc
    .from("assessment_sessions")
    .update({ expected_question_id: qAnswered, status: "IN_PROGRESS" })
    .eq("id", sessionId);
}

beforeAll(async () => {
  const svc = serviceClient();
  const suffix = randomUUID().slice(0, 8);

  tenantId = (
    must(
      await svc
        .from("tenants")
        .insert({ slug: `it-prog-${suffix}`, display_name: `IT Prog ${suffix}` })
        .select("id")
        .single(),
      "tenant",
    ) as { id: string }
  ).id;

  centerId = (
    must(
      await svc
        .from("centers")
        .insert({ tenant_id: tenantId, name: "IT Prog Center", status: "ACTIVE" })
        .select("id")
        .single(),
      "center",
    ) as { id: string }
  ).id;

  const { data: user } = await svc.auth.admin.createUser({
    email: `atlas-prog-${suffix}@integration.local`,
    password: "atlas-integration-pw-9f2b",
    email_confirm: true,
  });

  parentId = (
    must(
      await svc
        .from("parents")
        .insert({
          auth_user_id: user!.user!.id,
          tenant_id: tenantId,
          home_center_id: centerId,
          email: `atlas-prog-${suffix}@integration.local`,
          name: "IT Prog Parent",
        })
        .select("id")
        .single(),
      "parent",
    ) as { id: string }
  ).id;

  childId = (
    must(
      await svc
        .from("children")
        .insert({
          tenant_id: tenantId,
          parent_id: parentId,
          home_center_id: centerId,
          name: "IT Prog Child",
          birth_year: 2018,
          grade_level: "2",
        })
        .select("id")
        .single(),
      "child",
    ) as { id: string }
  ).id;

  sessionId = (
    must(
      await svc
        .from("assessment_sessions")
        .insert({ tenant_id: tenantId, child_id: childId, status: "IN_PROGRESS" })
        .select("id")
        .single(),
      "session",
    ) as { id: string }
  ).id;

  // Real questions — question_access_log has an FK to questions, so these
  // cannot be fabricated ids.
  const questions = must(
    await svc.from("questions").select("id").limit(3),
    "questions",
  ) as Array<{ id: string }>;
  if (questions.length < 3) throw new Error("need 3 seeded questions");
  [qAnswered, qA, qB] = questions.map((q) => q.id);
});

afterAll(async () => {
  const svc = serviceClient();
  await svc.from("question_access_log").delete().eq("session_id", sessionId);
  await svc.from("assessment_sessions").delete().eq("id", sessionId);
  await svc.from("children").delete().eq("id", childId);
  await svc.from("parents").delete().eq("id", parentId);
  await svc.from("tenants").delete().eq("id", tenantId);
});

// ===========================================================================
// HEADLINE — two concurrent claims, one progression
// ===========================================================================
describe("ATLAS-003 headline — concurrent submits cannot fork the assessment", () => {
  it("two SIMULTANEOUS claims yield ONE progression, ONE serve, and the SAME question to both", async () => {
    await resetSession();

    // Genuinely parallel — the row lock is what resolves this, not ordering.
    const [first, second] = await Promise.all([
      claim(qAnswered, qA),
      claim(qAnswered, qB),
    ]);

    // Both callers are told the same thing...
    expect(first).toBe(second);
    // ...and it is one of the two candidates, not a third state.
    expect([qA, qB]).toContain(first);

    // The session advanced exactly once.
    expect(await expectedQuestion()).toBe(first);

    // And exactly ONE serve was recorded — the loser's pick was discarded, not
    // logged. Before ATLAS-003 this was 2, and the two callers held different
    // questions.
    expect(await serveLogCount()).toBe(1);
    expect(await serveLogCount(first!)).toBe(1);
  });

  it("the loser's question is never served", async () => {
    await resetSession();
    const [a, b] = await Promise.all([claim(qAnswered, qA), claim(qAnswered, qB)]);
    const winner = a!;
    const loser = winner === qA ? qB : qA;
    expect(b).toBe(winner);
    expect(await serveLogCount(loser)).toBe(0);
  });
});

// ===========================================================================
// Sequential replay / two-tab / retry
// ===========================================================================
describe("ATLAS-003 — replays return the current state, they do not advance", () => {
  it("a SECOND claim answering the same question returns the already-served one", async () => {
    await resetSession();

    const firstWinner = await claim(qAnswered, qA);
    expect(firstWinner).toBe(qA);

    // A retry / second tab submitting the same answer again. The session has
    // moved on to qA, so this must NOT advance to qB.
    const replay = await claim(qAnswered, qB);
    expect(replay).toBe(qA);

    expect(await expectedQuestion()).toBe(qA);
    expect(await serveLogCount()).toBe(1);
    expect(await serveLogCount(qB)).toBe(0);
  });

  it("a STALE submit (answering a question the session moved past) does not advance", async () => {
    await resetSession();
    await claim(qAnswered, qA); // session now expects qA

    // Someone submits an answer to the ORIGINAL question again.
    const stale = await claim(qAnswered, qB);
    expect(stale).toBe(qA); // current state returned, unchanged
    expect(await expectedQuestion()).toBe(qA);
    expect(await serveLogCount()).toBe(1);
  });

  it("a normal linear progression still advances one step at a time", async () => {
    await resetSession();

    expect(await claim(qAnswered, qA)).toBe(qA);
    expect(await expectedQuestion()).toBe(qA);

    // Answering qA legitimately advances to qB.
    expect(await claim(qA, qB)).toBe(qB);
    expect(await expectedQuestion()).toBe(qB);

    expect(await serveLogCount()).toBe(2); // one per real serve
  });
});

// ===========================================================================
// Terminal + legacy
// ===========================================================================
describe("ATLAS-003 — terminal and legacy sessions", () => {
  it("a COMPLETED session never advances again", async () => {
    await resetSession();
    await serviceClient()
      .from("assessment_sessions")
      .update({ status: "COMPLETED" })
      .eq("id", sessionId);

    // Returns null — "nothing to serve" — rather than serving into a closed
    // session. The handler renders the terminal shape for this.
    expect(await claim(qAnswered, qA)).toBeNull();
    expect(await serveLogCount()).toBe(0);

    await serviceClient()
      .from("assessment_sessions")
      .update({ status: "IN_PROGRESS" })
      .eq("id", sessionId);
  });

  it("two concurrent claims on a completing session both settle on ONE outcome", async () => {
    await resetSession();
    const svc = serviceClient();

    // Race a completion against a claim — the basic terminal case. Whichever
    // order the lock resolves, the result must be self-consistent: either the
    // claim landed before completion (one serve) or after it (none).
    const [claimed] = await Promise.all([
      claim(qAnswered, qA),
      svc
        .from("assessment_sessions")
        .update({ status: "COMPLETED" })
        .eq("id", sessionId),
    ]);

    const serves = await serveLogCount();
    if (claimed === null) {
      expect(serves).toBe(0); // completed first
    } else {
      expect(claimed).toBe(qA);
      expect(serves).toBe(1); // claimed first — still exactly one
    }

    await svc
      .from("assessment_sessions")
      .update({ status: "IN_PROGRESS" })
      .eq("id", sessionId);
  });

  it("a legacy session with NO recorded expectation is treated permissively", async () => {
    // Sessions that existed before this migration have expected_question_id
    // NULL. They must not be bricked mid-question — the first claim through
    // establishes the expectation.
    const svc = serviceClient();
    await svc.from("question_access_log").delete().eq("session_id", sessionId);
    await svc
      .from("assessment_sessions")
      .update({ expected_question_id: null })
      .eq("id", sessionId);

    expect(await claim(qAnswered, qA)).toBe(qA);
    expect(await expectedQuestion()).toBe(qA);
  });
});

describe("ATLAS-003 — the claim is not client-callable", () => {
  it("anon cannot execute claim_next_question", async () => {
    const { anonClient } = await import("./helpers/supabase");
    const { error } = await anonClient().rpc("claim_next_question", {
      p_session_id: sessionId,
      p_answered_question_id: qAnswered,
      p_next_question_id: qA,
      p_tenant_id: tenantId,
      p_child_id: childId,
      p_ip: null,
    });
    expect(error).not.toBeNull();
  });
});

// Full N-way concurrency is Bar 2.
describe("pending — Bar 2 concurrency stress", () => {
  it.todo("~100 concurrent submits of the same served question -> one response, one progression");
  it.todo("~100-way terminal race -> exactly one completion, one narration, one staff alert");
  it.todo("sustained interleaved multi-session load shows no cross-session interference");
});
