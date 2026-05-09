// Time-flag banner for the parent diagnostic report.
//
// No Stitch source — v1 add-on for Item #2's session_time_flag feature
// (introduced after Stitch was designed). Designed from scratch using
// existing tokens.
//
// Two contexts (page.tsx routes the flag, banner just renders):
//   * Branch 6 (unreliable | mixed): standalone primary content. Red
//     severity. CTA to re-take if childId is provided.
//   * Branch 7 (rushed | struggling): caveat above the full report.
//     Orange severity. No CTA — the report itself is the next read.
//
// Defensive: returns null if flag === "normal", so an upstream change
// to the call site never crashes the page.
//
// Print stylesheet (R8 / TFB5 lock): the banner ALWAYS prints. The
// caveat needs to travel with the printed handout. The re-take CTA
// inside the banner is print:hidden — a clickable link in a printed
// handout makes no sense.
//
// Copy attributes failures to response patterns (timing, pacing), not
// to the child. Reviewed at file-6 gate.

import Link from "next/link";

import type { Database } from "@/lib/supabase/database.types";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

interface TimeFlagBannerProps {
  flag: SessionTimeFlag;
  childName: string;
  /** Required for the re-take CTA. Branch 6 passes this; branch 7 omits. */
  childId?: string;
}

interface BannerVariant {
  /** "broken" → red, with re-take CTA when childId provided.
   *  "caveat" → orange, no CTA. */
  severity: "broken" | "caveat";
  title: string;
  /** Material Symbols icon name. */
  icon: string;
  /** Body sentence; receives {childName} via interpolation at render. */
  body: (childName: string) => string;
}

const VARIANTS: Record<Exclude<SessionTimeFlag, "normal">, BannerVariant> = {
  unreliable: {
    severity: "broken",
    title: "Score not reliable",
    icon: "error",
    body: (n) =>
      `Too many quick or accidental responses to give a reliable read of ${n}'s level. Re-take when ${n} can give it their full attention.`,
  },
  mixed: {
    severity: "broken",
    title: "Inconsistent timing",
    icon: "error",
    body: (n) =>
      `Response timing varied widely across this session — not enough clean data to score reliably. Re-take when ${n} can give it their full attention.`,
  },
  rushed: {
    severity: "caveat",
    title: "Read with a caveat",
    icon: "speed",
    body: (n) =>
      `Many answers came faster than expected. The scores below may underestimate what ${n} actually knows.`,
  },
  struggling: {
    severity: "caveat",
    title: "Read with a caveat",
    icon: "support",
    body: () =>
      `Many answers took much longer than expected. Read the scores below as a starting point, not a ceiling.`,
  },
};

const SEVERITY_STYLES = {
  broken: {
    container: "bg-sam-red/10 border-l-4 border-sam-red",
    icon: "text-sam-red",
    title: "text-sam-red",
  },
  caveat: {
    container: "bg-sam-orange/10 border-l-4 border-sam-orange",
    icon: "text-sam-orange",
    title: "text-sam-orange",
  },
} as const;

export function TimeFlagBanner({
  flag,
  childName,
  childId,
}: TimeFlagBannerProps) {
  if (flag === "normal") return null;

  const variant = VARIANTS[flag];
  const styles = SEVERITY_STYLES[variant.severity];
  const showCta = variant.severity === "broken" && childId !== undefined;

  return (
    <div
      role="status"
      aria-label={variant.title}
      className={`rounded-r-2xl p-5 md:p-6 flex gap-4 items-start ${styles.container}`}
    >
      <span
        className={`material-symbols-outlined text-3xl shrink-0 ${styles.icon}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        {variant.icon}
      </span>
      <div className="flex-1 space-y-2">
        <h3
          className={`font-headline-adult font-bold text-base md:text-lg ${styles.title}`}
        >
          {variant.title}
        </h3>
        <p className="font-body-regular text-sam-navy/90 text-sm md:text-base leading-relaxed">
          {variant.body(childName)}
        </p>
        {showCta && (
          <div className="pt-2 print:hidden">
            <Link
              href={`/assessment?child_id=${childId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sam-red hover:bg-sam-red/90 text-white font-headline-adult font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Re-take Assessment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
