// Unit tests for strand-radar's polygon-coordinate math.
//
// Two pure helpers: pointAtDistance (distance + axis → SVG point) and
// pointOnAxis (percentage + axis → SVG point, clamps to [0,100]).
// Tests assert the geometric invariants: axis 0 points up, opposite
// axes (0/3, 1/4, 2/5) are reflections through center, all six axes
// are equidistant from center at the same input distance, and
// pointOnAxis correctly maps percentage → distance with clamping.
//
// Tolerances: toBeCloseTo default precision (~0.01 SVG units, well
// under 1px at any rendered scale).
//
// Geometry under test (mirrored from strand-radar.tsx):
//   CENTER = 200, RADIUS = 130, 6 axes 60° apart starting at -90° (up).

import { describe, expect, it } from "vitest";

import { pointAtDistance, pointOnAxis } from "./strand-radar";

const CENTER = 200;
const RADIUS = 130;

// Euclidean distance from chart center to (x, y) — used by symmetry
// and equidistance assertions to avoid hardcoding per-axis x/y values.
function distanceFromCenter(p: { x: number; y: number }): number {
  return Math.sqrt((p.x - CENTER) ** 2 + (p.y - CENTER) ** 2);
}

describe("pointAtDistance", () => {
  it("returns center when distance is 0", () => {
    for (let i = 0; i < 6; i++) {
      const p = pointAtDistance(0, i);
      expect(p.x).toBeCloseTo(CENTER);
      expect(p.y).toBeCloseTo(CENTER);
    }
  });

  it("axis 0 points up (top of chart)", () => {
    const p = pointAtDistance(RADIUS, 0);
    expect(p.x).toBeCloseTo(CENTER);
    expect(p.y).toBeCloseTo(CENTER - RADIUS); // 70 in SVG y (which grows down)
  });

  it("axis 3 points down (bottom of chart)", () => {
    const p = pointAtDistance(RADIUS, 3);
    expect(p.x).toBeCloseTo(CENTER);
    expect(p.y).toBeCloseTo(CENTER + RADIUS); // 330
  });

  it("axes 1 and 4 are reflections through center", () => {
    // Axis 1 at angle -30°, axis 4 at angle 150° — 180° apart.
    // Midpoint of any two reflected-through-center points is the center.
    const a = pointAtDistance(RADIUS, 1);
    const b = pointAtDistance(RADIUS, 4);
    expect((a.x + b.x) / 2).toBeCloseTo(CENTER);
    expect((a.y + b.y) / 2).toBeCloseTo(CENTER);
  });

  it("axes 2 and 5 are reflections through center", () => {
    // Axis 2 at angle 30°, axis 5 at angle 210° — 180° apart.
    const a = pointAtDistance(RADIUS, 2);
    const b = pointAtDistance(RADIUS, 5);
    expect((a.x + b.x) / 2).toBeCloseTo(CENTER);
    expect((a.y + b.y) / 2).toBeCloseTo(CENTER);
  });

  it("all 6 axes are equidistant from center at the same input distance", () => {
    // Regular-hexagon invariant: every vertex sits at the same radius.
    // Catches sign errors on any single axis that hardcoded per-axis
    // tests would miss (a flipped sign still matches its expected value
    // but breaks this aggregate check).
    for (let i = 0; i < 6; i++) {
      const p = pointAtDistance(RADIUS, i);
      expect(distanceFromCenter(p)).toBeCloseTo(RADIUS);
    }
  });
});

describe("pointOnAxis", () => {
  it("returns center at 0% (vertex at chart origin)", () => {
    for (let i = 0; i < 6; i++) {
      const p = pointOnAxis(0, i);
      expect(p.x).toBeCloseTo(CENTER);
      expect(p.y).toBeCloseTo(CENTER);
    }
  });

  it("returns outer ring vertex at 100%", () => {
    // At 100%, distance equals RADIUS — vertex sits on the outer ring.
    for (let i = 0; i < 6; i++) {
      const p = pointOnAxis(100, i);
      expect(distanceFromCenter(p)).toBeCloseTo(RADIUS);
    }
  });

  it("returns midpoint at 50%", () => {
    // At 50%, distance equals RADIUS/2 — halfway from center to outer.
    for (let i = 0; i < 6; i++) {
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
