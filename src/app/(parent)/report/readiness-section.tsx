// SHORT-test readiness section for the parent report.
//
// Asymmetric + §2.4-safe (see @/lib/report/readiness):
//   * readiness.ready === true  → render the upside-only "appears ready for …"
//     line, then the comprehensive CTA.
//   * readiness.ready === false → render NO readiness line and NO negative
//     framing — just the SAME comprehensive CTA.
//   * readiness === null (comprehensive session) → render nothing.
//
// All parent-facing strings come from READINESS_COPY (DRAFT, pending founder
// approval) — this component only lays them out, so approved wording drops in
// without structural change.

import { READINESS_COPY, type ReadinessSummary } from "@/lib/report/readiness";

interface Props {
  readiness: ReadinessSummary | null;
}

export function ReadinessSection({ readiness }: Props) {
  if (readiness === null) return null;

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

      <h2
        className={
          "font-display-child text-base font-bold text-sam-navy" +
          (readiness.ready ? " mt-4" : "")
        }
      >
        {READINESS_COPY.comprehensiveCtaHeading}
      </h2>
      <p className="mt-1 text-sm text-sam-gray-dark">
        {READINESS_COPY.comprehensiveCtaBody}
      </p>
      <a
        href="#comprehensive"
        className="mt-4 inline-flex items-center justify-center rounded-full bg-sam-teal px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sam-teal/90"
      >
        {READINESS_COPY.comprehensiveCtaButton}
      </a>
    </section>
  );
}
