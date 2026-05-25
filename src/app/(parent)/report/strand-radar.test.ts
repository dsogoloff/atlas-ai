// Unit tests for strand-radar's polygon-coordinate math (Phase 8 — 3 axes).
//
// Geometry under test (mirrored from strand-radar.tsx):
//   CENTER = 200, RADIUS = 130, 3 axes at 120° apart starting at -90° (up).
//
// Axis 0: up (angle -90° → (200, 200 - 130))
// Axis 1: lower-right (angle 30°)
// Axis 2: lower-left (angle 150°)
//
// Invariants asserted:
//   * Axis 0 points up, axis 1 is mirrored across the vertical axis by
//     axis 2 (3-fold symmetry).
//   * All three vertices at the same distance are equidistant from
//     center (regular-triangle invariant).
//   * pointOnAxis clamps to [0, 100].

import { describe, expect, it } from "vitest";

import { pointAtDistance, pointOnAxis } from "./strand-radar";

const CENTER = 200;
const RADIUS = 130;

function distanceFromCenter(p: { x: number; y: number }): number {
  return Math.sqrt((p.x - CENTER) ** 2 + (p.y - CENTER) ** 2);
}

describe("pointAtDistance (3-axis)", () => {
  it("returns center when distance is 0", () => {
    for (let i = 0; i < 3; i++) {
      const p = pointAtDistance(0, i);
      expect(p.x).toBeCloseTo(CENTER);
      expect(p.y).toBeCloseTo(CENTER);
    }
  });

  it("axis 0 points up (top of chart)", () => {
    const p = pointAtDistance(RADIUS, 0);
    expect(p.x).toBeCloseTo(CENTER);
    expect(p.y).toBeCloseTo(CENTER - RADIUS); // SVG y grows down
  });

  it("axes 1 and 2 are mirrored across the vertical axis (3-fold symmetry)", () => {
    // Axis 1 at +30°, axis 2 at +150° — symmetric about x = CENTER.
    const a = pointAtDistance(RADIUS, 1);
    const b = pointAtDistance(RADIUS, 2);
    // x-coordinates are equidistant from CENTER on opposite sides.
    expect((a.x + b.x) / 2).toBeCloseTo(CENTER);
    // y-coordinates are equal (both axes lie below center at the same height).
    expect(a.y).toBeCloseTo(b.y);
  });

  it("all 3 vertices are equidistant from center at the same input distance", () => {
    // Regular-triangle invariant: every vertex sits at the same radius.
    for (let i = 0; i < 3; i++) {
      const p = pointAtDistance(RADIUS, i);
      expect(distanceFromCenter(p)).toBeCloseTo(RADIUS);
    }
  });
});

describe("pointOnAxis (3-axis)", () => {
  it("returns center at 0% (vertex at chart origin)", () => {
    for (let i = 0; i < 3; i++) {
      const p = pointOnAxis(0, i);
      expect(p.x).toBeCloseTo(CENTER);
      expect(p.y).toBeCloseTo(CENTER);
    }
  });

  it("returns outer ring vertex at 100%", () => {
    for (let i = 0; i < 3; i++) {
      const p = pointOnAxis(100, i);
      expect(distanceFromCenter(p)).toBeCloseTo(RADIUS);
    }
  });

  it("returns midpoint at 50%", () => {
    for (let i = 0; i < 3; i++) {
      const p = pointOnAxis(50, i);
      expect(distanceFromCenter(p)).toBeCloseTo(RADIUS / 2);
    }
  });

  it("clamps negative percentages to 0% (vertex at center)", () => {
    const p = pointOnAxis(-10, 0);
    expect(p.x).toBeCloseTo(CENTER);
    expect(p.y).toBeCloseTo(CENTER);
  });

  it("clamps percentages above 100 to 100% (vertex at outer ring)", () => {
    const p = pointOnAxis(150, 0);
    expect(p.x).toBeCloseTo(CENTER);
    expect(p.y).toBeCloseTo(CENTER - RADIUS); // top axis at 100%
  });
});
