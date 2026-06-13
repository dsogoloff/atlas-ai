import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VisualPrimitive } from "./VisualPrimitive";

describe("VisualPrimitive dispatcher", () => {
  it("renders a number-bond spec", () => {
    const html = renderToString(
      <VisualPrimitive spec={{ kind: "number-bond", whole: 10, parts: [6, 4] }} />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Number bond");
  });

  it("renders a ten-frame spec", () => {
    const html = renderToString(
      <VisualPrimitive spec={{ kind: "ten-frame", filled: 5 }} />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Ten frame showing 5 counters");
  });

  it("forwards an explicit ariaLabel and className", () => {
    const html = renderToString(
      <VisualPrimitive
        spec={{ kind: "analog-clock", hour: 9, minute: 0 }}
        ariaLabel="Clock at nine o'clock"
        className="my-clock"
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("Clock at nine o");
    expect(html).toContain("my-clock");
  });
});
