import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NumberLine } from "./NumberLine";

describe("NumberLine", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <NumberLine
        kind="number-line"
        min={0}
        max={10}
        step={2}
        marks={[{ value: 4, label: "4", color: "teal" }]}
        jumps={[{ from: 0, to: 4, label: "+4" }]}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Number line from 0 to 10");
    expect(html).toContain("<polygon"); // arrowheads
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(
      <NumberLine kind="number-line" min={0} max={0} step={0} />,
    );
    expect(html).toContain("<svg");
  });
});
