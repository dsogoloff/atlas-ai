import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { parseShortTestOutcome, readLatestShortOutcome } from "./readOutcome";
import type { ShortTestOutcome } from "./outcome";

const VALID: ShortTestOutcome = {
  measured_level: "4",
  intake_level: "5",
  pass_band: "clean",
  clean_pass_ratio: 0.8,
  strand_map: { number_sense: { correct: 2, seen: 2, ratio: 1 } },
  seen_item_ids: ["q1", "q2"],
};

describe("parseShortTestOutcome", () => {
  it("accepts a well-formed outcome", () => {
    expect(parseShortTestOutcome(VALID)).toEqual(VALID);
  });

  it("rejects null / non-object / missing required fields", () => {
    expect(parseShortTestOutcome(null)).toBeNull();
    expect(parseShortTestOutcome("x")).toBeNull();
    expect(parseShortTestOutcome({ measured_level: "4" })).toBeNull();
    expect(
      parseShortTestOutcome({ ...VALID, pass_band: "bogus" }),
    ).toBeNull();
  });

  it("drops malformed strand_map entries and non-string seen ids best-effort", () => {
    const parsed = parseShortTestOutcome({
      ...VALID,
      strand_map: {
        number_sense: { correct: 1, seen: 2, ratio: 0.5 },
        geometry: { correct: "x" }, // malformed → dropped
      },
      seen_item_ids: ["q1", 5, "q2"],
    });
    expect(parsed?.strand_map.number_sense).toEqual({
      correct: 1,
      seen: 2,
      ratio: 0.5,
    });
    expect(parsed?.strand_map.geometry).toBeUndefined();
    expect(parsed?.seen_item_ids).toEqual(["q1", "q2"]);
  });
});

function makeClient(result: {
  data: { short_test_outcome: unknown } | null;
  error: { message: string } | null;
}): SupabaseClient<Database> {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.maybeSingle = () => Promise.resolve(result);
  return { from: () => chain } as unknown as SupabaseClient<Database>;
}

describe("readLatestShortOutcome", () => {
  it("returns the parsed outcome from the latest completed short session", async () => {
    const client = makeClient({
      data: { short_test_outcome: VALID },
      error: null,
    });
    const outcome = await readLatestShortOutcome(client, "child-1");
    expect(outcome).toEqual(VALID);
  });

  it("returns null when no completed short session exists", async () => {
    const client = makeClient({ data: null, error: null });
    expect(await readLatestShortOutcome(client, "child-1")).toBeNull();
  });

  it("returns null when the latest session's outcome is legacy/absent", async () => {
    const client = makeClient({
      data: { short_test_outcome: null },
      error: null,
    });
    expect(await readLatestShortOutcome(client, "child-1")).toBeNull();
  });

  it("throws on a DB error", async () => {
    const client = makeClient({ data: null, error: { message: "boom" } });
    await expect(readLatestShortOutcome(client, "child-1")).rejects.toThrow(
      /latest short outcome read failed: boom/,
    );
  });
});
