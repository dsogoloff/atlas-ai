// Pure-helper unit test + a renderToString smoke test for ClickImageMulti.
// node env, no jsdom / testing-library — initial render only, no event sim.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClickImageMulti, selectManyAnswer } from "./ClickImageMulti";
import type { ClientLabeledItem } from "@/lib/questionPicker/types";

const tiles: ClientLabeledItem[] = [
  { id: "t1", label: "Apple", image: { url: "/1.png", alt: "fruit 1", required: true } },
  { id: "t2", label: "Car" },
  { id: "t3", label: "Hat" },
];

describe("selectManyAnswer", () => {
  it("wraps selected ids into an id-set AnswerValue, order preserved", () => {
    expect(selectManyAnswer(["t3", "t1"])).toEqual({
      type: "id-set",
      ids: ["t3", "t1"],
    });
  });

  it("wraps an empty selection", () => {
    expect(selectManyAnswer([])).toEqual({ type: "id-set", ids: [] });
  });
});

describe("ClickImageMulti render smoke", () => {
  it("renders one toggle button (aria-pressed) per tile", () => {
    const html = renderToString(
      <ClickImageMulti tiles={tiles} onSubmit={() => {}} />,
    );
    const toggles = html.match(/aria-pressed=/g) ?? [];
    expect(toggles).toHaveLength(3);
  });

  it("renders a tile image when present, label otherwise", () => {
    const html = renderToString(
      <ClickImageMulti tiles={tiles} onSubmit={() => {}} />,
    );
    expect(html).toContain('src="/1.png"');
    expect(html).toContain("Car");
  });

  it("renders a Submit button", () => {
    const html = renderToString(
      <ClickImageMulti tiles={tiles} onSubmit={() => {}} />,
    );
    expect(html).toContain("Submit");
  });
});
