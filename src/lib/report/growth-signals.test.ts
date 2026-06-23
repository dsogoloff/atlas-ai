import { describe, expect, it } from "vitest";

import { buildGrowthSignals, type GrowthResponseInput } from "./growth-signals";

const r = (over: Partial<GrowthResponseInput>): GrowthResponseInput => ({
  strand: "measurement",
  isCorrect: false,
  skillName: null,
  timeFlag: "NORMAL",
  misconceptionLabels: [],
  ...over,
});

describe("buildGrowthSignals", () => {
  it("groups by sub-strand and counts served + correct", () => {
    const out = buildGrowthSignals([
      r({ strand: "whole_numbers", isCorrect: true }),
      r({ strand: "whole_numbers", isCorrect: true }),
      r({ strand: "whole_numbers", isCorrect: false }),
      r({ strand: "measurement", isCorrect: false }),
    ]);
    const byStrand = new Map(out.map((g) => [g.strand, g]));
    expect(byStrand.get("whole_numbers")).toMatchObject({
      served: 3,
      correct: 2,
    });
    expect(byStrand.get("measurement")).toMatchObject({
      served: 1,
      correct: 0,
    });
  });

  it("collects missed-skill labels from incorrect items only, deduped", () => {
    const [g] = buildGrowthSignals([
      r({ isCorrect: false, skillName: "Length" }),
      r({ isCorrect: false, skillName: "Length" }), // dup
      r({ isCorrect: true, skillName: "Mass" }), // correct → not missed
      r({ isCorrect: false, skillName: "Time" }),
    ]);
    expect(g.missed_skills).toEqual(["Length", "Time"]);
  });

  it("caps missed skills at 4", () => {
    const [g] = buildGrowthSignals(
      ["A", "B", "C", "D", "E", "F"].map((s) =>
        r({ isCorrect: false, skillName: s }),
      ),
    );
    expect(g.missed_skills).toHaveLength(4);
    expect(g.missed_skills).toEqual(["A", "B", "C", "D"]);
  });

  it("dedupes misconception labels across responses and caps at 3", () => {
    const [g] = buildGrowthSignals([
      r({ misconceptionLabels: ["A", "B"] }),
      r({ misconceptionLabels: ["B", "C"] }),
      r({ misconceptionLabels: ["D", "E"] }),
    ]);
    expect(g.misconceptions).toEqual(["A", "B", "C"]);
  });

  it("derives pace: fast when most items are TOO_FAST and none slow", () => {
    const [g] = buildGrowthSignals([
      r({ timeFlag: "TOO_FAST" }),
      r({ timeFlag: "TOO_FAST" }),
      r({ timeFlag: "NORMAL" }),
    ]);
    expect(g.pace).toBe("fast");
  });

  it("derives pace: slow when most items are TOO_SLOW and none fast", () => {
    const [g] = buildGrowthSignals([
      r({ timeFlag: "TOO_SLOW" }),
      r({ timeFlag: "TOO_SLOW" }),
    ]);
    expect(g.pace).toBe("slow");
  });

  it("derives pace: mixed when both fast and slow appear", () => {
    const [g] = buildGrowthSignals([
      r({ timeFlag: "TOO_FAST" }),
      r({ timeFlag: "TOO_SLOW" }),
      r({ timeFlag: "NORMAL" }),
    ]);
    expect(g.pace).toBe("mixed");
  });

  it("derives pace: typical when nothing flagged", () => {
    const [g] = buildGrowthSignals([
      r({ timeFlag: "NORMAL" }),
      r({ timeFlag: "INVALID" }),
    ]);
    expect(g.pace).toBe("typical");
  });

  it("returns an empty array for no responses", () => {
    expect(buildGrowthSignals([])).toEqual([]);
  });
});
