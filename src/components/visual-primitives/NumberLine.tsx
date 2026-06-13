// Number line — axis with arrowheads, ticks, point marks, and jump arcs.
//
// Ticks at min..max stepping by step (guarded). marks = coloured dots above
// the line; jumps = semicircular arcs above the line. Pure Server Component.

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type { NumberLineSpec, PrimitiveDisplayProps } from "./types";

const W = 420;
const PAD = 24;
const AXIS_Y = 110;
const INNER_W = W - PAD * 2;

export function NumberLine(props: NumberLineSpec & PrimitiveDisplayProps) {
  const { min, max, step, showTickLabels, marks, jumps, className, ariaLabel } =
    props;

  const span = max - min || 1;
  const xOf = (v: number) => PAD + ((v - min) / span) * INNER_W;

  // Build tick values, guarding step <= 0 → single segment (just ends).
  const ticks: number[] = [];
  if (step > 0) {
    for (let v = min; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  } else {
    ticks.push(min, max);
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} 140`}
      className={"h-auto w-full max-w-[420px] " + (className ?? "")}
    >
      {/* Jumps (arcs) drawn first, beneath marks. */}
      {jumps?.map((j, i) => {
        const x1 = xOf(j.from);
        const x2 = xOf(j.to);
        const r = Math.abs(x2 - x1) / 2;
        const mx = (x1 + x2) / 2;
        return (
          <g key={`j-${i}`} aria-hidden="true">
            <path
              d={`M ${x1} ${AXIS_Y} A ${r} ${r} 0 0 1 ${x2} ${AXIS_Y}`}
              fill="none"
              stroke="var(--color-sam-orange)"
              strokeWidth="2"
            />
            {j.label ? (
              <text x={mx} y={AXIS_Y - r - 4} textAnchor="middle" fontSize="12" fill="var(--color-sam-orange)">
                {j.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Axis with arrowheads. */}
      <line x1={PAD - 8} y1={AXIS_Y} x2={W - PAD + 8} y2={AXIS_Y} stroke="var(--color-sam-navy)" strokeWidth="2" />
      <polygon points={`${PAD - 8},${AXIS_Y} ${PAD - 1},${AXIS_Y - 5} ${PAD - 1},${AXIS_Y + 5}`} fill="var(--color-sam-navy)" />
      <polygon points={`${W - PAD + 8},${AXIS_Y} ${W - PAD + 1},${AXIS_Y - 5} ${W - PAD + 1},${AXIS_Y + 5}`} fill="var(--color-sam-navy)" />

      {/* Ticks + labels. */}
      {ticks.map((v, i) => {
        const x = xOf(v);
        return (
          <g key={`t-${i}`}>
            <line x1={x} y1={AXIS_Y - 6} x2={x} y2={AXIS_Y + 6} stroke="var(--color-sam-navy)" strokeWidth="1.5" />
            {showTickLabels !== false ? (
              <text x={x} y={AXIS_Y + 20} textAnchor="middle" fontSize="12" fill="var(--color-sam-navy)">
                {v}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Marks (dots above the line). */}
      {marks?.map((m, i) => {
        const x = xOf(m.value);
        return (
          <g key={`m-${i}`}>
            <circle cx={x} cy={AXIS_Y - 14} r="5" fill={accentToken(m.color ?? "teal")} />
            {m.label ? (
              <text x={x} y={AXIS_Y - 22} textAnchor="middle" fontSize="12" fill="var(--color-sam-navy)">
                {m.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
