import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnalogClock } from "./AnalogClock";

describe("AnalogClock", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <AnalogClock kind="analog-clock" hour={3} minute={15} />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Analog clock showing 3:15");
    expect(html).toContain("<line");
  });

  it("handles edge/negative params gracefully", () => {
    const html = renderToString(
      <AnalogClock kind="analog-clock" hour={-1} minute={-5} />,
    );
    expect(html).toContain("<svg");
    // -1h, -5m normalize to 11:55.
    expect(html).toContain("Analog clock showing 11:55");
  });
});
