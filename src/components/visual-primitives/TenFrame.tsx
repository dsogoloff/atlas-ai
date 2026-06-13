// Ten frame — 2×5 grids of counters, filled left→right, top row first.
//
// Multiple frames stack vertically. Filled cells get a coloured counter;
// empty cells are outlined. Pure Server Component.

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type { PrimitiveDisplayProps, TenFrameSpec } from "./types";

const CELL = 34;
const COLS = 5;
const ROWS = 2;
const FRAME_GAP = 12;
const PAD = 4;
const FRAME_W = COLS * CELL;
const FRAME_H = ROWS * CELL;

export function TenFrame(props: TenFrameSpec & PrimitiveDisplayProps) {
  const { filled, frames, color, className, ariaLabel } = props;
  const safeFilled = Math.max(0, Math.floor(filled || 0));
  const frameCount = Math.max(
    1,
    Math.floor(frames ?? Math.max(1, Math.ceil(safeFilled / 10))),
  );

  const W = FRAME_W + PAD * 2;
  const H = frameCount * FRAME_H + (frameCount - 1) * FRAME_GAP + PAD * 2;

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} ${H}`}
      className={"h-auto w-full max-w-[220px] " + (className ?? "")}
    >
      {Array.from({ length: frameCount }, (_, f) => {
        const fy = PAD + f * (FRAME_H + FRAME_GAP);
        return (
          <g key={`f-${f}`}>
            {Array.from({ length: ROWS * COLS }, (_, idx) => {
              const r = Math.floor(idx / COLS);
              const c = idx % COLS;
              const x = PAD + c * CELL;
              const y = fy + r * CELL;
              const cellIndex = f * 10 + idx;
              const isFilled = cellIndex < safeFilled;
              return (
                <g key={`c-${idx}`}>
                  <rect
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    fill="white"
                    stroke="var(--color-sam-navy)"
                    strokeWidth="1.5"
                  />
                  {isFilled ? (
                    <circle
                      cx={x + CELL / 2}
                      cy={y + CELL / 2}
                      r={CELL / 2 - 5}
                      fill={accentToken(color)}
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
