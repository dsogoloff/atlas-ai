import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { STRANDS } from "@/lib/engine/levels";
import type { Database } from "@/lib/supabase/database.types";

import { sessionStartHandler } from "./handler";
import type { StartRequest } from "./types";

// ===========================================================================
// Mock infrastructure
// ===========================================================================
//
// Per-table call queue: tests pre-stage {data, error} results per table;
// fake from(table) chains pop the next staged result. Inserts / updates /
// deletes are captured for assertion.

interface MockResult {
  data: unknown;
  error: ({ message: string; code?: string }) | null;
  /** For Supabase head:true count queries — sessionHasResponses uses this
   *  to drive the no-progress vs has-progress branch in resumeExisting. */
  count?: number;
}

interface ServiceMock {
  client: SupabaseClient<Database>;
  inserts: Array<{ table: string; row: unknown }>;
  updates: Array<{ table: string; patch: unknown }>;
  deletes: Array<{ table: string }>;
  /** Captured .eq(col, val) filters, tagged by table. Lets the consent-gate
   *  tests assert the lookup is keyed to the specific child + excludes
   *  revoked rows (the mock's .eq is otherwise a passthrough). */
  eqCalls: Array<{ table: string; col: string; val: unknown }>;
}

function makeServiceClient(
  scripts: Record<string, MockResult[]>,
): ServiceMock {
  const inserts: Array<{ table: string; row: unknown }> = [];
  const updates: Array<{ table: string; patch: unknown }> = [];
  const deletes: Array<{ table: string }> = [];
  const eqCalls: Array<{ table: string; col: string; val: unknown }> = [];
  // Item #12 Phase 7.5: the handler's first `questions` SELECT is the
  // discoverEmptyBankStrands call. Inject a synthetic "bank populates
  // every strand" default so emptyBankStrands is empty and legacy test
  // scripts continue consuming their scripted entries in order.
  let questionsDiscoverConsumed = false;

  const client = {
    from(table: string) {
      // Item #10 Phase 3: replay's new SELECT queries (assessment_sessions
      // for engine_prior_version + child_id; children for grade_level) need
      // defaults when tests don't stage anything explicitly. Defaults preserve
      // pre-Phase-3 behavior — engine_prior_version='v1' resolves cleanly via
      // getPriorConfigByVersion; grade_level=null triggers seedPosteriors'
      // R3 fall-back to uniform priors.
      const next = (): MockResult => {
        if (table === "questions" && !questionsDiscoverConsumed) {
          questionsDiscoverConsumed = true;
          return {
            data: STRANDS.map((s) => ({ strand: s })),
            error: null,
          };
        }
        const staged = scripts[table]?.shift();
        if (staged !== undefined) return staged;
        if (table === "assessment_sessions") {
          return {
            data: { engine_prior_version: "v1", child_id: CHILD_ID },
            error: null,
          };
        }
        if (table === "children") {
          return { data: { grade_level: null }, error: null };
        }
        // Consent gate (M2): default to "consent on file" so legacy scripts
        // don't have to stage it. The consent-gate tests stage an empty array
        // explicitly to exercise the block.
        if (table === "consent_records") {
          return { data: [{ id: "consent-default" }], error: null };
        }
        return { data: null, error: null };
      };

      let pendingUpdate: unknown = undefined;
      let pendingDelete = false;
      const builder: Record<string, unknown> = {};

      builder.select = () => builder;
      builder.eq = (col: string, val: unknown) => {
        eqCalls.push({ table, col, val });
        return builder;
      };
      builder.in = () => builder;
      builder.order = () => builder;

      builder.update = (patch: unknown) => {
        pendingUpdate = patch;
        return builder;
      };
      builder.delete = () => {
        pendingDelete = true;
        return builder;
      };
      builder.insert = (row: unknown) => {
        inserts.push({ table, row });
        return builder;
      };

      builder.maybeSingle = () => Promise.resolve(next());
      builder.single = () => Promise.resolve(next());

      builder.then = (
        onFulfilled?: ((r: MockResult) => unknown) | null,
        onRejected?: ((e: unknown) => unknown) | null,
      ) => {
        if (pendingUpdate !== undefined) {
          updates.push({ table, patch: pendingUpdate });
        }
        if (pendingDelete) {
          deletes.push({ table });
        }
        return Promise.resolve(next()).then(onFulfilled, onRejected);
      };

      return builder;
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    inserts,
    updates,
    deletes,
    eqCalls,
  };
}

interface RlsMockOpts {
  user?: { id: string } | null;
  userError?: { message: string } | null;
  parent?: MockResult;
  child?: MockResult;
}

function makeRlsClient(opts: RlsMockOpts): SupabaseClient<Database> {
  const auth = {
    getUser: async () => ({
      data: { user: opts.user ?? null },
      error: opts.userError ?? null,
    }),
  };
  const parentResult = opts.parent ?? { data: null, error: null };
  const childResult = opts.child ?? { data: null, error: null };

  const client = {
    auth,
    from(table: string) {
      const result =
        table === "parents"
          ? parentResult
          : table === "children"
            ? childResult
            : { data: null, error: null };

      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.maybeSingle = () => Promise.resolve(result);
      builder.then = (
        onFulfilled?: ((r: MockResult) => unknown) | null,
        onRejected?: ((e: unknown) => unknown) | null,
      ) => Promise.resolve(result).then(onFulfilled, onRejected);
      return builder;
    },
  };

  return client as unknown as SupabaseClient<Database>;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = "00000000-0000-0000-0000-000000000099";
const PARENT_ID = "00000000-0000-0000-0000-0000000000bb";
const TENANT_ID = "00000000-0000-0000-0000-0000000000aa";
const CHILD_ID = "00000000-0000-0000-0000-0000000000cc";
const SESSION_ID = "00000000-0000-0000-0000-0000000000ee";

const REQ: StartRequest = { child_id: CHILD_ID };

const PARENT_OK: MockResult = {
  data: { id: PARENT_ID, tenant_id: TENANT_ID },
  error: null,
};
const CHILD_OK: MockResult = {
  data: { id: CHILD_ID },
  error: null,
};

// Item #10 Phase 3 — child fixture with grade_level set, used by the
// grade-aware-seeding describe block at the end of this file.
const CHILD_GRADE_K: MockResult = {
  data: { id: CHILD_ID, grade_level: "K" },
  error: null,
};

function questionRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "00000000-0000-0000-0000-0000000000q1",
    external_id: "EXT-Q1",
    strand: "number_sense",
    level: "5A",
    difficulty: 0.176,
    format: "MULTIPLE_CHOICE",
    content: { stem: "Q1?", options: ["a", "b"] },
    ...over,
  };
}

