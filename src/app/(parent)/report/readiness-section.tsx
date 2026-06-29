// SHORT-test readiness section for the parent report.
//
// Asymmetric + §2.4-safe (see @/lib/report/readiness):
//   * readiness.ready === true  → render the upside-only "appears ready for …"
//     line (legible level label), then the universal comprehensive CTA.
//   * readiness.ready === false → render NO readiness line and NO negative
//     framing — just the SAME comprehensive CTA.
//   * readiness === null (comprehensive session) → render nothing.
//
// The comprehensive CTA (FollowUpCta) is UNIVERSAL — shown to every short-test
// taker regardless of pass/no-pass. All parent-facing strings come from
// READINESS_COPY (founder-approved); the voice-locked narration prompt is
// untouched.

import { READINESS_COPY, type ReadinessSummary } from "@/lib/report/readiness";

import { FollowUpCta } from "./follow-up-cta";

interface Props {
  readiness: ReadinessSummary | null;
  sessionId: string;
  /** LEAD_SCHOOL_FIELD_LIVE — gates the child's-school field on the form. */
  schoolFieldEnabled: boolean;
  /** Staff (admin) oversight view: render the readiness CONTENT but never the
   *  parent lead-capture CTA. FollowUpCta mutates (submits a lead + notifies
   *  the center), so it must not be actionable when an admin views the report. */
  staffView?: boolean;
}

export function ReadinessSection({
  readiness,
  sessionId,
  schoolFieldEnabled,
  staffView = false,
}: Props) {
  if (readiness === null) return null;

  // In the staff view the only content is the (upside-only) ready line; with no
  // ready line and the CTA suppressed there is nothing to show, so render
  // nothing rather than an empty card.
  if (staffView && !readiness.ready) return null;

  return (
    <section
      className="rounded-2xl border border-sam-gray-light bg-white p-6"
      aria-label="Next step"
    >
      {readiness.ready && (
        <p className="font-display-child text-lg font-bold text-sam-navy">
          {READINESS_COPY.readyLine(readiness.currentLevelLabel)}
        </p>
      )}

      {!staffView && (
        <div className={readiness.ready ? "mt-4" : ""}>
          <FollowUpCta
            sessionId={sessionId}
            schoolFieldEnabled={schoolFieldEnabled}
          />
        </div>
      )}
    </section>
  );
}
