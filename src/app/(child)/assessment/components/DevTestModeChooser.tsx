"use client";

// DEV-ONLY pre-start chooser for the assessment session.
//
// Rendered by AssessmentClient ONLY when ENABLE_COMPREHENSIVE_PILOT is on
// (a server flag passed down as a prop). In production the flag is off, this
// component never mounts, and the session auto-starts a SHORT test exactly as
// before. Its sole job is to let an operator (QA) pick the short vs
// comprehensive test type and click Start — the comprehensive flow otherwise
// has no UI entry point. The server re-checks the same flag, so this is a
// convenience surface, not a security boundary.

import type { Tier } from "@/lib/tier/derive";

interface Props {
  tier: Tier;
  comprehensive: boolean;
  onChange: (comprehensive: boolean) => void;
  onStart: () => void;
}

export function DevTestModeChooser({
  tier,
  comprehensive,
  onChange,
  onStart,
}: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sam-cream p-6">
      <div className="w-full max-w-md rounded-2xl border border-sam-gray-light bg-white p-6 shadow-sm">
        <p className="mb-1 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
          Dev only · pilot flag on
        </p>
        <h1 className="mt-2 font-display-child text-lg font-bold text-sam-navy">
          Choose test type
        </h1>
        <p className="mt-1 text-sm text-sam-gray">
          This picker is gated behind <code>ENABLE_COMPREHENSIVE_PILOT</code>{" "}
          and is not shown in production.
        </p>

        <fieldset className="mt-4 flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sam-gray-light p-3 has-[:checked]:border-sam-teal has-[:checked]:bg-sam-teal/5">
            <input
              type="radio"
              name="test-mode"
              className="mt-1"
              checked={!comprehensive}
              onChange={() => onChange(false)}
            />
            <span>
              <span className="block text-sm font-bold text-sam-navy">
                Short test
              </span>
              <span className="block text-xs text-sam-gray">
                The default adaptive placement (what parents get).
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sam-gray-light p-3 has-[:checked]:border-sam-teal has-[:checked]:bg-sam-teal/5">
            <input
              type="radio"
              name="test-mode"
              className="mt-1"
              checked={comprehensive}
              onChange={() => onChange(true)}
            />
            <span>
              <span className="block text-sm font-bold text-sam-navy">
                Comprehensive test
              </span>
              <span className="block text-xs text-sam-gray">
                Longer per-strand coverage run (budget / floors / hard cap).
              </span>
            </span>
          </label>
        </fieldset>

        <button
          type="button"
          onClick={onStart}
          className="mt-5 w-full rounded-full bg-sam-teal px-6 py-3 font-display-child text-sm font-bold text-white shadow-sm transition hover:bg-sam-teal/90"
        >
          Start {comprehensive ? "comprehensive" : "short"} test
          {tier === "K_4" ? " (K-4)" : " (5-8)"}
        </button>
      </div>
    </div>
  );
}
