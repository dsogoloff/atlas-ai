// Strand Mastery Radar Chart for the parent diagnostic report.
//
// Phase 8 (Item #12): the radar now renders the 3 V2026 parent strands
// — number_algebra, measurement_geometry, statistics — as a triangular
// 3-axis radar. The 6-axis hexagon is gone. Sub-strand-level mastery is
// rolled up to parent-strand level upstream via rollUpToParentStrands;
// this component takes the 3-row result.
//
// Geometry is a permanent 3-axis triangle anchored at the top of the
// circle: axis 0 points up (number_algebra), axis 1 to lower-right
// (measurement_geometry, +120°), axis 2 to lower-left (statistics, -120°
// from axis 0). A parent strand with band='no_data' renders its vertex
// at center (polygon dips in to a degenerate edge) with a greyed label —
// same treatment the 6-axis radar applied per-strand.
//
// Hand-rolled SVG, no charting library. Pure math is preserved (mirrors
// the placement-card precedent). All sizing in SVG user units (viewBox
// 0 0 400 400). The container scales the SVG via CSS (w-full max-w-md).
//
// Print stylesheet: prints alongside the bars (RD8).
// SR1 lock: no section title inside the radar; the bar map's
// "Mathematical Strengths" header below covers both visualizations.

import type { ParentStrandMastery } from "@/lib/report/strand-mastery";
import { PARENT_STRAND_ORDER } from "@/lib/report/types";

import {
  PARENT_STRAND_LABELS,
  SHORT_PARENT_STRAND_LABELS,
} from "./strand-labels";

// =============================================================================
// Geometry constants — SVG internal coordinates.
//
// 3 axes at 120° apart, axis 0 pointing up. Same 400×400 reference frame
// the hexagon used so the bar-map and radar visually balance on the page.
// VIEWBOX_PAD_X widened slightly: the diagonal labels at -30° / 210° sit
// further from the central vertical than hexagon labels did.
// =============================================================================

const CENTER = 200;
const RADIUS = 130; // outer ring (100% mastery)
const LABEL_DISTANCE = 165; // center → axis label baseline
const AXIS_COUNT = 3;
const ANGLE_STEP_DEG = 360 / AXIS_COUNT; // 120
const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0] as const;

// viewBox padding: 30px each side covers SHORT_PARENT_STRAND_LABELS
// ("Number" / "Measure" / "Statistics") at fontSize=14 without clipping.
const VIEWBOX_PAD_X = 30;
const VIEWBOX_MIN_X = -VIEWBOX_PAD_X;
const VIEWBOX_WIDTH = 400 + VIEWBOX_PAD_X * 2;
const VIEWBOX_HEIGHT = 400;

// =============================================================================
// Pure math — exported for test coverage. Tests assert axis ordering,
// reflection invariants for 3-fold symmetry, equidistance, and edge
// cases at 0% and 100%.
// =============================================================================

/** Maps a percentage on axis i to an SVG (x, y) point. Clamps the
 *  percentage to [0, 100] before computing distance. */
export function pointOnAxis(
  percentage: number,
  axisIndex: number,
): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(100, percentage));
  return pointAtDistance((clamped / 100) * RADIUS, axisIndex);
}

/** Maps a fixed distance on axis i to an SVG (x, y) point. Axis 0 points
 *  up; subsequent axes rotate clockwise at ANGLE_STEP_DEG intervals. */
export function pointAtDistance(
  distance: number,
  axisIndex: number,
): { x: number; y: number } {
  const angleRad = ((axisIndex * ANGLE_STEP_DEG - 90) * Math.PI) / 180;
  return {
    x: CENTER + distance * Math.cos(angleRad),
    y: CENTER + distance * Math.sin(angleRad),
  };
}

// =============================================================================
// Internal helpers — SVG points + per-axis label anchoring.
// =============================================================================

