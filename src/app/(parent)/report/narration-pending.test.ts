import { describe, expect, it } from "vitest";

import { isNarrationPending, NARRATION_WAIT_BOUND_MS } from "./narration-pending";

const COMPLETED = "2026-06-25T02:41:28.000Z";
const completedMs = Date.parse(COMPLETED);

describe("isNarrationPending — pre-narration interstitial gate", () => {
  it("is PENDING when a freshly-completed session has no narration row yet", () => {
    // Just completed, narration trigger hasn't written the row yet (~8s gap):
    // show the "preparing your report" interstitial instead of the shell.
    expect(isNarrationPending(false, COMPLETED, completedMs + 3_000)).toBe(true);
  });

  it("is NOT pending once a narration row exists (any terminal state)", () => {
    // The trigger writes the row once, at the end of generation — a present row
    // is terminal (ok / suppressed / failed), so the full report renders.
    expect(isNarrationPending(true, COMPLETED, completedMs + 3_000)).toBe(false);
  });

  it("is NOT pending after the wait bound elapses (failed / never-arriving narration)", () => {
    // A narration that fails or never lands must fall through to the existing
    // generic-lede report rather than trapping the parent on the interstitial.
    expect(
      isNarrationPending(false, COMPLETED, completedMs + NARRATION_WAIT_BOUND_MS + 1),
    ).toBe(false);
  });

  it("treats the bound as exclusive at the exact boundary", () => {
    expect(
      isNarrationPending(false, COMPLETED, completedMs + NARRATION_WAIT_BOUND_MS),
    ).toBe(false);
    expect(
      isNarrationPending(false, COMPLETED, completedMs + NARRATION_WAIT_BOUND_MS - 1),
    ).toBe(true);
  });

  it("is NOT pending when completed_at is null (no completion timestamp)", () => {
    expect(isNarrationPending(false, null, completedMs + 3_000)).toBe(false);
  });

  it("is NOT pending when completed_at is unparseable", () => {
    expect(isNarrationPending(false, "not-a-date", completedMs + 3_000)).toBe(false);
  });
});
