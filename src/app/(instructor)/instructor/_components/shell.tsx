// Shared instructor-portal chrome. Deliberately distinct from the parent
// report's editorial palette — this is the staff-facing adult surface
// (sam-* tokens, the same family the answer-log uses), not the parent
// report. Kept minimal: a brand top bar, a page wrapper, and a no-access
// state.

import Link from "next/link";

export function InstructorTopBar({ instructorName }: { instructorName?: string }) {
  return (
    <header className="bg-sam-cream sticky top-0 z-40 border-b border-sam-gray-light flex justify-between items-center w-full px-6 py-4">
      <Link href="/instructor" className="flex items-center gap-2">
        <span className="text-xl font-black text-sam-navy font-display-child">
          Atlas Assessment
        </span>
        <span className="text-xs font-bold text-sam-gray-mid uppercase tracking-wider hidden sm:inline">
          Instructor
        </span>
      </Link>
      {instructorName && (
        <span className="text-sm font-headline-adult text-sam-navy/70">
          {instructorName}
        </span>
      )}
    </header>
  );
}

export function InstructorShell({
  instructorName,
  children,
}: {
  instructorName?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <InstructorTopBar instructorName={instructorName} />
      <main className="flex-grow w-full px-6 py-8 md:py-10 max-w-5xl mx-auto">
        {children}
      </main>
    </>
  );
}

export function InstructorNotice({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <>
      <InstructorTopBar />
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
