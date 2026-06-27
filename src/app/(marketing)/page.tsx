/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";

import { LandingViewBeacon } from "./landing-view-beacon";

// Ported from stitch/module-a/01-landing-desktop.html (do not hand-edit
// either this file or the Stitch source — re-port if the design changes).
//
// Cycle 0 deviations from source, to be addressed in a follow-up:
//  - Stripped `dark:` Tailwind variants (no dark-mode toggle wired yet).
//  - Replaced inline `font-['Plus_Jakarta_Sans']` with the named
//    `font-display-child` token so next/font/google self-hosting works.
//  - Image src attributes swapped from broken Stitch CDN URLs to local
//    placeholder SVGs in /public/img/. Real S.A.M. assets will replace them.
//
// Phase 4a of Item #7: replaced the Stitch logged-in chrome (notifications/
// help/avatar in the top app bar) with a "Sign in" link → /login, and wired
// the hero + mascot-strip primary CTAs to /signup. Other unwired CTAs (View
// Sample Reports, Explore Dashboard, Book a Demo) and # nav/footer links
// remain pending real content.

export default function LandingPage() {
  return (
    <>
      <LandingViewBeacon />
      {/* TopAppBar */}
      <header className="bg-[#FEFBF6] font-display-child font-semibold top-0 z-40 border-b border-[#F2EDE4] shadow-[0px_4px_12px_rgba(27,58,107,0.05)] flex justify-between items-center w-full px-6 py-4 sticky">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center" aria-label="S.A.M Singapore Math — home">
            <Image
              src="/sam-logo.png"
              alt="S.A.M Singapore Math"
              width={3887}
              height={2182}
              priority
              className="h-16 w-auto"
            />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2 border-2 border-sam-navy text-sam-navy font-headline-adult rounded-xl hover:bg-sam-navy hover:text-white transition-all active:scale-95"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-container-max mx-auto px-gutter py-stack-lg">
        {/* Hero Section */}
        <section className="grid grid-cols-12 gap-gutter items-center min-h-[716px] mb-stack-lg">
          <div className="col-span-12 lg:col-span-6 space-y-stack-md">
            <div className="inline-flex items-center gap-3">
              <span
                className="material-symbols-outlined text-sam-navy text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                stars
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-headline-adult text-sam-navy text-2xl">
                  Atlas Assessment
                  <sup
                    className="font-semibold"
                    style={{ fontSize: "1em", top: "-0.3em" }}
                  >
                    ™
                  </sup>
                </span>
                <span className="font-body-regular text-sam-gray-mid text-base">
                  Powered by Inspirea Labs
                </span>
              </span>
            </div>
            <h1 className="font-display-child text-[64px] leading-tight text-sam-navy">
              Unlocking Math Potential,{" "}
              <span className="text-sam-red underline decoration-sam-yellow">
                One Step
              </span>{" "}
              at a Time.
            </h1>
            <p className="text-body-regular text-sam-gray-dark max-w-lg text-lg">
              A rigorous assessment journey designed for young learners. We turn
              complex data into actionable progress reports for parents and
              instructors.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/signup"
                className="bg-sam-red text-white font-headline-adult px-8 py-4 rounded-[16px] shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                Start Assessment
              </Link>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 relative flex justify-center items-center">
            {/* Mascot: brown long-haired mini dachshund */}
            <div className="relative z-10 w-full max-w-md">
              <img
                alt="Atlas dachshund mascot waving hello"
                className="rounded-[48px] shadow-2xl border-8 border-white transform rotate-3 bg-sam-cream"
                src="/mascot/waving.png"
              />
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 bg-sam-yellow p-4 rounded-2xl shadow-md rotate-12">
                <span
                  className="material-symbols-outlined text-sam-navy text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  calculate
                </span>
              </div>
              <div className="absolute -bottom-4 -left-8 bg-sam-teal p-6 rounded-full shadow-lg -rotate-12">
                <span
                  className="material-symbols-outlined text-white text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  architecture
                </span>
              </div>
            </div>
            {/* Background visual rhythm */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-sam-red/5 to-sam-navy/5 rounded-full blur-3xl -z-10" />
          </div>
        </section>

        {/* Bento Grid: Diagnostic Areas */}
        <section className="mb-stack-lg">
          <div className="text-center mb-stack-lg">
            <h2 className="font-display-child text-sam-navy mb-2">
              Assessment Strands
            </h2>
            <p className="text-sam-gray-mid font-body-regular">
              Comprehensive coverage of mathematical foundations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="col-span-1 bg-white p-8 rounded-[32px] shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light hover:border-sam-red transition-all group">
              <div className="w-14 h-14 bg-sam-red/10 rounded-2xl flex items-center justify-center mb-6 text-sam-red group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  apps
                </span>
              </div>
              <h3 className="font-headline-adult text-sam-navy mb-2">
                Number Sense
              </h3>
              <p className="text-sam-gray-mid text-sm">
                Deep analysis of place value, number patterns, and fundamental
                arithmetic logic for K-4 learners.
              </p>
            </div>
            {/* Card 2 */}
            <div className="col-span-1 bg-sam-navy p-8 rounded-[32px] text-white flex flex-col justify-between">
              <div>
                <span
                  className="material-symbols-outlined text-sam-yellow text-4xl mb-4"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  query_stats
                </span>
                <h3 className="font-headline-adult mb-2">
                  Misconception Mapping
                </h3>
              </div>
              <div className="text-[28px] font-black text-sam-yellow leading-tight">
                Misconception-tagged
              </div>
              <p className="text-white/70 text-xs">
                Every response is tagged to the specific mathematical
                misconception it reveals, so reports show exactly where to focus
                next.
              </p>
            </div>
            {/* Card 3 */}
            <div className="col-span-1 bg-white p-8 rounded-[32px] shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light hover:border-sam-teal transition-all group">
              <div className="w-14 h-14 bg-sam-teal/10 rounded-2xl flex items-center justify-center mb-6 text-sam-teal">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shapes
                </span>
              </div>
              <h3 className="font-headline-adult text-sam-navy mb-2">
                Geometry
              </h3>
              <p className="text-sam-gray-mid text-sm">
                Evaluating visualization skills and geometric understanding
                through interactive tiles.
              </p>
            </div>
            {/* Card 4 */}
            <div className="col-span-1 md:col-span-2 bg-sam-yellow/10 p-8 rounded-[32px] border border-sam-yellow/30 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-display-child text-sam-navy text-2xl mb-4">
                  Parents&rsquo; Report
                </h3>
                <p className="text-sam-gray-dark max-w-sm mb-8">
                  A clear, plain-language summary for families — your
                  child&rsquo;s strengths, where to focus next, and the
                  recommended starting level.
                </p>
                <h3 className="font-display-child text-sam-navy text-2xl mb-4">
                  Instructor Dashboard
                </h3>
                <p className="text-sam-gray-dark max-w-sm">
                  Real-time tracking of student progress with visual milestone
                  mapping and detailed error analysis.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-20 transform -rotate-12">
                <span
                  className="material-symbols-outlined text-[200px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  dashboard
                </span>
              </div>
            </div>
            {/* Card 5 */}
            <div className="col-span-1 bg-white p-8 rounded-[32px] shadow-[0px_4px_12px_rgba(27,58,107,0.08)] border border-sam-gray-light hover:border-sam-orange transition-all">
              <div className="w-14 h-14 bg-sam-orange/10 rounded-2xl flex items-center justify-center mb-6 text-sam-orange">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  speed
                </span>
              </div>
              <h3 className="font-headline-adult text-sam-navy mb-2">
                Operations & Algorithms
              </h3>
              <p className="text-sam-gray-mid text-sm">
                Calculation fluency and applied problem-solving across
                addition, subtraction, multiplication, and division.
              </p>
            </div>
          </div>
        </section>

        {/* Mascot Intervention / Journey Strip */}
        <section className="bg-sam-navy rounded-[40px] p-12 text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto relative z-10">
            <h2 className="font-display-child text-white text-4xl mb-6">
              Ready to start the journey?
            </h2>
            <p className="text-white/70 mb-8 font-body-regular">
              Join over 30,000 students who took Seriously Addictive Mathematics
              assessment. We personalize math education for every child.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/signup"
                className="bg-sam-red text-white px-10 py-4 rounded-[20px] font-bold shadow-xl"
              >
                Get Started Now
              </Link>
            </div>
          </div>
          {/* Mascot peek-a-boo */}
          <div className="absolute -bottom-4 right-10 w-48 h-48">
            <img
              alt="Atlas dachshund mascot celebrating"
              className="w-full h-full object-contain"
              src="/mascot/celebrating.png"
            />
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-sam-gray-light mt-stack-lg py-12">
        <div className="max-w-container-max mx-auto px-gutter">
          <div className="max-w-sm">
            <span className="text-xl font-black text-sam-navy">
              Atlas Assessment
            </span>
            <p className="text-sam-gray-mid text-sm mt-4">
              Empowering educators with world-class assessment tools.
            </p>
          </div>
        </div>
        <div className="max-w-container-max mx-auto px-gutter mt-12 pt-8 border-t border-sam-gray-light text-center text-xs text-sam-gray-mid">
          © 2026 Atlas Assessment Suite by S.A.M New York. All rights reserved.
        </div>
      </footer>
    </>
  );
}
