// Dispatcher — maps a VisualPrimitiveSpec to its renderer, forwarding the
// optional className / ariaLabel. Exhaustive switch with a `never` default.

import { AnalogClock } from "./AnalogClock";
import { ArrayGrid } from "./ArrayGrid";
import { BarModel } from "./BarModel";
import { FractionShape } from "./FractionShape";
import { Money } from "./Money";
import { NumberBond } from "./NumberBond";
import { NumberLine } from "./NumberLine";
import { PatternSequence } from "./PatternSequence";
import { PlaceValueBlocks } from "./PlaceValueBlocks";
import { Shapes2D } from "./Shapes2D";
import { TenFrame } from "./TenFrame";
import type { VisualPrimitiveSpec } from "./types";

export function VisualPrimitive({
  spec,
  className,
  ariaLabel,
}: {
  spec: VisualPrimitiveSpec;
  className?: string;
  ariaLabel?: string;
}) {
  switch (spec.kind) {
    case "bar-model":
      return <BarModel {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />;
    case "number-bond":
      return <NumberBond {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />;
    case "ten-frame":
      return <TenFrame {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />;
    case "place-value-blocks":
      return (
        <PlaceValueBlocks {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />
      );
    case "number-line":
      return <NumberLine {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />;
    case "array":
      return <ArrayGrid {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />;
    case "fraction-shape":
      return (
        <FractionShape {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />
      );
    case "analog-clock":
      return (
        <AnalogClock {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />
      );
    case "money":
      return <Money {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />;
    case "shape-2d":
      return <Shapes2D {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />;
    case "pattern-sequence":
      return (
        <PatternSequence {...spec} className={className} ariaLabel={ariaLabel ?? spec.ariaLabel} />
      );
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}
