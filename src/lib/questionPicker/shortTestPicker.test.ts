import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import {
  SHORT_TEST_LEVEL_BAND,
  pickShortTestQuestion,
} from "./shortTestPicker";
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
  };
}

function req(over: Partial<PickerRequest> = {}): PickerRequest {
  return {
    strand: over.strand ?? "operations_algorithms",
    targetDifficulty: over.targetDifficulty ?? 0,
    width: over.width ?? 1,
  };
}

describe("SHORT_TEST_LEVEL_BAND (grades 3–7)", () => {
  it("covers 3A through 7B", () => {
    expect(SHORT_TEST_LEVEL_BAND).toEqual([
      "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B", "7A", "7B",
    ]);
  });
  it("excludes below grade 3 and above grade 7", () => {
    expect(SHORT_TEST_LEVEL_BAND).not.toContain("2B");
    expect(SHORT_TEST_LEVEL_BAND).not.toContain("8A");
    expect(SHORT_TEST_LEVEL_BAND).not.toContain("KA");
  });
});

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

describe("pickShortTestQuestion — grade-band scope (3–7)", () => {
  it("includes an in-band item and excludes out-of-band items", async () => {
    const inBand = row({ id: "33333333-3333-3333-3333-333333333333", level: "4A" });
    const tooLow = row({ id: "44444444-4444-4444-4444-444444444444", level: "2B" });
    const tooHigh = row({ id: "55555555-5555-5555-5555-555555555555", level: "8A" });
    const result = await pickShortTestQuestion(
      makeClient([tooLow, tooHigh, inBand]),
      req(),
      ctx(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe(inBand.id);
  });

  it("returns strand-exhausted when the only eligible item is out of band", async () => {
    const result = await pickShortTestQuestion(
      makeClient([row({ level: "2B", short_test_eligible: true })]),
      req(),
      ctx(),
    );
    expect(result).toEqual({ ok: false, reason: "strand-exhausted" });
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
