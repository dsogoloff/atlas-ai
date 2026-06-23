// renderToString smoke tests for QuestionShell. node env, no jsdom — initial
// render only. QuestionMascot (framer-motion + PNG modules the node env doesn't
// transform) and QuestionImage (next/image) are stubbed; the mascot stub emits a
// sentinel so we can assert the in-question footer mascot is MOUNTED in BOTH tier
// branches — the behavior under test (the mascot is now shown for every tier,
// not just K-4).
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const MASCOT_SENTINEL = "[[question-mascot]]";

vi.mock("./QuestionMascot", () => ({
  QuestionMascot: () => MASCOT_SENTINEL,
}));
vi.mock("./QuestionImage", () => ({
  QuestionImage: () => null,
}));

import { QuestionShell } from "./QuestionShell";
import type { ProgressDisplay } from "@/lib/display/progress";

const progress: ProgressDisplay = {
  questionNumber: 1,
  maxQuestions: 15,
  copy: "Question 1 of up to 15",
  percent: 7,
};

function render(tier: "K_4" | "G5_8") {
  return renderToString(
    <QuestionShell
      prompt="2 + 2 = ?"
      tier={tier}
      progress={progress}
      celebrateTick={0}
    >
      <div>answer input</div>
    </QuestionShell>,
  );
}

describe("QuestionShell in-question mascot", () => {
  it("renders the footer mascot for K_4", () => {
    const html = render("K_4");
    expect(html).toContain(MASCOT_SENTINEL);
    expect(html).toContain("<footer");
  });

  it("renders the footer mascot for G5_8 too (extended to all tiers)", () => {
    const html = render("G5_8");
    expect(html).toContain(MASCOT_SENTINEL);
    expect(html).toContain("<footer");
  });
});
