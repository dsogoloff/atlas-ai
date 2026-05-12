import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import type { PickedQuestionRow } from "@/lib/questionPicker/types";

import { findOutstandingQuestion } from "./findOutstanding";

// ---------------------------------------------------------------------------
// Mock infrastructure
// ---------------------------------------------------------------------------
//
// Per-table queue: each .from(table) chain pops the next staged result.
// The chain is uniform — .select / .eq / .order all return the chain;
// .maybeSingle() and awaiting the chain itself both resolve to the
// staged result.

interface MockResult {
  data: unknown;
  error: { message: string } | null;
}

function makeClient(scripts: Record<string, MockResult[]>): SupabaseClient<Database> {
  const client = {
    from(table: string) {
      const next = (): MockResult =>
        scripts[table]?.shift() ?? { data: null, error: null };

      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.order = () => builder;
      builder.maybeSingle = () => Promise.resolve(next());
      builder.then = (
        onFulfilled?: ((r: MockResult) => unknown) | null,
        onRejected?: ((e: unknown) => unknown) | null,
      ) => Promise.resolve(next()).then(onFulfilled, onRejected);
      return builder;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function questionRow(id: string): PickedQuestionRow {
  return {
    id,
    external_id: `EXT-${id}`,
    strand: "operations_algorithms",
    level: "2B",
    difficulty: 0.0,
    format: "MULTIPLE_CHOICE",
    content: { stem: "s", options: ["a"] },
  };
}

// Logs are returned newest-first by the .order(desc) call; tests stage
// arrays in that order.
const logRow = (qid: string, isoTs: string) => ({
  question_id: qid,
  created_at: isoTs,
});

const SESSION = "session-1";

// ===========================================================================
// Tests
// ===========================================================================

describe("findOutstandingQuestion / empty session", () => {
  it("returns null when there are no access-log rows", async () => {
    const client = makeClient({
      question_access_log: [{ data: [], error: null }],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out).toBeNull();
  });

  it("returns null when access-log data is null (no rows ever)", async () => {
    const client = makeClient({
      question_access_log: [{ data: null, error: null }],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out).toBeNull();
  });
});

describe("findOutstandingQuestion / single log", () => {
  it("returns the question when one log row has no matching response", async () => {
    const client = makeClient({
      question_access_log: [
        { data: [logRow("q-A", "2026-05-07T10:00:00Z")], error: null },
      ],
      responses: [{ data: [], error: null }],
      questions: [{ data: questionRow("q-A"), error: null }],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out?.id).toBe("q-A");
  });

  it("returns null when the lone log row has a matching response", async () => {
    const client = makeClient({
      question_access_log: [
        { data: [logRow("q-A", "2026-05-07T10:00:00Z")], error: null },
      ],
      responses: [{ data: [{ question_id: "q-A" }], error: null }],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out).toBeNull();
  });
});

describe("findOutstandingQuestion / interleaved", () => {
  it("serve A, serve B, answer A → outstanding = B (newest unanswered)", async () => {
    // Logs are returned newest-first by .order(desc).
    const client = makeClient({
      question_access_log: [
        {
          data: [
            logRow("q-B", "2026-05-07T10:01:00Z"),
            logRow("q-A", "2026-05-07T10:00:00Z"),
          ],
          error: null,
        },
      ],
      responses: [{ data: [{ question_id: "q-A" }], error: null }],
      questions: [{ data: questionRow("q-B"), error: null }],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out?.id).toBe("q-B");
  });

  it("serve A, serve B, answer B → outstanding = A (only unanswered)", async () => {
    const client = makeClient({
      question_access_log: [
        {
          data: [
            logRow("q-B", "2026-05-07T10:01:00Z"),
            logRow("q-A", "2026-05-07T10:00:00Z"),
          ],
          error: null,
        },
      ],
      responses: [{ data: [{ question_id: "q-B" }], error: null }],
      questions: [{ data: questionRow("q-A"), error: null }],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out?.id).toBe("q-A");
  });

  it("serve A, serve B, answer A, answer B → null", async () => {
    const client = makeClient({
      question_access_log: [
        {
          data: [
            logRow("q-B", "2026-05-07T10:01:00Z"),
            logRow("q-A", "2026-05-07T10:00:00Z"),
          ],
          error: null,
        },
      ],
      responses: [
        { data: [{ question_id: "q-A" }, { question_id: "q-B" }], error: null },
      ],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out).toBeNull();
  });

  it("dedupes when same question is served twice (resume), only one response → that question", async () => {
    // serve A, serve B, answer A, resume → re-serves A → log has 3 rows.
    // After dedupe, A is "answered" and B is the only unanswered.
    const client = makeClient({
      question_access_log: [
        {
          data: [
            logRow("q-A", "2026-05-07T10:02:00Z"), // resume re-serve
            logRow("q-B", "2026-05-07T10:01:00Z"),
            logRow("q-A", "2026-05-07T10:00:00Z"),
          ],
          error: null,
        },
      ],
      responses: [{ data: [{ question_id: "q-A" }], error: null }],
      questions: [{ data: questionRow("q-B"), error: null }],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out?.id).toBe("q-B");
  });
});

describe("findOutstandingQuestion / DB errors", () => {
  it("throws on access-log read error", async () => {
    const client = makeClient({
      question_access_log: [
        { data: null, error: { message: "qal down" } },
      ],
    });
    await expect(findOutstandingQuestion(client, SESSION)).rejects.toThrow(
      /qal down/,
    );
  });

  it("throws on responses read error", async () => {
    const client = makeClient({
      question_access_log: [
        { data: [logRow("q-A", "t")], error: null },
      ],
      responses: [{ data: null, error: { message: "responses down" } }],
    });
    await expect(findOutstandingQuestion(client, SESSION)).rejects.toThrow(
      /responses down/,
    );
  });

  it("throws on question materialisation error", async () => {
    const client = makeClient({
      question_access_log: [
        { data: [logRow("q-A", "t")], error: null },
      ],
      responses: [{ data: [], error: null }],
      questions: [{ data: null, error: { message: "questions down" } }],
    });
    await expect(findOutstandingQuestion(client, SESSION)).rejects.toThrow(
      /questions down/,
    );
  });
});

describe("findOutstandingQuestion / orphan defensiveness", () => {
  it("returns null when log references a question that no longer exists", async () => {
    // FK with ON DELETE CASCADE makes this implausible, but the function
    // shouldn't crash if the invariant breaks somehow.
    const client = makeClient({
      question_access_log: [
        { data: [logRow("q-A", "t")], error: null },
      ],
      responses: [{ data: [], error: null }],
      questions: [{ data: null, error: null }],
    });
    const out = await findOutstandingQuestion(client, SESSION);
    expect(out).toBeNull();
  });
});