function callHandler(args: {
  rlsClient: SupabaseClient<Database>;
  serviceClient: SupabaseClient<Database>;
  ip?: string | null;
  request?: StartRequest;
}) {
  return sessionStartHandler({
    request: args.request ?? REQ,
    rlsClient: args.rlsClient,
    serviceClient: args.serviceClient,
    ip: args.ip ?? "203.0.113.7",
  });
}

// ===========================================================================
// Auth + ownership chain
// ===========================================================================

describe("sessionStartHandler / auth chain", () => {
  it("returns 401 when there is no authenticated user", async () => {
    const rls = makeRlsClient({ user: null });
    const svc = makeServiceClient({});
    const result = await callHandler({ rlsClient: rls, serviceClient: svc.client });
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "unauthorized", status: 401 }),
    });
  });

  it("returns 401 when no parent row exists for the auth user", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: { data: null, error: null },
    });
    const svc = makeServiceClient({});
    const result = await callHandler({ rlsClient: rls, serviceClient: svc.client });
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "unauthorized", status: 401 }),
    });
  });

  it("returns 500 when the parent lookup errors", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: { data: null, error: { message: "db down" } },
    });
    const svc = makeServiceClient({});
    const result = await callHandler({ rlsClient: rls, serviceClient: svc.client });
    expect(result).toMatchObject({ ok: false, error: { code: "internal" } });
  });

  it("returns 404 when the child is not owned by the calling parent", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: { data: null, error: null },
    });
    const svc = makeServiceClient({});
    const result = await callHandler({ rlsClient: rls, serviceClient: svc.client });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "child_not_found", status: 404 },
    });
  });
});

// ===========================================================================
// Consent gate (M2 readiness / COPPA Gate-B)
// ===========================================================================

