// Visual chrome for one question. Tier-aware:
//
//   * K_4: adapted from sam-placement K4QuestionShell. Full-bleed sam-cream
//     bg with decorative blurs, centered prompt + yellow underline,
//     "Read carefully!" footer.
//
//   * G5_8: adapted from stitch/module-c/03-g58-mc-journey.html. Adds a
//     logo-only TopAppBar (no menu, no avatar — exit affordance deferred
//     per Item #6 plan gate decision #7). Same prompt + yellow underline
//     (brand mark retained per gate decision #4). No footer text — the
//     prompt is the focus. Brand palette only (gate decision #3).
//
// No question count in either tier — the engine terminates dynamically on
// confidence threshold, max-questions cap, or bank exhaustion. A "Question
// N of M" display would require a denominator we don't have.
//
// Pure presentational; no state, no fetch, no framer-motion. Imported into
// a "use client" boundary by assessment-client.

import type { Tier } from "@/lib/tier/derive";

interface Props {
  /** Question prompt (from question.content.stem). */
  prompt: string;
  /** Drives chrome variant. K_4 vs G5_8. */
  tier: Tier;
  /** Input component for this question's format. */
  children: React.ReactNode;
}

export function QuestionShell({ prompt, tier, children }: Props) {
  if (tier === "G5_8") {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-sam-cream">
        {/* Decorative accents — cooler tone than K-4 */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[15%] -left-16 h-48 w-48 rounded-full bg-sam-orange/10 blur-3xl" />
          <div className="absolute bottom-[25%] -right-16 h-64 w-64 rounded-full bg-sam-teal/10 blur-3xl" />
        </div>

        {/* TopAppBar — logo only. No menu, no avatar, no exit affordance
            (deferred to a later Item; no FSM/API expansion in Item #6). */}
        <header className="border-b border-sam-gray-light bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-center px-6">
            <span className="font-display-child text-lg font-bold tracking-tight text-sam-red">
              S.A.M. Assessment
            </span>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-3xl flex-col items-center gap-12">
            <div className="text-center">
              <h1 className="font-display-child text-3xl font-bold leading-tight text-sam-navy md:text-4xl">
                {prompt}
              </h1>
              <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-sam-yellow" />
            </div>

            <div className="w-full">{children}</div>
          </div>
        </main>
      </div>
    );
  }

  // K_4 (default)
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-sam-cream">
      {/* Decorative accents — Stitch module-b vibe */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-sam-yellow/20 blur-3xl" />
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-sam-red/5 blur-3xl" />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-3xl flex-col items-center gap-10">
          <header className="text-center">
            <h1 className="font-display-child text-3xl font-bold leading-tight text-sam-navy md:text-4xl">
              {prompt}
            </h1>
            <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-sam-yellow" />
          </header>

          <div className="w-full">{children}</div>
        </div>
      </main>

      <footer className="flex items-center gap-2 border-t border-sam-gray-light bg-white/80 px-6 py-4 backdrop-blur">
        <span
          className="material-symbols-outlined text-sam-orange"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          lightbulb
        </span>
        <span className="text-sm font-medium text-sam-gray-dark">
          Read carefully!
        </span>
      </footer>
    </div>
  );
}
