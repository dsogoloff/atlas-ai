"use client";

// Fire instructor_report_viewed exactly once when an instructor opens a
// student's completed report. Mirrors the parent report's useEffect-once
// pattern (parent-report-feedback.tsx): a sessionStorage key dedupes across
// React Strict Mode's double-invoke and in-tab remounts; a ref dedupes within
// this component instance. Renders nothing.

import { useEffect, useRef } from "react";

import { recordInstructorReportViewed } from "../../lib/actions";

export function ReportViewTracker({ sessionId }: { sessionId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const key = `atlas:instructor_report_viewed:${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (private mode etc.) — fire anyway; at
      // worst the view is counted once more than strictly necessary.
    }
    void recordInstructorReportViewed(sessionId);
  }, [sessionId]);

  return null;
}
