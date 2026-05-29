// Placement box for the parent Assessment Report.
//
// Editorial reskin (docs/atlas-sample-report.html): the placement value sits
// inside a navy box at the bottom of the report hero. Optional narration
// sentence (placement_line) renders directly below the box as a quiet warm
// line in the report's secondary text colour. tier and overallPercentage are
// retained on the prop API for caller-stability but no longer drive visual
// chrome — the editorial format is performance-blind by design.
//
// Report lock R2: parent-facing copy shows "S.A.M Level N" only — the
// half-level letter is internal placement detail. stripHalfLevel mirrors
// the narration prompt's stripper.

import type { Tier } from "@/lib/tier/derive";

interface PlacementCardProps {
  childName: string;
  samLevel: string; // pre-formatted, e.g. "S.A.M Level 2A"
  overallPercentage: number;
  tier: Tier;
  /** Optional Sonnet-generated warm sentence shown below the placement box. */
  narrationLine?: string;
}

function stripHalfLevel(samLevel: string): string {
  return samLevel.replace(/[A-Za-z]$/, "").trimEnd();
}

export function PlacementCard({
  samLevel,
  narrationLine,
}: PlacementCardProps) {
  const samLevelWhole = stripHalfLevel(samLevel);

  return (
    <div>
      <div
        className="flex justify-between items-baseline gap-4 px-6 sm:px-7 py-5 sm:py-6 text-white max-sm:flex-col max-sm:items-start max-sm:gap-2.5"
        style={{ backgroundColor: "var(--color-report-navy)" }}
      >
        <span className="text-[11px] uppercase tracking-[0.16em] opacity-75">
          Recommended Placement
        </span>
        <span
          className="text-3xl font-medium"
          style={{
            fontFamily: "var(--font-report-serif)",
          }}
        >
          {samLevelWhole}
        </span>
      </div>
      {narrationLine && (
        <p
          className="mt-5 text-[15px] leading-relaxed"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-text-secondary)",
          }}
        >
          {narrationLine}
        </p>
      )}
    </div>
  );
}
