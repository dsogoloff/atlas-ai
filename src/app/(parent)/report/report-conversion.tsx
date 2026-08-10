"use client";

// Marketing conversion: `assessment_complete`. Renders nothing.
//
// Fires on the PARENT-FACING report — the report-generated/viewed step. That is
// both the true completion signal (the report only exists once the assessment
// finished) and the point where the conversion sits in parent context, with the
// Meta Pixel loaded by the (parent) layout.
//
// Mounted alongside the other parent-only widgets in report-article.tsx, so it
// is suppressed for the staff (admin) oversight view — an admin reading a
// report is not a marketing conversion.
//
// Payload is the persisted UTMs plus the test type. It CANNOT carry score,
// level, strand, misconception, item or response data: buildEventPayload
// allowlist-copies, and report-conversion.test.tsx asserts it.

import { useEffect, useRef } from "react";

import { MARKETING_EVENTS } from "@/lib/marketing/events";
import { trackOnce } from "@/lib/marketing/track";

export function ReportConversion({
  sessionId,
  assessmentType,
}: {
  sessionId: string;
  assessmentType: "short" | "comprehensive";
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackOnce(MARKETING_EVENTS.ASSESSMENT_COMPLETE, sessionId, {
      assessment_type: assessmentType,
    });
  }, [sessionId, assessmentType]);

  return null;
}
