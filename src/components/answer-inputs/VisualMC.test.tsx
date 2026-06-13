// Pure-helper unit test + a renderToString smoke test for VisualMC.
// node env, no jsdom / testing-library — initial render only, no event sim.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VisualMC, selectIndexAnswer } from "./VisualMC";
import type { VisualMCSpec } from "./types";

describe("selectIndexAnswer", () => {
  it("wraps an index into an mc-index AnswerValue", () => {
    expect(selectIndexAnswer(0)).toEqual({ type: "mc-index", index: 0 });
    expect(selectIndexAnswer(2)).toEqual({ type: "mc-index", index: 2 });
  });
});

describe("VisualMC render smoke", () => {
  const spec: VisualMCSpec = {
    kind: "visual-mc",
    ariaLabel: "Which bar shows 6?",
    options: [
      {
        id: "opt-a",
        visual: {
          kind: "bar-model",
          rows: [{ segments: [{ value: 6, label: "6" }] }],
        },
      },
      {
        id: "opt-b",
        visual: {
          kind: "bar-model",
          rows: [{ segments: [{ value: 4, label: "4" }] }],
        },
      },
    ],
  };

  it("renders an svg from the nested visual primitive", () => {
    const html = renderToString(<VisualMC {...spec} />);
    expect(html).toContain("<svg");
  });

  it("renders one selectable radio per option", () => {
    const html = renderToString(<VisualMC {...spec} />);
    const radios = html.match(/role="radio"/g) ?? [];
    expect(radios).toHaveLength(2);
  });
});
