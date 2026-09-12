import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildMilestoneProperties,
  type AssessmentMilestoneUpdate,
} from "./syncContact";

// The three attempt properties do NOT exist in portal 245446396 yet. HubSpot
// rejects an ENTIRE PATCH containing one unknown property, so shipping these
// keys before the founder creates them would break the
// assessment_started_date / assessment_completed_date writes that work today —
// for every parent, not just re-takers. HUBSPOT_ATTEMPT_PROPERTIES_LIVE is the
// gate, and these tests are what keep it honest.

const BASE: AssessmentMilestoneUpdate = {
  accountId: "cdc2c196-eae4-4a71-ab72-2cf9cd455425",
  milestone: "completed",
  occurredAt: "2026-09-12T02:25:37.822Z",
  attempt: {
    attemptCount: 3,
    firstStartedAt: "2026-09-11T23:47:15.352Z",
    firstCompletedAt: "2026-09-11T23:54:00.584Z",
  },
};

const LATEST_MILLIS = new Date(BASE.occurredAt).getTime();
const FIRST_START_MILLIS = new Date("2026-09-11T23:47:15.352Z").getTime();
// first_assessment_completed_date is a HubSpot `date` (verified live
// 2026-09-12), so it is written as MIDNIGHT UTC of the completion day, not
// the raw instant. Its datetime sibling above keeps full precision.
// See attemptPropertyTypes.test.ts for the coercion itself.
const FIRST_DONE_MILLIS = Date.UTC(2026, 8, 11);

beforeEach(() => vi.stubEnv("HUBSPOT_ATTEMPT_PROPERTIES_LIVE", ""));
afterEach(() => vi.unstubAllEnvs());

describe("buildMilestoneProperties — schema gate OFF (default)", () => {
  it("writes ONLY the latest-wins milestone property", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    expect(props).toEqual({ assessment_completed_date: LATEST_MILLIS });
  });

  it("withholds every not-yet-created property, even with a full summary", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    for (const key of [
      "assessment_attempt_count",
      "first_assessment_started_date",
      "first_assessment_completed_date",
    ]) {
      expect(props).not.toHaveProperty(key);
    }
  });
});

describe("buildMilestoneProperties — schema gate ON", () => {
  beforeEach(() => vi.stubEnv("HUBSPOT_ATTEMPT_PROPERTIES_LIVE", "true"));

  it("adds the first-attempt dates and the attempt count", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    expect(props).toEqual({
      assessment_completed_date: LATEST_MILLIS,
      assessment_attempt_count: 3,
      first_assessment_started_date: FIRST_START_MILLIS,
      first_assessment_completed_date: FIRST_DONE_MILLIS,
    });
  });

  it("keeps the milestone property LATEST-wins, not first-wins", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    // The latest attempt's instant (full datetime precision), and the first
    // attempt's carried separately (floored to midnight — it is a `date`).
    expect(props.assessment_completed_date).toBe(LATEST_MILLIS);
    expect(props.first_assessment_completed_date).toBe(FIRST_DONE_MILLIS);
    expect(props.assessment_completed_date).not.toBe(
      props.first_assessment_completed_date,
    );
  });

  it("omits a first-attempt date that is genuinely absent", () => {
    const props = buildMilestoneProperties(
      {
        ...BASE,
        milestone: "started",
        attempt: {
          attemptCount: 0,
          firstStartedAt: "2026-09-11T23:47:15.352Z",
          firstCompletedAt: null,
        },
      },
      "assessment_started_date",
    );
    expect(props.assessment_attempt_count).toBe(0);
    expect(props).not.toHaveProperty("first_assessment_completed_date");
  });

  it("writes only the milestone property when no summary was supplied", () => {
    const { attempt: _drop, ...noSummary } = BASE;
    void _drop;
    const props = buildMilestoneProperties(noSummary, "assessment_completed_date");
    expect(props).toEqual({ assessment_completed_date: LATEST_MILLIS });
  });

  it("COMPLIANCE: emits no level, band or score key under any input", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    for (const key of Object.keys(props)) {
      expect(key).toMatch(
        /^(assessment_(started|completed)_date|assessment_attempt_count|first_assessment_(started|completed)_date)$/,
      );
    }
  });
});
