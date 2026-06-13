// Money — Singapore coins & notes, one token per pile with a "× count" label.
//
// cents < 100 → coin circle ("5c/10c/20c/50c"); 100 → "$1" coin; 200/500/1000
// → note rectangle ("$2/$5/$10"). Labels via centsWord(). Pure Server Component.

import { centsWord, describeVisual } from "./describe";
import type { MoneySpec, PrimitiveDisplayProps } from "./types";

const SLOT_W = 90;
const TOP = 8;
const TOKEN_H = 60;
const LABEL_H = 22;

export function Money(props: MoneySpec & PrimitiveDisplayProps) {
  const { piles, className, ariaLabel } = props;

  const W = Math.max(SLOT_W, piles.length * SLOT_W);
  const H = TOP + TOKEN_H + LABEL_H + 8;

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} ${H}`}
      className={"h-auto w-full max-w-[400px] " + (className ?? "")}
    >
      {piles.map((pile, i) => {
        const cx = i * SLOT_W + SLOT_W / 2;
        const cy = TOP + TOKEN_H / 2;
        const isNote = pile.cents >= 200;
        return (
          <g key={i}>
            {isNote ? (
              <rect
                x={cx - 38}
                y={cy - 20}
                width={76}
                height={40}
                rx={4}
                fill="var(--color-sam-teal)"
                stroke="var(--color-sam-navy)"
                strokeWidth="1.5"
              />
            ) : (
              <circle
                cx={cx}
                cy={cy}
                r={26}
                fill="var(--color-sam-yellow)"
                stroke="var(--color-sam-navy)"
                strokeWidth="1.5"
              />
            )}
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="var(--color-sam-navy)">
              {centsWord(pile.cents)}
            </text>
            <text x={cx} y={TOP + TOKEN_H + 16} textAnchor="middle" fontSize="13" fill="var(--color-sam-navy)">
              {`× ${pile.count}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
