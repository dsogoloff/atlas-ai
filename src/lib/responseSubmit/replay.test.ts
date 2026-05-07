import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { LEVELS, STRANDS } from "@/lib/engine/levels";
import type { Database, Enums } from "@/lib/supabase/database.types";

import { replayEngineState } from "./replay";

// ---------------------------------------------------------------------------
// Minimal Supabase mock — only the two builders replay.ts actually calls.
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

interface FakeOpts {
  responses?: ResponseRow[];
  responsesError?: { message: string };
  questions?: QuestionRow[];
  questionsError?: { message: string };
}

function fakeSupabase(opts: FakeOpts): SupabaseClient<Database> {
  const responsesResult = {
    data: opts.responses ?? [],
    error: opts.responsesError ?? null,
  };
  const questionsResult = {
    data: opts.questions ?? [],
    error: opts.questionsError ?? null,
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
            strand: "OPERATIONS",
            level: "3A",
            difficulty: 0,
            format: "MULTIPLE_CHOICE",
          },
          {
            id: "q2",
            strand: "OPERATIONS",
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
    // item, the OPERATIONS posterior has shifted off uniform: mid-grade
    // mass exceeds the bottom-end mass.
    const opsKA = state.posteriors.OPERATIONS.KA;
    const ops3A = state.posteriors.OPERATIONS["3A"];
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
            strand: "OPERATIONS",
            level: "3A",
            difficulty: 0,
            format: "MULTIPLE_CHOICE",
          },
        ],
      }),
      "session-uuid",
    );
    // GEOMETRY had no responses; should remain uniform.
    expect(state.posteriors.GEOMETRY.KA).toBeCloseTo(
      state.posteriors.GEOMETRY["8B"],
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
