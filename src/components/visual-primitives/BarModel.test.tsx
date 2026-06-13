import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BarModel } from "./BarModel";

describe("BarModel", () => {
  it("renders with valid params", () => {
    const html = renderToString(
      <BarModel
        kind="bar-model"
        rows={[
          { label: "Alan", segments: [{ value: 6, label: "6", color: "teal" }] },
          {
            label: "Ben",
            segments: [
              { value: 6, label: "6" },
              { value: 4, label: "4", color: "orange" },
            ],
          },
        ]}
        brace={{ row: 1, label: "10" }}
        caption="Who has more?"
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Bar model");
    expect(html).toContain("Who has more?");
    expect(html).toContain("Alan");
  });

  it("handles edge/missing params gracefully", () => {
    expect(() =>
      renderToString(<BarModel kind="bar-model" rows={[]} />),
    ).not.toThrow();
    const html = renderToString(<BarModel kind="bar-model" rows={[]} />);
    expect(html).toContain("<svg");
  });
});
