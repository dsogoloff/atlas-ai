import { describe, expect, it } from "vitest";

import { parseUtmParams } from "./attribution";
import {
  ALLOWED_EVENT_PARAMS,
  buildEventPayload,
  isCleanPayload,
  MARKETING_EVENTS,
  MARKETING_EVENT_NAMES,
} from "./events";

// Every field the report / session layer knows about a child. NONE of these may
// ever reach Google or Meta. Kept deliberately over-broad — if a future refactor
// starts spreading a report object into an event payload, this test fails.
const CHILD_PERFORMANCE_FIELDS = {
  score: 42,
  raw_score: 42,
  percent_correct: 0.83,
  sam_level: "L3",
  level: "L3",
  grade: 4,
  strand: "number_sense",
  strand_mastery: { number_sense: 0.4 },
  misconception: "place_value_confusion",
  misconceptions: ["place_value_confusion"],
  readiness: "ready",
  item_id: "sam-l3-q07",
  question_id: "sam-l3-q07",
  answer_given: "17",
  is_correct: false,
  time_ms: 4200,
  session_id: "6f1b1f7e-0000-4000-8000-000000000000",
  child_id: "6f1b1f7e-0000-4000-8000-000000000001",
  child_name: "Ada",
  email: "parent@example.com",
  placement: { sam_level: "L3" },
  responses: [{ q: 1, correct: true }],
} as const;

describe("event names", () => {
  it("are exactly the two snake_case conversions, spelled as specified", () => {
    expect(MARKETING_EVENTS.ASSESSMENT_START).toBe("assessment_start");
    expect(MARKETING_EVENTS.ASSESSMENT_COMPLETE).toBe("assessment_complete");
    expect([...MARKETING_EVENT_NAMES]).toEqual([
      "assessment_start",
      "assessment_complete",
    ]);
  });
});

describe("buildEventPayload", () => {
  const attribution = {
    ...parseUtmParams(
      "?utm_source=facebook&utm_medium=paid_social&utm_campaign=sam_ny_fall" +
        "&utm_content=carousel_a&utm_term=math",
    ),
    first_seen: "2026-08-03T12:00:00.000Z",
  };

  it("carries the five persisted UTMs through to the event payload", () => {
    const payload = buildEventPayload(attribution);
    expect(payload).toEqual({
      utm_source: "facebook",
      utm_medium: "paid_social",
      utm_campaign: "sam_ny_fall",
      utm_content: "carousel_a",
      utm_term: "math",
      first_seen: "2026-08-03T12:00:00.000Z",
    });
  });

  it("allows the assessment_type metadata field", () => {
    const payload = buildEventPayload(attribution, {
      assessment_type: "short",
    });
    expect(payload.assessment_type).toBe("short");
  });

  it("is empty for an unattributed visitor rather than carrying blanks", () => {
    expect(buildEventPayload({})).toEqual({});
  });

  // ---- The privacy guard. -------------------------------------------------
  it("DROPS every child-performance field, whatever the caller passes", () => {
    const payload = buildEventPayload(attribution, CHILD_PERFORMANCE_FIELDS);
    for (const key of Object.keys(CHILD_PERFORMANCE_FIELDS)) {
      expect(payload).not.toHaveProperty(key);
    }
    expect(isCleanPayload(payload)).toBe(true);
  });

  it("drops child data even with no attribution to dilute it", () => {
    expect(buildEventPayload({}, CHILD_PERFORMANCE_FIELDS)).toEqual({});
  });

  it("cannot be widened by a key that merely looks allowlisted", () => {
    const payload = buildEventPayload(
      {},
      { utm_source_extra: "x", Utm_Source: "y", "utm_source ": "z" },
    );
    expect(payload).toEqual({});
  });

  it("drops non-string and blank values", () => {
    const payload = buildEventPayload(
      {},
      { utm_source: 5, utm_medium: null, utm_campaign: "   ", utm_term: {} },
    );
    expect(payload).toEqual({});
  });

  it("trims whitespace on kept values", () => {
    expect(buildEventPayload({}, { utm_source: "  google  " })).toEqual({
      utm_source: "google",
    });
  });
});

describe("ALLOWED_EVENT_PARAMS", () => {
  it("is the five UTMs plus exactly two non-child metadata fields", () => {
    expect([...ALLOWED_EVENT_PARAMS]).toEqual([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "assessment_type",
      "first_seen",
    ]);
  });

  it("contains no child-performance field name", () => {
    for (const key of Object.keys(CHILD_PERFORMANCE_FIELDS)) {
      expect(ALLOWED_EVENT_PARAMS).not.toContain(key);
    }
  });
});

describe("isCleanPayload", () => {
  it("rejects any non-allowlisted key", () => {
    expect(isCleanPayload({ utm_source: "x" })).toBe(true);
    expect(isCleanPayload({ utm_source: "x", score: 1 })).toBe(false);
    expect(isCleanPayload({})).toBe(true);
  });
});
