import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlaceValueBlocks } from "./PlaceValueBlocks";

describe("PlaceValueBlocks", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <PlaceValueBlocks
        kind="place-value-blocks"
        hundreds={2}
        tens={3}
        ones={4}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("hundreds");
    expect(html).toContain("tens");
    expect(html).toContain("ones");
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(
      <PlaceValueBlocks kind="place-value-blocks" />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Place-value blocks");
  });
});
