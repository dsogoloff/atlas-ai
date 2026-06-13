// Simple 2D shapes — each shape in `shapes[]` rendered in a row with its
// optional label below. Regular polygons computed from a centre + radius.
// Pure Server Component.

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type {
  PrimitiveDisplayProps,
  Shape2DSpec,
  ShapeName,
} from "./types";

const SLOT = 90;
const TOP = 8;
const R = 34;
const LABEL_H = 22;

function regularPolygon(cx: number, cy: number, r: number, n: number): string {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function shapeNode(shape: ShapeName, cx: number, cy: number, fill: string) {
  const common = { fill, stroke: "var(--color-sam-navy)", strokeWidth: 1.5 };
  switch (shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={R} {...common} />;
    case "square":
      return <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} {...common} />;
    case "rectangle":
      return <rect x={cx - R} y={cy - R * 0.6} width={R * 2} height={R * 1.2} {...common} />;
    case "triangle":
      return <polygon points={regularPolygon(cx, cy, R, 3)} {...common} />;
    case "pentagon":
      return <polygon points={regularPolygon(cx, cy, R, 5)} {...common} />;
    case "hexagon":
      return <polygon points={regularPolygon(cx, cy, R, 6)} {...common} />;
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

export function Shapes2D(props: Shape2DSpec & PrimitiveDisplayProps) {
  const { shapes, className, ariaLabel } = props;
  const W = Math.max(SLOT, shapes.length * SLOT);
  const H = TOP + R * 2 + LABEL_H + 8;

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} ${H}`}
      className={"h-auto w-full max-w-[400px] " + (className ?? "")}
    >
      {shapes.map((s, i) => {
        const cx = i * SLOT + SLOT / 2;
        const cy = TOP + R;
        return (
          <g key={i}>
            {shapeNode(s.shape, cx, cy, accentToken(s.color))}
            {s.label ? (
              <text x={cx} y={TOP + R * 2 + 16} textAnchor="middle" fontSize="12" fill="var(--color-sam-navy)">
                {s.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
