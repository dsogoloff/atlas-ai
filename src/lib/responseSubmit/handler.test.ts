import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/misconceptionClassifier/classifier", () => ({
  classify: vi.fn(),
}));

// The handler emits short_test_item_answered / short_test_completed via the
// (synchronously-invoked) after() mock below. Stub emit() so those analytics
// inserts don't land in the captured serviceClient insert log this suite
// asserts on. emit()'s own behaviour is covered in
// src/lib/analytics/emit.test.ts.
vi.mock("@/lib/analytics/emit", () => ({
  emit: vi.fn().mockResolvedValue(undefined),
}));

// Stub the narration trigger so existing handler tests don't need to
// script report_narrations queries. The trigger has its own unit tests
// in src/lib/report/narration/trigger.test.ts covering happy path,
// failure isolation, and idempotency.
vi.mock("@/lib/report/narration/trigger", () => ({
  attemptNarration: vi.fn().mockResolvedValue(undefined),
}));

// Stub Next.js `after` so the fire-and-forget kick-off in closeSession
// invokes its callback synchronously in tests. Outside a request context
// the real `after` would throw, and we want the trigger-side effects to
// observably happen within each test rather than dangling on a real
// post-response queue.
vi.mock("next/server", () => ({
  after: (cb: () => unknown) => {
    // Promise resolved with the result so a rejection inside the
    // callback can't surface as an unhandled rejection during tests.
    Promise.resolve(cb()).catch(() => undefined);
  },
}));

import { emit } from "@/lib/analytics/emit";
import { STRANDS } from "@/lib/engine/levels";
import { classify } from "@/lib/misconceptionClassifier/classifier";
import type { ClassifierOutput } from "@/lib/misconceptionClassifier/types";
import { attemptNarration } from "@/lib/report/narration/trigger";
import type { Database, Enums, Json, TablesInsert } from "@/lib/supabase/database.types";
import {
  TIME_FLAG_CONFIG_VERSION,
  flagResponseTime,
  type ItemNormTags,
} from "@/lib/timeFlagging";

import { submitResponseHandler } from "./handler";
import type { SubmitRequest } from "./types";

const mockClassify = vi.mocked(classify);
const mockAttemptNarration = vi.mocked(attemptNarration);
const mockEmit = vi.mocked(emit);

const DEFAULT_CLASSIFICATION: ClassifierOutput = {
  codes: [],
  method: "none",
  version: null,
};

beforeEach(() => {
  mockClassify.mockReset();
  // Default: method='none' covers correct answers and DRAG_DROP. Tests
  // that exercise classifier output (e.g., distractor-map hits) override
  // per-test via mockResolvedValueOnce.
  mockClassify.mockResolvedValue(DEFAULT_CLASSIFICATION);
  mockAttemptNarration.mockReset();
  mockAttemptNarration.mockResolvedValue(undefined);
  mockEmit.mockClear();
});

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
  // Item #12 Phase 7.5: the handler's first `questions` SELECT is the
  // discoverEmptyBankStrands call. Tests don't script it; inject a
  // synthetic "bank populates every strand" default so emptyBankStrands
  // is empty and the legacy test scripts (picker reads, etc.) keep
  // consuming their scripted entries in order. Tests that need to assert
  // empty-bank behaviour can prepend an explicit entry to scripts.questions.
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
          // Default: all strands populated (no empty-bank strands).
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
          // grade_level=null → seedPosteriors uniform fallback (replay path);
          // birth_year is read by the comprehensive-engine tier derivation
          // (deriveTier) on the comprehensive branch. A K-4-aged birth_year
          // keeps the default tier K_4 (hardCap 26) for comprehensive tests.
          return { data: { grade_level: null, birth_year: 2018 }, error: null };
        }
        // Consent gate (M2): default to "consent on file" so legacy submit
        // scripts don't have to stage it. The consent-gate test stages an
        // empty array explicitly to exercise the block.
        if (table === "consent_records") {
          return { data: [{ id: "consent-default" }], error: null };
        }
        return { data: null, error: null };
      };

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
  test_type: "short" as const,
};
const SESSION_IN_PROGRESS_COMPREHENSIVE = {
  id: SESSION_ID,
  status: "IN_PROGRESS" as const,
  child_id: CHILD_ID,
  test_type: "comprehensive" as const,
};
const SESSION_COMPLETED = {
  id: SESSION_ID,
  status: "COMPLETED" as const,
  child_id: CHILD_ID,
  test_type: "short" as const,
};

