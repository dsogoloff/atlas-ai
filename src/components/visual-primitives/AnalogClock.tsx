// Analog clock — face, 12 hour ticks, hour + minute hands, centre dot.
// Hour hand advances with minutes. Negatives normalized. Pure Server Component.

import { describeVisual } from "./describe";
import type { AnalogClockSpec, PrimitiveDisplayProps } from "./types";

const SIZE = 200;
const C = SIZE / 2;
const R = SIZE / 2 - 8;

export function AnalogClock(props: AnalogClockSpec & PrimitiveDisplayProps) {
  const { hour, minute, className, ariaLabel } = props;
  const m = (((Math.floor(minute) % 60) + 60) % 60);
  const h = (((Math.floor(hour) % 12) + 12) % 12);

  const minuteAngle = (m / 60) * 360 - 90;
  const hourAngle = ((h + m / 60) / 12) * 360 - 90;

  const hand = (angleDeg: number, len: number) => ({
    x: C + len * Math.cos((angleDeg * Math.PI) / 180),
    y: C + len * Math.sin((angleDeg * Math.PI) / 180),
  });
  const hourEnd = hand(hourAngle, R * 0.5);
  const minEnd = hand(minuteAngle, R * 0.8);

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? describeVisual(props)}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={"h-auto w-full max-w-[220px] " + (className ?? "")}
    >
      <circle cx={C} cy={C} r={R} fill="white" stroke="var(--color-sam-navy)" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const x1 = C + (R - 8) * Math.cos(a);
        const y1 = C + (R - 8) * Math.sin(a);
        const x2 = C + R * Math.cos(a);
        const y2 = C + R * Math.sin(a);
        return (
          <line key={i} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} stroke="var(--color-sam-navy)" strokeWidth="2" />
        );
      })}
      <line x1={C} y1={C} x2={hourEnd.x.toFixed(2)} y2={hourEnd.y.toFixed(2)} stroke="var(--color-sam-navy)" strokeWidth="4" strokeLinecap="round" />
      <line x1={C} y1={C} x2={minEnd.x.toFixed(2)} y2={minEnd.y.toFixed(2)} stroke="var(--color-sam-teal)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={C} cy={C} r="4" fill="var(--color-sam-navy)" />
    </svg>
  );
}
