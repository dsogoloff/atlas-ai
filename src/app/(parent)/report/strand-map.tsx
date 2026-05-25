// Strand Breakdown card for the parent diagnostic report.
//
// Stitch port from module-d/04 (lines 183-238) + 05. Phase 8 (Item #12)
// widened the input to a VARIABLE-LENGTH list of V2026 sub-strands (2-8
// rows depending on the child's S.A.M. level). Each row is one sub-
// strand applicable at that level; sub-strands with no responses still
// appear with band='no_data' so the parent sees the full level coverage.
//
// Section title is "Mathematical Strengths" (SM2 lock) — performance-
// blind copy by design for v1, same class as the placement-card flavor
// sentence and the mascot quote. Band-aware framing is a v2 fixup.
//
// Bars are static (SM4 lock) — no Framer Motion, server component.

import type {
  MasteryBand,
  StrandMastery,
} from "@/lib/report/strand-mastery";

import { STRAND_LABELS } from "./strand-labels";

interface StrandMapProps {
  /** Variable-length 2-8: one row per V2026 sub-strand applicable at the
   *  child's S.A.M. level. Ordering and length are controlled by the
   *  caller (assemble.ts derives them from tax_sub_strands.applies_to_
   *  level_codes for the child's level). */
  rows: StrandMastery[];
}

interface BandStyle {
  /** Tailwind class for the bar fill background. */
  fillClass: string;
  /** Tailwind class for the right-side caption text color. */
  captionClass: string;
  /** Trailing word(s) after the percentage (e.g. "Mastery"). */
  captionSuffix: string;
}

const BAND_STYLES: Record<MasteryBand, BandStyle> = {
  mastery: {
    fillClass: "bg-sam-teal",
    captionClass: "text-sam-teal",
    captionSuffix: "Mastery",
  },
  progressing: {
    fillClass: "bg-sam-orange",
    captionClass: "text-sam-orange",
    captionSuffix: "Progressing",
  },
  area_of_focus: {
    fillClass: "bg-sam-red",
    captionClass: "text-sam-red",
    captionSuffix: "Area of Focus",
  },
  no_data: {
    fillClass: "", // no fill rendered — see render path
    captionClass: "text-sam-gray-mid",
    captionSuffix: "",
  },
};

export function StrandMap({ rows }: StrandMapProps) {
  return (
    <section aria-label="Mathematical strengths by strand">
      <h3 className="font-display-child text-sam-navy text-xl md:text-2xl mb-4 md:mb-6">
        Mathematical Strengths
      </h3>
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30 space-y-6 md:space-y-8">
        {rows.map((row) => {
          const style = BAND_STYLES[row.band];
          const isEmpty = row.band === "no_data";
          const captionText = isEmpty
            ? "Not assessed"
            : `${row.percentage}% ${style.captionSuffix}`;
          return (
            <div key={row.strand} className="space-y-2">
              <div className="flex justify-between items-end gap-4">
                <span className="font-bold text-sam-navy">
                  {STRAND_LABELS[row.strand]}
                </span>
                <span
                  className={`text-sm font-bold ${style.captionClass}`}
                  aria-label={
                    isEmpty
                      ? `${STRAND_LABELS[row.strand]} not assessed`
                      : `${STRAND_LABELS[row.strand]}: ${row.percentage} percent ${style.captionSuffix}`
                  }
                >
                  {captionText}
                </span>
              </div>
              <div
                className="h-3 w-full bg-slate-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={isEmpty ? 0 : row.percentage}
                aria-label={STRAND_LABELS[row.strand]}
              >
                {!isEmpty && (
                  <div
                    className={`h-full rounded-full ${style.fillClass}`}
                    style={{ width: `${row.percentage}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
