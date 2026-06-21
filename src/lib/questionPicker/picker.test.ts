import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import {
  discoverAvailableBooklets,
  discoverShortEligibleCounts,
  pickQuestion,
} from "./picker";
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

// Predicate-applying variant of makeClient.
//
// The default makeClient above ignores .eq() arguments and resolves to
// pre-staged data regardless of predicate. That's fine for "given these
// rows, what does the picker do with them" tests — but it can't verify
// that the picker actually issued a specific WHERE clause.
//
// This variant filters the row set on every .eq(col, val), so a test
// can stage [active, inactive] and assert that only active is returned,
// which exercises the picker's `.eq("is_active", true)` call at
// picker.ts:92. If that line is ever removed, the inactive row stops
// being filtered and the test goes red.
function makePredicateFilteringClient(
  rows: ReadonlyArray<PickedQuestionRow & Record<string, unknown>>,
): SupabaseClient<Database> {
  let filtered: Array<PickedQuestionRow & Record<string, unknown>> = rows.slice();
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = (col: string, val: unknown) => {
    filtered = filtered.filter((r) => r[col] === val);
    return chain;
  };
  chain.in = (col: string, vals: unknown[]) => {
    filtered = filtered.filter((r) => vals.includes(r[col]));
    return chain;
  };
  chain.then = (
    onFulfilled?: ((r: QueryResult) => unknown) | null,
    onRejected?: ((e: unknown) => unknown) | null,
  ) =>
    Promise.resolve({
      data: filtered as unknown as PickedQuestionRow[],
      error: null,
    } as QueryResult).then(onFulfilled, onRejected);

  return { from: () => chain } as unknown as SupabaseClient<Database>;
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
    strand: "operations_algorithms",
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
    levelBand: over.levelBand,
  };
}