function pointsString(distances: readonly number[]): string {
  return distances
    .map((d, i) => {
      const { x, y } = pointAtDistance(d, i);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Per-axis text-anchor + dominant-baseline so labels sit cleanly
 *  outside the triangle. Axis 0 (top): anchor middle, baseline above
 *  text. Axis 1 (lower-right): anchor start, baseline below text. Axis
 *  2 (lower-left): anchor end, baseline below text. */
function labelAnchor(axisIndex: number): {
  textAnchor: "start" | "middle" | "end";
  dominantBaseline: "alphabetic" | "middle" | "hanging";
} {
  switch (axisIndex) {
    case 0:
      return { textAnchor: "middle", dominantBaseline: "alphabetic" };
    case 1:
      return { textAnchor: "start", dominantBaseline: "hanging" };
    case 2:
      return { textAnchor: "end", dominantBaseline: "hanging" };
    default:
      return { textAnchor: "middle", dominantBaseline: "middle" };
  }
}

// =============================================================================
// Component
// =============================================================================

interface StrandRadarProps {
  /** Always length 3, in PARENT_STRAND_ORDER. Produced by
   *  rollUpToParentStrands(reportContent.strand_mastery). */
  rows: ParentStrandMastery[];
}

export function StrandRadar({ rows }: StrandRadarProps) {
  // Polygon vertex distances. no_data rows have percentage=0 → vertex at
  // center. With 3 axes a single no_data axis degenerates the polygon to
  // a line through the other two vertices; visually honest "triangle
  // missing a side."
  const polygonDistances = rows.map(
    (row) => (Math.max(0, Math.min(100, row.percentage)) / 100) * RADIUS,
  );

  const ariaSummary =
    "Strand mastery: " +
    rows
      .map((row) =>
        row.band === "no_data"
          ? `${PARENT_STRAND_LABELS[row.strand]} not assessed`
          : `${PARENT_STRAND_LABELS[row.strand]} ${row.percentage} percent`,
      )
      .join(", ");

  return (
    <section>
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30 flex justify-center">
        <svg
          viewBox={`${VIEWBOX_MIN_X} 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="w-full max-w-md h-auto"
          role="img"
          aria-label={ariaSummary}
        >
          {/* Grid rings — concentric triangles at 25/50/75/100%. */}
          {GRID_LEVELS.map((level) => (
            <polygon
              key={`grid-${level}`}
              points={pointsString(
                PARENT_STRAND_ORDER.map(() => RADIUS * level),
              )}
              fill="none"
              stroke="#F1F3FF"
              strokeWidth="1.5"
            />
          ))}

          {/* Axis lines — center to each outer vertex. */}
          {PARENT_STRAND_ORDER.map((_, i) => {
            const outer = pointAtDistance(RADIUS, i);
            return (
              <line
                key={`axis-${i}`}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x.toFixed(2)}
                y2={outer.y.toFixed(2)}
                stroke="#F1F3FF"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Data polygon. */}
          <polygon
            points={pointsString(polygonDistances)}
            fill="#06A77D"
            fillOpacity="0.25"
            stroke="#06A77D"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Vertex dots — one per non-no_data parent. */}
          {rows.map((row, i) => {
            if (row.band === "no_data") return null;
            const { x, y } = pointOnAxis(row.percentage, i);
            return (
              <circle
                key={`vertex-${row.strand}`}
                cx={x.toFixed(2)}
                cy={y.toFixed(2)}
                r="4"
                fill="#06A77D"
              />
            );
          })}

          {/* Axis labels (short form) — color-keyed: greyed when no_data. */}
          {rows.map((row, i) => {
            const { x, y } = pointAtDistance(LABEL_DISTANCE, i);
            const { textAnchor, dominantBaseline } = labelAnchor(i);
            const labelColor =
              row.band === "no_data" ? "#6B7280" : "#1B3A6B";
            return (
              <text
                key={`label-${row.strand}`}
                x={x.toFixed(2)}
                y={y.toFixed(2)}
                textAnchor={textAnchor}
                dominantBaseline={dominantBaseline}
                fontSize="14"
                fontWeight="600"
                fill={labelColor}
              >
                {SHORT_PARENT_STRAND_LABELS[row.strand]}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
