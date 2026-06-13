import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Shapes2D } from "./Shapes2D";

describe("Shapes2D", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <Shapes2D
        kind="shape-2d"
        shapes={[
          { shape: "triangle", label: "triangle", color: "teal" },
          { shape: "circle", label: "circle" },
        ]}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Shapes:");
    expect(html).toContain("triangle");
    expect(html).toContain("<polygon");
    expect(html).toContain("<circle");
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(<Shapes2D kind="shape-2d" shapes={[]} />);
    expect(html).toContain("<svg");
  });
});
