// Section 3 body — "Placement recommendation" on the parent report.
//
// Shows the S.A.M booklet level as the recommended starting point + a forward
// CTA. The "first half / second half" entry-point framing was dropped (founder
// decision 2026-06-18, D3): parents see the S.A.M LEVEL only, no half-level.
// `samLevel` is already the booklet display ("S.A.M Level 3").
//
// PROVISIONAL copy (FORWARD_CTA): isolated as a constant so it is easy to
// reword after the S.A.M. discussion.

interface PlacementRecommendationProps {
  /** Pre-formatted booklet placement label, e.g. "S.A.M Level 3". */
  samLevel: string;
}

const FORWARD_CTA =
  "We’ll be able to estimate how quickly your child progresses once classes begin.";

export function PlacementRecommendation({
  samLevel,
}: PlacementRecommendationProps) {
  const entryLabel = samLevel;

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
