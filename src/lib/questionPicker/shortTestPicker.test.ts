import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { pickShortTestQuestion } from "./shortTestPicker";
import type {
  PickedQuestionRow,
  PickerContext,
  PickerRequest,
} from "./types";

// ---------------------------------------------------------------------------
// Mock: a chainable query client that applies every .eq(col,val) and
// .in(col,vals) predicate to a staged row set, so a test can assert the
// picker actually issued the short_test_eligible + grade-band WHERE clauses.
// Rows carry the filter-only columns (tenant_id, is_active, short_test_eligible)
// in addition to the PickedQuestionRow shape.
// ---------------------------------------------------------------------------

type FilterRow = PickedQuestionRow & Record<string, unknown>;

function makeClient(
  rows: ReadonlyArray<FilterRow>,
): SupabaseClient<Database> {
  let filtered: FilterRow[] = rows.slice();
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
    onFulfilled?: ((r: unknown) => unknown) | null,
    onRejected?: ((e: unknown) => unknown) | null,
  ) =>
    Promise.resolve({
      data: filtered as unknown as PickedQuestionRow[],
      error: null,
    }).then(onFulfilled, onRejected);

  return { from: () => chain } as unknown as SupabaseClient<Database>;
}

const TENANT = "00000000-0000-0000-0000-0000000000aa";

function row(over: Partial<FilterRow>): FilterRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    external_id: "EXT-001",
    strand: "operations_algorithms",
    level: "4A",
    difficulty: 0.0,
    format: "MULTIPLE_CHOICE",
    content: { stem: "s", options: ["a"] },
    content_id: null,
    // filter-only columns
    tenant_id: TENANT,
    is_active: true,
    short_test_eligible: true,
    ...over,
  };
}

function ctx(over: Partial<PickerContext> = {}): PickerContext {
  return {
    tenantId: over.tenantId ?? TENANT,
    servedQuestionIds: over.servedQuestionIds ?? [],
    candidateLimit: over.candidateLimit,
    levelBand: over.levelBand,
    subStrandByContentId: over.subStrandByContentId,
    servedSubStrands: over.servedSubStrands,
  };
}

function req(over: Partial<PickerRequest> = {}): PickerRequest {
  return {
    strand: over.strand ?? "operations_algorithms",
    targetDifficulty: over.targetDifficulty ?? 0,
    width: over.width ?? 1,
  };
}

