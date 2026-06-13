// Bar model — Singapore part/whole & comparison bars.
//
// Horizontal stacked bars, one row per BarRow, on a COMMON scale so lengths
// compare across rows. Optional brace bracket above a named row.
// Presentational, pure → Server Component (no "use client").

import { accentToken } from "./accent";
import { describeVisual } from "./describe";
import type { BarModelSpec, PrimitiveDisplayProps } from "./types";

const W = 400;
const LABEL_W = 64;
const PAD = 8;
const ROW_H = 34;
const ROW_GAP = 10;
const BRACE_H = 18;
const CAPTION_H = 22;
const INNER_W = W - LABEL_W - PAD * 2;

export function BarModel(props: BarModelSpec & PrimitiveDisplayProps) {
  const { rows, brace, caption, className, ariaLabel } = props;

  const totals = rows.map((r) =>
    r.segments.reduce((s, seg) => s + (seg.value > 0 ? seg.value : 0), 0),
  );
  const maxTotal = Math.max(1, ...totals);

  const topPad = brace ? BRACE_H + PAD : PAD;
  const bodyH = rows.length * ROW_H + Math.max(0, rows.length - 1) * ROW_GAP;
  const H = topPad + bodyH + (caption ? CAPTION_H : PAD);

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${W} ${H}`}
      className={"h-auto w-full max-w-[400px] " + (className ?? "")}
    >
      {rows.map((row, ri) => {
        const y = topPad + ri * (ROW_H + ROW_GAP);
        let x = LABEL_W + PAD;
        return (
          <g key={ri}>
            {row.label ? (
              <text
                x={LABEL_W}
                y={y + ROW_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="13"
                fill="var(--color-sam-navy)"
              >
                {row.label}
              </text>
            ) : null}
            {row.segments.map((seg, si) => {
              const w = (Math.max(0, seg.value) / maxTotal) * INNER_W;
              const segX = x;
              x += w;
              return (
                <g key={si}>
                  <rect
                    x={segX}
                    y={y}
                    width={w}
                    height={ROW_H}
                    fill={accentToken(seg.color)}
                    stroke="var(--color-sam-navy)"
                    strokeWidth="1"
                  />
                  {seg.label && w > 8 ? (
                    <text
                      x={segX + w / 2}
                      y={y + ROW_H / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="13"
                      fill="white"
                    >
                      {seg.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {brace && brace.row === ri ? (
              <g aria-hidden="true">
                <line
                  x1={LABEL_W + PAD}
                  y1={y - 6}
                  x2={LABEL_W + PAD + (totals[ri] / maxTotal) * INNER_W}
                  y2={y - 6}
                  stroke="var(--color-sam-navy)"
                  strokeWidth="1.5"
                />
                <line x1={LABEL_W + PAD} y1={y - 10} x2={LABEL_W + PAD} y2={y - 2} stroke="var(--color-sam-navy)" strokeWidth="1.5" />
                <line
                  x1={LABEL_W + PAD + (totals[ri] / maxTotal) * INNER_W}
                  y1={y - 10}
                  x2={LABEL_W + PAD + (totals[ri] / maxTotal) * INNER_W}
                  y2={y - 2}
                  stroke="var(--color-sam-navy)"
                  strokeWidth="1.5"
                />
                <text
                  x={LABEL_W + PAD + (totals[ri] / maxTotal) * INNER_W / 2}
                  y={y - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="var(--color-sam-navy)"
                >
                  {brace.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
      {caption ? (
        <text
          x={W / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize="13"
          fill="var(--color-sam-navy)"
        >
          {caption}
        </text>
      ) : null}
    </svg>
  );
}
