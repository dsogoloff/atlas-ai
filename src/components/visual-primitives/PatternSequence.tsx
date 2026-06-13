// Pattern sequence — items left→right: shape → small shape; number → numeral;
// blank → dashed box containing "?". Even spacing. Pure Server Component.

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type {
  PatternItem,
  PatternSequenceSpec,
  PrimitiveDisplayProps,
  ShapeName,
} from "./types";

const SLOT = 64;
const TOP = 8;
const R = 22;

function regularPolygon(cx: number, cy: number, r: number, n: number): string {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function smallShape(shape: ShapeName, cx: number, cy: number, fill: string) {
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

function itemNode(item: PatternItem, cx: number, cy: number) {
  switch (item.type) {
    case "shape":
      return smallShape(item.shape, cx, cy, accentToken(item.color));
    case "number":
      return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="28" fill="var(--color-sam-navy)">
          {item.value}
        </text>
      );
    case "blank":
      return (
        <g>
          <rect
            x={cx - R}
            y={cy - R}
            width={R * 2}
            height={R * 2}
            fill="white"
            stroke="var(--color-sam-navy)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="24" fill="var(--color-sam-navy)">
            ?
          </text>
        </g>
      );
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

export function PatternSequence(
  props: PatternSequenceSpec & PrimitiveDisplayProps,
) {
  const { items, className, ariaLabel } = props;
  const W = Math.max(SLOT, items.length * SLOT);
  const H = TOP + R * 2 + 8;

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} ${H}`}
      className={"h-auto w-full max-w-[420px] " + (className ?? "")}
    >
      {items.map((item, i) => (
        <g key={i}>{itemNode(item, i * SLOT + SLOT / 2, TOP + R)}</g>
      ))}
    </svg>
  );
}
