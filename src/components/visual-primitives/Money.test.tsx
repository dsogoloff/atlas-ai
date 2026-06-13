import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Money } from "./Money";

describe("Money", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <Money
        kind="money"
        piles={[
          { cents: 50, count: 2 },
          { cents: 500, count: 1 },
        ]}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Money:");
    expect(html).toContain("50c");
    expect(html).toContain("$5");
  });

  it("handles edge/missing params gracefully", () => {
    const html = renderToString(<Money kind="money" piles={[]} />);
    expect(html).toContain("<svg");
  });
});
