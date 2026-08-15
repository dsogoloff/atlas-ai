// STAFF-ONLY placement block for a SHORT test.
//
// WHY THIS EXISTS
// ---------------
// A short report deliberately withholds the placement from PARENTS: a short
// sample does not yield a placement, and showing one would leak a
// comprehensive-shaped claim off a ten-item check. That withholding lives in
// report-article.tsx (`!reportContent.readiness`) and is NOT touched here.
//
// But the admin ("master instructor") surface renders that SAME ReportArticle,
// so it inherited the withholding — leaving the director with no placement
// value anywhere on a short test, which is exactly what they need at
// enrollment to set the level in iClassPro.
//
// This block is that value, and ONLY on staff surfaces. It is rendered by the
// instructor/admin student-detail page, never by the parent report. The parent
// report component is unchanged; nothing here is importable into it by
// accident, because the page that renders it is already behind the staff
// route + requireStaffAal2.
//
// TWO STRINGS, DELIBERATELY BOTH
// ------------------------------
//   • samLevel      — the parent-facing label ("S.A.M Level 3"). Shown so staff
//     read the same words a parent would on a comprehensive report.
//   • canonicalLevel — the FRANCHISE §4.2 contract value ("L3"). This is the
//     string that gets copy-pasted into iClassPro, so it is rendered verbatim,
//     selectable, and visually separated from the prose label. Both are derived
//     from ONE clamped level by placementStrings() (canonical-level.ts), so
//     they cannot disagree.

import type { CanonicalLevel } from "@/lib/report/canonical-level";

export function StaffPlacementBlock({
  samLevel,
  canonicalLevel,
}: {
  /** Parent-facing label, e.g. "S.A.M Level 3". */
  samLevel: string;
  /** FRANCHISE §4.2 contract value, e.g. "L3". */
  canonicalLevel: CanonicalLevel;
}) {
  return (
    <section
      className="mt-2 mb-8 rounded-[24px] border-2 border-sam-navy/10 bg-sam-cream/60 p-6 md:p-8"
      aria-labelledby="staff-placement-heading"
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="material-symbols-outlined text-sam-navy text-[20px]"
          aria-hidden="true"
        >
          school
        </span>
        <h2
          id="staff-placement-heading"
          className="font-headline-adult text-sam-navy font-semibold"
        >
          Placement for enrollment
        </h2>
        <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-sam-gray-mid">
          Staff only
        </span>
      </div>

      <p className="text-sam-gray-mid text-sm mb-5">
        Not shown to the parent on a short test. Use the level below when
        enrolling this student.
      </p>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-sam-gray-mid mb-1">
            Recommended placement
          </p>
          <p className="font-headline-adult text-sam-navy text-xl">{samLevel}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-sam-gray-mid mb-1">
            iClassPro level
          </p>
          {/* Selectable + monospaced: this exact string is copy-pasted. */}
          <p className="font-mono text-sam-navy text-2xl font-bold tracking-wide select-all">
            {canonicalLevel}
          </p>
        </div>
      </div>

      <p className="text-sam-gray-mid text-xs mt-5">
        Based on a short check. Confirm with a comprehensive assessment after
        enrollment.
      </p>
    </section>
  );
}
