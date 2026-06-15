// Pure-helper unit test + a renderToString smoke test for ClickImageSingle.
// node env, no jsdom / testing-library — initial render only, no event sim.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClickImageSingle, selectOneAnswer } from "./ClickImageSingle";
import type { ClientLabeledItem } from "@/lib/questionPicker/types";

const tiles: ClientLabeledItem[] = [
  { id: "tile-a", label: "Triangle", image: { url: "/a.png", alt: "shape A", required: true } },
  { id: "tile-b", label: "Square", image: { url: "/b.png", alt: "shape B", required: true } },
  { id: "tile-c", label: "Circle" },
];

describe("selectOneAnswer", () => {
  it("wraps a single id into a one-element id-set AnswerValue", () => {
    expect(selectOneAnswer("tile-b")).toEqual({ type: "id-set", ids: ["tile-b"] });
  });
});

describe("ClickImageSingle render smoke", () => {
  it("renders one selectable radio per tile", () => {
    const html = renderToString(
      <ClickImageSingle tiles={tiles} onSubmit={() => {}} />,
    );
    const radios = html.match(/role="radio"/g) ?? [];
    expect(radios).toHaveLength(3);
  });

  it("renders a tile image when present and the label when absent", () => {
    const html = renderToString(
      <ClickImageSingle tiles={tiles} onSubmit={() => {}} />,
    );
    expect(html).toContain('src="/a.png"');
    expect(html).toContain('alt="shape A"');
    // tile-c has no image → its text label appears
    expect(html).toContain("Circle");
  });

  it("renders a Submit button", () => {
    const html = renderToString(
      <ClickImageSingle tiles={tiles} onSubmit={() => {}} />,
    );
    expect(html).toContain("Submit");
  });
});
