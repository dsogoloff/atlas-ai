// Number bond — whole node connected down to its parts.
//
// Whole circle (navy) top-centre; straight connectors to a row of part circles
// (teal) beneath. "?" renders literally for unknowns. Pure Server Component.

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type {
  MaybeUnknown,
  NumberBondSpec,
  PrimitiveDisplayProps,
} from "./types";

const W = 320;
const R = 28;
const WHOLE_CY = 40;
const PART_CY = 150;

function show(v: MaybeUnknown): string {
  return v === "?" ? "?" : String(v);
}

export function NumberBond(props: NumberBondSpec & PrimitiveDisplayProps) {
  const { whole, parts, color, className, ariaLabel } = props;
  const n = Math.max(1, parts.length);
  const partColor = color ?? "teal";

  // Even horizontal distribution of part centres.
  const slot = W / n;
  const centres = parts.map((_, i) => slot * (i + 0.5));

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} ${PART_CY + R + 10}`}
      className={"h-auto w-full max-w-[320px] " + (className ?? "")}
    >
      {/* Connectors first so circles sit on top. */}
      {centres.map((cx, i) => (
        <line
          key={`c-${i}`}
          x1={W / 2}
          y1={WHOLE_CY}
          x2={cx}
          y2={PART_CY}
          stroke="var(--color-sam-navy)"
          strokeWidth="2"
          aria-hidden="true"
        />
      ))}

      <circle cx={W / 2} cy={WHOLE_CY} r={R} fill={accentToken("navy")} />
      <text
        x={W / 2}
        y={WHOLE_CY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fill="white"
      >
        {show(whole)}
      </text>

      {parts.map((p, i) => (
        <g key={`p-${i}`}>
          <circle cx={centres[i]} cy={PART_CY} r={R} fill={accentToken(partColor)} />
          <text
            x={centres[i]}
            y={PART_CY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="18"
            fill="white"
          >
            {show(p)}
          </text>
        </g>
      ))}
    </svg>
  );
}
