import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database, Enums, Inserts, Json } from "@/lib/supabase/database.types";
import {
  TIME_FLAG_CONFIG_VERSION,
  flagResponseTime,
  type ItemNormTags,
} from "@/lib/timeFlagging";

import { submitResponseHandler } from "./handler";
import type { SubmitRequest } from "./types";

// ===========================================================================
// Mock infrastructure
// ===========================================================================
//
// Per-table call queue: tests pre-stage a list of {data,error} results per
// table; the fake client pops the next result on each from(table) chain.
// Insert payloads and update patches are captured for assertion.

interface MockResult {
  data: unknown;
  error: { message: string } | null;
}

interface ServiceMock {
  client: SupabaseClient<Database>;
  inserts: Array<{ table: string; row: unknown }>;
  updates: Array<{ table: string; patch: unknown }>;
}

function makeServiceClient(scripts: Record<string, MockResult[]>): ServiceMock {
  const inserts: Array<{ table: string; row: unknown }> = [];
  const updates: Array<{ table: string; patch: unknown }> = [];

  const client = {
    from(table: string) {
      const next = (): MockResult =>
        scripts[table]?.shift() ?? { data: null, error: null };

      let pendingUpdate: unknown = undefined;
      const builder: Record<string, unknown> = {};

      builder.select = () => builder;
      builder.eq = () => builder;
      builder.in = () => builder;

      builder.update = (patch: unknown) => {
        pendingUpdate = patch;
        return builder;
      };

      builder.maybeSingle = () => Promise.resolve(next());
      builder.single = () => Promise.resolve(next());
      builder.order = () => Promise.resolve(next());

      builder.insert = (row: unknown) => {
        inserts.push({ table, row });
        return Promise.resolve(next());
      };

      // Awaiting the chain (e.g., update().eq()) lands here.
      builder.then = (
        onFulfilled?: ((r: MockResult) => unknown) | null,
        onRejected?: ((e: unknown) => unknown) | null,
      ) => {
        if (pendingUpdate !== undefined) {
          updates.push({ table, patch: pendingUpdate });
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
  };
}

interface RlsMockOpts {
  user?: { id: string } | null;
  userError?: { message: string } | null;
  parent?: MockResult;
  children?: MockResult;
  session?: MockResult;
}

function makeRlsClient(opts: RlsMockOpts): SupabaseClient<Database> {
  const auth = {
    getUser: async () => ({
      data: { user: opts.user ?? null },
      error: opts.userError ?? null,
    }),
  };
  const client = {
    auth,
    from(table: string) {
      const result =
        table === "parents"
          ? opts.parent ?? { data: null, error: null }
          : table === "children"
            ? opts.children ?? { data: [], error: null }
            : table === "assessment_sessions"
              ? opts.session ?? { data: null, error: null }
              : (() => {
                  throw new Error(`unexpected rls table ${table}`);
                })();

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

// ===========================================================================
// Fixtures
// ===========================================================================

const PARENT = { id: "p1", tenant_id: "t1" };
const CHILD_ID = "c1";
const SESSION_ID = "s1";
const QUESTION_ID = "q1";

const SESSION_IN_PROGRESS = {
  id: SESSION_ID,
  status: "IN_PROGRESS" as const,
  child_id: CHILD_ID,
};
const SESSION_COMPLETED = {
  id: SESSION_ID,
  status: "COMPLETED" as const,
  child_id: CHILD_ID,
};

// A simple KA-level question: ADDITION, SYMBOLIC, no words, MC with answer "A".
const QUESTION = {
  id: QUESTION_ID,
  strand: "OPERATIONS" as Enums<"strand">,
  level: "KA" as Enums<"half_grade_level">,
  difficulty: 0,
  format: "MULTIPLE_CHOICE" as Enums<"question_format">,
  content: { correct_answer: "A" } as Json,
  word_count: 0,
  operation_type: "ADDITION" as Enums<"operation_type">,
  num_operations: 1,
  representation: "SYMBOLIC" as Enums<"representation_kind">,
};

const TAGS: ItemNormTags = {
  word_count: QUESTION.word_count,
  operation_type: QUESTION.operation_type,
  num_operations: QUESTION.num_operations,
  representation: QUESTION.representation,
};

function rlsHappy(): RlsMockOpts {
  return {
    user: { id: "u1" },
    parent: { data: PARENT, error: null },
    children: { data: [{ id: CHILD_ID }], error: null },
    session: { data: SESSION_IN_PROGRESS, error: null },
  };
}

function makeRequest(overrides?: Partial<SubmitRequest>): SubmitRequest {
  return {
    session_id: SESSION_ID,
    question_id: QUESTION_ID,
    answer_given: "A",
    time_ms: 5000,
    ...overrides,
  };
}

// 24 prior responses to push the post-state to MAX_QUESTIONS=25 and force
// shouldTerminate -> done. Each prior gets its own question_id so replay's
// servedQuestionIds builds correctly.
function priors(n: number) {
  const responses = [];
  const questions = [];
  for (let i = 0; i < n; i++) {
    const qid = `prior-${i}`;
    responses.push({
      question_id: qid,
      is_correct: true,
      time_taken_seconds: 5,
      created_at: `2026-05-07T00:${String(i).padStart(2, "0")}:00Z`,
    });
    questions.push({
      id: qid,
      strand: "OPERATIONS" as Enums<"strand">,
      level: "3A" as Enums<"half_grade_level">,
      difficulty: 0,
      format: "MULTIPLE_CHOICE" as Enums<"question_format">,
    });
  }
  return { responses, questions };
}

// Aggregation-query fixture — N normal + M invalid response rows.
function aggRows(normal: number, invalid: number) {
  const rows = [];
  for (let i = 0; i < normal; i++) {
    rows.push({
      expected_time_sec: 5,
      time_ratio: 1.0,
      time_flag: "NORMAL" as Enums<"time_flag">,
      time_flag_config_version: TIME_FLAG_CONFIG_VERSION,
      used_fallback: false,
    });
  }
  for (let i = 0; i < invalid; i++) {
    rows.push({
      expected_time_sec: 5,
      time_ratio: 0.1,
      time_flag: "INVALID" as Enums<"time_flag">,
      time_flag_config_version: TIME_FLAG_CONFIG_VERSION,
      used_fallback: false,
    });
  }
  return rows;
}

type ResponseInsertRow = Inserts<"responses">;

function expectedInsertFor(timeMs: number, isCorrect = true): ResponseInsertRow {
  const flag = flagResponseTime({
    level: QUESTION.level,
    format: QUESTION.format,
    tags: TAGS,
    timeMs,
  });
  return {
    tenant_id: PARENT.tenant_id,
    session_id: SESSION_ID,
    question_id: QUESTION_ID,
    answer_given: "A",
    is_correct: isCorrect,
    time_taken_seconds: timeMs / 1000,
    expected_time_sec: flag.expectedTimeSec,
    time_ratio: flag.timeRatio,
    time_flag: flag.flag,
    time_flag_config_version: flag.configVersion,
    used_fallback: flag.usedFallback,
    detected_misconceptions: [],
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe("submitResponseHandler — happy path mid-session", () => {
  it("inserts response with all 12 columns, updates current_estimate, returns next_request", async () => {
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence check
        { data: [], error: null }, // replay responses (empty -> no questions read)
        { data: null, error: null }, // insert response
      ],
      questions: [{ data: QUESTION, error: null }],
      assessment_sessions: [{ data: null, error: null }], // estimate update
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.is_correct).toBe(true);
    expect(result.body.done).toBe(false);
    expect(result.body.next_request).toBeDefined();
    expect(result.body.placement).toBeUndefined();

    expect(svc.inserts).toHaveLength(1);
    expect(svc.inserts[0].table).toBe("responses");
    expect(svc.inserts[0].row).toEqual(expectedInsertFor(5000));

    // current_estimate UPDATE happened.
    expect(svc.updates).toHaveLength(1);
    expect(svc.updates[0].table).toBe("assessment_sessions");
    const estPatch = svc.updates[0].patch as Record<string, unknown>;
    expect(estPatch.current_estimate).toBeDefined();
  });
});

describe("submitResponseHandler — happy path terminating", () => {
  it("writes COMPLETED + summary; insert payload covers all 12 columns; returns placement", async () => {
    const p = priors(24);
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence
        { data: p.responses, error: null }, // replay responses
        { data: null, error: null }, // insert
        { data: aggRows(25, 0), error: null }, // aggregation re-read
      ],
      questions: [
        { data: QUESTION, error: null }, // question fetch
        { data: p.questions, error: null }, // replay questions (in())
      ],
      assessment_sessions: [
        { data: null, error: null }, // estimate update
        { data: null, error: null }, // close update
        { data: null, error: null }, // summary update
      ],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(true);
    expect(result.body.placement).toBeDefined();
    expect(result.body.next_request).toBeUndefined();

    expect(svc.inserts).toHaveLength(1);
    expect(svc.inserts[0].row).toEqual(expectedInsertFor(5000));

    // assessment_sessions updates: estimate, close, summary (in order).
    const sessionUpdates = svc.updates.filter(
      (u) => u.table === "assessment_sessions",
    );
    expect(sessionUpdates).toHaveLength(3);
    const closePatch = sessionUpdates[1].patch as Record<string, unknown>;
    expect(closePatch.status).toBe("COMPLETED");
    expect(closePatch.completed_at).toEqual(expect.any(String));

    const summaryPatch = sessionUpdates[2].patch as Record<string, unknown>;
    expect(summaryPatch.session_time_flag).toBeDefined();
    expect(summaryPatch.time_flag_summary).toBeDefined();
  });
});

describe("submitResponseHandler — idempotent retry", () => {
  it("returns body computed from post-state and skips the insert", async () => {
    const svc = makeServiceClient({
      responses: [
        { data: { is_correct: true, time_flag: "NORMAL" }, error: null }, // existence hits
        { data: [], error: null }, // replay responses (empty: handler ran before any insert in test fixture)
      ],
      questions: [],
      assessment_sessions: [],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.is_correct).toBe(true);
    expect(result.body.time_flag).toBe("NORMAL");

    // No insert, no update.
    expect(svc.inserts).toHaveLength(0);
    expect(svc.updates).toHaveLength(0);
  });
});

describe("submitResponseHandler — auth failures", () => {
  it("returns 401 when auth.getUser yields no user", async () => {
    const svc = makeServiceClient({});
    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient({ user: null }),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthorized");
    expect(result.error.status).toBe(401);
  });

  it("returns 401 when auth user has no parents row", async () => {
    const svc = makeServiceClient({});
    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient({
        user: { id: "u1" },
        parent: { data: null, error: null },
      }),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unauthorized");
  });
});

describe("submitResponseHandler — ownership failures", () => {
  it("returns 404 when session is not visible (RLS denies)", async () => {
    const svc = makeServiceClient({});
    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient({
        ...rlsHappy(),
        session: { data: null, error: null },
      }),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("session_not_found");
    expect(result.error.status).toBe(404);
  });

  it("returns 403 when session is visible but child_id is not in owned children (dual-role bypass)", async () => {
    const svc = makeServiceClient({});
    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient({
        ...rlsHappy(),
        // children read returns rows that don't include the session's child_id.
        children: { data: [{ id: "some-other-child" }], error: null },
        session: {
          data: { id: SESSION_ID, status: "IN_PROGRESS", child_id: CHILD_ID },
          error: null,
        },
      }),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("forbidden");
    expect(result.error.status).toBe(403);
  });
});

describe("submitResponseHandler — session/question state errors", () => {
  it("returns 409 when a NEW submit hits a COMPLETED session", async () => {
    const svc = makeServiceClient({
      responses: [{ data: null, error: null }], // existence (no row)
      questions: [],
      assessment_sessions: [],
    });
    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient({
        ...rlsHappy(),
        session: { data: SESSION_COMPLETED, error: null },
      }),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("session_completed");
    expect(result.error.status).toBe(409);
  });

  it("returns 404 when the question is not found", async () => {
    const svc = makeServiceClient({
      responses: [{ data: null, error: null }], // existence (no row)
      questions: [{ data: null, error: null }], // question not found
      assessment_sessions: [],
    });
    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("question_not_found");
  });
});

describe("submitResponseHandler — flagger errors", () => {
  it("returns 500 with code flagger_error when flagResponseTime throws", async () => {
    // num_operations: 0 violates the flagger's invariant; in production this
    // would fail the questions_num_operations_chk constraint, but the test
    // exercises the runtime safety path.
    const svc = makeServiceClient({
      responses: [{ data: null, error: null }],
      questions: [
        {
          data: { ...QUESTION, num_operations: 0 },
          error: null,
        },
      ],
      assessment_sessions: [],
    });
    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("flagger_error");
    expect(result.error.status).toBe(500);

    // Side-effect: nothing should have been inserted.
    expect(svc.inserts).toHaveLength(0);
  });
});

describe("submitResponseHandler — INVALID time_ms (test 11)", () => {
  it("persists time_flag=INVALID on the response when time_ms < 1000", async () => {
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null },
        { data: [], error: null },
        { data: null, error: null },
      ],
      questions: [{ data: QUESTION, error: null }],
      assessment_sessions: [{ data: null, error: null }],
    });
    const result = await submitResponseHandler({
      request: makeRequest({ time_ms: 500 }),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.time_flag).toBe("INVALID");

    expect(svc.inserts).toHaveLength(1);
    const row = svc.inserts[0].row as ResponseInsertRow;
    expect(row.time_flag).toBe("INVALID");
    expect(row.time_taken_seconds).toBe(0.5);
  });

  it("counts the INVALID response in the persisted session summary on terminate", async () => {
    const p = priors(24);
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence
        { data: p.responses, error: null }, // replay
        { data: null, error: null }, // insert
        { data: aggRows(24, 1), error: null }, // aggregation: 24 NORMAL + 1 INVALID
      ],
      questions: [
        { data: QUESTION, error: null },
        { data: p.questions, error: null },
      ],
      assessment_sessions: [
        { data: null, error: null }, // estimate
        { data: null, error: null }, // close
        { data: null, error: null }, // summary
      ],
    });
    const result = await submitResponseHandler({
      request: makeRequest({ time_ms: 500 }),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(true);

    const summaryUpdate = svc.updates.find(
      (u) =>
        u.table === "assessment_sessions" &&
        (u.patch as Record<string, unknown>).time_flag_summary !== undefined,
    );
    expect(summaryUpdate).toBeDefined();
    const summary = (summaryUpdate!.patch as Record<string, unknown>)
      .time_flag_summary as Record<string, unknown>;
    expect(summary.invalid).toBe(1);
    expect(summary.total).toBe(25);
    expect(summary.normal).toBe(24);
  });
});
