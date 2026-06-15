// Pure-helper unit test + a renderToString smoke test for ImageOrdering.
// node env, no jsdom / testing-library — initial render only, no event sim.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ImageOrdering, orderToAnswer } from "./ImageOrdering";
import type { ClientLabeledItem } from "@/lib/questionPicker/types";

const tiles: ClientLabeledItem[] = [
  { id: "s1", label: "Step 1", image: { url: "/s1.png", alt: "first", required: true } },
  { id: "s2", label: "Step 2" },
  { id: "s3", label: "Step 3" },
];

describe("orderToAnswer", () => {
  it("wraps an id sequence into an ordered-ids AnswerValue", () => {
    expect(orderToAnswer(["s2", "s1", "s3"])).toEqual({
      type: "ordered-ids",
      ids: ["s2", "s1", "s3"],
    });
  });
});

describe("ImageOrdering render smoke", () => {
  it("renders one reorderable item per tile", () => {
    const html = renderToString(
      <ImageOrdering tiles={tiles} onSubmit={() => {}} />,
    );
    const items = html.match(/aria-roledescription="reorderable item"/g) ?? [];
    expect(items).toHaveLength(3);
  });

  it("renders a tile image when present, label otherwise", () => {
    const html = renderToString(
      <ImageOrdering tiles={tiles} onSubmit={() => {}} />,
    );
    expect(html).toContain('src="/s1.png"');
    expect(html).toContain("Step 2");
  });

  it("renders a Submit button", () => {
    const html = renderToString(
      <ImageOrdering tiles={tiles} onSubmit={() => {}} />,
    );
    expect(html).toContain("Submit");
  });
});
