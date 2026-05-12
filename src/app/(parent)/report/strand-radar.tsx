// Strand Mastery Radar Chart for the parent diagnostic report.
//
// Reads the same StrandMastery[] array as <StrandMap>; renders it as a
// hexagonal radar (6 strands → 6 axes 60° apart). Gives the parent a
// gestalt view of strengths vs. focus areas; the bars below carry the
// precise per-strand percentages and band labels.
//
// Hand-rolled SVG — no charting library. Matches the placement-card
// gauge precedent (also hand-rolled SVG). Math is pure: each axis at
// angle (-90 + i*60)°, vertex distance = (percentage/100) * RADIUS.
// no_data strands render the vertex at the center (polygon dips in)
// with a greyed axis label.
//
// All sizing in SVG user units (viewBox 0 0 400 400). The container
// scales the SVG via CSS (w-full max-w-md); SVG math stays fixed.
//
// Print stylesheet: prints alongside the bars (RD8). Useful for
// instructor/tutor handoff; small visual, doesn't bloat the page.
//
// No section title (SR1) — radar pairs with the StrandMap section
// header below ("Mathematical Strengths"). Two visualizations of the
// same data; one shared label.

import { STRAND_ORDER, type StrandMastery } from "@/lib/report/strand-mastery";

import { SHORT_STRAND_LABELS, STRAND_LABELS } from "./strand-labels";

// =============================================================================
// Geometry constants — SVG internal coordinates.
//
// The hexagon is centered at (200, 200) with the original 400×400 reference
// frame. The viewBox extends 30 units of horizontal padding on each side so
// off-axis labels ("Operations" upper-right, "Geometry" lower-left, etc.)
// don't clip — Item #12 Phase 7.6. The grid/polygon math stays in the 0-400
// reference for stability; only the viewport widens.
// =============================================================================

const CENTER = 200;
const RADIUS = 130; // outer ring (100% mastery)
const LABEL_DISTANCE = 165; // center → axis label baseline
const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0] as const;

// viewBox padding: left/right only. The widest labels are on the diagonal
// axes (text-anchor start/end at x=343 / x=57) which can extend ~70 px
// horizontally from their anchor. 30 px each side covers "Operations" /
// "Fractions" / "Geometry" / "Data" at fontSize=14 with comfortable
// margin; the top/bottom labels (anchor=middle) fit in the original
// vertical extent.
const VIEWBOX_PAD_X = 30;
const VIEWBOX_MIN_X = -VIEWBOX_PAD_X;
const VIEWBOX_WIDTH = 400 + VIEWBOX_PAD_X * 2;
const VIEWBOX_HEIGHT = 400;

// =============================================================================
// Pure math — exported for test coverage (RD9). Tests assert axis
// ordering, sin/cos sign correctness, edge cases at 0% and 100%, and
// the no_data → center vertex behavior.
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

/** Maps a fixed distance on axis i to an SVG (x, y) point. Used for
 *  grid rings, axis lines, and label positioning. Axis 0 points up;
 *  subsequent axes rotate clockwise at 60° intervals. */
export function pointAtDistance(
  distance: number,
  axisIndex: number,
): { x: number; y: number } {
  const angleRad = ((axisIndex * 60 - 90) * Math.PI) / 180;
  return {
    x: CENTER + distance * Math.cos(angleRad),
    y: CENTER + distance * Math.sin(angleRad),
  };
}

// =============================================================================
// Internal helpers — SVG points formatting + per-axis label anchoring.
// =============================================================================

/** Joins axis-indexed distances into the "x1,y1 x2,y2 ..." string format
 *  the SVG <polygon points> attribute expects. */
function pointsString(distances: readonly number[]): string {
  return distances
    .map((d, i) => {
      const { x, y } = pointAtDistance(d, i);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Per-axis text-anchor + dominant-baseline so labels sit cleanly
 *  outside the hexagon. Top/bottom axes anchor middle; right side
 *  anchors start (text extends rightward); left side anchors end. */
function labelAnchor(axisIndex: number): {
  textAnchor: "start" | "middle" | "end";
  dominantBaseline: "alphabetic" | "middle" | "hanging";
} {
  switch (axisIndex) {
    case 0:
      return { textAnchor: "middle", dominantBaseline: "alphabetic" };
    case 1:
      return { textAnchor: "start", dominantBaseline: "alphabetic" };
    case 2:
      return { textAnchor: "start", dominantBaseline: "hanging" };
    case 3:
      return { textAnchor: "middle", dominantBaseline: "hanging" };
    case 4:
      return { textAnchor: "end", dominantBaseline: "hanging" };
    case 5:
      return { textAnchor: "end", dominantBaseline: "alphabetic" };
    default:
      return { textAnchor: "middle", dominantBaseline: "middle" };
  }
}

// =============================================================================
// Component
// =============================================================================

interface StrandRadarProps {
  rows: StrandMastery[]; // length always 6 in canonical STRAND_ORDER
}

export function StrandRadar({ rows }: StrandRadarProps) {
  // Polygon vertex distances per strand. no_data rows have percentage = 0
  // (helper guarantee), so the vertex naturally lands at the center —
  // no special-case branch needed for the polygon itself.
  const polygonDistances = rows.map(
    (row) => (Math.max(0, Math.min(100, row.percentage)) / 100) * RADIUS,
  );

  // Build a screen-reader summary listing each strand's percentage.
  // The SVG itself is decorative for AT users; the description gives
  // them the same data the sighted parent reads from the polygon.
  const ariaSummary =
    "Strand mastery: " +
    rows
      .map((row) =>
        row.band === "no_data"
          ? `${STRAND_LABELS[row.strand]} not assessed`
          : `${STRAND_LABELS[row.strand]} ${row.percentage} percent`,
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
          {/* Grid rings — concentric hexagons at 25/50/75/100%. */}
          {GRID_LEVELS.map((level) => (
            <polygon
              key={`grid-${level}`}
              points={pointsString(STRAND_ORDER.map(() => RADIUS * level))}
              fill="none"
              stroke="#F1F3FF"
              strokeWidth="1.5"
            />
          ))}

          {/* Axis lines — center to each outer vertex. */}
          {STRAND_ORDER.map((_, i) => {
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

          {/* Vertex dots — one per non-no_data strand. */}
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
                {SHORT_STRAND_LABELS[row.strand]}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
