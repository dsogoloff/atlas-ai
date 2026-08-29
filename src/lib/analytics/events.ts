// Atlas Assessment — analytics event taxonomy.
//
// Single source of truth for event names on the TypeScript side. Mirrors the
// `analytics_event_name` enum in
// supabase/migrations/20260529000000_analytics_events.sql — keep the two in
// lockstep. `AnalyticsEventName` is pinned to the generated DB enum so a drift
// between this file and the schema is a typecheck error, not a runtime bug.
//
// Privacy (strategy §6.4): events reference ids only. Never put PII (names,
// emails, free text) into a `props` payload — see emit().

import type { Database } from "@/lib/supabase/database.types";

export type AnalyticsEventName =
  Database["public"]["Enums"]["analytics_event_name"];

export const ANALYTICS_EVENTS = {
  LANDING_VIEWED: "landing_viewed",
  PARENT_CONSENT_COMPLETED: "parent_consent_completed",
  CHILD_PROFILE_CREATED: "child_profile_created",
  SHORT_TEST_STARTED: "short_test_started",
  SHORT_TEST_ITEM_ANSWERED: "short_test_item_answered",
  SHORT_TEST_COMPLETED: "short_test_completed",
  SHORT_RESULT_VIEWED: "short_result_viewed",
  COMPREHENSIVE_TEST_STARTED: "comprehensive_test_started",
  COMPREHENSIVE_ITEM_ANSWERED: "comprehensive_item_answered",
  COMPREHENSIVE_TEST_COMPLETED: "comprehensive_test_completed",
  PARENT_REPORT_GENERATED: "parent_report_generated",
  PARENT_REPORT_VIEWED: "parent_report_viewed",
  CENTER_FOLLOWUP_OPTED_IN: "center_followup_opted_in",
  REPORT_CTA_TAPPED: "report_cta_tapped",
  PARENT_SATISFACTION_SUBMITTED: "parent_satisfaction_submitted",
  INSTRUCTOR_REPORT_VIEWED: "instructor_report_viewed",
  PLACEMENT_RECOMMENDATION_CREATED: "placement_recommendation_created",
  INSTRUCTOR_USEFULNESS_SUBMITTED: "instructor_usefulness_submitted",
} as const satisfies Record<string, AnalyticsEventName>;
