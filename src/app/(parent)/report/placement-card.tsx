// Overall Summary card for the parent diagnostic report.
//
// Stitch port from module-d/04 (desktop, lines 161-182) + 05 (mobile,
// lines 153-168). Single responsive component (PC3 lock): below md
// stacks centered with a 128px gauge above the placement label;
// at md+ goes side-by-side with a 192px gauge on the right.
//
// Confidence is intentionally NOT displayed (PC1 lock) — engine-
// internal IRT term, parent-illegible. Percentage carries the
// parent-facing precision signal.
//
// Copy is tier-aware (PC2 / R10): K_4 leans cheerful, G5_8 leans
// measured. Both variants are performance-blind today (same words
// regardless of percentage); band-aware copy is a v2 fixup, same
// class as the mascot quote nit flagged on file 3.
//
// SVG gauge math: r=88 → circumference = 2π·88 = 552.92.
// stroke-dashoffset = 552.92 * (1 - clampedPct/100). Negative or >100
// inputs are clamped before the math so the ring never overflows.

import type { Tier } from "@/lib/tier/derive";

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // 552.92

interface PlacementCardProps {
  childName: string;
  samLevel: string; // pre-formatted, e.g. "S.A.M. Level 2A"
  overallPercentage: number; // 0..100, R1 hybrid (correct/attempted)
  tier: Tier;
  /** Optional Sonnet-generated warm sentence shown under the SAM level.
   *  When present, replaces the hardcoded tier-aware flavor sentence —
   *  the slot accommodates one warm sentence, not two competing ones.
   *  When absent, falls back to flavorSentence(...) (today's behaviour). */
  narrationLine?: string;
}

function flavorSentence(
  childName: string,
  samLevel: string,
  tier: Tier,
): string {
  if (tier === "G5_8") {
    return `${childName} demonstrated solid command of grade-level concepts. Placement at ${samLevel} reflects current strengths.`;
  }
  return `${childName} showed strong conceptual understanding today! Ready to begin ${samLevel}.`;
}

export function PlacementCard({
  childName,
  samLevel,
  overallPercentage,
  tier,
  narrationLine,
}: PlacementCardProps) {
  const pct = Math.max(0, Math.min(100, overallPercentage));
  const dashOffset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <section
      aria-label="Recommended placement"
      className="bg-white rounded-2xl p-6 md:p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30 flex flex-col items-center text-center gap-6 md:flex-row md:items-center md:text-left md:gap-10"
    >
      <div className="flex-1 space-y-3 md:space-y-4">
        <h2 className="text-sam-gray-mid uppercase tracking-widest text-xs md:text-sm font-bold">
          Recommended Placement
        </h2>
        <div className="font-display-child text-sam-red text-3xl md:text-5xl leading-tight">
          {samLevel}
        </div>
        <p className="font-body-regular text-sam-navy/90 text-base md:text-lg">
          {narrationLine ?? flavorSentence(childName, samLevel, tier)}
        </p>
      </div>

      <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 192 192"
          className="w-full h-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="96"
            cy="96"
            r={RADIUS}
            fill="transparent"
            stroke="#F1F3FF"
            strokeWidth="12"
          />
          <circle
            cx="96"
            cy="96"
            r={RADIUS}
            fill="transparent"
            stroke="#E63946"
            strokeWidth="12"
            strokeDasharray={CIRCUMFERENCE.toFixed(2)}
            strokeDashoffset={dashOffset.toFixed(2)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display-child text-sam-navy leading-none text-3xl md:text-4xl"
            aria-label={`${pct} percent proficiency`}
          >
            {pct}%
          </span>
          <span className="text-[10px] md:text-xs font-bold text-sam-gray-mid uppercase tracking-wider mt-1">
            Proficiency
          </span>
        </div>
      </div>
    </section>
  );
}
