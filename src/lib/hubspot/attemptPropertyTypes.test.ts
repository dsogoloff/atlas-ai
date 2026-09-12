import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  ATTEMPT_PROPERTIES,
  ATTEMPT_PROPERTY_TYPES,
  buildMilestoneProperties,
  toHubspotDateValue,
  toUtcMidnightMillis,
  type AssessmentMilestoneUpdate,
} from "./syncContact";

// Property TYPES read from the live portal (245446396) on 2026-09-12:
//   first_assessment_started_date   = datetime
//   first_assessment_completed_date = date        <-- the asymmetry
//   assessment_attempt_count        = number
//
// A HubSpot `date` property accepts ONLY midnight-UTC epoch millis. Handing it
// a real timestamp rejects the ENTIRE PATCH, which would also take down the
// assessment_started_date / assessment_completed_date writes travelling in the
// same request — for every parent, not just re-takers.

const DAY_MS = 86_400_000;

/** A deliberately awkward real instant: late in the UTC day, sub-second
 *  precision. This is Olga Nekrasova's genuine first completion. */
const REAL_TIMESTAMP = "2026-09-11T23:54:00.584Z";
const REAL_START = "2026-09-11T23:47:15.352Z";

const BASE: AssessmentMilestoneUpdate = {
  accountId: "cdc2c196-eae4-4a71-ab72-2cf9cd455425",
  milestone: "completed",
  occurredAt: "2026-09-12T02:25:37.822Z",
  attempt: {
    attemptCount: 3,
    firstStartedAt: REAL_START,
    firstCompletedAt: REAL_TIMESTAMP,
  },
};

beforeEach(() => vi.stubEnv("HUBSPOT_ATTEMPT_PROPERTIES_LIVE", "true"));
afterEach(() => vi.unstubAllEnvs());

describe("ATTEMPT_PROPERTY_TYPES", () => {
  it("records the live portal types, including the date/datetime asymmetry", () => {
    expect(ATTEMPT_PROPERTY_TYPES[ATTEMPT_PROPERTIES.firstStartedAt]).toBe(
      "datetime",
    );
    expect(ATTEMPT_PROPERTY_TYPES[ATTEMPT_PROPERTIES.firstCompletedAt]).toBe(
      "date",
    );
    expect(ATTEMPT_PROPERTY_TYPES[ATTEMPT_PROPERTIES.attemptCount]).toBe("number");
  });

  it("declares a type for every attempt property that can be written", () => {
    for (const name of Object.values(ATTEMPT_PROPERTIES)) {
      expect(ATTEMPT_PROPERTY_TYPES).toHaveProperty(name);
    }
  });
});

describe("toUtcMidnightMillis", () => {
  it("floors a real timestamp to midnight UTC of the same calendar day", () => {
    expect(toUtcMidnightMillis(REAL_TIMESTAMP)).toBe(
      Date.UTC(2026, 8, 11), // 2026-09-11T00:00:00.000Z
    );
  });

  it("returns a value HubSpot will accept as a date (exact multiple of a day)", () => {
    expect(toUtcMidnightMillis(REAL_TIMESTAMP) % DAY_MS).toBe(0);
  });

  it("is already-midnight safe (idempotent)", () => {
    const midnight = "2026-09-11T00:00:00.000Z";
    expect(toUtcMidnightMillis(midnight)).toBe(Date.parse(midnight));
  });

  it("uses UTC calendar components, not the server's local day", () => {
    // 23:54Z on the 11th is still the 11th in UTC, but the 11th *evening* or
    // the 12th depending on local zone. Vercel functions are not guaranteed
    // to run in UTC, so this must not drift.
    const lateInUtcDay = toUtcMidnightMillis("2026-09-11T23:59:59.999Z");
    const earlyInUtcDay = toUtcMidnightMillis("2026-09-11T00:00:00.001Z");
    expect(lateInUtcDay).toBe(earlyInUtcDay);
    expect(new Date(lateInUtcDay).getUTCDate()).toBe(11);
  });
});

describe("toHubspotDateValue", () => {
  it("keeps full precision for a datetime property", () => {
    expect(toHubspotDateValue(REAL_TIMESTAMP, "datetime")).toBe(
      Date.parse(REAL_TIMESTAMP),
    );
  });

  it("floors to midnight UTC for a date property", () => {
    expect(toHubspotDateValue(REAL_TIMESTAMP, "date")).toBe(
      Date.UTC(2026, 8, 11),
    );
  });
});

describe("buildMilestoneProperties — real timestamps through both first-date fields", () => {
  it("sends a value each field's ACTUAL type accepts", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");

    // datetime — full precision preserved.
    expect(props[ATTEMPT_PROPERTIES.firstStartedAt]).toBe(Date.parse(REAL_START));

    // date — floored to midnight UTC, or HubSpot 400s the whole patch.
    expect(props[ATTEMPT_PROPERTIES.firstCompletedAt]).toBe(Date.UTC(2026, 8, 11));
  });

  it("NEITHER first-date field would be rejected: date is midnight, datetime is not floored", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");

    const dateValue = props[ATTEMPT_PROPERTIES.firstCompletedAt] as number;
    const datetimeValue = props[ATTEMPT_PROPERTIES.firstStartedAt] as number;

    // The actual HubSpot acceptance rule for a `date` property.
    expect(dateValue % DAY_MS).toBe(0);

    // And the datetime field keeps its time-of-day — proving the coercion is
    // targeted, not a blanket floor that would silently lose precision.
    expect(datetimeValue % DAY_MS).not.toBe(0);
  });

  it("keeps the latest-wins milestone property at full datetime precision", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    // assessment_completed_date is itself a datetime — untouched by the date
    // coercion applied to its first_* sibling.
    expect(props.assessment_completed_date).toBe(Date.parse(BASE.occurredAt));
    expect((props.assessment_completed_date as number) % DAY_MS).not.toBe(0);
  });

  it("sends the attempt count as a number, not a string", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    expect(typeof props[ATTEMPT_PROPERTIES.attemptCount]).toBe("number");
    expect(props[ATTEMPT_PROPERTIES.attemptCount]).toBe(3);
  });

  it("emits exactly the four expected keys and nothing else", () => {
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    expect(Object.keys(props).sort()).toEqual(
      [
        "assessment_completed_date",
        ATTEMPT_PROPERTIES.firstStartedAt,
        ATTEMPT_PROPERTIES.firstCompletedAt,
        ATTEMPT_PROPERTIES.attemptCount,
      ].sort(),
    );
  });

  it("coerces on the started milestone too, not only on completion", () => {
    const props = buildMilestoneProperties(
      { ...BASE, milestone: "started", occurredAt: REAL_START },
      "assessment_started_date",
    );
    expect((props[ATTEMPT_PROPERTIES.firstCompletedAt] as number) % DAY_MS).toBe(0);
  });

  it("still withholds all three when the schema gate is off", () => {
    vi.stubEnv("HUBSPOT_ATTEMPT_PROPERTIES_LIVE", "");
    const props = buildMilestoneProperties(BASE, "assessment_completed_date");
    expect(Object.keys(props)).toEqual(["assessment_completed_date"]);
  });
});