function req(over: Partial<PickerRequest> = {}): PickerRequest {
  return {
    strand: over.strand ?? "operations_algorithms",
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

describe("pickQuestion / is_active filter", () => {
  // Regression test for Item #11 Phase 3.
  //
  // Phase 2 deactivated 5 PLACEHOLDER questions via is_active=false. The
  // picker must not serve inactive rows. picker.ts:92 carries the
  // `.eq("is_active", true)` predicate; this test locks it in so a future
  // edit that drops the predicate goes red.
  //
  // The fixture inverts the natural tiebreak so a missing-filter regression
  // would be unambiguous: inactive sorts FIRST under the picker's
  // external_id ASC tiebreak (A-INACTIVE < B-ACTIVE). If the filter is
  // dropped, both rows enter the sort, A-INACTIVE wins, and the test fails
  // on the assertion below.
  it("excludes is_active=false rows even when they would otherwise sort first", async () => {
    const active = {
      ...row({ id: "id-active", external_id: "B-ACTIVE" }),
      is_active: true,
      tenant_id: TENANT,
    };
    const inactive = {
      ...row({ id: "id-inactive", external_id: "A-INACTIVE" }),
      is_active: false,
      tenant_id: TENANT,
    };
    const client = makePredicateFilteringClient([active, inactive]);

    const result = await pickQuestion(client, req(), ctx());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("id-active");
  });
});

describe("pickQuestion / level band (ctx.levelBand, ±1 hold-hard)", () => {
  it("filters out off-level items, keeping only in-band levels", async () => {
    // A 0C child's ±1 band is {0B,0C,grade-1}; a grade-6-sourced item must
    // not be served even if its difficulty is closest to target.
    const inBand = {
      ...row({ id: "id-inband", external_id: "B", difficulty: 0.5, level: "0C" }),
      is_active: true,
      tenant_id: TENANT,
    };
    const offLevel = {
      // closest to target 0, but out of band
      ...row({ id: "id-offlevel", external_id: "A", difficulty: 0.0, level: "6A" }),
      is_active: true,
      tenant_id: TENANT,
    };
    const client = makePredicateFilteringClient([inBand, offLevel]);

    const band = ["0B", "0C", "KA", "KB", "1A", "1B"];
    const result = await pickQuestion(
      client,
      req({ targetDifficulty: 0 }),
      ctx({ levelBand: band }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("id-inband");
  });

  it("HOLD HARD: returns strand-exhausted when nothing is in band (no widening)", async () => {
    const offLevel = {
      ...row({ id: "id-offlevel", level: "6A" }),
      is_active: true,
      tenant_id: TENANT,
    };
    const client = makePredicateFilteringClient([offLevel]);
    const result = await pickQuestion(
      client,
      req(),
      ctx({ levelBand: ["0B", "0C", "KA", "KB", "1A", "1B"] }),
    );
    expect(result).toEqual({ ok: false, reason: "strand-exhausted" });
  });

  it("applies no level filter when levelBand is omitted (legacy behavior)", async () => {
    const anyLevel = {
      ...row({ id: "id-any", level: "6A" }),
      is_active: true,
      tenant_id: TENANT,
    };
    const client = makePredicateFilteringClient([anyLevel]);
    const result = await pickQuestion(client, req(), ctx());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("id-any");
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

// ---------------------------------------------------------------------------
// discoverShortEligibleCounts (Picker Calibration)
// ---------------------------------------------------------------------------

function makeStrandCountClient(
  strands: ReadonlyArray<{ strand: string }>,
): SupabaseClient<Database> {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.in = () => chain;
  chain.then = (
    onFulfilled?: ((r: QueryResult) => unknown) | null,
    onRejected?: ((e: unknown) => unknown) | null,
  ) =>
    Promise.resolve({
      data: strands as unknown as PickedQuestionRow[],
      error: null,
    } as QueryResult).then(onFulfilled, onRejected);
  return { from: () => chain } as unknown as SupabaseClient<Database>;
}

describe("discoverShortEligibleCounts", () => {
  it("counts eligible items per strand", async () => {
    const client = makeStrandCountClient([
      { strand: "number_sense" },
      { strand: "number_sense" },
      { strand: "geometry" },
    ]);
    const counts = await discoverShortEligibleCounts(client, "tenant-1", ["0B"]);
    expect(counts.get("number_sense")).toBe(2);
    expect(counts.get("geometry")).toBe(1);
    expect(counts.has("measurement")).toBe(false);
  });

  it("short-circuits to an empty map for an empty band (no query)", async () => {
    let queried = false;
    const client = {
      from: () => {
        queried = true;
        return {};
      },
    } as unknown as SupabaseClient<Database>;
    const counts = await discoverShortEligibleCounts(client, "tenant-1", []);
    expect(counts.size).toBe(0);
    expect(queried).toBe(false);
  });

  it("throws on a DB error", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.in = () => chain;
    chain.then = (
      onFulfilled?: ((r: QueryResult) => unknown) | null,
      onRejected?: ((e: unknown) => unknown) | null,
    ) =>
      Promise.resolve({
        data: null,
        error: { message: "boom" },
      } as QueryResult).then(onFulfilled, onRejected);
    const client = { from: () => chain } as unknown as SupabaseClient<Database>;
    await expect(
      discoverShortEligibleCounts(client, "tenant-1", ["0B"]),
    ).rejects.toThrow(/discoverShortEligibleCounts failed: boom/);
  });
});

describe("discoverAvailableBooklets", () => {
  function makeLevelClient(
    levels: ReadonlyArray<{ level: string }>,
  ): SupabaseClient<Database> {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.then = (
      onFulfilled?: ((r: QueryResult) => unknown) | null,
      onRejected?: ((e: unknown) => unknown) | null,
    ) =>
      Promise.resolve({
        data: levels as unknown as PickedQuestionRow[],
        error: null,
      } as QueryResult).then(onFulfilled, onRejected);
    return { from: () => chain } as unknown as SupabaseClient<Database>;
  }

  it("maps active levels to their booklet ordinals (deduped)", async () => {
    // 0C/KA/KB → booklet 2; 1A/1B → 3; 4A → 6.
    const client = makeLevelClient([
      { level: "0C" },
      { level: "KA" },
      { level: "1A" },
      { level: "1B" },
      { level: "4A" },
    ]);
    const ords = await discoverAvailableBooklets(client, "tenant-1");
    expect([...ords].sort((a, b) => a - b)).toEqual([2, 3, 6]);
  });

  it("throws on a DB error", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.then = (
      onFulfilled?: ((r: QueryResult) => unknown) | null,
      onRejected?: ((e: unknown) => unknown) | null,
    ) =>
      Promise.resolve({
        data: null,
        error: { message: "kaboom" },
      } as QueryResult).then(onFulfilled, onRejected);
    const client = { from: () => chain } as unknown as SupabaseClient<Database>;
    await expect(
      discoverAvailableBooklets(client, "tenant-1"),
    ).rejects.toThrow(/discoverAvailableBooklets failed: kaboom/);
  });
});
