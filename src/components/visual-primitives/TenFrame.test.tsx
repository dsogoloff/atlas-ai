import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TenFrame } from "./TenFrame";

describe("TenFrame", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <TenFrame kind="ten-frame" filled={7} color="teal" />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Ten frame showing 7 counters");
    expect(html).toContain("<circle");
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(<TenFrame kind="ten-frame" filled={0} />);
    expect(html).toContain("<svg");
    // 0 filled → still a valid frame of outlined cells, no counters.
    expect(html).toContain("<rect");
  });
});
