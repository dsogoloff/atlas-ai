import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { pickForSession } from "./pickForSession";
import type { PickedQuestionRow, PickerRequest } from "./types";

// Mock that records the .eq/.in predicates issued, so we can assert which
// picker + level band ran for a given session test type.
type FilterRow = PickedQuestionRow & Record<string, unknown>;

function makeClient(rows: ReadonlyArray<FilterRow>) {
  let filtered: FilterRow[] = rows.slice();
  const eqs: Array<{ col: string; val: unknown }> = [];
  const ins: Array<{ col: string; vals: unknown[] }> = [];
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = (col: string, val: unknown) => {
    eqs.push({ col, val });
    filtered = filtered.filter((r) => r[col] === val);
    return chain;
  };
  chain.in = (col: string, vals: unknown[]) => {
    ins.push({ col, vals });
    filtered = filtered.filter((r) => vals.includes(r[col]));
    return chain;
  };
  chain.then = (
    onFulfilled?: ((r: unknown) => unknown) | null,
    onRejected?: ((e: unknown) => unknown) | null,
  ) =>
    Promise.resolve({ data: filtered, error: null }).then(
      onFulfilled,
      onRejected,
    );
  const client = { from: () => chain } as unknown as SupabaseClient<Database>;
  return { client, eqs, ins };
}

const TENANT = "00000000-0000-0000-0000-0000000000aa";

function row(over: Partial<FilterRow>): FilterRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    external_id: "EXT-001",
    strand: "operations_algorithms",
    level: "5A",
    difficulty: 0.0,
    format: "MULTIPLE_CHOICE",
    content: { stem: "s", options: ["a"] },
    tenant_id: TENANT,
    is_active: true,
    short_test_eligible: true,
    ...over,
  };
}

const req: PickerRequest = {
  strand: "operations_algorithms",
  targetDifficulty: 0,
  width: 1,
};
const base = { tenantId: TENANT, servedQuestionIds: [] as string[] };

describe("pickForSession — comprehensive", () => {
  it("uses the ±1 band and does NOT filter short_test_eligible", async () => {
    const { client, eqs, ins } = makeClient([row({ level: "5A" })]);
    const result = await pickForSession(client, req, base, {
      testType: "comprehensive",
      gradeLevel: "5",
      birthYear: 2015,
    });
    expect(result.ok).toBe(true);
    // grade-5 anchor → band includes 4A..6B; no short_test_eligible eq.
    expect(eqs.some((e) => e.col === "short_test_eligible")).toBe(false);
    const levelIn = ins.find((i) => i.col === "level");
    expect(levelIn?.vals).toEqual(
      expect.arrayContaining(["4A", "4B", "5A", "5B", "6A", "6B"]),
    );
  });
});

describe("pickForSession — short", () => {
  it("filters short_test_eligible AND bands to the previous + current booklet", async () => {
    const prev = row({ id: "prev", level: "4A" });
    const same = row({ id: "same", level: "5A" });
    const { client, eqs, ins } = makeClient([same, prev]);
    const result = await pickForSession(client, req, base, {
      testType: "short",
      gradeLevel: "5",
      birthYear: 2015,
    });
    expect(eqs.some((e) => e.col === "short_test_eligible" && e.val === true)).toBe(true);
    const levelIn = ins.find((i) => i.col === "level");
    // grade-5 child → previous booklet grade 4 AND current booklet grade 5
    expect(levelIn?.vals).toEqual(["4A", "4B", "5A", "5B"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.id).toBe("prev");
  });

  it("reaches below the intake floor (Kindergarten → samples 0B and 0C)", async () => {
    const { client, ins } = makeClient([row({ id: "b", level: "0B" })]);
    const result = await pickForSession(client, req, base, {
      testType: "short",
      gradeLevel: "K",
      birthYear: 2020,
    });
    // Kindergarten anchors at the 0C booklet (ordinal 2); previous + current =
    // {0B, 0C}, and KA/KB fold into the 0C booklet ordinal.
    const levelIn = ins.find((i) => i.col === "level");
    expect(levelIn?.vals).toEqual(["0B", "0C", "KA", "KB"]);
    expect(result.ok).toBe(true);
  });
});
