import { describe, expect, it } from "vitest";

import {
  baseSplit,
  planNextOffset,
  strandAdjustedSplit,
  type OffsetWeight,
} from "./comprehensiveSplit";

function weightAt(split: OffsetWeight[], offset: number): number {
  return split.find((o) => o.offset === offset)?.weight ?? 0;
}

describe("baseSplit", () => {
  it("clean centers on M with upward reach (30/50/20 over M-1/M/M+1)", () => {
    const s = baseSplit("clean");
    expect(weightAt(s, -1)).toBeCloseTo(0.3);
    expect(weightAt(s, 0)).toBeCloseTo(0.5);
    expect(weightAt(s, 1)).toBeCloseTo(0.2);
  });

  it("mixed weights below M with an M-2 backstop (50/30/20 over M-1/M/M-2)", () => {
    const s = baseSplit("mixed");
    expect(weightAt(s, -1)).toBeCloseTo(0.5);
    expect(weightAt(s, 0)).toBeCloseTo(0.3);
    expect(weightAt(s, -2)).toBeCloseTo(0.2);
    expect(weightAt(s, 1)).toBe(0); // no reach when mixed
  });

  it("weak is below-weighted (floor-finding seed) and never reaches up", () => {
    const s = baseSplit("weak");
    expect(weightAt(s, 0)).toBeLessThan(weightAt(s, -1) + weightAt(s, -2));
    expect(weightAt(s, 1)).toBe(0);
  });

  it("insufficient and no-outcome use the same neutral split", () => {
    expect(baseSplit("insufficient")).toEqual(baseSplit(null));
    const s = baseSplit(null);
    expect(weightAt(s, -1)).toBeCloseTo(0.5);
    expect(weightAt(s, 0)).toBeCloseTo(0.3);
    expect(weightAt(s, 1)).toBeCloseTo(0.2);
  });

  it("every base split's weights sum to ~1", () => {
    for (const band of ["clean", "mixed", "weak", "insufficient", null] as const) {
      const total = baseSplit(band).reduce((s, o) => s + o.weight, 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });
});

describe("strandAdjustedSplit", () => {
  const base = baseSplit("clean"); // -1:.3, 0:.5, +1:.2

  it("returns the base unchanged for a pivot (0.5) ratio", () => {
    const adj = strandAdjustedSplit(base, 0.5);
    expect(weightAt(adj, -1)).toBeCloseTo(0.3);
    expect(weightAt(adj, 0)).toBeCloseTo(0.5);
    expect(weightAt(adj, 1)).toBeCloseTo(0.2);
  });

  it("returns the base unchanged for an unseen strand (null ratio)", () => {
    expect(strandAdjustedSplit(base, null)).toEqual(base);
  });

  it("a struggling strand (low ratio) pulls weight toward below-level", () => {
    const adj = strandAdjustedSplit(base, 0.0);
    expect(weightAt(adj, -1)).toBeGreaterThan(0.3);
    expect(weightAt(adj, 1)).toBeLessThan(0.2);
  });

  it("a strong strand (high ratio) pulls weight away from below-level", () => {
    const adj = strandAdjustedSplit(base, 1.0);
    expect(weightAt(adj, -1)).toBeLessThan(0.3);
    expect(weightAt(adj, 1)).toBeGreaterThan(0.2);
  });

  it("stays normalised after adjustment", () => {
    for (const ratio of [0, 0.25, 0.75, 1]) {
      const total = strandAdjustedSplit(base, ratio).reduce(
        (s, o) => s + o.weight,
        0,
      );
      expect(total).toBeCloseTo(1, 10);
    }
  });
});

describe("planNextOffset", () => {
  const split = baseSplit("clean"); // -1:.3, 0:.5, +1:.2
  const allOffsets = new Set([-1, 0, 1]);

  it("targets the largest-deficit offset (M first on an empty draw of budget 20)", () => {
    // Empty draw: targets are 6 / 10 / 4. M (0) has the largest target ⇒ deficit.
    const offset = planNextOffset({
      split,
      servedByOffset: new Map(),
      totalBudget: 20,
      availableOffsets: allOffsets,
    });
    expect(offset).toBe(0);
  });

  it("moves to an under-served offset once M is ahead of its target", () => {
    // M already served 12 (target 10 ⇒ deficit -2); M-1 served 0 (target 6).
    const offset = planNextOffset({
      split,
      servedByOffset: new Map([
        [0, 12],
        [-1, 0],
        [1, 0],
      ]),
      totalBudget: 20,
      availableOffsets: allOffsets,
    });
    expect(offset).toBe(-1);
  });

  it("never returns an unavailable offset (ceiling/edge clamp)", () => {
    // Reach (+1) unavailable (e.g. M at ceiling) → falls to in-range offsets.
    const offset = planNextOffset({
      split,
      servedByOffset: new Map([
        [-1, 6],
        [0, 10],
      ]),
      totalBudget: 20,
      availableOffsets: new Set([-1, 0]),
    });
    expect(offset === -1 || offset === 0).toBe(true);
  });

  it("returns null when no split offset is available", () => {
    const offset = planNextOffset({
      split,
      servedByOffset: new Map(),
      totalBudget: 20,
      availableOffsets: new Set([5]),
    });
    expect(offset).toBeNull();
  });

  it("breaks ties toward the lower offset (favour covering below)", () => {
    // Equal deficits across all offsets (served proportional to weight×budget).
    const offset = planNextOffset({
      split: [
        { offset: -1, weight: 0.5 },
        { offset: 0, weight: 0.5 },
      ],
      servedByOffset: new Map(),
      totalBudget: 10,
      availableOffsets: new Set([-1, 0]),
    });
    expect(offset).toBe(-1);
  });
});
