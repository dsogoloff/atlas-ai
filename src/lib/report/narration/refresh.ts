// Atlas Assessment — stale-narration detection for low-level report self-heal.
//
// Why this exists: narration is generated ONCE at session completion and
// cached in report_narrations; the report page reads that cached row and never
// regenerates (see report/page.tsx). PR #160 added the engine 6-strand
// fallback so a young-band session (0A/0B/L1/L2, content_id NULL) assembles
// real strand_mastery — but any session narrated BEFORE #160 was cached when
// sub-strand resolution was still empty. At that point the anti-fabrication
// guard in generate.ts saw no strand data and deterministically suppressed
// strand_lede + emptied strengths, so the cached row renders a blank "Strand
// Performance" section with no Strengths. The page re-assembles content live
// (so the radar/bars already reflect #160), but the cached narrative stays
// stale.
//
// These pure predicates let the report page detect exactly that stale shape —
// an "ok" row missing strand prose while the freshly assembled content now
// HAS strand data — so it can regenerate once and re-cache. Working levels
// (0C/L3-L6) cached non-empty strand prose, so they never match; genuinely
// thin sessions (no strand data even after fallback) never match either, so
// we never regenerate something that would only be suppressed again.

import type { ReportContent, ReportNarration } from "@/lib/report/types";
import type { ReportNarrationRow } from "./resolve";

/** True when at least one sub-strand carries measured responses (total > 0) —
 *  the same condition generate.ts's anti-fabrication guard keys off. With
 *  #160's fallback in place this is true for assessed young-band sessions. */
export function contentHasStrandData(content: ReportContent): boolean {
  return content.strand_mastery.some((s) => s.total > 0);
}

/** True when a cached narration row was written under the no-strand-data
 *  assumption: status "ok", but strand_lede absent and strengths empty/absent
 *  (the exact output of generate.ts's guard when hasStrandData was false).
 *  Pre-#160 young-band rows have precisely this shape. */
export function narrationRowIsStrandSuppressed(
  row: ReportNarrationRow | null,
): boolean {
  if (!row || row.status !== "ok") return false;
  const noLede = row.strand_lede === null;
  const noStrengths =
    row.findings_strengths === null || row.findings_strengths.length === 0;
  return noLede && noStrengths;
}

/** True when a cached row is the self-heal "already attempted" sentinel — a
 *  status:"failed" row. The report-page self-heal persists exactly this after a
 *  regeneration fails so the NEXT view renders the data-only fallback instead
 *  of regenerating again. This is the at-most-once guard: a deterministically
 *  failing session settles on a failed marker rather than looping. */
export function narrationRowIsSelfHealAttempted(
  row: ReportNarrationRow | null,
): boolean {
  return row !== null && row.status === "failed";
}

/** Regenerate the cached narration in exactly two recoverable shapes, and never
 *  more than once per session:
 *
 *   1. NO cached row at all + live content has strand data — the completion-time
 *      trigger (attemptNarration) threw before persisting (e.g. a transient
 *      callSonnet failure as the session completed). This is the L4 defect:
 *      the report rendered data-only with no strengths/growth narrative and the
 *      old self-heal (strand-suppressed rows only) never recovered it. Heal once.
 *   2. A strand-suppressed "ok" row + live content now has strand data — the
 *      #160 pre-fallback young-band case. Heal once (the regenerated row carries
 *      strand_lede, so this is false on the next view — idempotent).
 *
 *  Guards (no loop, no fabrication):
 *   - status:"failed" marker → false. After a failed self-heal the page persists
 *     this marker; a second view sees it and settles into the data-only fallback.
 *   - content without strand data → false. Regeneration would only be suppressed
 *     again by generate.ts's anti-fabrication guard. */
export function shouldRegenerateNarration(
  row: ReportNarrationRow | null,
  content: ReportContent,
): boolean {
  // Never regenerate something the anti-fabrication guard would re-suppress.
  if (!contentHasStrandData(content)) return false;
  // At-most-once guard: a failed marker is terminal.
  if (narrationRowIsSelfHealAttempted(row)) return false;
  // No row → completion-time trigger threw before persisting. Heal once.
  if (row === null) return true;
  // Stale strand-suppressed young-band row. Heal once.
  return narrationRowIsStrandSuppressed(row);
}

/** A status:"failed" ReportNarration carrying only the keys (session_id,
 *  tenant_id) — no prose. The report-page self-heal upserts this after a
 *  regeneration fails so report_narrations holds a row whose presence stops the
 *  next view from regenerating (shouldRegenerateNarration → false). The Piece 4
 *  resolver treats status:"failed" as no prose, so the report renders the
 *  existing graceful data-only fallback. */
export function failedNarrationMarker(
  content: ReportContent,
  model: string,
): ReportNarration {
  return {
    session_id: content.session_id,
    tenant_id: content.tenant_id,
    generated_at: new Date().toISOString(),
    model,
    status: "failed",
  };
}

/** Project a freshly generated ReportNarration onto the report_narrations row
 *  shape the page resolver consumes (resolveNarrationProse), nulling absent
 *  prose the same way the DB columns are nullable. Lets a self-heal render the
 *  regenerated narration without a re-fetch. */
export function narrationToRow(n: ReportNarration): ReportNarrationRow {
  return {
    status: n.status,
    placement_line: n.placement_line ?? null,
    strand_lede: n.strand_lede ?? null,
    findings_strengths: n.key_findings?.strengths ?? null,
    findings_growth_areas: n.key_findings?.growth_areas ?? null,
    recommendations_lede: n.recommendations_lede ?? null,
  };
}
