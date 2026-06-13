import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FractionShape } from "./FractionShape";

describe("FractionShape", () => {
  it("renders a bar variant with valid params", () => {
    const html = renderToString(
      <FractionShape
        kind="fraction-shape"
        variant="bar"
        denominator={4}
        shaded={3}
        color="orange"
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Fraction bar: 3 of 4 parts shaded");
    expect(html).toContain("<rect");
  });

  it("renders a circle variant with index array", () => {
    const html = renderToString(
      <FractionShape
        kind="fraction-shape"
        variant="circle"
        denominator={6}
        shaded={[0, 2]}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(
      <FractionShape
        kind="fraction-shape"
        variant="bar"
        denominator={0}
        shaded={0}
      />,
    );
    expect(html).toContain("<svg");
  });
});
