// Unit tests for the PlacementEstimate boundary serializers in types.ts.
//
// Coverage:
//   * isPlacementEstimateJson — runtime guard for current_estimate jsonb.
//     Accepts valid wire shapes; rejects null, undefined, primitives,
//     missing fields, and wrong field types.
//   * fromPlacementEstimateJson — snake_case wire → camelCase engine
//     hydration. Round-trips field values without mutation.
//
// These two helpers were added during Item #8 to fix the snake_case
// current_estimate read bug; tests were deferred to the cleanup batch.

import { describe, expect, it } from "vitest";

import {
  fromPlacementEstimateJson,
  isPlacementEstimateJson,
  type PlacementEstimateJson,
} from "./types";

const validJson: PlacementEstimateJson = {
  overall_level: "3A",
  strand_levels: {
    number_sense: "3A",
    operations_algorithms: "2B",
    fractions_decimals: "2A",
    measurement: "3A",
    geometry: "3B",
    data_statistics: "3A",
  },
  confidence: 0.72,
};

describe("isPlacementEstimateJson", () => {
  it("accepts a fully-formed valid object", () => {
    expect(isPlacementEstimateJson(validJson)).toBe(true);
  });

  it("rejects null", () => {
    expect(isPlacementEstimateJson(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isPlacementEstimateJson(undefined)).toBe(false);
  });

  it("rejects primitives", () => {
    expect(isPlacementEstimateJson("3A")).toBe(false);
    expect(isPlacementEstimateJson(42)).toBe(false);
    expect(isPlacementEstimateJson(true)).toBe(false);
  });

  it("rejects when overall_level is missing", () => {
    expect(
      isPlacementEstimateJson({
        strand_levels: validJson.strand_levels,
        confidence: validJson.confidence,
      }),
    ).toBe(false);
  });

  it("rejects when confidence is missing or non-number", () => {
    expect(
      isPlacementEstimateJson({
        overall_level: validJson.overall_level,
        strand_levels: validJson.strand_levels,
      }),
    ).toBe(false);
    expect(
      isPlacementEstimateJson({ ...validJson, confidence: "0.72" }),
    ).toBe(false);
  });

  it("rejects when strand_levels is missing or null", () => {
    expect(
      isPlacementEstimateJson({
        overall_level: validJson.overall_level,
        confidence: validJson.confidence,
      }),
    ).toBe(false);
    expect(
      isPlacementEstimateJson({ ...validJson, strand_levels: null }),
    ).toBe(false);
  });
});

describe("fromPlacementEstimateJson", () => {
  it("hydrates wire shape into camelCase engine shape", () => {
    const result = fromPlacementEstimateJson(validJson);
    expect(result).toEqual({
      overallLevel: "3A",
      strandLevels: validJson.strand_levels,
      confidence: 0.72,
    });
  });

  it("preserves strand_levels reference (no deep clone)", () => {
    const result = fromPlacementEstimateJson(validJson);
    expect(result.strandLevels).toBe(validJson.strand_levels);
  });
});
