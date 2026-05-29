// Sub-strand performance detail — parent Assessment Report.
//
// Editorial reskin (docs/atlas-sample-report.html): the per-sub-strand
// breakdown moves from coloured bars to a calm table-style list — one row
// per sub-strand with name, percentage, and a qualitative pill (Solid /
// Approaching / Developing / Not assessed). Pills are bordered, not filled,
// to keep the typographic weight on the prose elsewhere on the page.
//
// Band → pill mapping (reuses the existing classifier in strand-mastery.ts;
// thresholds unchanged):
//   mastery        → Solid       (navy)
//   progressing    → Approaching (amber)
//   area_of_focus  → Developing  (oxblood)
//   no_data        → Not assessed (neutral)

import type {
  MasteryBand,
  StrandMastery,
} from "@/lib/report/strand-mastery";

import { STRAND_LABELS } from "./strand-labels";

interface StrandMapProps {
  rows: StrandMastery[];
}

interface PillStyle {
  label: string;
  borderVar: string;
  colorVar: string;
}

const PILL_STYLES: Record<MasteryBand, PillStyle> = {
  mastery: {
    label: "Solid",
    borderVar: "var(--color-report-solid)",
    colorVar: "var(--color-report-solid)",
  },
  progressing: {
    label: "Approaching",
    borderVar: "var(--color-report-approaching)",
    colorVar: "var(--color-report-approaching)",
  },
  area_of_focus: {
    label: "Developing",
    borderVar: "var(--color-report-developing)",
    colorVar: "var(--color-report-developing)",
  },
  no_data: {
    label: "Not assessed",
    borderVar: "var(--color-report-text-light)",
    colorVar: "var(--color-report-text-secondary)",
  },
};

export function StrandMap({ rows }: StrandMapProps) {
  return (
    <div
      className="flex flex-col border-t"
      style={{ borderColor: "var(--color-report-border)" }}
    >
      {rows.map((row) => {
        const pill = PILL_STYLES[row.band];
        const isEmpty = row.band === "no_data";
        const value = isEmpty ? "—" : `${row.percentage}%`;
        const ariaSummary = isEmpty
          ? `${STRAND_LABELS[row.strand]}: not assessed`
          : `${STRAND_LABELS[row.strand]}: ${row.percentage} percent, ${pill.label}`;
        return (
          <div
            key={row.strand}
            className="flex justify-between items-center gap-4 py-3.5 border-b text-sm max-sm:flex-col max-sm:items-start max-sm:gap-2"
            style={{ borderColor: "var(--color-report-border)" }}
            aria-label={ariaSummary}
          >
            <span
              className="font-medium"
              style={{
                fontFamily: "var(--font-report-sans)",
                color: "var(--color-report-text)",
              }}
            >
              {STRAND_LABELS[row.strand]}
            </span>
            <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between">
              <span
                className="font-medium text-right min-w-[38px]"
                style={{
                  fontFamily: "var(--font-report-sans)",
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--color-report-text)",
                }}
              >
                {value}
              </span>
              <span
                className="text-[10px] uppercase tracking-[0.14em] px-3 py-1 border min-w-[110px] text-center"
                style={{
                  fontFamily: "var(--font-report-sans)",
                  borderColor: pill.borderVar,
                  color: pill.colorVar,
                }}
              >
                {pill.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