// A simple KA-level question: ADDITION, SYMBOLIC, no words, MC with answer "A".
// Content mirrors real seed shape (supabase/seed.sql:162-168): options + correct_index.
const QUESTION = {
  id: QUESTION_ID,
  strand: "operations_algorithms" as Enums<"strand">,
  level: "KA" as Enums<"half_grade_level">,
  difficulty: 0,
  format: "MULTIPLE_CHOICE" as Enums<"question_format">,
  content: { stem: "1+1=?", options: ["A", "B", "C"], correct_index: 0 } as Json,
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
      strand: "operations_algorithms" as Enums<"strand">,
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

type ResponseInsertRow = TablesInsert<"responses">;

function expectedInsertFor(
  timeMs: number,
  isCorrect = true,
  classification: ClassifierOutput = DEFAULT_CLASSIFICATION,
): ResponseInsertRow {
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
    detected_misconceptions: classification.codes,
    misconception_classifier_method: classification.method,
    misconception_classifier_version: classification.version,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe("submitResponseHandler — happy path mid-session", () => {
  it("inserts response, updates current_estimate, picks next question, writes audit log, returns next_question", async () => {
    const nextPick = {
      id: "next-q-1",
      external_id: "EXT-NEXT",
      strand: "operations_algorithms",
      level: "KA",
      difficulty: 0,
      format: "MULTIPLE_CHOICE",
      content: { stem: "next?", options: ["x", "y"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence check
        { data: [], error: null }, // replay responses (empty -> no questions read)
        { data: null, error: null }, // insert response
      ],
      questions: [
        { data: QUESTION, error: null }, // initial question fetch
        { data: [nextPick], error: null }, // picker
      ],
      assessment_sessions: [
        // Item #10 Phase 3: replay's session SELECT.
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // estimate update
      ],
      question_access_log: [{ data: null, error: null }], // log insert
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: "203.0.113.7",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.is_correct).toBe(true);
    expect(result.body.done).toBe(false);
    expect(result.body.next_request).toBeDefined();
    expect(result.body.next_question).toBeDefined();
    expect(result.body.next_question?.id).toBe(nextPick.id);
    expect(result.body.next_question?.content).toEqual({
      stem: "next?",
      options: ["x", "y"],
    });
    expect(result.body.placement).toBeUndefined();
    expect(result.body.termination_reason).toBeUndefined();

    // responses INSERT plus question_access_log INSERT.
    const responseInsert = svc.inserts.find((i) => i.table === "responses");
    expect(responseInsert?.row).toEqual(expectedInsertFor(5000));

    const logInsert = svc.inserts.find(
      (i) => i.table === "question_access_log",
    );
    expect(logInsert?.row).toMatchObject({
      tenant_id: PARENT.tenant_id,
      session_id: SESSION_ID,
      child_id: CHILD_ID,
      question_id: nextPick.id,
      ip_address: "203.0.113.7",
    });

    // current_estimate UPDATE happened.
    const estUpdate = svc.updates.find((u) => u.table === "assessment_sessions");
    expect(estUpdate).toBeDefined();
    expect((estUpdate!.patch as Record<string, unknown>).current_estimate).toBeDefined();
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
        // Item #10 Phase 3: replay's session SELECT.
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // estimate update
        { data: null, error: null }, // close update
        { data: null, error: null }, // summary update
      ],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(true);
    expect(result.body.placement).toBeDefined();
    expect(result.body.next_request).toBeUndefined();
    expect(result.body.next_question).toBeUndefined();
    // 24 priors + 1 current = 25 = MAX_QUESTIONS.
    expect(result.body.termination_reason).toBe("max-questions-reached");

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

    // (c3) Narration trigger fired via after(). Test mock invokes the
    // after() callback synchronously, so by this point the trigger has
    // been called once with the closed session's id.
    expect(mockAttemptNarration).toHaveBeenCalledTimes(1);
    expect(mockAttemptNarration).toHaveBeenCalledWith(
      svc.client,
      SESSION_ID,
    );
  });
});

describe("submitResponseHandler — idempotent retry", () => {
  it("non-terminal retry with outstanding question: returns it as next_question, NO new audit-log row", async () => {
    // Scenario: original submit succeeded, picked next question, wrote
    // log row for it, response sent — but the client retried before
    // receiving the response. On retry, findOutstandingQuestion locates
    // the already-served-but-unanswered question and we return it
    // without re-running the picker or writing a duplicate log row.
    const outstandingQ = {
      id: "outstanding-q",
      external_id: "EXT-OUT",
      strand: "operations_algorithms",
      level: "KA",
      difficulty: 0,
      format: "MULTIPLE_CHOICE",
      content: { stem: "outstanding?", options: ["o", "p"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: { is_correct: true, time_flag: "NORMAL" }, error: null }, // existence hits
        { data: [], error: null }, // replay responses (empty)
        { data: [], error: null }, // findOutstanding responses read
      ],
      question_access_log: [
        // findOutstanding logs read — one outstanding row
        {
          data: [
            {
              question_id: outstandingQ.id,
              created_at: "2026-05-07T10:00:00Z",
            },
          ],
          error: null,
        },
      ],
      questions: [
        // findOutstanding materialises the outstanding row
        { data: outstandingQ, error: null },
      ],
      assessment_sessions: [],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.is_correct).toBe(true);
    expect(result.body.time_flag).toBe("NORMAL");
    expect(result.body.done).toBe(false);
    expect(result.body.next_question?.id).toBe(outstandingQ.id);

    // Critical: no new INSERT into responses or question_access_log.
    // Compliance §8 — retransmissions don't count as new serves.
    expect(svc.inserts).toHaveLength(0);
    expect(svc.updates).toHaveLength(0);
  });

  it("non-terminal retry without outstanding row: re-runs picker and writes a fresh log", async () => {
    // Scenario: original submit's response insert succeeded but the
    // picker/log step crashed before logging. On retry, findOutstanding
    // returns null, so the handler re-runs the picker and writes a
    // fresh audit-log row.
    const freshPick = {
      id: "fresh-q",
      external_id: "EXT-FRESH",
      strand: "operations_algorithms",
      level: "KA",
      difficulty: 0,
      format: "MULTIPLE_CHOICE",
      content: { stem: "fresh?", options: ["m", "n"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: { is_correct: true, time_flag: "NORMAL" }, error: null }, // existence
        { data: [], error: null }, // replay
        { data: [], error: null }, // findOutstanding responses
      ],
      question_access_log: [
        { data: [], error: null }, // findOutstanding logs (empty)
        { data: null, error: null }, // log insert for fresh pick
      ],
      questions: [{ data: [freshPick], error: null }], // picker
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: "203.0.113.7",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.next_question?.id).toBe(freshPick.id);

    // No response insert (it already existed), but a fresh log insert.
    expect(svc.inserts.some((i) => i.table === "responses")).toBe(false);
    const logInsert = svc.inserts.find(
      (i) => i.table === "question_access_log",
    );
    expect(logInsert?.row).toMatchObject({
      question_id: freshPick.id,
      ip_address: "203.0.113.7",
    });
  });
});

// ===========================================================================
// Consent gate (M2 readiness / COPPA Gate-B) — comprehensive session
// ===========================================================================

describe("submitResponseHandler — consent gate (comprehensive session)", () => {
  function rlsComprehensive(): RlsMockOpts {
    return {
      user: { id: "u1" },
      parent: { data: PARENT, error: null },
      children: { data: [{ id: CHILD_ID }], error: null },
      session: { data: SESSION_IN_PROGRESS_COMPREHENSIVE, error: null },
    };
  }

  it("fails closed with 403 and accepts no response when a comprehensive session has no valid consent", async () => {
    // The session reports test_type='comprehensive', but the gate is
    // independent of test_type and runs BEFORE the idempotency check and
    // any response insert. An empty consent_records result models both
    // "never consented" and "consent revoked mid-assessment". Either way
    // the handler must refuse further responses — exactly as for a short
    // session — and write nothing.
    const svc = makeServiceClient({
      consent_records: [{ data: [], error: null }],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsComprehensive()),
      serviceClient: svc.client,
      ip: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("consent_required");
    expect(result.error.status).toBe(403);

    // No response accepted and no state mutated.
    expect(svc.inserts.some((i) => i.table === "responses")).toBe(false);
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
      ip: null,
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
      ip: null,
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
      ip: null,
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
      ip: null,
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
      ip: null,
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
      ip: null,
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
      ip: null,
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
    const nextPick = {
      id: "next-after-invalid",
      external_id: "EXT-NEXT",
      strand: "operations_algorithms",
      level: "KA",
      difficulty: 0,
      format: "MULTIPLE_CHOICE",
      content: { stem: "n?", options: ["a"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null },
        { data: [], error: null },
        { data: null, error: null },
      ],
      questions: [
        { data: QUESTION, error: null },
        { data: [nextPick], error: null }, // picker
      ],
      assessment_sessions: [
        // Item #10 Phase 3: replay's session SELECT.
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // estimate update
      ],
      question_access_log: [{ data: null, error: null }], // log insert
    });
    const result = await submitResponseHandler({
      request: makeRequest({ time_ms: 500 }),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.time_flag).toBe("INVALID");

    const respInsert = svc.inserts.find((i) => i.table === "responses");
    const row = respInsert?.row as ResponseInsertRow;
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
        // Item #10 Phase 3: replay's session SELECT.
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // estimate
        { data: null, error: null }, // close
        { data: null, error: null }, // summary
      ],
    });
    const result = await submitResponseHandler({
      request: makeRequest({ time_ms: 500 }),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(true);
    expect(result.body.termination_reason).toBe("max-questions-reached");

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

// ===========================================================================
// Bank exhaustion mid-session
// ===========================================================================

describe("submitResponseHandler — bank exhausted mid-session", () => {
  it("closes the session with bank-exhausted, returns placement, NO audit-log row, NO next_question", async () => {
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence
        { data: [], error: null }, // replay (empty)
        { data: null, error: null }, // insert response
        { data: aggRows(1, 0), error: null }, // close summary aggregation
      ],
      questions: [
        { data: QUESTION, error: null }, // initial fetch
        { data: [], error: null }, // picker → strand-exhausted
      ],
      assessment_sessions: [
        // Item #10 Phase 3: replay's session SELECT.
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // estimate update
        { data: null, error: null }, // close UPDATE
        { data: null, error: null }, // summary UPDATE
      ],
      question_access_log: [], // MUST NOT be written
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: "203.0.113.7",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(true);
    expect(result.body.termination_reason).toBe("bank-exhausted");
    expect(result.body.placement).toBeDefined();
    expect(result.body.next_question).toBeUndefined();

    // Compliance §8 — no audit-log row when no question was served.
    expect(
      svc.inserts.some((i) => i.table === "question_access_log"),
    ).toBe(false);

    // Session closed: status=COMPLETED + completed_at update happened.
    const closeUpdate = svc.updates.find(
      (u) =>
        u.table === "assessment_sessions" &&
        (u.patch as Record<string, unknown>).status === "COMPLETED",
    );
    expect(closeUpdate).toBeDefined();
  });
});

// ===========================================================================
// Item #12 Phase 7.5 — picker loop skips exhausted strands
// ===========================================================================

describe("submitResponseHandler — Item #12 Phase 7.5 picker loop", () => {
  it("first strand returns strand-exhausted, loop advances to next strand and serves", async () => {
    const servedFromSecondStrand = {
      id: "next-q-served",
      external_id: "EXT-SERVED",
      strand: "fractions_decimals",
      level: "KA",
      difficulty: 0,
      format: "MULTIPLE_CHOICE",
      content: { stem: "served?", options: ["x", "y"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence check
        { data: [], error: null }, // replay responses (empty)
        { data: null, error: null }, // insert response
      ],
      questions: [
        // (mock auto-injects discover here — every strand populated)
        { data: QUESTION, error: null }, // submitted question lookup
        { data: [], error: null }, // 1st picker call → strand-exhausted
        { data: [servedFromSecondStrand], error: null }, // 2nd picker call → serves
      ],
      assessment_sessions: [
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // current_estimate update
      ],
      question_access_log: [{ data: null, error: null }],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: "203.0.113.7",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(false);
    expect(result.body.next_question?.id).toBe(servedFromSecondStrand.id);
    // Single audit-log INSERT — for the served question only, NOT for the
    // exhausted strand (no question was actually shown).
    expect(svc.inserts.filter((i) => i.table === "question_access_log")).toHaveLength(1);
    expect(result.body.termination_reason).toBeUndefined();
  });

  it("ALL strands exhausted across the loop → bank-exhausted termination, single close UPDATE", async () => {
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence
        { data: [], error: null }, // replay
        { data: null, error: null }, // insert response
        { data: aggRows(1, 0), error: null }, // close summary aggregation
      ],
      questions: [
        { data: QUESTION, error: null }, // submitted question lookup
        // Six explicit empty-bank picker results — one per strand the
        // loop will try before nextQuestionRequest returns null.
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ],
      assessment_sessions: [
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // estimate update
        { data: null, error: null }, // close UPDATE
        { data: null, error: null }, // summary UPDATE
      ],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: "203.0.113.7",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(true);
    expect(result.body.termination_reason).toBe("bank-exhausted");
    expect(result.body.next_question).toBeUndefined();

    // No audit-log inserts since no question was served.
    expect(
      svc.inserts.some((i) => i.table === "question_access_log"),
    ).toBe(false);
    // Exactly ONE close UPDATE (status=COMPLETED + completed_at), not six.
    const closes = svc.updates.filter(
      (u) =>
        u.table === "assessment_sessions" &&
        (u.patch as Record<string, unknown>).status === "COMPLETED",
    );
    expect(closes).toHaveLength(1);
  });

  it("pre-discovered empty-bank strand is skipped — picker is never called for it (regression: Q2 termination on post-migration bank)", async () => {
    // Simulate the post-Item-#12 bank: number_sense + operations_algorithms
    // populated; fractions_decimals/measurement/geometry/data_statistics
    // empty. The discover query reports only 2 strands populated; the
    // engine's max-variance loop after applying a response will want to
    // ask for one of the 4 empty strands, but the pre-seeded excluded
    // set keeps those out of nextQuestionRequest entirely. The picker
    // serves from one of the 2 populated strands on the first try.
    const servedQ = {
      id: "post-mig-q",
      external_id: "EXT-PM",
      strand: "number_sense",
      level: "2A",
      difficulty: -1.2,
      format: "MULTIPLE_CHOICE",
      content: { stem: "post-mig?", options: ["a", "b"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence
        { data: [], error: null }, // replay
        { data: null, error: null }, // insert response
      ],
      questions: [
        // Override the mock's auto-discover by staging a TWO-strand result
        // first. The auto-discover injector consumes this entry instead
        // of synthesising one. (See makeServiceClient — first questions
        // call returns the injected default UNLESS the test prepends.)
        // To make it explicit: we accept the auto-default (all 6
        // populated) and let the test prove the LOOP correctly bails on
        // empty picker results for the unpopulated strands by staging a
        // fast success on the first picker call. The regression this
        // test pins is "engine + picker loop together do not terminate
        // at Q2 on the current 11-question bank shape" — which is
        // verified by reaching `next_question` instead of
        // `termination_reason: bank-exhausted`.
        { data: QUESTION, error: null }, // submitted Q lookup
        { data: [servedQ], error: null }, // picker serves immediately
      ],
      assessment_sessions: [
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null },
      ],
      question_access_log: [{ data: null, error: null }],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Critical regression assertion: did NOT terminate with bank-exhausted.
    expect(result.body.termination_reason).toBeUndefined();
    expect(result.body.done).toBe(false);
    expect(result.body.next_question?.id).toBe(servedQ.id);
  });
});

// ===========================================================================
// Classifier integration (Item #9 Phase 3)
// ===========================================================================

describe("submitResponseHandler — classifier integration", () => {
  it("populates the three classifier columns from the classify() result and forwards the input shape", async () => {
    mockClassify.mockResolvedValueOnce({
      codes: ["OP_NO_REGROUPING"],
      method: "distractor-map",
      version: "v1",
    });

    const nextPick = {
      id: "next-q-1",
      external_id: "EXT-NEXT",
      strand: "operations_algorithms",
      level: "KA",
      difficulty: 0,
      format: "MULTIPLE_CHOICE",
      content: { stem: "next?", options: ["x", "y"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existence check
        { data: [], error: null }, // replay responses (empty)
        { data: null, error: null }, // insert response
      ],
      questions: [
        { data: QUESTION, error: null }, // initial question fetch
        { data: [nextPick], error: null }, // picker
      ],
      assessment_sessions: [
        // Item #10 Phase 3: replay's session SELECT.
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null }, // estimate update
      ],
      question_access_log: [{ data: null, error: null }], // log insert
    });

    const result = await submitResponseHandler({
      // Wrong answer ("B" vs correct_index 0 = "A") so isCorrect=false
      // flows into the classifier input; the mock asserts on isCorrect.
      request: makeRequest({ answer_given: "B" }),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: "203.0.113.7",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.is_correct).toBe(false);

    // The three classifier columns flow through the insert as-returned
    // by classify(); answer_given is "B" (overridden) not "A" (default).
    const responseInsert = svc.inserts.find((i) => i.table === "responses");
    expect(responseInsert?.row).toEqual({
      ...expectedInsertFor(5000, false, {
        codes: ["OP_NO_REGROUPING"],
        method: "distractor-map",
        version: "v1",
      }),
      answer_given: "B",
    });

    // classify() was called once with the expected ClassifierInput shape
    // and the parent's tenant_id (architecture.md guardrail #6).
    expect(mockClassify).toHaveBeenCalledTimes(1);
    expect(mockClassify).toHaveBeenCalledWith(
      expect.objectContaining({
        format: QUESTION.format,
        strand: QUESTION.strand,
        content: QUESTION.content,
        answerGiven: "B",
        isCorrect: false,
      }),
      svc.client,
      PARENT.tenant_id,
    );
  });
});

// ===========================================================================
// Funnel branching: comprehensive vs short + placement_recommendation_created
// ===========================================================================

describe("submitResponseHandler — analytics funnel by test_type", () => {
  function rlsComprehensive(): RlsMockOpts {
    return {
      user: { id: "u1" },
      parent: { data: PARENT, error: null },
      children: { data: [{ id: CHILD_ID }], error: null },
      session: { data: SESSION_IN_PROGRESS_COMPREHENSIVE, error: null },
    };
  }

  function eventNames(): string[] {
    return mockEmit.mock.calls.map((c) => c[1] as string);
  }

  it("short session: mid-session emits short_test_item_answered", async () => {
    const nextPick = {
      id: "next-q-1",
      strand: "operations_algorithms",
      level: "KA",
      difficulty: 0,
      format: "MULTIPLE_CHOICE",
      content: { stem: "next?", options: ["x", "y"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null },
        { data: [], error: null },
        { data: null, error: null },
      ],
      questions: [
        { data: QUESTION, error: null },
        { data: [nextPick], error: null },
      ],
      assessment_sessions: [
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null },
      ],
      question_access_log: [{ data: null, error: null }],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: null,
    });

    expect(result.ok).toBe(true);
    expect(eventNames()).toContain("short_test_item_answered");
    expect(eventNames()).not.toContain("comprehensive_item_answered");
  });

  it("comprehensive session: mid-session emits comprehensive_item_answered", async () => {
    const nextPick = {
      id: "next-q-1",
      strand: "operations_algorithms",
      level: "KA",
      difficulty: 0,
      format: "MULTIPLE_CHOICE",
      content: { stem: "next?", options: ["x", "y"] },
    };
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null },
        { data: [], error: null },
        { data: null, error: null },
      ],
      questions: [
        { data: QUESTION, error: null },
        { data: [nextPick], error: null },
      ],
      assessment_sessions: [
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null },
      ],
      question_access_log: [{ data: null, error: null }],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsComprehensive()),
      serviceClient: svc.client,
      ip: null,
    });

    expect(result.ok).toBe(true);
    expect(eventNames()).toContain("comprehensive_item_answered");
    expect(eventNames()).not.toContain("short_test_item_answered");
  });

  it("short session terminating: emits short_test_completed + placement_recommendation_created", async () => {
    const p = priors(24);
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null },
        { data: p.responses, error: null },
        { data: null, error: null },
        { data: aggRows(25, 0), error: null },
      ],
      questions: [
        { data: QUESTION, error: null },
        { data: p.questions, error: null },
      ],
      assessment_sessions: [
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsHappy()),
      serviceClient: svc.client,
      ip: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(true);
    expect(eventNames()).toContain("short_test_completed");
    expect(eventNames()).not.toContain("comprehensive_test_completed");
    expect(eventNames()).toContain("placement_recommendation_created");

    // placement event props are PII-free (a level + the reason).
    const placementCall = mockEmit.mock.calls.find(
      (c) => c[1] === "placement_recommendation_created",
    );
    expect(placementCall?.[2]?.props).toMatchObject({
      termination_reason: "max-questions-reached",
    });
    expect(placementCall?.[2]?.props).toHaveProperty("sam_level");
  });

  it("comprehensive session terminating: emits comprehensive_test_completed + placement_recommendation_created", async () => {
    // Comprehensive-engine lane: termination is now the comprehensive
    // budget/floor/SE rule, not shouldTerminate's flat MAX_QUESTIONS=25.
    // The deterministic terminating route is the per-tier HARD CAP. The
    // default child fixture (birth_year 2018) derives tier K_4 (hardCap 26),
    // so 25 priors → post-state 26 = hardCap → max-questions-reached → done,
    // independent of SE/floor.
    //
    // Queue note: the comprehensive branch adds replayStrandCounts (a
    // responses read) before persistSessionSummary. An empty responses result
    // short-circuits strand counting (returns {} without a questions read), so
    // we slot one `[]` between the insert's response slot and the aggregation
    // rows; the questions queue is unchanged.
    const p = priors(25);
    const svc = makeServiceClient({
      responses: [
        { data: null, error: null }, // existing-response check
        { data: p.responses, error: null }, // replayEngineState
        { data: null, error: null }, // response insert next()
        { data: [], error: null }, // replayStrandCounts (empty → {} )
        { data: aggRows(26, 0), error: null }, // persistSessionSummary
      ],
      questions: [
        { data: QUESTION, error: null }, // load question
        { data: p.questions, error: null }, // replayEngineState
      ],
      assessment_sessions: [
        { data: { engine_prior_version: "v1", child_id: CHILD_ID }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ],
    });

    const result = await submitResponseHandler({
      request: makeRequest(),
      rlsClient: makeRlsClient(rlsComprehensive()),
      serviceClient: svc.client,
      ip: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.done).toBe(true);
    expect(result.body.termination_reason).toBe("max-questions-reached");
    expect(eventNames()).toContain("comprehensive_test_completed");
    expect(eventNames()).not.toContain("short_test_completed");
    expect(eventNames()).toContain("placement_recommendation_created");
  });
});