describe("pickShortTestQuestion — short_test_eligible filter", () => {
  it("draws only from short_test_eligible = true items", async () => {
    const eligible = row({ id: "11111111-1111-1111-1111-111111111111", short_test_eligible: true });
    const ineligible = row({ id: "22222222-2222-2222-2222-222222222222", short_test_eligible: false });
    const result = await pickShortTestQuestion(
      makeClient([ineligible, eligible]),
      req(),
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe(eligible.id);
  });

  it("returns strand-exhausted when every candidate is ineligible", async () => {
    const result = await pickShortTestQuestion(
      makeClient([row({ short_test_eligible: false })]),
      req(),
      ctx(),
    );
    expect(result).toEqual({ ok: false, reason: "strand-exhausted" });
  });
});

describe("pickShortTestQuestion — previous-booklet level band (ctx.levelBand)", () => {
  // The caller passes the single previous booklet's half-grades (e.g. a grade-5
  // child samples grade 4 → ["4A","4B"]).
  it("draws only from the passed previous-booklet levels", async () => {
    const inBand = row({ id: "33333333-3333-3333-3333-333333333333", level: "4A" });
    const sameGrade = row({ id: "55555555-5555-5555-5555-555555555555", level: "5A" });
    const tooLow = row({ id: "44444444-4444-4444-4444-444444444444", level: "2B" });
    const result = await pickShortTestQuestion(
      makeClient([sameGrade, tooLow, inBand]),
      req(),
      ctx({ levelBand: ["4A", "4B"] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe(inBand.id);
  });

  it("HOLD HARD: strand-exhausted when nothing is in the previous booklet (no widening)", async () => {
    const result = await pickShortTestQuestion(
      makeClient([row({ level: "5A", short_test_eligible: true })]),
      req(),
      ctx({ levelBand: ["4A", "4B"] }),
    );
    expect(result).toEqual({ ok: false, reason: "strand-exhausted" });
  });

  it("reaches below the intake floor (0C child samples 0B)", async () => {
    const below = row({ id: "66666666-6666-6666-6666-666666666666", level: "0B" });
    const atFloor = row({ id: "77777777-7777-7777-7777-777777777777", level: "0C" });
    const result = await pickShortTestQuestion(
      makeClient([atFloor, below]),
      req(),
      ctx({ levelBand: ["0B"] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe(below.id);
  });
});

describe("pickShortTestQuestion — served exclusion + nearest-difficulty", () => {
  it("skips already-served items and picks the closest to target", async () => {
    const served = row({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", difficulty: 0.0 });
    const near = row({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", difficulty: 0.1 });
    const far = row({ id: "cccccccc-cccc-cccc-cccc-cccccccccccc", difficulty: 0.9 });
    const result = await pickShortTestQuestion(
      makeClient([served, far, near]),
      req({ targetDifficulty: 0 }),
      ctx({ servedQuestionIds: [served.id] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe(near.id);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — STRAND COVERAGE governs selection (AXIS-B sub-strands).
//
// The engine router (AXIS A) requests an engine strand; WITHIN that strand the
// picker must spread across the V2026 sub-strands the parent report measures
// before deepening one. These tests model a single engine strand whose eligible
// items fan out to several sub-strands.
// ---------------------------------------------------------------------------

describe("pickShortTestQuestion — sub-strand coverage governor", () => {
  // Two eligible items in the SAME engine strand: one whose sub-strand is
  // already covered (ratio) but is NEAREST to target, one whose sub-strand is
  // NOT yet covered (geometry) but is slightly farther. Pre-fix the picker would
  // pick the nearest (deepening ratio again and never reaching geometry).
  it("REPRO + FIX: prefers an uncovered sub-strand over a nearer covered one", async () => {
    const coveredNearest = row({
      id: "d1111111-1111-1111-1111-111111111111",
      content_id: "content-ratio",
      difficulty: 0.0,
    });
    const uncoveredFarther = row({
      id: "d2222222-2222-2222-2222-222222222222",
      content_id: "content-geometry",
      difficulty: 0.3,
    });
    const result = await pickShortTestQuestion(
      makeClient([coveredNearest, uncoveredFarther]),
      req({ targetDifficulty: 0 }),
      ctx({
        subStrandByContentId: new Map([
          ["content-ratio", "ratio"],
          ["content-geometry", "geometry"],
        ]),
        servedSubStrands: new Set(["ratio"]),
      }),
    );
    expect(result.ok).toBe(true);
    // Coverage governs over nearest-difficulty: geometry (uncovered) wins.
    if (result.ok) expect(result.question.id).toBe(uncoveredFarther.id);
  });

  it("within the SAME coverage bucket, nearest-difficulty still tiebreaks", async () => {
    // Both sub-strands uncovered → coverage indifferent → nearest wins.
    const near = row({
      id: "d3333333-3333-3333-3333-333333333333",
      content_id: "content-geometry",
      difficulty: 0.1,
    });
    const far = row({
      id: "d4444444-4444-4444-4444-444444444444",
      content_id: "content-algebra",
      difficulty: 0.9,
    });
    const result = await pickShortTestQuestion(
      makeClient([far, near]),
      req({ targetDifficulty: 0 }),
      ctx({
        subStrandByContentId: new Map([
          ["content-geometry", "geometry"],
          ["content-algebra", "algebra"],
        ]),
        servedSubStrands: new Set(),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe(near.id);
  });

  it("GRACEFUL FALLBACK: NULL content_id never beats a coverage-extending item", async () => {
    const uncovered = row({
      id: "d5555555-5555-5555-5555-555555555555",
      content_id: "content-geometry",
      difficulty: 0.5,
    });
    const unresolved = row({
      id: "d6666666-6666-6666-6666-666666666666",
      content_id: null,
      difficulty: 0.0, // nearer, but no sub-strand → not coverage-extending
    });
    const result = await pickShortTestQuestion(
      makeClient([unresolved, uncovered]),
      req({ targetDifficulty: 0 }),
      ctx({
        subStrandByContentId: new Map([["content-geometry", "geometry"]]),
        servedSubStrands: new Set(),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe(uncovered.id);
  });

  it("GRACEFUL FALLBACK: with no coverage context, picks nearest-difficulty (prior behaviour)", async () => {
    const near = row({
      id: "d7777777-7777-7777-7777-777777777777",
      content_id: "content-geometry",
      difficulty: 0.1,
    });
    const far = row({
      id: "d8888888-8888-8888-8888-888888888888",
      content_id: "content-ratio",
      difficulty: 0.9,
    });
    const result = await pickShortTestQuestion(
      makeClient([far, near]),
      req({ targetDifficulty: 0 }),
      ctx(), // no subStrandByContentId / servedSubStrands
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe(near.id);
  });

  it("L6 scenario: across served slots, previously-skipped sub-strands get representation", async () => {
    // Eligible pool in one engine strand spanning 4 sub-strands; 'percentage'
    // already covered, the other three are the symptom's skipped sub-strands.
    // Serving with each newly-covered sub-strand added to servedSubStrands must
    // reach geometry, ratio, AND algebra, never re-picking percentage.
    const subStrandByContentId = new Map([
      ["c-percentage", "percentage"],
      ["c-geometry", "geometry"],
      ["c-ratio", "ratio"],
      ["c-algebra", "algebra"],
    ]);
    const pool = [
      row({ id: "e0000000-0000-0000-0000-000000000001", content_id: "c-percentage", difficulty: 0.0 }),
      row({ id: "e0000000-0000-0000-0000-000000000002", content_id: "c-geometry", difficulty: 0.2 }),
      row({ id: "e0000000-0000-0000-0000-000000000003", content_id: "c-ratio", difficulty: 0.4 }),
      row({ id: "e0000000-0000-0000-0000-000000000004", content_id: "c-algebra", difficulty: 0.6 }),
    ];

    const served = new Set<string>(["percentage"]);
    const servedQuestionIds: string[] = [];
    const reached = new Set<string>();

    for (let i = 0; i < 3; i++) {
      const result = await pickShortTestQuestion(
        makeClient(pool),
        req({ targetDifficulty: 0 }),
        ctx({
          servedQuestionIds,
          subStrandByContentId,
          servedSubStrands: served,
        }),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const sub = subStrandByContentId.get(result.question.content_id ?? "")!;
      expect(sub).not.toBe("percentage"); // never re-deepens the covered one
      reached.add(sub);
      served.add(sub);
      servedQuestionIds.push(result.question.id);
    }

    expect(reached).toEqual(new Set(["geometry", "ratio", "algebra"]));
  });
});
