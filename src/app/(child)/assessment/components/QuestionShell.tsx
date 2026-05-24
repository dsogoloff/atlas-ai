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
// Progress chrome (Item #12 Phase 7.7): both tiers render a "Question N
// of up to 25" copy + a subtle progress bar. The "up to" hedge is
// load-bearing — sessions can terminate early on confidence-threshold-
// met or bank-exhausted, so the 25 is a ceiling not a target. K-4 uses
// the brand red bar; G5-8 uses a muted neutral, matching the existing
// tier-aware chrome distinction (cheerful for K-4, measured for G5-8).
//
// Pure presentational; no state, no fetch, no framer-motion. Imported into
// a "use client" boundary by assessment-client.

import type { Tier } from "@/lib/tier/derive";
import type { ProgressDisplay } from "@/lib/display/progress";
import type { ClientQuestionImage } from "@/lib/questionPicker/types";

import { QuestionImage } from "./QuestionImage";

interface Props {
  /** Question prompt (from question.content.stem). */
  prompt: string;
  /** Drives chrome variant. K_4 vs G5_8. */
  tier: Tier;
  /** Progress chrome data — computed by the assessment client from
   *  reducer state via computeProgressDisplay(responseCount). */
  progress: ProgressDisplay;
  /** Optional image (from question.content.image). When present, renders
   *  between prompt and input children per Item #13a Phase 3 visual gate.
   *  Undefined for text-only questions; behavior is identical to pre-
   *  Phase-3 (no image slot rendered). */
  image?: ClientQuestionImage;
  /** Input component for this question's format. */
  children: React.ReactNode;
}

export function QuestionShell({
  prompt,
  tier,
  progress,
  image,
  children,
}: Props) {
  if (tier === "G5_8") {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-sam-cream">
        {/* Decorative accents — cooler tone than K-4 */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[15%] -left-16 h-48 w-48 rounded-full bg-sam-orange/10 blur-3xl" />
          <div className="absolute bottom-[25%] -right-16 h-64 w-64 rounded-full bg-sam-teal/10 blur-3xl" />
        </div>

        {/* TopAppBar — logo only + G5-8 progress chrome (muted neutral). */}
        <header className="border-b border-sam-gray-light bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-6 px-6">
            <span className="font-display-child text-lg font-bold tracking-tight text-sam-red">
              S.A.M. Assessment
            </span>
            <ProgressChrome progress={progress} tier="G5_8" />
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-6 py-12">
          <div className="flex w-full max-w-3xl flex-col items-center gap-12">
            <div className="text-center">
              <h1 className="font-display-child text-3xl font-bold leading-tight text-sam-navy md:text-4xl">
                {prompt}
              </h1>
              <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-sam-yellow" />
            </div>

            {image && (
              <QuestionImage key={image.url} image={image} tier="G5_8" />
            )}

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

      {/* K-4 progress chrome — brand red bar, cheerful copy. Sits at
          the very top so the child sees it without scrolling. */}
      <div className="border-b border-sam-gray-light/60 bg-white/80 px-6 py-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <ProgressChrome progress={progress} tier="K_4" />
        </div>
      </div>

      <main className="flex flex-1 items-start justify-center px-6 py-10">
        <div className="flex w-full max-w-3xl flex-col items-center gap-10">
          <header className="text-center">
            <h1 className="font-display-child text-3xl font-bold leading-tight text-sam-navy md:text-4xl">
              {prompt}
            </h1>
            <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-sam-yellow" />
          </header>

          {image && (
            <QuestionImage key={image.url} image={image} tier="K_4" />
          )}

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

// Tier-aware progress bar. Pure presentational — copy + width come
// from the ProgressDisplay precomputed in the helper.
function ProgressChrome({
  progress,
  tier,
}: {
  progress: ProgressDisplay;
  tier: Tier;
}) {
  // K-4: cheerful brand red. G5-8: muted neutral — same restraint as
  // the G5-8 chrome's other tier-aware deltas.
  const fillClass = tier === "K_4" ? "bg-sam-red" : "bg-sam-navy/40";
  const trackClass =
    tier === "K_4" ? "bg-sam-red/10" : "bg-sam-gray-light";

  return (
    <div
      className="flex w-full items-center gap-3"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={progress.maxQuestions}
      aria-valuenow={progress.questionNumber}
      aria-label={progress.copy}
    >
      <span className="shrink-0 text-xs font-bold text-sam-navy/70 md:text-sm">
        {progress.copy}
      </span>
      <div className={`h-2 flex-1 overflow-hidden rounded-full ${trackClass}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${fillClass}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
