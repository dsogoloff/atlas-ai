// Marketing conversion events + the payload whitelist.
//
// PRIVACY BOUNDARY (the important part of this file).
//
// These events leave the box: they go to Google and to Meta. Nothing about a
// child's performance may ever ride along — no score, level, strand,
// misconception, item id, response, timing, or name. So the payload is not
// "sanitized" by removing known-bad keys (a denylist rots the moment a new
// report field is added); it is built by COPYING an explicit allowlist and
// dropping everything else. Same discipline as the Contract A emit.
//
// If a future event genuinely needs a new field, add it to
// ALLOWED_EVENT_PARAMS *and* prove it carries no child performance data.

import { UTM_KEYS, type Attribution } from "./attribution";

/** Exact snake_case names. GA4 marks these as Key Events; Meta receives them
 *  via trackCustom (neither is a Meta standard event). */
export const MARKETING_EVENTS = {
  ASSESSMENT_START: "assessment_start",
  ASSESSMENT_COMPLETE: "assessment_complete",
} as const;

export type MarketingEventName =
  (typeof MARKETING_EVENTS)[keyof typeof MARKETING_EVENTS];

export const MARKETING_EVENT_NAMES: readonly MarketingEventName[] = [
  MARKETING_EVENTS.ASSESSMENT_START,
  MARKETING_EVENTS.ASSESSMENT_COMPLETE,
];

/**
 * Every key that may appear in an outbound event payload. The five UTMs plus
 * two non-child metadata fields:
 *   • assessment_type — "short" | "comprehensive". Product mix, not a result.
 *   • first_seen      — first-touch timestamp, for campaign-window analysis.
 * NOTHING ELSE. No ids, no names, no results.
 */
export const ALLOWED_EVENT_PARAMS = [
  ...UTM_KEYS,
  "assessment_type",
  "first_seen",
] as const;

export type AllowedEventParam = (typeof ALLOWED_EVENT_PARAMS)[number];

export type EventPayload = Partial<Record<AllowedEventParam, string>>;

const ALLOWED = new Set<string>(ALLOWED_EVENT_PARAMS);

/**
 * Build an outbound payload from the persisted attribution plus optional
 * extras. Allowlist-copy: a key not in ALLOWED_EVENT_PARAMS cannot survive,
 * whatever the caller passes. Empty / non-string values are dropped so the
 * payload never carries `undefined` or a stringified object.
 */
export function buildEventPayload(
  attribution: Attribution,
  extra: Record<string, unknown> = {},
): EventPayload {
  const merged: Record<string, unknown> = { ...attribution, ...extra };
  const out: EventPayload = {};
  for (const key of ALLOWED_EVENT_PARAMS) {
    const value = merged[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed === "") continue;
    out[key] = trimmed;
  }
  return out;
}

/** Guard used by the payload test and by track(): true iff every key is
 *  allowlisted. Exported so a regression is a test failure, not a silent leak. */
export function isCleanPayload(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).every((key) => ALLOWED.has(key));
}
