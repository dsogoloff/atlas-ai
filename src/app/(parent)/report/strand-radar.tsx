// Strand performance radar — parent Assessment Report.
//
// 3-axis triangular radar of the V2026 parent strands (number_algebra,
// measurement_geometry, statistics). Geometry is unchanged from the prior
// Stitch-era radar; the editorial reskin only changes colours / typography
// to the docs/atlas-sample-report.html palette (navy stroke + cyan fill,
// per-vertex colour-coding by mastery band, neutral grid).
//
// Hand-rolled SVG, no charting library. All sizing in SVG user units
// (viewBox 0 0 400 400). The container scales the SVG via CSS.

import type { ParentStrandMastery } from "@/lib/report/strand-mastery";
import { PARENT_STRAND_ORDER } from "@/lib/report/types";

import {
  PARENT_STRAND_LABELS,
  SHORT_PARENT_STRAND_LABELS,
} from "./strand-labels";

const CENTER = 200;
const RADIUS = 130; // outer ring (100% mastery)
const LABEL_DISTANCE = 165;
const AXIS_COUNT = 3;
const ANGLE_STEP_DEG = 360 / AXIS_COUNT;
const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0] as const;

const VIEWBOX_PAD_X = 30;
const VIEWBOX_MIN_X = -VIEWBOX_PAD_X;
const VIEWBOX_WIDTH = 400 + VIEWBOX_PAD_X * 2;
const VIEWBOX_HEIGHT = 400;

/** Maps a percentage on axis i to an SVG (x, y) point. */
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

function pointsString(distances: readonly number[]): string {
  return distances
    .map((d, i) => {
      const { x, y } = pointAtDistance(d, i);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

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

function vertexFill(band: ParentStrandMastery["band"]): string {
  switch (band) {
    case "progressing":
      return "var(--color-report-approaching)";
    case "area_of_focus":
      return "var(--color-report-developing)";
    case "no_data":
      return "var(--color-report-text-light)";
    case "mastery":
    default:
      return "var(--color-report-solid)";
  }
}

interface StrandRadarProps {
  rows: ParentStrandMastery[];
}

export function StrandRadar({ rows }: StrandRadarProps) {
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
    <div className="flex justify-center my-2 mb-9">
      <svg
        viewBox={`${VIEWBOX_MIN_X} 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="w-full max-w-[460px] h-auto overflow-visible"
        role="img"
        aria-label={ariaSummary}
      >
        {/* Grid triangles at 25/50/75/100%. */}
        {GRID_LEVELS.map((level) => (
          <polygon
            key={`grid-${level}`}
            points={pointsString(
              PARENT_STRAND_ORDER.map(() => RADIUS * level),
            )}
            fill="none"
            stroke="var(--color-report-border)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines. */}
        {PARENT_STRAND_ORDER.map((_, i) => {
          const outer = pointAtDistance(RADIUS, i);
          return (
            <line
              key={`axis-${i}`}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x.toFixed(2)}
              y2={outer.y.toFixed(2)}
              stroke="var(--color-report-border)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon — cyan fill, navy stroke. */}
        <polygon
          points={pointsString(polygonDistances)}
          fill="var(--color-report-cyan)"
          fillOpacity="0.14"
          stroke="var(--color-report-navy)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Vertex dots — colour-coded per band. */}
        {rows.map((row, i) => {
          if (row.band === "no_data") return null;
          const { x, y } = pointOnAxis(row.percentage, i);
          return (
            <circle
              key={`vertex-${row.strand}`}
              cx={x.toFixed(2)}
              cy={y.toFixed(2)}
              r="4.5"
              fill={vertexFill(row.band)}
              stroke="var(--color-report-paper-white)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Axis labels — short form, navy (greyed when no_data). */}
        {rows.map((row, i) => {
          const { x, y } = pointAtDistance(LABEL_DISTANCE, i);
          const { textAnchor, dominantBaseline } = labelAnchor(i);
          const labelColor =
            row.band === "no_data"
              ? "var(--color-report-text-light)"
              : "var(--color-report-text)";
          return (
            <text
              key={`label-${row.strand}`}
              x={x.toFixed(2)}
              y={y.toFixed(2)}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
              fontSize="12"
              fontWeight="500"
              fill={labelColor}
              style={{
                fontFamily: "var(--font-report-sans)",
                letterSpacing: "0.02em",
              }}
            >
              {SHORT_PARENT_STRAND_LABELS[row.strand]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
