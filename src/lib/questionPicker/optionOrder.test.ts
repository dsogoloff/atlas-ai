import { describe, expect, it } from "vitest";

import { isClustered, spreadOptions } from "./optionOrder";

// The reported defect: 6 image tiles with the correct (red) ones at t1/t3/t5.
const SIX = ["t1", "t2", "t3", "t4", "t5", "t6"].map((id) => ({ id }));
const REDS = ["t1", "t3", "t5"];

function correctPositions(order: { id: string }[], correct: string[]): number[] {
  const set = new Set(correct);
  return order.flatMap((o, i) => (set.has(o.id) ? [i] : []));
}

describe("isClustered", () => {
  it("flags all-same-column (correct at 0,2,4 — one 2-col column)", () => {
    expect(isClustered(["t1", "t2", "t3", "t4", "t5", "t6"], new Set(REDS))).toBe(true);
  });
  it("flags a contiguous run of correct options", () => {
    expect(isClustered(["a", "b", "c", "d", "e"], new Set(["d", "e"]))).toBe(true);
  });
  it("passes when correct options span both columns / are non-contiguous", () => {
    // correct at 0,1,3 -> columns L,R,R and not a single run
    expect(isClustered(["t1", "t3", "x", "t5"], new Set(REDS))).toBe(false);
  });
  it("never clusters with <2 correct", () => {
    expect(isClustered(["a", "b", "c"], new Set(["a"]))).toBe(false);
  });
});

describe("spreadOptions", () => {
  it("is deterministic: same (items, correct, seed) -> identical order (no flicker)", () => {
    const a = spreadOptions(SIX, REDS, "q-123");
    const b = spreadOptions(SIX, REDS, "q-123");
    expect(a).toEqual(b);
  });

  it("preserves the option SET (grading is by id, never position)", () => {
    const out = spreadOptions(SIX, REDS, "q-123");
    expect(out.map((o) => o.id).sort()).toEqual(SIX.map((o) => o.id).sort());
  });

  it("de-clusters the reported {t1,t3,t5} case for the served id", () => {
    const out = spreadOptions(SIX, REDS, "11111111-1111-1111-1111-111111111111");
    expect(isClustered(out.map((o) => o.id), new Set(REDS))).toBe(false);
  });

  it("ROBUST not lucky: never clusters across many distinct ids", () => {
    for (let i = 0; i < 500; i++) {
      const out = spreadOptions(SIX, REDS, `item-${String(i)}`);
      expect(isClustered(out.map((o) => o.id), new Set(REDS))).toBe(false);
      // position must not be informative: correct options span >1 column
      const cols = new Set(correctPositions(out, REDS).map((p) => p % 2));
      expect(cols.size).toBeGreaterThan(1);
    }
  });

  it("different ids generally yield different orders (option order varies by item)", () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, i) =>
        spreadOptions(SIX, REDS, `id-${String(i)}`).map((o) => o.id).join(","),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("leaves 1- and 2-option lists untouched (nothing to spread)", () => {
    expect(spreadOptions([{ id: "a" }, { id: "b" }], ["a"], "s")).toEqual([
      { id: "a" },
      { id: "b" },
    ]);
  });
});
