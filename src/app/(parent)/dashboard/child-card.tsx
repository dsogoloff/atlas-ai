// ChildCard — presentation-only server component for the parent
// dashboard's populated state. One component handles both viewports
// via Tailwind responsive utilities (Phase 1 Q4): the structural
// differences between Stitch sources 01 (desktop) and 03 (mobile)
// are absorbable.
//
// Color band rotates by tier (Phase 1 Q10):
//   K_4  → sam-yellow accent (avatar border, badge bg, corner blob)
//   G5_8 → sam-teal   accent (same)
//
// Avatar is a colored initials circle (Phase 1 Q9) — we don't collect
// child portraits per compliance.md data minimization.

import Link from "next/link";

import { formatGradeLevel } from "@/lib/format/gradeLevel";
import type { Tier } from "@/lib/tier/derive";

interface ChildCardProps {
  child: {
    id: string;
    name: string;
    grade_level: string | null;
    birth_year: number;
  };
  /** ISO timestamp of the most recent COMPLETED assessment session,
   *  or null if no completed sessions exist for this child. */
  lastCompletedAt: string | null;
  tier: Tier;
}

// Phase 1 Q3: "Last assessed Oct 24, 2023" via en-US short month.
function formatLastAssessed(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

// Display label for the grade badge. Falls back to a tier hint when
// children.grade_level is null (operator skipped the optional grade
// field on /add-child).
function gradeLabel(gradeLevel: string | null, tier: Tier): string {
  const trimmed = gradeLevel?.trim();
  if (trimmed) return formatGradeLevel(trimmed);
  return tier === "K_4" ? "K-4" : "Grades 5-8";
}

export function ChildCard({ child, lastCompletedAt, tier }: ChildCardProps) {
  const initial = child.name.trim().charAt(0).toUpperCase() || "?";

  // Tier-derived accent classes (Phase 1 Q10).
  const accent =
    tier === "K_4"
      ? {
          avatarBorder: "border-sam-yellow",
          avatarBg: "bg-sam-yellow/10",
          badgeBg: "bg-sam-yellow/20",
          badgeText: "text-sam-navy",
          blobBg: "bg-sam-yellow/10",
        }
      : {
          avatarBorder: "border-sam-teal",
          avatarBg: "bg-sam-teal/10",
          badgeBg: "bg-sam-teal/20",
          badgeText: "text-sam-teal",
          blobBg: "bg-sam-teal/10",
        };

  return (
    <div className="bg-white rounded-3xl md:rounded-[32px] p-6 md:p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30 flex flex-col transition-all hover:shadow-[0px_8px_32px_rgba(27,58,107,0.1)] relative overflow-hidden group">
      {/* Decorative corner blob — desktop only (mobile Stitch source
          doesn't have one and the smaller card looks busy with it). */}
      <div
        className={`hidden md:block absolute top-0 right-0 w-32 h-32 ${accent.blobBg} rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110`}
      />

      {/* Top row: avatar + name + grade badge + status row */}
      <div className="flex items-start gap-4 md:gap-6 mb-6 md:mb-8 relative">
        <div
          className={`shrink-0 w-12 h-12 md:w-24 md:h-24 rounded-2xl md:rounded-3xl ${accent.avatarBg} border-2 md:border-4 ${accent.avatarBorder} flex items-center justify-center`}
        >
          <span className="font-display-child text-xl md:text-3xl text-sam-navy font-bold">
            {initial}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="font-display-child text-xl md:text-3xl text-sam-navy">
              {child.name}
            </h2>
            <span
              className={`${accent.badgeBg} ${accent.badgeText} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}
            >
              {gradeLabel(child.grade_level, tier)}
            </span>
          </div>
          {lastCompletedAt ? (
            <div className="flex items-center gap-2 text-sam-navy/40 font-medium">
              <span className="material-symbols-outlined text-[20px]">
                calendar_today
              </span>
              <span className="text-caption">
                Last assessed {formatLastAssessed(lastCompletedAt)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sam-teal font-semibold">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <span className="text-caption">Ready to start</span>
            </div>
          )}
        </div>
      </div>

      {/* CTA stack — Start Assessment (always) + View Report
          (disabled when no completion, link when completion exists
          per Phase 1 Q1 + Q2). */}
      <div className="mt-auto space-y-4">
        <Link
          href={`/assessment?child_id=${child.id}`}
          className="w-full bg-sam-red text-white font-display-child text-lg md:text-xl py-4 rounded-2xl shadow-lg hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 group/cta"
        >
          Start Assessment
          <span className="material-symbols-outlined group-hover/cta:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
        {lastCompletedAt ? (
          // TODO(Item #8): /report route doesn't exist yet. Link target
          // points at /report?child=<id> as a placeholder; Item #8 will
          // own the actual route shape (could change to /report/[id]
          // or carry a session id instead).
          <Link
            href={`/report?child=${child.id}`}
            className="w-full text-sam-navy font-headline-adult text-base py-2 hover:text-sam-red transition-colors flex items-center justify-center gap-1"
          >
            View Report
            <span className="material-symbols-outlined text-[18px]">
              analytics
            </span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full text-sam-gray-mid font-headline-adult text-base py-2 cursor-not-allowed flex items-center justify-center gap-1"
          >
            View Report
            <span className="material-symbols-outlined text-[18px]">lock</span>
          </button>
        )}
      </div>
    </div>
  );
}
