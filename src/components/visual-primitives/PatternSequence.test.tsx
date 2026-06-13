import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PatternSequence } from "./PatternSequence";

describe("PatternSequence", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <PatternSequence
        kind="pattern-sequence"
        items={[
          { type: "shape", shape: "circle", color: "teal" },
          { type: "number", value: 3 },
          { type: "blank" },
        ]}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Pattern:");
    expect(html).toContain(">3<");
    expect(html).toContain(">?<");
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(
      <PatternSequence kind="pattern-sequence" items={[]} />,
    );
    expect(html).toContain("<svg");
  });
});
