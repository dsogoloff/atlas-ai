// Shared instructor-portal chrome. Deliberately distinct from the parent
// report's editorial palette — this is the staff-facing adult surface
// (sam-* tokens, the same family the answer-log uses), not the parent
// report. Kept minimal: a brand top bar, a page wrapper, and a no-access
// state.

import Link from "next/link";

import { signOutAction } from "@/lib/auth/sign-out";
import { getBranding } from "@/lib/branding";

// The chrome is shared by the instructor portal and the tenant-wide admin
// view. `roleLabel` / `homeHref` default to the instructor surface so every
// existing instructor caller is unchanged; the admin view passes "Admin" /
// "/admin".
export function InstructorTopBar({
  instructorName,
  roleLabel = "Instructor",
  homeHref = "/instructor",
}: {
  instructorName?: string;
  roleLabel?: string;
  homeHref?: string;
}) {
  return (
    <header className="bg-sam-cream sticky top-0 z-40 border-b border-sam-gray-light flex justify-between items-center w-full px-6 py-4">
      <Link href={homeHref} className="flex items-center gap-2">
        <span className="text-xl font-black text-sam-navy font-display-child">
          {getBranding().productName}
        </span>
        <span className="text-xs font-bold text-sam-gray-mid uppercase tracking-wider hidden sm:inline">
          {roleLabel}
        </span>
      </Link>
      {/* Right cluster — staff name + Sign out. Shown only when a name is
          present, i.e. a signed-in staff surface (instructor portal / admin
          view). The no-access InstructorNotice renders the bar WITHOUT a name,
          so it gets no sign-out (it has no session context). */}
      {instructorName && (
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-sm font-headline-adult text-sam-navy/70">
            {instructorName}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 text-sm font-headline-adult text-sam-navy/70 hover:text-sam-red border border-sam-gray-light hover:border-sam-red rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                logout
              </span>
              Sign out
            </button>
          </form>
        </div>
      )}
    </header>
  );
}

export function InstructorShell({
  instructorName,
  roleLabel,
  homeHref,
  children,
}: {
  instructorName?: string;
  roleLabel?: string;
  homeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <InstructorTopBar
        instructorName={instructorName}
        roleLabel={roleLabel}
        homeHref={homeHref}
      />
      <main className="flex-grow w-full px-6 py-8 md:py-10 max-w-5xl mx-auto">
        {children}
      </main>
    </>
  );
}

export function InstructorNotice({
  title,
  body,
  roleLabel,
  homeHref,
}: {
  title: string;
  body: string;
  roleLabel?: string;
  homeHref?: string;
}) {
  return (
    <>
      <InstructorTopBar roleLabel={roleLabel} homeHref={homeHref} />
      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center bg-white rounded-3xl p-10 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
          <h1 className="font-display-child text-2xl text-sam-navy mb-4">
            {title}
          </h1>
          <p className="font-body-regular text-sam-gray-mid">{body}</p>
        </div>
      </main>
    </>
  );
}
