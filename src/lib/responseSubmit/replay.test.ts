import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { uniformPosterior } from "@/lib/engine/bayesian";
import { LEVELS, STRANDS } from "@/lib/engine/levels";
import { PRIORS_V1, seedPosteriors } from "@/lib/engine/priors";
import type { Database, Enums } from "@/lib/supabase/database.types";

import { replayEngineState } from "./replay";

// ---------------------------------------------------------------------------
// Minimal Supabase mock — only the builders replay.ts actually calls.
// ---------------------------------------------------------------------------

interface ResponseRow {
  question_id: string;
  is_correct: boolean;
  time_taken_seconds: number;
  created_at: string;
}

interface QuestionRow {
  id: string;
  strand: Enums<"strand">;
  level: Enums<"half_grade_level">;
  difficulty: number;
  format: Enums<"question_format">;
}

interface SessionRow {
  engine_prior_version: string;
  child_id: string;
}

interface ChildRow {
  grade_level: string | null;
}

interface FakeOpts {
  responses?: ResponseRow[];
  responsesError?: { message: string };
  questions?: QuestionRow[];
  questionsError?: { message: string };
  // Phase 3 additions — session + child reads inside replay.
  session?: SessionRow | null;
  sessionError?: { message: string };
  child?: ChildRow | null;
  childError?: { message: string };
}

