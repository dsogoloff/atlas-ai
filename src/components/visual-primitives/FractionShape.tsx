// Fraction shape — bar (vertical slices) or circle (pie sectors), with the
// indicated parts shaded. Pure Server Component.

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type { FractionShapeSpec, PrimitiveDisplayProps } from "./types";

const SIZE = 200;
const PAD = 10;

function shadedSet(shaded: number | number[], denom: number): Set<number> {
  if (Array.isArray(shaded)) return new Set(shaded);
  const n = Math.max(0, Math.min(denom, Math.floor(shaded)));
  return new Set(Array.from({ length: n }, (_, i) => i));
}

export function FractionShape(props: FractionShapeSpec & PrimitiveDisplayProps) {
  const { variant, denominator, shaded, color, className, ariaLabel } = props;
  const denom = Math.max(1, Math.floor(denominator));
  const set = shadedSet(shaded, denom);
  const fill = accentToken(color);

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={"h-auto w-full max-w-[220px] " + (className ?? "")}
    >
      {variant === "circle"
        ? Array.from({ length: denom }, (_, i) => {
            const cx = SIZE / 2;
            const cy = SIZE / 2;
            const rad = SIZE / 2 - PAD;
            if (denom === 1) {
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={rad}
                  fill={set.has(0) ? fill : "white"}
                  stroke="var(--color-sam-navy)"
                  strokeWidth="2"
                />
              );
            }
            const a0 = (i / denom) * 2 * Math.PI - Math.PI / 2;
            const a1 = ((i + 1) / denom) * 2 * Math.PI - Math.PI / 2;
            const x0 = cx + rad * Math.cos(a0);
            const y0 = cy + rad * Math.sin(a0);
            const x1 = cx + rad * Math.cos(a1);
            const y1 = cy + rad * Math.sin(a1);
            return (
              <path
                key={i}
                d={`M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${rad} ${rad} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`}
                fill={set.has(i) ? fill : "white"}
                stroke="var(--color-sam-navy)"
                strokeWidth="2"
              />
            );
          })
        : Array.from({ length: denom }, (_, i) => {
            const innerW = SIZE - PAD * 2;
            const sliceW = innerW / denom;
            const x = PAD + i * sliceW;
            return (
              <rect
                key={i}
                x={x}
                y={PAD + 40}
                width={sliceW}
                height={SIZE - PAD * 2 - 80}
                fill={set.has(i) ? fill : "white"}
                stroke="var(--color-sam-navy)"
                strokeWidth="2"
              />
            );
          })}
    </svg>
  );
}
