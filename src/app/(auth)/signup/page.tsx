/* eslint-disable @next/next/no-img-element */
// Ported from stitch/module-a/02-parent-signup-desktop.html.
//
// Cycle 1 deviations from source (faithful otherwise):
//  - Stripped `dark:` Tailwind variants (no dark-mode toggle wired yet).
//  - Replaced inline `font-['Plus_Jakarta_Sans']` with `font-display-child`
//    so next/font/google self-hosting works.
//  - Mascot image src swapped from broken Stitch CDN URL to local placeholder.
//
// Spec gaps to address before launch (intentionally NOT fixed in this port to
// keep diffs reviewable; all flagged in features.md / compliance.md):
//  - features.md §5 requires a S.A.M. center selector at signup. Not in
//    this Stitch screen.
//  - compliance.md §2 specifies the locked COPPA + school-operator consent
//    text. The Stitch placeholder text below differs and must be replaced.
//  - Form has no submit handler / validation / Supabase Auth wiring.

import Link from "next/link";

export default function SignupPage() {
  return (
    <>
      <main className="w-full max-w-container-max px-gutter md:px-margin-desktop py-stack-lg flex-1 flex items-center justify-center">
        {/* Two Column Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter w-full bg-white rounded-[32px] overflow-hidden shadow-[0px_4px_24px_rgba(27,58,107,0.08)] min-h-[720px]">
          {/* Branding / Illustration Column (hidden on mobile) */}
          <div className="hidden md:flex flex-col justify-center items-center p-stack-lg bg-sam-navy/5 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-sam-yellow/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-sam-red/10 rounded-full blur-3xl" />
            <div className="relative z-10 text-center space-y-stack-md max-w-[440px]">
              <div className="flex justify-center mb-8">
                <img
                  alt="Family using Atlas Assessment together"
                  className="w-full h-64 object-cover rounded-3xl shadow-lg border-4 border-white bg-sam-cream"
                  src="/img/placeholder-mascot.svg"
                />
              </div>
              <h1 className="font-display-child text-display-child text-sam-navy">
                Welcome to the Journey.
              </h1>
              <p className="font-body-regular text-body-regular text-sam-gray-mid">
                Atlas Assessment helps you understand your child&rsquo;s
                mathematical potential through engaging diagnostics and clear,
                actionable reporting.
              </p>
              <div className="pt-stack-md flex items-center justify-center gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-sam-gray-light flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-sam-teal"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    analytics
                  </span>
                  <span className="font-caption text-caption text-sam-navy">
                    Diagnostic Reports
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-sam-gray-light flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-sam-orange"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    trending_up
                  </span>
                  <span className="font-caption text-caption text-sam-navy">
                    Growth Tracking
                  </span>
                </div>
              </div>
            </div>
            {/* Mascot peek with speech bubble */}
            <div className="absolute bottom-6 left-6 flex items-center gap-4">
              <img
                alt="Atlas mascot"
                className="w-20 h-20 object-contain"
                src="/img/placeholder-mascot.svg"
              />
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-sam-gray-light relative">
                <p className="text-caption font-caption text-sam-navy italic">
                  &ldquo;Let&rsquo;s grow together!&rdquo;
                </p>
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-sam-gray-light rotate-45" />
              </div>
            </div>
          </div>

          {/* Signup Form Column */}
          <div className="p-8 md:p-margin-desktop flex flex-col justify-center">
            <div className="max-w-[480px] mx-auto w-full">
              <header className="mb-stack-lg">
                <div className="mb-4">
                  <span className="text-2xl font-black text-sam-navy">
                    Atlas Assessment
                  </span>
                </div>
                <h2 className="font-headline-adult text-headline-adult text-sam-navy mb-2">
                  Create Parent Account
                </h2>
                <p className="font-body-regular text-body-regular text-sam-gray-mid">
                  Empower your child&rsquo;s math learning path today.
                </p>
              </header>
              <form className="space-y-stack-md">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      className="font-caption text-caption text-sam-navy ml-1"
                      htmlFor="first-name"
                    >
                      First Name
                    </label>
                    <input
                      className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white"
                      id="first-name"
                      placeholder="Enter first name"
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="font-caption text-caption text-sam-navy ml-1"
                      htmlFor="last-name"
                    >
                      Last Name
                    </label>
                    <input
                      className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white"
                      id="last-name"
                      placeholder="Enter last name"
                      type="text"
                    />
                  </div>
                </div>
                {/* Email */}
                <div className="space-y-2">
                  <label
                    className="font-caption text-caption text-sam-navy ml-1"
                    htmlFor="email"
                  >
                    Parent Email Address
                  </label>
                  <input
                    className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white"
                    id="email"
                    placeholder="example@email.com"
                    type="email"
                  />
                </div>
                {/* Password */}
                <div className="space-y-2">
                  <label
                    className="font-caption text-caption text-sam-navy ml-1"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white"
                      id="password"
                      placeholder="Min. 12 characters"
                      type="password"
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sam-gray-mid"
                      type="button"
                      aria-label="Show password"
                    >
                      <span className="material-symbols-outlined text-sm">
                        visibility
                      </span>
                    </button>
                  </div>
                </div>
                {/* COPPA Consent (Stitch placeholder text — final language per
                    compliance.md §2 will replace this when wired up) */}
                <div className="bg-sam-cream p-4 rounded-2xl border border-sam-orange/20 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center h-6">
                      <input
                        className="w-5 h-5 rounded border-sam-gray-light text-sam-red focus:ring-sam-red"
                        id="coppa"
                        type="checkbox"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="font-caption text-[13px] leading-tight text-sam-navy font-bold flex items-center gap-1"
                        htmlFor="coppa"
                      >
                        <span
                          className="material-symbols-outlined text-sam-orange text-lg"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified_user
                        </span>
                        COPPA Consent &amp; Privacy Agreement
                      </label>
                      <p className="font-caption text-[12px] text-sam-gray-mid leading-relaxed">
                        I am the parent/legal guardian and give consent for
                        Atlas Assessment to collect limited data for diagnostic
                        purposes as per the{" "}
                        <Link className="text-sam-red underline" href="/coppa">
                          Children&rsquo;s Online Privacy Protection Rule
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="pt-4 space-y-4">
                  <button
                    className="w-full h-14 bg-sam-red text-white font-headline-adult rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    type="submit"
                  >
                    <span>Create Parent Account</span>
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </button>
                  <div className="flex items-center justify-center gap-2 font-caption text-caption text-sam-gray-mid">
                    <span>Already have an account?</span>
                    <a
                      className="text-sam-red font-bold hover:underline"
                      href="#"
                    >
                      Log in
                    </a>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full py-stack-md flex justify-center border-t border-sam-gray-light/30">
        <p className="font-caption text-caption text-sam-gray-mid/60">
          © 2024 Atlas Assessment Diagnostic Suite. All rights reserved.
        </p>
      </footer>
    </>
  );
}
