// Array — rows × cols of evenly-spaced markers (multiplication / area).
//
// marker "dot" → circles (default), "square" → squares. Pure Server Component.

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type { ArraySpec, PrimitiveDisplayProps } from "./types";

const CELL = 28;
const PAD = 8;

export function ArrayGrid(props: ArraySpec & PrimitiveDisplayProps) {
  const { rows, cols, marker, color, className, ariaLabel } = props;
  const r = Math.max(0, Math.floor(rows));
  const c = Math.max(0, Math.floor(cols));

  const W = Math.max(CELL, c * CELL) + PAD * 2;
  const H = Math.max(CELL, r * CELL) + PAD * 2;
  const fill = accentToken(color);

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} ${H}`}
      className={"h-auto w-full max-w-[360px] " + (className ?? "")}
    >
      {Array.from({ length: r }, (_, ri) =>
        Array.from({ length: c }, (_, ci) => {
          const cx = PAD + ci * CELL + CELL / 2;
          const cy = PAD + ri * CELL + CELL / 2;
          return marker === "square" ? (
            <rect
              key={`${ri}-${ci}`}
              x={cx - CELL / 2 + 4}
              y={cy - CELL / 2 + 4}
              width={CELL - 8}
              height={CELL - 8}
              fill={fill}
            />
          ) : (
            <circle key={`${ri}-${ci}`} cx={cx} cy={cy} r={CELL / 2 - 5} fill={fill} />
          );
        }),
      )}
    </svg>
  );
}