describe("sessionStartHandler / consent gate (per-child / Model B)", () => {
  // Helper: the consent_records lookup filters captured by the gate.
  function consentFilters(svc: ReturnType<typeof makeServiceClient>) {
    return svc.eqCalls.filter((e) => e.table === "consent_records");
  }

  it("blocks with 403 and creates no session when THIS child has no unrevoked consent", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      // No consent row matches this child — the gate must refuse.
      consent_records: [{ data: [], error: null }],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "consent_required", status: 403 },
    });
    // Gate runs BEFORE any session insert — a session cannot start without
    // this child's consent (the integrity blocker the M2 audit found).
    expect(svc.inserts.some((i) => i.table === "assessment_sessions")).toBe(
      false,
    );
  });

  it("keys the lookup to the requested child: child A cannot start on child B's consent", async () => {
    // Request is for CHILD_ID (child A). The DB holds no consent for A (empty
    // result) — even if child B were consented, this query is scoped to A, so
    // B's consent is irrelevant. We assert the lookup filtered on A's id.
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      consent_records: [{ data: [], error: null }],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
      request: { child_id: CHILD_ID },
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "consent_required", status: 403 },
    });
    // The consent query is scoped to child A specifically — not parent-wide.
    expect(consentFilters(svc)).toEqual(
      expect.arrayContaining([
        { table: "consent_records", col: "child_id", val: CHILD_ID },
        { table: "consent_records", col: "parent_id", val: PARENT_ID },
      ]),
    );
  });

  it("excludes revoked rows: revoking child A's consent blocks child A", async () => {
    // A revoked row would not satisfy `revoked = false`, so the gate sees no
    // valid consent and blocks. We assert the lookup filters revoked=false AND
    // the specific child — so revoking A affects A only (a different child_id
    // row is untouched by this query).
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      consent_records: [{ data: [], error: null }], // only a revoked row exists
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "consent_required", status: 403 },
    });
    expect(consentFilters(svc)).toEqual(
      expect.arrayContaining([
        { table: "consent_records", col: "child_id", val: CHILD_ID },
        { table: "consent_records", col: "revoked", val: false },
      ]),
    );
  });

  it("proceeds to create a session when THIS child has an unrevoked consent record", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      consent_records: [{ data: [{ id: "consent-1" }], error: null }],
      assessment_sessions: [
        { data: null, error: null }, // existing-session check (none)
        { data: { id: SESSION_ID }, error: null }, // INSERT...returning id
      ],
      questions: [{ data: [questionRow()], error: null }],
      question_access_log: [{ data: null, error: null }],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.body.session_id).toBe(SESSION_ID);
  });

  it("returns 500 when the consent lookup itself errors (does not fail open)", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      consent_records: [{ data: null, error: { message: "consent table down" } }],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "internal", status: 500 },
    });
    expect(svc.inserts.some((i) => i.table === "assessment_sessions")).toBe(
      false,
    );
  });
});

// ===========================================================================
// Fresh-session happy path
// ===========================================================================

describe("sessionStartHandler / fresh session", () => {
  it("creates a session, picks the first question, writes the audit log, returns 200", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      assessment_sessions: [
        { data: null, error: null }, // existing-session check (none)
        { data: { id: SESSION_ID }, error: null }, // INSERT...returning id
      ],
      questions: [
        { data: [questionRow()], error: null }, // picker
      ],
      question_access_log: [{ data: null, error: null }], // log insert
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
      ip: "203.0.113.7",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.body.session_id).toBe(SESSION_ID);
    expect(result.body.question.id).toBe(questionRow().id);
    expect(result.body.question.format).toBe("MULTIPLE_CHOICE");
    // compliance §8: client payload must NOT include answers
    expect(result.body.question.content).toEqual({
      stem: "Q1?",
      options: ["a", "b"],
    });
    expect(result.body.error).toBeUndefined();

    // assessment_sessions insert payload
    const sessInsert = svc.inserts.find(
      (i) => i.table === "assessment_sessions",
    );
    expect(sessInsert?.row).toMatchObject({
      tenant_id: TENANT_ID,
      child_id: CHILD_ID,
      status: "IN_PROGRESS",
    });

    // question_access_log insert payload — full audit fields
    const logInsert = svc.inserts.find(
      (i) => i.table === "question_access_log",
    );
    expect(logInsert?.row).toMatchObject({
      tenant_id: TENANT_ID,
      session_id: SESSION_ID,
      child_id: CHILD_ID,
      question_id: questionRow().id,
      ip_address: "203.0.113.7",
    });
  });
});

