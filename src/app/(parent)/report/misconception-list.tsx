// Areas for Growth (Detected Misconceptions) card for the parent
// diagnostic report.
//
// Stitch port from module-d/04 (lines 239-264) + 05. Up to 3 cards
// (R6 lock), sorted by occurrence count desc (helper guarantee).
// Empty state renders a positive card (ML1 lock) — when no
// misconceptions are detected, that's a real positive signal, not
// performance-blind framing.
//
// Icon by strand (ML2): 6 fixed Material Symbols — visual variety
// without requiring per-misconception icon storage.
// Color by rank (ML3): 1st=red, 2nd=orange, 3rd=teal — mirrors the
// occurrence-sorted order. Deliberately NOT strand-colored to avoid
// collision with StrandMap's band colors.
//
// Description copy comes straight from the misconceptions table
// (label + description columns). v1 trusts the seed copy is parent-
// facing and sanitized.

import type { Strand } from "@/lib/engine/types";
import type { AggregatedMisconception } from "@/lib/report/misconception-aggregate";

interface MisconceptionListProps {
  rows: AggregatedMisconception[]; // length 0..3, sorted by occurrences desc
  childName: string;
}

const STRAND_ICONS: Record<Strand, string> = {
  NUMBER_SENSE: "numbers",
  OPERATIONS: "calculate",
  WORD_PROBLEMS: "quiz",
  FRACTIONS_DECIMALS: "pie_chart",
  GEOMETRY: "category",
  MEASUREMENT_DATA: "straighten",
};

interface RankStyle {
  iconBg: string;
  iconColor: string;
}

// Rank 0 = top occurrence, rank 1 = second, rank 2 = third.
const RANK_STYLES: readonly RankStyle[] = [
  { iconBg: "bg-sam-red/10", iconColor: "text-sam-red" },
  { iconBg: "bg-sam-orange/10", iconColor: "text-sam-orange" },
  { iconBg: "bg-sam-teal/10", iconColor: "text-sam-teal" },
];

export function MisconceptionList({
  rows,
  childName,
}: MisconceptionListProps) {
  return (
    <section aria-label="Areas for growth">
      <h3 className="font-display-child text-sam-navy text-xl md:text-2xl mb-4 md:mb-6">
        Areas for Growth
      </h3>
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30 flex items-start gap-4">
          <div className="w-12 h-12 bg-sam-teal/10 rounded-xl flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-sam-teal"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              check_circle
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-base md:text-lg font-bold text-sam-navy mb-2">
              No specific patterns to flag
            </h4>
            <p className="text-sam-gray-mid text-sm md:text-base leading-relaxed">
              {childName}&rsquo;s session didn&rsquo;t surface any common
              misconceptions worth highlighting. Keep practising at this level.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((row, idx) => {
            const style =
              RANK_STYLES[idx] ?? RANK_STYLES[RANK_STYLES.length - 1]!;
            const icon = STRAND_ICONS[row.strand];
            return (
              <article
                key={row.code}
                className="bg-white rounded-2xl p-6 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30 flex flex-col"
              >
                <div
                  className={`w-12 h-12 ${style.iconBg} rounded-xl flex items-center justify-center mb-4`}
                >
                  <span
                    className={`material-symbols-outlined ${style.iconColor}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                </div>
                <h4 className="text-base md:text-lg font-bold text-sam-navy mb-2">
                  {row.label}
                </h4>
                <p className="text-sam-gray-mid text-sm leading-relaxed">
                  {row.description}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
