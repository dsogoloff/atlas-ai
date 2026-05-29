// "Our Recommendation" — placement + starting points for the parent
// Assessment Report.
//
// Editorial reskin (docs/atlas-sample-report.html): renders a calm
// paper-grey box containing the placement statement and a top-to-bottom
// list of the recommendation items already produced by the engine. Each
// list row shows the engine strand as the "unit name" with the primary
// recommendation prose underneath. supplementary[] / notes remain hidden
// in v1 per RC3 / RC4.
//
// The reference template includes an "Addresses Finding 0N" link per
// unit; our data model does not currently link recommendations to
// findings, so that anchor is omitted until a real link exists.

import type { Recommendation } from "@/lib/report/types";

import { ENGINE_STRAND_LABELS } from "./strand-labels";

interface RecommendationsCardProps {
  /** Already sorted by page.tsx: area_of_focus > progressing > mastery
   *  > no_data, with STRAND_ORDER as the within-band tiebreaker. */
  recommendations: Recommendation[];
  /** Optional Sonnet-generated intro sentence, rendered above the box. */
  narrationLede?: string;
  /** Child first name, used in the placement statement inside the box. */
  childName: string;
  /** Pre-stripped placement label, e.g. "S.A.M Level 3". */
  placementLabel: string;
}

export function RecommendationsCard({
  recommendations,
  narrationLede,
  childName,
  placementLabel,
}: RecommendationsCardProps) {
  return (
    <div>
      {narrationLede && (
        <p
          className="text-[15px] leading-[1.65] mb-8 max-w-[560px]"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-text-secondary)",
          }}
        >
          {narrationLede}
        </p>
      )}

      <div
        className="p-8 max-sm:p-6 mt-2"
        style={{
          backgroundColor: "var(--color-report-paper)",
          fontFamily: "var(--font-report-sans)",
        }}
      >
        <p
          className="text-base leading-[1.7] mb-2"
          style={{ color: "var(--color-report-text)" }}
        >
          Place {childName} at{" "}
          <strong
            className="font-semibold"
            style={{ color: "var(--color-report-navy)" }}
          >
            {placementLabel}
          </strong>
          , with a focused start on the areas surfaced by this assessment.
        </p>

        {recommendations.length === 0 ? (
          <p
            className="text-[15px] leading-[1.65] mt-4"
            style={{ color: "var(--color-report-text-secondary)" }}
          >
            Recommendations will appear after the next assessment.
          </p>
        ) : (
          <ul className="list-none mt-6 p-0">
            {recommendations.map((rec, idx) => {
              const isLast = idx === recommendations.length - 1;
              return (
                <li
                  key={`${rec.strand}-${rec.level}`}
                  className={`py-4 text-[15px] flex flex-col gap-1 border-t${
                    isLast ? " border-b" : ""
                  } max-sm:gap-1`}
                  style={{ borderColor: "var(--color-report-border)" }}
                >
                  <span
                    className="font-medium"
                    style={{ color: "var(--color-report-navy)" }}
                  >
                    {ENGINE_STRAND_LABELS[rec.strand]}
                  </span>
                  <p
                    className="leading-[1.65]"
                    style={{ color: "var(--color-report-text-secondary)" }}
                  >
                    {rec.primary}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