// ===========================================================================
// First-pick exhaustion → rollback
// ===========================================================================

describe("sessionStartHandler / first-pick exhaustion", () => {
  it("returns 422 bank_unservable AND deletes the just-inserted session row", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      assessment_sessions: [
        { data: null, error: null }, // existing check
        { data: { id: SESSION_ID }, error: null }, // INSERT
        { data: null, error: null }, // DELETE rollback
      ],
      questions: [{ data: [], error: null }], // picker → strand-exhausted
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("bank_unservable");
    expect(result.error.status).toBe(422);
    expect(svc.deletes.some((d) => d.table === "assessment_sessions")).toBe(
      true,
    );
    // Audit log must NOT be written when no question was served.
    expect(
      svc.inserts.some((i) => i.table === "question_access_log"),
    ).toBe(false);
  });

  // Item #12 Phase 7.5 — first-pick loop advances past exhausted strands.
  it("Phase 7.5: first picker call exhausts, loop advances to second strand and serves (no rollback)", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      assessment_sessions: [
        { data: null, error: null }, // existing check (no IN_PROGRESS)
        { data: { id: SESSION_ID }, error: null }, // INSERT
      ],
      questions: [
        // (auto-injected discover — all 6 strands populated)
        { data: [], error: null }, // 1st picker → strand-exhausted
        { data: [questionRow()], error: null }, // 2nd picker → serves
      ],
      question_access_log: [{ data: null, error: null }],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.body.question.id).toBe(questionRow().id);
    // Session was NOT deleted — the loop found a servable strand.
    expect(svc.deletes.some((d) => d.table === "assessment_sessions")).toBe(false);
    // Exactly one audit-log INSERT for the served question.
    expect(
      svc.inserts.filter((i) => i.table === "question_access_log"),
    ).toHaveLength(1);
  });

  it("still returns 422 even when the rollback DELETE fails (logs warning)", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      assessment_sessions: [
        { data: null, error: null },
        { data: { id: SESSION_ID }, error: null },
        { data: null, error: { message: "delete failed" } },
      ],
      questions: [{ data: [], error: null }],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "bank_unservable", status: 422 },
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ===========================================================================
// Resume — existing IN_PROGRESS session with outstanding question
// ===========================================================================

describe("sessionStartHandler / resume with outstanding", () => {
  it("returns 409 with the outstanding question + writes a NEW audit-log row", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });

    // findOutstandingQuestion: log says served q1, no responses → outstanding=q1
    const q1 = questionRow();
    const svc = makeServiceClient({
      assessment_sessions: [
        // existing-session check — found
        { data: { id: SESSION_ID }, error: null },
      ],
      question_access_log: [
        // findOutstanding step (1): logs newest-first
        {
          data: [{ question_id: q1.id, created_at: "2026-05-07T10:00:00Z" }],
          error: null,
        },
        // logQuestionServe insert
        { data: null, error: null },
      ],
      responses: [
        // sessionHasResponses: count>0 → hasProgress=true → 409 branch.
        // The downstream findOutstanding queue still says data: [] for
        // narrative simplicity (one served, none answered). In a real DB
        // this would be inconsistent, but each mock query is independent
        // and the test cares about exercising the has-progress 409 branch.
        { data: null, count: 1, error: null },
        // findOutstanding step (2): no responses
        { data: [], error: null },
        // logAndRespond.computeRequest → replayEngineState reads responses
        { data: [], error: null },
      ],
      questions: [
        // findOutstanding step (4): materialise q1
        { data: q1, error: null },
        // replay step: questions for response question_ids — none, so this
        // would actually be skipped. But if reached, return empty array.
      ],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(409);
    expect(result.body.session_id).toBe(SESSION_ID);
    expect(result.body.question.id).toBe(q1.id);
    expect(result.body.error).toEqual({
      code: "session_in_progress",
      message: expect.stringContaining("resumed"),
    });

    // New audit-log row was written for the resumed serve.
    expect(
      svc.inserts.filter((i) => i.table === "question_access_log"),
    ).toHaveLength(1);

    // No new session was inserted.
    expect(
      svc.inserts.filter((i) => i.table === "assessment_sessions"),
    ).toHaveLength(0);
  });

  it("interleaved: serve A, serve B, answer A → returns B as the outstanding question", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const qA = questionRow({ id: "qid-A", external_id: "EXT-A" });
    const qB = questionRow({ id: "qid-B", external_id: "EXT-B" });

    const svc = makeServiceClient({
      assessment_sessions: [{ data: { id: SESSION_ID }, error: null }],
      question_access_log: [
        // logs newest-first: B then A
        {
          data: [
            { question_id: qB.id, created_at: "2026-05-07T10:01:00Z" },
            { question_id: qA.id, created_at: "2026-05-07T10:00:00Z" },
          ],
          error: null,
        },
        { data: null, error: null }, // log insert for resumed serve
      ],
      responses: [
        // sessionHasResponses: 1 row (qA was answered) → hasProgress=true.
        { data: null, count: 1, error: null },
        // step (2): A is answered
        { data: [{ question_id: qA.id }], error: null },
        // logAndRespond's replayEngineState — reads responses again
        { data: [{ question_id: qA.id }], error: null },
      ],
      questions: [
        // step (4): materialise B
        { data: qB, error: null },
        // replay's questions.in() — fetch row for qA (the answered one)
        { data: [qA], error: null },
      ],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.question.id).toBe(qB.id);
  });
});

