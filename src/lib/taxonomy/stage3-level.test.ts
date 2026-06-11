// Unit tests for Stage 3's level-label handling (scripts/conversion/
// stage3-tag.ts) — the 0A/0B/0C fix: external_id slugs and the
// taxonomy-content level window must resolve the Kindergarten levels
// (l0a/l0b/l0c) by their ORDINAL position in the taxonomy's `levels`
// array, not by digit arithmetic.
//
// All fixtures are SYNTHETIC.

import { describe, expect, it } from "vitest";

import {
  filterTaxonomyForLevel,
  levelKeyFromLabel,
  shortLevelSlug,
  type Taxonomy,
} from "../../../scripts/conversion/stage3-tag";

describe("levelKeyFromLabel", () => {
  it("maps digit labels to l<n>", () => {
    expect(levelKeyFromLabel("Level 5")).toBe("l5");
    expect(levelKeyFromLabel("Level 1")).toBe("l1");
  });

  it("maps the Kindergarten labels to l0a/l0b/l0c", () => {
    expect(levelKeyFromLabel("Level 0A")).toBe("l0a");
    expect(levelKeyFromLabel("Level 0B")).toBe("l0b");
    expect(levelKeyFromLabel("Level 0C")).toBe("l0c");
    expect(levelKeyFromLabel("level 0a")).toBe("l0a");
  });

  it("returns null for missing/unrecognizable labels", () => {
    expect(levelKeyFromLabel(null)).toBeNull();
    expect(levelKeyFromLabel("Worksheet")).toBeNull();
  });
});

describe("shortLevelSlug", () => {
  it("builds digit slugs (external_id SAM-L5-Qnn)", () => {
    expect(shortLevelSlug("Level 5")).toBe("L5");
  });

  it("builds Kindergarten slugs (external_id SAM-L0A-Qnn)", () => {
    expect(shortLevelSlug("Level 0A")).toBe("L0A");
    expect(shortLevelSlug("Level 0B")).toBe("L0B");
    expect(shortLevelSlug("Level 0C")).toBe("L0C");
  });

  it("falls back to X / collapsed label", () => {
    expect(shortLevelSlug(null)).toBe("X");
    expect(shortLevelSlug("Some Sheet")).toBe("SOMESHEET");
  });
});

// Synthetic taxonomy mirroring the real level ordering (l0a..l6 by sort)
// with one content item per level.
const LEVEL_KEYS = ["l0a", "l0b", "l0c", "l1", "l2", "l3", "l4", "l5", "l6"];

const taxonomy: Taxonomy = {
  version: "test",
  source: "synthetic",
  strands: [{ key: "s1", name: "Strand" }] as Taxonomy["strands"],
  levels: LEVEL_KEYS.map((key, i) => ({
    key,
    name: key.toUpperCase(),
    sort: i + 1,
    mvp: true,
  })),
  sub_strands: [],
  content: LEVEL_KEYS.map((level, i) => ({
    key: `c-${level}`,
    level,
    sub_strand: "ss1",
    seq: i,
    name: `Content ${level}`,
    mvp: true,
  })),
};

function levelsOf(content: ReturnType<typeof filterTaxonomyForLevel>): string[] {
  return content.map((c) => c.level);
}

describe("filterTaxonomyForLevel", () => {
  it("windows ±1 by ordinal position for digit levels", () => {
    expect(levelsOf(filterTaxonomyForLevel(taxonomy, "Level 3"))).toEqual([
      "l2",
      "l3",
      "l4",
    ]);
  });

  it("chains l0c into l1 (Level 1's window includes the Kindergarten top)", () => {
    expect(levelsOf(filterTaxonomyForLevel(taxonomy, "Level 1"))).toEqual([
      "l0c",
      "l1",
      "l2",
    ]);
  });

  it("resolves the Kindergarten levels", () => {
    expect(levelsOf(filterTaxonomyForLevel(taxonomy, "Level 0A"))).toEqual([
      "l0a",
      "l0b",
    ]);
    expect(levelsOf(filterTaxonomyForLevel(taxonomy, "Level 0B"))).toEqual([
      "l0a",
      "l0b",
      "l0c",
    ]);
    expect(levelsOf(filterTaxonomyForLevel(taxonomy, "Level 0C"))).toEqual([
      "l0b",
      "l0c",
      "l1",
    ]);
  });

  it("clamps at the top level", () => {
    expect(levelsOf(filterTaxonomyForLevel(taxonomy, "Level 6"))).toEqual([
      "l5",
      "l6",
    ]);
  });

  it("returns everything when the label is missing or unknown", () => {
    expect(filterTaxonomyForLevel(taxonomy, null)).toHaveLength(LEVEL_KEYS.length);
    expect(filterTaxonomyForLevel(taxonomy, "Level 99")).toHaveLength(
      LEVEL_KEYS.length,
    );
  });
});