function fakeSupabase(opts: FakeOpts): SupabaseClient<Database> {
  // Phase 3: session + child results. Absent-vs-null distinguishing via
  // `'session' in opts` — tests that omit the field get sensible defaults;
  // tests that explicitly pass `null` trigger the not-found branches.
  const sessionResult = {
    data:
      "session" in opts
        ? opts.session
        : { engine_prior_version: "v1", child_id: "test-child-id" },
    error: opts.sessionError ?? null,
  };
  const childResult = {
    data: "child" in opts ? opts.child : { grade_level: null },
    error: opts.childError ?? null,
  };

  const responsesResult = {
    data: opts.responses ?? [],
    error: opts.responsesError ?? null,
  };
  const questionsResult = {
    data: opts.questions ?? [],
    error: opts.questionsError ?? null,
  };

  const sessionBuilder = {
    select: () => sessionBuilder,
    eq: () => sessionBuilder,
    maybeSingle: () => Promise.resolve(sessionResult),
  };
  const childBuilder = {
    select: () => childBuilder,
    eq: () => childBuilder,
    maybeSingle: () => Promise.resolve(childResult),
  };
  const responsesBuilder = {
    select: () => responsesBuilder,
    eq: () => responsesBuilder,
    order: () => Promise.resolve(responsesResult),
  };
  const questionsBuilder = {
    select: () => questionsBuilder,
    in: () => Promise.resolve(questionsResult),
  };

  const client = {
    from: (table: string) => {
      if (table === "assessment_sessions") return sessionBuilder;
      if (table === "children") return childBuilder;
      if (table === "responses") return responsesBuilder;
      if (table === "questions") return questionsBuilder;
      throw new Error(`[fake supabase] unexpected table ${table}`);
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("replayEngineState", () => {
  it("returns a fresh uniform state for an empty session", async () => {
    const state = await replayEngineState(fakeSupabase({}), "session-uuid");
    expect(state.responseCount).toBe(0);
    expect(state.servedQuestionIds).toEqual([]);
    for (const strand of STRANDS) {
      const total = LEVELS.reduce(
        (s, l) => s + state.posteriors[strand][l],
        0,
      );
      expect(total).toBeCloseTo(1);
      expect(state.posteriors[strand].KA).toBeCloseTo(
        state.posteriors[strand]["8B"],
      );
    }
  });

  it("folds responses through applyResponse and tracks served IDs in order", async () => {
    const state = await replayEngineState(
      fakeSupabase({
        responses: [
          {
            question_id: "q1",
            is_correct: true,
            time_taken_seconds: 5,
            created_at: "2026-05-07T00:00:00Z",
          },
          {
            question_id: "q2",
            is_correct: false,
            time_taken_seconds: 6,
            created_at: "2026-05-07T00:00:30Z",
          },
        ],
        questions: [
          {
            id: "q1",
            strand: "operations_algorithms",
            level: "3A",
            difficulty: 0,
            format: "MULTIPLE_CHOICE",
          },
          {
            id: "q2",
            strand: "operations_algorithms",
            level: "5A",
            difficulty: 1.5,
            format: "NUMERIC_ENTRY",
          },
        ],
      }),
      "session-uuid",
    );

    expect(state.responseCount).toBe(2);
    expect(state.servedQuestionIds).toEqual(["q1", "q2"]);
    // After a correct on a mid-difficulty item and an incorrect on a hard
    // item, the operations_algorithms posterior has shifted off uniform: mid-grade
    // mass exceeds the bottom-end mass.
    const opsKA = state.posteriors.operations_algorithms.KA;
    const ops3A = state.posteriors.operations_algorithms["3A"];
    expect(ops3A).toBeGreaterThan(opsKA);
  });

  it("leaves untouched strands at uniform posterior", async () => {
    const state = await replayEngineState(
      fakeSupabase({
        responses: [
          {
            question_id: "q1",
            is_correct: true,
            time_taken_seconds: 5,
            created_at: "2026-05-07T00:00:00Z",
          },
        ],
        questions: [
          {
            id: "q1",
            strand: "operations_algorithms",
            level: "3A",
            difficulty: 0,
            format: "MULTIPLE_CHOICE",
          },
        ],
      }),
      "session-uuid",
    );
    // geometry had no responses; should remain uniform.
    expect(state.posteriors.geometry.KA).toBeCloseTo(
      state.posteriors.geometry["8B"],
    );
  });

  it("throws when a response references a missing question", async () => {
    await expect(
      replayEngineState(
        fakeSupabase({
          responses: [
            {
              question_id: "q-missing",
              is_correct: true,
              time_taken_seconds: 1,
              created_at: "2026-05-07T00:00:00Z",
            },
          ],
          questions: [],
        }),
        "session-uuid",
      ),
    ).rejects.toThrow(/q-missing/);
  });

  it("throws when the responses query errors", async () => {
    await expect(
      replayEngineState(
        fakeSupabase({ responsesError: { message: "boom" } }),
        "session-uuid",
      ),
    ).rejects.toThrow(/boom/);
  });

  it("throws when the questions query errors", async () => {
    await expect(
      replayEngineState(
        fakeSupabase({
          responses: [
            {
              question_id: "q1",
              is_correct: true,
              time_taken_seconds: 1,
              created_at: "2026-05-07T00:00:00Z",
            },
          ],
          questionsError: { message: "qboom" },
        }),
        "session-uuid",
      ),
    ).rejects.toThrow(/qboom/);
  });
});

// ---------------------------------------------------------------------------
// Item #10 Phase 3 — grade-aware seeding
// ---------------------------------------------------------------------------

describe("replayEngineState — grade-aware seeding (Item #10 Phase 3)", () => {
  it("grade-3 child with zero responses produces seedPosteriors('3', PRIORS_V1)", async () => {
    const state = await replayEngineState(
      fakeSupabase({
        session: { engine_prior_version: "v1", child_id: "test-child-id" },
        child: { grade_level: "3" },
        responses: [],
      }),
      "session-uuid",
    );
    const expected = seedPosteriors("3", PRIORS_V1);
    for (const strand of STRANDS) {
      for (const level of LEVELS) {
        expect(state.posteriors[strand][level]).toBe(expected[strand][level]);
      }
    }
    expect(state.responseCount).toBe(0);
    expect(state.servedQuestionIds).toEqual([]);
  });

  it("explicit null grade_level falls back to uniform across all strands", async () => {
    const state = await replayEngineState(
      fakeSupabase({
        session: { engine_prior_version: "v1", child_id: "test-child-id" },
        child: { grade_level: null },
        responses: [],
      }),
      "session-uuid",
    );
    const expectedUniform = uniformPosterior();
    for (const strand of STRANDS) {
      for (const level of LEVELS) {
        expect(state.posteriors[strand][level]).toBe(expectedUniform[level]);
      }
    }
  });

  it("grade-K seeded initial state survives the response-apply loop on untouched strands", async () => {
    const state = await replayEngineState(
      fakeSupabase({
        session: { engine_prior_version: "v1", child_id: "test-child-id" },
        child: { grade_level: "K" },
        responses: [
          {
            question_id: "q1",
            is_correct: true,
            time_taken_seconds: 5,
            created_at: "2026-05-10T00:00:00Z",
          },
        ],
        questions: [
          {
            id: "q1",
            strand: "operations_algorithms",
            level: "KA",
            difficulty: -2,
            format: "MULTIPLE_CHOICE",
          },
        ],
      }),
      "session-uuid",
    );
    // fractions_decimals had no responses — should retain the grade-K
    // seeded shape (peaked at KA-KB), NOT uniform, NOT clobbered by the
    // operations_algorithms response.
    const gradeK = seedPosteriors("K", PRIORS_V1);
    for (const level of LEVELS) {
      expect(state.posteriors.fractions_decimals[level]).toBe(
        gradeK.fractions_decimals[level],
      );
    }
    // Sanity: operations_algorithms WAS touched — its KA mass changed from the seeded
    // value (the response updated this strand specifically).
    expect(state.posteriors.operations_algorithms.KA).not.toBe(gradeK.operations_algorithms.KA);
  });

  it("unknown engine_prior_version propagates getPriorConfigByVersion throw", async () => {
    const promise = replayEngineState(
      fakeSupabase({
        session: { engine_prior_version: "v99", child_id: "test-child-id" },
      }),
      "session-uuid",
    );
    await expect(promise).rejects.toThrow(/v99/);
    await expect(promise).rejects.toThrow(/known versions/);
  });
});

// ---------------------------------------------------------------------------
// Item #10 Phase 3 — new error paths
// ---------------------------------------------------------------------------

describe("replayEngineState — new error paths (Item #10 Phase 3)", () => {
  it("throws when the session row is missing", async () => {
    await expect(
      replayEngineState(fakeSupabase({ session: null }), "session-uuid"),
    ).rejects.toThrow(/session.*not found/);
  });

  it("throws when the children row is missing", async () => {
    await expect(
      replayEngineState(fakeSupabase({ child: null }), "session-uuid"),
    ).rejects.toThrow(/child.*not found/);
  });

  it("throws when the session query errors", async () => {
    await expect(
      replayEngineState(
        fakeSupabase({ sessionError: { message: "sessboom" } }),
        "session-uuid",
      ),
    ).rejects.toThrow(/sessboom/);
  });

  it("throws when the children query errors", async () => {
    await expect(
      replayEngineState(
        fakeSupabase({ childError: { message: "kidboom" } }),
        "session-uuid",
      ),
    ).rejects.toThrow(/kidboom/);
  });
});