// ===========================================================================
// Resume half-state — session IN_PROGRESS but every served question answered
// ===========================================================================

describe("sessionStartHandler / resume half-state", () => {
  it("picks the next question via the engine when nothing is outstanding", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const qA = questionRow({ id: "qid-A", external_id: "EXT-A" });
    const qNext = questionRow({ id: "qid-next", external_id: "EXT-N" });

    const svc = makeServiceClient({
      assessment_sessions: [{ data: { id: SESSION_ID }, error: null }],
      question_access_log: [
        // logs: A served once
        {
          data: [{ question_id: qA.id, created_at: "2026-05-07T10:00:00Z" }],
          error: null,
        },
        // log insert for the new pick
        { data: null, error: null },
      ],
      responses: [
        // sessionHasResponses: 1 row (qA was answered) → hasProgress=true.
        { data: null, count: 1, error: null },
        // findOutstanding step (2): A is answered → no outstanding
        { data: [{ question_id: qA.id }], error: null },
        // replay step
        { data: [{ question_id: qA.id }], error: null },
      ],
      questions: [
        // replay's questions.in() for [qA]
        { data: [qA], error: null },
        // picker query
        { data: [qNext], error: null },
      ],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(409);
    expect(result.body.question.id).toBe(qNext.id);
  });

  it("returns 422 when the picker exhausts on resume + closes the session with bank-exhausted", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const qA = questionRow({ id: "qid-A", external_id: "EXT-A" });
    const svc = makeServiceClient({
      assessment_sessions: [
        { data: { id: SESSION_ID }, error: null }, // existing
        // Item #10 Phase 3: replay's session SELECT.
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // close UPDATE
      ],
      question_access_log: [
        {
          data: [{ question_id: qA.id, created_at: "t" }],
          error: null,
        },
      ],
      responses: [
        // sessionHasResponses: 1 row → hasProgress=true.
        { data: null, count: 1, error: null },
        { data: [{ question_id: qA.id }], error: null },
        { data: [{ question_id: qA.id }], error: null }, // replay
      ],
      questions: [
        { data: [qA], error: null }, // replay's questions.in()
        { data: [], error: null }, // picker → strand-exhausted
      ],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "bank_unservable", status: 422 },
    });
    // Session was closed (UPDATE captured).
    expect(
      svc.updates.find((u) => u.table === "assessment_sessions"),
    ).toMatchObject({
      patch: expect.objectContaining({ status: "COMPLETED" }),
    });
    // Session row was NOT deleted (it has real data).
    expect(svc.deletes.some((d) => d.table === "assessment_sessions")).toBe(
      false,
    );
  });
});

// ===========================================================================
// Concurrency — unique-violation race
// ===========================================================================

