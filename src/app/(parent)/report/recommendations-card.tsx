// Recommended Next Steps card for the parent diagnostic report.
//
// Stitch port from module-d/04 (lines 265-287) + 05. Title verbatim
// from Stitch with name substitution: "Ways to Support {childName}
// at Home". One bulleted item per recommendation; the parent receives
// an already-sorted array (page.tsx owns the band-priority sort, so
// area_of_focus items appear first — most-actionable to least).
//
// Schema-vs-Stitch note: Stitch shows 3 hand-written bullets; the
// schema (curriculum_recommendations) returns one row per (strand,
// level) pair, up to 6. We render all available with a small uppercase
// strand eyebrow per item (RC1+RC5), so the parent can map back to
// the StrandMap above.
//
// supplementary[] and notes are intentionally hidden in v1
// (RC3+RC4) — surface in v2 if pilot families ask.

import type { Recommendation } from "@/lib/report/types";

import { STRAND_LABELS } from "./strand-labels";

interface RecommendationsCardProps {
  /** Already sorted by page.tsx: area_of_focus > progressing > mastery
   *  > no_data, with STRAND_ORDER as the within-band tiebreaker. */
  recommendations: Recommendation[];
  childName: string;
  /** Optional Sonnet-generated intro sentence, rendered above the list. */
  narrationLede?: string;
}

export function RecommendationsCard({
  recommendations,
  childName,
  narrationLede,
}: RecommendationsCardProps) {
  return (
    <section aria-label={`Ways to support ${childName} at home`}>
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border-2 border-sam-navy/5">
        <h3 className="text-lg md:text-xl font-bold text-sam-navy mb-5 md:mb-6 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-sam-teal"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            tips_and_updates
          </span>
          Ways to Support {childName} at Home
        </h3>

        {narrationLede && (
          <p className="font-body-regular text-sam-navy/80 text-base md:text-lg leading-relaxed mb-5 md:mb-6">
            {narrationLede}
          </p>
        )}

        {recommendations.length === 0 ? (
          <p className="text-sam-gray-mid text-sm md:text-base leading-relaxed">
            Recommendations will appear after the next assessment.
          </p>
        ) : (
          <ul className="space-y-5 md:space-y-6">
            {recommendations.map((rec) => (
              <li
                key={`${rec.strand}-${rec.level}`}
                className="flex gap-4 items-start"
              >
                <span
                  className="material-symbols-outlined text-sam-navy/30 mt-0.5 shrink-0"
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <div className="flex-1 space-y-1">
                  <div className="text-[10px] md:text-xs font-bold text-sam-gray-mid uppercase tracking-wider">
                    {STRAND_LABELS[rec.strand]}
                  </div>
                  <p className="text-sam-navy/80 text-sm md:text-base leading-relaxed">
                    {rec.primary}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
