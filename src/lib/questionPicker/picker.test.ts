import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { pickQuestion } from "./picker";
import type {
  Chooser,
  PickedQuestionRow,
  PickerContext,
  PickerRequest,
} from "./types";

// ---------------------------------------------------------------------------
// Mock infrastructure
// ---------------------------------------------------------------------------
//
// The picker's only DB call is:
//
//   from("questions").select(...).eq(...).eq(...).eq(...)
//
// awaited as a single thenable. Each .eq returns the same chain so the
// thenable resolution lands on the pre-staged result.

interface QueryResult {
  data: PickedQuestionRow[] | null;
  error: { message: string } | null;
}

function makeClient(result: QueryResult): SupabaseClient<Database> {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.then = (
    onFulfilled?: ((r: QueryResult) => unknown) | null,
    onRejected?: ((e: unknown) => unknown) | null,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  return {
    from: () => chain,
  } as unknown as SupabaseClient<Database>;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function row(over: Partial<PickedQuestionRow>): PickedQuestionRow {
  // Spread `over` LAST so explicit `external_id: null` overrides the
  // default (`??` would have collapsed null back to the default and
  // hidden the null-sort bug we're testing for).
  return {
    id: "00000000-0000-0000-0000-000000000001",
    external_id: "EXT-001",
    strand: "OPERATIONS",
    level: "2B",
    difficulty: 0.0,
    format: "MULTIPLE_CHOICE",
    content: { stem: "s", options: ["a"] },
    ...over,
  };
}

const TENANT = "00000000-0000-0000-0000-0000000000aa";

function ctx(over: Partial<PickerContext> = {}): PickerContext {
  return {
    tenantId: over.tenantId ?? TENANT,
    servedQuestionIds: over.servedQuestionIds ?? [],
    candidateLimit: over.candidateLimit,
  };
}

function req(over: Partial<PickerRequest> = {}): PickerRequest {
  return {
    strand: over.strand ?? "OPERATIONS",
    targetDifficulty: over.targetDifficulty ?? 0.0,
    width: over.width ?? 0.3,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe("pickQuestion / happy path", () => {
  it("returns the row whose difficulty is closest to target", async () => {
    const closest = row({ id: "id-close", difficulty: 0.05 });
    const farther = row({ id: "id-far", difficulty: 1.5 });
    const client = makeClient({ data: [farther, closest], error: null });

    const result = await pickQuestion(client, req(), ctx());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("id-close");
  });

  it("excludes served question ids", async () => {
    const served = row({ id: "id-served", difficulty: 0.0 });
    const next = row({ id: "id-next", difficulty: 0.4 });
    const client = makeClient({ data: [served, next], error: null });

    const result = await pickQuestion(
      client,
      req(),
      ctx({ servedQuestionIds: ["id-served"] }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("id-next");
  });
});

describe("pickQuestion / advisory width", () => {
  // The engine's width default is 0.3. The picker MUST pick a closest
  // item outside that band when nothing else is available — width is
  // advisory, not a hard filter. See picker.ts header comment.
  it("returns the closest item even when it lies outside ±width", async () => {
    const onlyOption = row({ id: "id-only", difficulty: 2.5 });
    const client = makeClient({ data: [onlyOption], error: null });

    const result = await pickQuestion(
      client,
      req({ targetDifficulty: 0.0, width: 0.3 }),
      ctx(),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("id-only");
  });
});

describe("pickQuestion / deterministic tiebreak", () => {
  it("breaks distance-ties by external_id (alphabetical, NULLS LAST)", async () => {
    const aExt = row({
      id: "id-aaa",
      external_id: "EXT-A",
      difficulty: 0.0,
    });
    const bExt = row({
      id: "id-bbb",
      external_id: "EXT-B",
      difficulty: 0.0,
    });
    const nullExt = row({
      id: "id-zzz",
      external_id: null,
      difficulty: 0.0,
    });

    // Provide rows out of order so a stable-sort bug would surface.
    const client = makeClient({
      data: [nullExt, bExt, aExt],
      error: null,
    });

    const result = await pickQuestion(client, req(), ctx());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.external_id).toBe("EXT-A");
  });

  it("breaks external_id ties by uuid id (lexicographic)", async () => {
    const second = row({
      id: "id-bbb",
      external_id: "EXT-SAME",
      difficulty: 0.0,
    });
    const first = row({
      id: "id-aaa",
      external_id: "EXT-SAME",
      difficulty: 0.0,
    });
    const client = makeClient({ data: [second, first], error: null });

    const result = await pickQuestion(client, req(), ctx());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("id-aaa");
  });

  it("places null external_id after non-null at equal distance", async () => {
    const placeholder = row({
      id: "id-placeholder",
      external_id: null,
      difficulty: 0.0,
    });
    const real = row({
      id: "id-real",
      external_id: "SAM-001",
      difficulty: 0.0,
    });
    const client = makeClient({
      data: [placeholder, real],
      error: null,
    });

    const result = await pickQuestion(client, req(), ctx());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.external_id).toBe("SAM-001");
  });
});

describe("pickQuestion / strand exhaustion", () => {
  it("returns strand-exhausted when no rows match the query", async () => {
    const client = makeClient({ data: [], error: null });

    const result = await pickQuestion(client, req(), ctx());
    expect(result).toEqual({ ok: false, reason: "strand-exhausted" });
  });

  it("returns strand-exhausted when all rows are already served", async () => {
    const a = row({ id: "id-a" });
    const b = row({ id: "id-b" });
    const client = makeClient({ data: [a, b], error: null });

    const result = await pickQuestion(
      client,
      req(),
      ctx({ servedQuestionIds: ["id-a", "id-b"] }),
    );
    expect(result).toEqual({ ok: false, reason: "strand-exhausted" });
  });

  it("returns strand-exhausted when supabase data is null", async () => {
    const client = makeClient({ data: null, error: null });
    const result = await pickQuestion(client, req(), ctx());
    expect(result).toEqual({ ok: false, reason: "strand-exhausted" });
  });
});

describe("pickQuestion / DB errors", () => {
  it("throws on supabase error", async () => {
    const client = makeClient({
      data: null,
      error: { message: "db down" },
    });
    await expect(pickQuestion(client, req(), ctx())).rejects.toThrow(
      /db down/,
    );
  });
});

describe("pickQuestion / chooser callback (Layer 2 plug-in point)", () => {
  it("passes the top candidateLimit rows to the chooser, sorted by distance", async () => {
    const a = row({ id: "id-a", external_id: "A", difficulty: 0.0 });
    const b = row({ id: "id-b", external_id: "B", difficulty: 0.1 });
    const c = row({ id: "id-c", external_id: "C", difficulty: 0.2 });
    const farthest = row({
      id: "id-far",
      external_id: "F",
      difficulty: 5.0,
    });
    const client = makeClient({
      data: [farthest, c, b, a],
      error: null,
    });

    let seen: ReadonlyArray<PickedQuestionRow> | null = null;
    const chooser: Chooser = (cands) => {
      seen = cands;
      return cands[cands.length - 1] ?? null;
    };

    const result = await pickQuestion(
      client,
      req(),
      ctx({ candidateLimit: 3 }),
      chooser,
    );

    expect(seen).not.toBeNull();
    expect(seen!.map((r) => r.id)).toEqual(["id-a", "id-b", "id-c"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("id-c");
  });

  it("returns strand-exhausted when chooser declines (returns null)", async () => {
    const a = row({ id: "id-a", difficulty: 0.0 });
    const client = makeClient({ data: [a], error: null });

    const result = await pickQuestion(client, req(), ctx(), () => null);
    expect(result).toEqual({ ok: false, reason: "strand-exhausted" });
  });
});
