/* eslint-disable @next/next/no-img-element */
// Ported from stitch/module-a/04-add-child-desktop.html.
//
// Cycle 1 deviations from source (faithful otherwise):
//  - Stripped `dark:` Tailwind variants.
//  - Replaced inline `font-['Plus_Jakarta_Sans']` with `font-display-child`.
//  - Replaced 2 broken Stitch CDN images (instructor avatar, mascot) with
//    local placeholder SVGs.
//  - Birth Year extended to 2010-2022 and Grade extended to K-8 to match
//    the K-8 architecture target locked in features.md (Stitch source only
//    covered K-5 / 2014-2019). Range is illustrative; tighten when the
//    real grade-eligibility logic lands.
//  - Help-tip wording: replaced "Sammy" with "the engine" (mascot name not
//    yet locked).
//
// Spec gaps to address before launch (intentionally NOT fixed in this port):
//  - Form has no submit handler, no validation, no Supabase wiring.
//  - The `home_center_id` for the new child is inherited from the parent
//    (per features.md §5) — not surfaced in the UI yet, but should appear
//    once the signup flow captures the parent's center.
//  - Cancel destination is hardcoded to /signup; real flow goes back to the
//    referring page (signup vs dashboard) once router state is wired.

import Link from "next/link";

export default function AddChildPage() {
  return (
    <>
      {/* TopAppBar */}
      <header className="bg-[#FEFBF6] font-display-child font-semibold top-0 z-40 border-b border-[#F2EDE4] shadow-[0px_4px_12px_rgba(27,58,107,0.05)] flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-sam-navy">
            Atlas Assessment
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-8 items-center">
            <a
              className="text-sam-navy/60 hover:text-sam-red transition-colors"
              href="#"
            >
              Students
            </a>
            <a
              className="text-sam-navy/60 hover:text-sam-red transition-colors"
              href="#"
            >
              Reports
            </a>
            <a
              className="text-sam-red border-b-2 border-sam-red pb-1"
              href="#"
            >
              Add Child
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="p-2 text-sam-navy/60 hover:text-sam-red transition-colors active:scale-95 active:duration-150"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button
              className="p-2 text-sam-navy/60 hover:text-sam-red transition-colors active:scale-95 active:duration-150"
              aria-label="Help"
            >
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
              <img
                alt="Parent profile"
                src="/img/placeholder-avatar.svg"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-gutter py-stack-lg relative overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-sam-yellow/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-sam-teal/10 rounded-full blur-3xl" />

        {/* Add Child Card */}
        <div className="w-full max-w-[540px] bg-white rounded-3xl shadow-[0px_4px_24px_rgba(27,58,107,0.08)] p-10 relative z-10 border border-sam-gray-light/30">
          {/* Mascot */}
          <div className="flex justify-center -mt-24 mb-6">
            <div className="w-32 h-32 relative">
              <img
                alt="Mascot"
                className="w-full h-full object-contain"
                src="/img/placeholder-mascot.svg"
              />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="font-display-child text-display-child text-sam-navy mb-2">
              Welcome!
            </h1>
            <p className="text-sam-gray-mid font-headline-adult text-lg">
              Let&rsquo;s start your child&rsquo;s learning journey.
            </p>
          </div>

          <form className="space-y-6">
            {/* Child name */}
            <div className="space-y-2">
              <label
                className="block font-headline-adult text-sm font-semibold text-sam-navy ml-1"
                htmlFor="child-name"
              >
                Child&rsquo;s Name
              </label>
              <div className="relative">
                <input
                  className="w-full px-5 py-4 bg-sam-cream border-2 border-transparent focus:border-sam-red focus:ring-0 rounded-2xl text-sam-navy placeholder:text-sam-gray-mid/60 transition-all font-medium outline-none"
                  id="child-name"
                  placeholder="e.g. Alex"
                  type="text"
                />
                <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-sam-gray-mid">
                  person
                </span>
              </div>
            </div>

            {/* Birth year + grade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  className="block font-headline-adult text-sm font-semibold text-sam-navy ml-1"
                  htmlFor="birth-year"
                >
                  Birth Year
                </label>
                <div className="relative">
                  <select
                    className="w-full px-5 py-4 bg-sam-cream border-2 border-transparent focus:border-sam-red focus:ring-0 rounded-2xl text-sam-navy appearance-none cursor-pointer transition-all font-medium outline-none"
                    id="birth-year"
                    defaultValue=""
                  >
                    <option disabled value="">
                      Select
                    </option>
                    {Array.from({ length: 13 }, (_, i) => 2010 + i).map(
                      (year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ),
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-sam-gray-mid pointer-events-none">
                    calendar_month
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label
                  className="block font-headline-adult text-sm font-semibold text-sam-navy ml-1"
                  htmlFor="grade"
                >
                  Current Grade
                </label>
                <div className="relative">
                  <select
                    className="w-full px-5 py-4 bg-sam-cream border-2 border-transparent focus:border-sam-red focus:ring-0 rounded-2xl text-sam-navy appearance-none cursor-pointer transition-all font-medium outline-none"
                    id="grade"
                    defaultValue=""
                  >
                    <option disabled value="">
                      Select
                    </option>
                    <option value="K">Kindergarten</option>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={String(g)}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-sam-gray-mid pointer-events-none">
                    school
                  </span>
                </div>
              </div>
            </div>

            {/* Help tip */}
            <div className="bg-sam-yellow/10 border border-sam-yellow/30 p-4 rounded-2xl flex gap-3">
              <span
                className="material-symbols-outlined text-sam-orange shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                info
              </span>
              <p className="text-caption font-caption text-sam-navy/80 leading-snug">
                Providing the correct grade helps the engine tailor diagnostic
                questions to your child&rsquo;s level.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-4">
              <button
                className="w-full py-5 bg-sam-red text-white font-display-child text-xl rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                type="button"
              >
                Add Child
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <Link
                href="/signup"
                className="block w-full py-3 bg-transparent text-sam-navy/60 font-headline-adult text-sm font-semibold hover:text-sam-navy transition-colors text-center"
              >
                Cancel and Go Back
              </Link>
            </div>
          </form>
        </div>
      </main>

      <footer className="p-6 text-center text-sam-gray-mid/50 text-caption font-caption">
        © 2024 Atlas Assessment Diagnostic Suite. All rights reserved.
      </footer>
    </>
  );
}
