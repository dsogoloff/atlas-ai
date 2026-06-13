// Place-value (base-10) blocks — thousands, hundreds, tens, ones grouped
// left→right with a caption under each present group. Pure Server Component.

import type { ReactNode } from "react";

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type { PlaceValueBlocksSpec, PrimitiveDisplayProps } from "./types";

const U = 6; // unit cell size
const TOP = 6;
const GROUP_GAP = 18;
const CAPTION_H = 18;

interface Group {
  caption: string;
  width: number;
  render: (x: number) => ReactNode;
}

export function PlaceValueBlocks(
  props: PlaceValueBlocksSpec & PrimitiveDisplayProps,
) {
  const { thousands, hundreds, tens, ones, color, className, ariaLabel } = props;
  const fill = accentToken(color);

  function grid(count: number, cols: number, caption: string): Group {
    const safe = Math.max(0, Math.floor(count));
    return {
      caption,
      width: cols * U,
      render: (gx) => (
        <>
          {Array.from({ length: safe }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            return (
              <rect
                key={i}
                x={gx + c * U}
                y={TOP + r * U}
                width={U - 1}
                height={U - 1}
                fill={fill}
                stroke="var(--color-sam-navy)"
                strokeWidth="0.5"
              />
            );
          })}
        </>
      ),
    };
  }

  const groups: Group[] = [];

  function repeat(count: number | undefined, builder: () => Group) {
    const safe = Math.max(0, Math.floor(count ?? 0));
    for (let k = 0; k < safe; k++) groups.push(builder());
  }

  repeat(thousands, () => ({
    caption: "thousands",
    width: 11 * U,
    render: (gx) => (
      <>
        <rect x={gx} y={TOP} width={10 * U} height={10 * U} fill={fill} stroke="var(--color-sam-navy)" strokeWidth="1" />
        <rect x={gx + 2} y={TOP - 2} width={10 * U} height={10 * U} fill={fill} fillOpacity="0.6" stroke="var(--color-sam-navy)" strokeWidth="1" />
      </>
    ),
  }));
  repeat(hundreds, () => grid(100, 10, "hundreds"));
  repeat(tens, () => grid(10, 1, "tens"));
  repeat(ones, () => grid(1, 1, "ones"));

  if (groups.length === 0) {
    return (
      <svg
        role="img"
        aria-label={ariaLabel ?? describeVisual(props)}
        viewBox="0 0 60 60"
        className={"h-auto w-full max-w-[360px] " + (className ?? "")}
      />
    );
  }

  let x = 6;
  const positions = groups.map((g) => {
    const gx = x;
    x += g.width + GROUP_GAP;
    return gx;
  });
  const W = x;
  const H = TOP + 10 * U + CAPTION_H + 6;

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} ${H}`}
      className={"h-auto w-full max-w-[400px] " + (className ?? "")}
    >
      {groups.map((g, i) => (
        <g key={i}>
          {g.render(positions[i])}
          <text
            x={positions[i] + g.width / 2}
            y={TOP + 10 * U + 14}
            textAnchor="middle"
            fontSize="9"
            fill="var(--color-sam-navy)"
          >
            {g.caption}
          </text>
        </g>
      ))}
    </svg>
  );
}