describe("sessionStartHandler / concurrent insert", () => {
  it("falls into the resume path when INSERT loses the unique-index race", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const q1 = questionRow();

    const svc = makeServiceClient({
      assessment_sessions: [
        { data: null, error: null }, // first existing-session check (none)
        // INSERT fails 23505
        {
          data: null,
          error: { message: "duplicate key", code: "23505" },
        },
        // re-read after the constraint fires
        { data: { id: SESSION_ID }, error: null },
      ],
      question_access_log: [
        {
          data: [{ question_id: q1.id, created_at: "t" }],
          error: null,
        },
        { data: null, error: null }, // log insert for resume
      ],
      responses: [
        // sessionHasResponses: 0 rows → hasProgress=false → 200 (no-banner).
        // The race-loss path is THE canonical zero-progress resume: the
        // session row exists from a sibling /start whose first pick hasn't
        // been answered yet (React Strict Mode double-invoke in dev).
        { data: null, count: 0, error: null },
        { data: [], error: null },
        { data: [], error: null }, // replay (used by computeRequest)
      ],
      questions: [{ data: q1, error: null }],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.body.session_id).toBe(SESSION_ID);
    // No resume banner — the body must NOT carry an error field.
    expect(result.body.error).toBeUndefined();
  });

  it("returns 200 (no resume banner) when the existing session has zero responses", async () => {
    // The Strict-Mode dev-only repro: a prior /start created the session
    // and served question #1; the parallel /start lands on the existing-
    // session branch with hasProgress=false. UX-equivalent to "fresh
    // session" — same status code, same body shape (no error field).
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const q1 = questionRow();

    const svc = makeServiceClient({
      assessment_sessions: [
        // existing-session check — found
        { data: { id: SESSION_ID }, error: null },
      ],
      question_access_log: [
        {
          data: [{ question_id: q1.id, created_at: "t" }],
          error: null,
        },
        { data: null, error: null }, // log insert for resumed serve
      ],
      responses: [
        // sessionHasResponses: 0 rows → hasProgress=false.
        { data: null, count: 0, error: null },
        // findOutstanding step (2): no responses → q1 outstanding
        { data: [], error: null },
        // logAndRespond.computeRequest → replay reads responses
        { data: [], error: null },
      ],
      questions: [{ data: q1, error: null }],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.body.session_id).toBe(SESSION_ID);
    expect(result.body.question.id).toBe(q1.id);
    // Crucial: no error field, so the client does not show a resume banner.
    expect(result.body.error).toBeUndefined();
  });
});

// ===========================================================================
// Audit-log failure on a fresh-session pick
// ===========================================================================

describe("sessionStartHandler / audit-log failure", () => {
  it("returns 500 when the question is picked but the audit log insert fails", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_OK,
    });
    const svc = makeServiceClient({
      assessment_sessions: [
        { data: null, error: null },
        { data: { id: SESSION_ID }, error: null },
      ],
      questions: [{ data: [questionRow()], error: null }],
      question_access_log: [
        { data: null, error: { message: "audit table down" } },
      ],
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "internal", status: 500 },
    });
  });
});

// ===========================================================================
// Item #10 Phase 3 — grade-aware seeding
// ===========================================================================

describe("sessionStartHandler / Item #10 Phase 3 grade-aware seeding", () => {
  it("stamps engine_prior_version='v1' on the session insert (grade-K child)", async () => {
    const rls = makeRlsClient({
      user: { id: USER_ID },
      parent: PARENT_OK,
      child: CHILD_GRADE_K,
    });
    const svc = makeServiceClient({
      assessment_sessions: [
        { data: null, error: null }, // existing-session check (none)
        { data: { id: SESSION_ID }, error: null }, // INSERT...returning id
      ],
      questions: [
        { data: [questionRow()], error: null }, // picker
      ],
      question_access_log: [{ data: null, error: null }], // log insert
    });

    const result = await callHandler({
      rlsClient: rls,
      serviceClient: svc.client,
    });

    // Primary: session insert payload stamps ACTIVE_PRIOR_VERSION.
    // The mock controls what the picker returns regardless of the engine's
    // targetDifficulty request, so a "first question level" assertion would
    // be a tautology in this mock framework. Real-DB level-shift behavior
    // is covered by the visual gate (see Phase 3 commit message).
    const sessInsert = svc.inserts.find(
      (i) => i.table === "assessment_sessions",
    );
    expect(sessInsert?.row).toMatchObject({
      engine_prior_version: "v1",
    });

    // Secondary: the grade-aware path returns the success contract intact —
    // status 200, session id present. Smoke-test that Phase 3's
    // createEngineState options-object signature didn't crash the flow.
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.body.session_id).toBe(SESSION_ID);
  });
});
