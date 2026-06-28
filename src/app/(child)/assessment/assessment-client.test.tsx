// renderToString gating tests for AssessmentClient's pre-start handoff gate.
// node env, no jsdom — initial render only (no effects fire, so startSession is
// never called). The session's initial state is "starting", so the first render
// is the pre-start gate. We mock only the heavy leaf screens that this gate
// never reaches (they pull in PNG/framer-motion modules the node env can't
// transform); the gate's own screens — DevTestModeChooser, ChildHandoff,
// ParentIntro — render for real so we assert the flag-conditional branch.

import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./components/Welcome", () => ({ Welcome: () => null }));
vi.mock("./components/QuestionShell", () => ({ QuestionShell: () => null }));
vi.mock("./components/QuestionTimer", () => ({ QuestionTimer: () => null }));
vi.mock("./components/CompletionScreen", () => ({
  CompletionScreen: () => null,
}));
vi.mock("./components/ResumeBanner", () => ({ ResumeBanner: () => null }));
vi.mock("./components/ErrorPanel", () => ({ ErrorPanel: () => null }));
vi.mock("./lib/api", () => ({
  startSession: vi.fn(),
  submitResponse: vi.fn(),
}));

import { AssessmentClient } from "./assessment-client";

function render(comprehensivePilotEnabled: boolean) {
  return renderToString(
    <AssessmentClient
      childId="child-1"
      childName="Maya Chen"
      tier="K_4"
      comprehensivePilotEnabled={comprehensivePilotEnabled}
    />,
  )
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "'");
}

describe("AssessmentClient pre-start handoff gate", () => {
  it("flag OFF (production): renders the child handoff, no test-type chooser", () => {
    const html = render(false);
    expect(html).toContain("Pass the screen to your child");
    expect(html).toContain("Hand the device to your child to begin.");
    // No chooser surface — short is the only production path.
    expect(html).not.toContain("Choose test type");
    expect(html).not.toContain('type="radio"');
  });

  it("flag ON (DEV/QA): keeps the test-type chooser, no handoff", () => {
    const html = render(true);
    expect(html).toContain("Choose test type");
    expect(html).toContain('type="radio"'); // short / comprehensive radios
    expect(html).not.toContain("Pass the screen to your child");
  });
});
