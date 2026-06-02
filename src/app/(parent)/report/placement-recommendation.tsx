// Section 3 body — "Placement recommendation" on the parent report.
//
// Composes: the placement band + the EXISTING half-level surfaced as a plain
// entry point ("second half") + a forward CTA. Deliberately NO time-to-advance
// estimate — none exists in the data and none is invented. The half-level is
// read from the existing sam_level string via splitEntryPoint (no new schema).
//
// PROVISIONAL copy (ENTRY_POINT lead + FORWARD_CTA): isolated as constants so
// it is easy to reword after the S.A.M. discussion.

import { splitEntryPoint } from "@/lib/report/entry-point";

interface PlacementRecommendationProps {
  /** Pre-formatted placement label, e.g. "S.A.M Level 2B". */
  samLevel: string;
}

const FORWARD_CTA =
  "We’ll be able to estimate how quickly your child progresses once classes begin.";

export function PlacementRecommendation({
  samLevel,
}: PlacementRecommendationProps) {
  const { band, half } = splitEntryPoint(samLevel);
  const entryLabel = half ? `${band}, ${half}` : band;

  return (
    <div className="max-w-[660px]">
      <p
        className="text-[17px] leading-[1.7]"
        style={{
          fontFamily: "var(--font-report-sans)",
          color: "var(--color-report-text)",
        }}
      >
        Recommended starting point:{" "}
        <strong
          className="font-semibold"
          style={{ color: "var(--color-report-navy)" }}
        >
          {entryLabel}
        </strong>
        .
      </p>
      <p
        className="mt-4 text-[17px] leading-[1.7]"
        style={{
          fontFamily: "var(--font-report-sans)",
          color: "var(--color-report-text-secondary)",
        }}
      >
        {FORWARD_CTA}
      </p>
    </div>
  );
}
