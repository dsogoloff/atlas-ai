import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NumberBond } from "./NumberBond";

describe("NumberBond", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <NumberBond kind="number-bond" whole={10} parts={[6, 4]} />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Number bond");
    expect(html).toContain(">10<");
    expect(html).toContain(">6<");
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(
      <NumberBond kind="number-bond" whole="?" parts={["?"]} />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain(">?<");
  });
});
