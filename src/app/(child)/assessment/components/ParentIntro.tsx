"use client";

// Parent intro / instructions screen, shown on the SHORT-test start path after
// child selection and BEFORE the first question (gated by ENABLE_PARENT_INTRO;
// AssessmentClient holds back the auto-start until the parent taps Start).
//
// Two things the supervising parent reads here:
//   1. AGE-DEPENDENT proctoring instructions, keyed to the child's grade and
//      routed by deriveProctoringMode (cutoff at grade 2/3 — see
//      @/lib/proctoring/mode). "read-aloud" vs "no-assistance".
//   2. An "about this check" section that sets expectations for what the short
//      check is and isn't (§2.4 discipline — directional, not diagnostic).
//
// ALL copy is DRAFT pending founder approval and lives in
// @/lib/proctoring/copy — this component only lays it out, so approved wording
// drops in without touching structure. Tier drives only cosmetic chrome
// (cheerful K-4 vs measured G5-8), matching the rest of the assessment UI.

import type { Tier } from "@/lib/tier/derive";
import type { ProctoringMode } from "@/lib/proctoring/mode";
import { PARENT_INTRO_COPY } from "@/lib/proctoring/copy";

interface Props {
  mode: ProctoringMode;
  tier: Tier;
  /** Fired when the parent taps Start — releases the held auto-start. */
  onStart: () => void;
}

export function ParentIntro({ mode, tier, onStart }: Props) {
  const copy = PARENT_INTRO_COPY;
  const m = copy.modes[mode];
  const accent = tier === "K_4" ? "text-sam-red" : "text-sam-navy";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sam-cream p-6">
      <div className="w-full max-w-xl rounded-3xl border border-sam-gray-light bg-white p-8 shadow-sm">
        <h1 className={`font-display-child text-2xl font-bold ${accent}`}>
          {copy.screenTitle}
        </h1>

        {/* Proctoring instructions for this child's grade band. */}
        <section className="mt-6" aria-labelledby="proctor-heading">
          <span className="inline-block rounded-full bg-sam-yellow/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sam-navy">
            {m.badge}
          </span>
          <h2
            id="proctor-heading"
            className="mt-3 font-display-child text-lg font-bold text-sam-navy"
          >
            {m.heading}
          </h2>

          {m.canPoints && (
            <div className="mt-4">
              <p className="text-sm font-bold text-sam-navy">{m.canTitle}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {m.canPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-sam-gray-dark">
                    <span
                      className="material-symbols-outlined text-base text-sam-teal"
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {m.dontPoints && (
            <div className="mt-4">
              <p className="text-sm font-bold text-sam-navy">{m.dontTitle}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {m.dontPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-sam-gray-dark">
                    <span
                      className="material-symbols-outlined text-base text-sam-red"
                      aria-hidden="true"
                    >
                      do_not_disturb_on
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {m.points && (
            <ul className="mt-4 flex flex-col gap-2">
              {m.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-sam-gray-dark">
                  <span
                    className="material-symbols-outlined text-base text-sam-teal"
                    aria-hidden="true"
                  >
                    arrow_right
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 rounded-2xl bg-sam-cream px-4 py-3 text-sm font-semibold text-sam-navy">
            {m.summary}
          </p>
        </section>

        {/* What the short check is / isn't (§2.4). */}
        <section className="mt-8 border-t border-sam-gray-light pt-6" aria-labelledby="about-heading">
          <h2
            id="about-heading"
            className="font-display-child text-lg font-bold text-sam-navy"
          >
            {copy.about.heading}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {copy.about.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-sam-gray-dark">
                <span
                  className="material-symbols-outlined text-base text-sam-teal"
                  aria-hidden="true"
                >
                  info
                </span>
                {point}
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 w-full rounded-full bg-sam-red px-6 py-4 font-display-child text-lg font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none"
        >
          {copy.startButton}
        </button>
      </div>
    </div>
  );
}
