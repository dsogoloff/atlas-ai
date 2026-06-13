import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ArrayGrid } from "./ArrayGrid";

describe("ArrayGrid", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <ArrayGrid kind="array" rows={3} cols={4} marker="dot" color="teal" />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Array of 3 rows by 4 columns");
    expect(html).toContain("<circle");
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(<ArrayGrid kind="array" rows={0} cols={0} />);
    expect(html).toContain("<svg");
  });
});
