// Pre-narration gap detection for the parent report.
//
// The narration row is written a few SECONDS after a session completes: the
// completion path sets completed_at, then the narration trigger generates the
// prose and upserts report_narrations in one shot at the end. A report opened
// in that gap has no narration row yet, so it would render the pre-narration
// shell (generic strand lede, no Strengths / Areas) — the "blank narrative"
// timing artifact. The report page uses this predicate to instead show a brief
// "preparing your report" interstitial that polls until the row lands.
//
// The wait is BOUNDED: once the row exists (any terminal state — ok, suppressed,
// or failed) it is no longer pending, and once completion is older than the
// bound the page falls through to the normal report. So a narration that fails
// or never arrives degrades to the existing generic-lede behaviour rather than
// trapping the parent on an indefinite interstitial.

/** How long after completion to keep waiting for the narration row before
 *  giving up and rendering the report as-is. Live generation is ~8s; the bound
 *  leaves headroom for a slow call without stranding the reader. */
export const NARRATION_WAIT_BOUND_MS = 30_000;

/** Current wall-clock ms. Isolated in this non-component helper so the
 *  force-dynamic report Server Component doesn't read the impure `Date.now()`
 *  directly in render scope (the react-hooks/react-compiler purity lint flags
 *  known-impure globals there). The report is uncached/dynamic, so reading the
 *  clock per request is correct — the helper just keeps the call out of render. */
export function nowMs(): number {
  return Date.now();
}

/** True while a freshly-completed session's narration is still in flight: no
 *  report_narrations row yet AND completion is within the wait bound. The
 *  trigger writes the row once, at the end of generation, so "no row" is the
 *  in-flight signal. A present row (even status:"failed" or a legitimately
 *  strand-suppressed ok row) is terminal → not pending. */
export function isNarrationPending(
  hasNarrationRow: boolean,
  completedAt: string | null,
  nowMs: number,
  boundMs: number = NARRATION_WAIT_BOUND_MS,
): boolean {
  if (hasNarrationRow) return false;
  if (!completedAt) return false;
  const completedMs = Date.parse(completedAt);
  if (!Number.isFinite(completedMs)) return false;
  return nowMs - completedMs < boundMs;
}
