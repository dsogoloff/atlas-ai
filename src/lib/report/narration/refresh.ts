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

/** Regenerate when the cached narration is strand-suppressed yet the live
 *  content now carries strand data (#160's fallback populated strand_mastery
 *  after the row was cached). Once regenerated WITH strand data the new row
 *  carries strand_lede, so this predicate is false on the next view —
 *  idempotent, no regenerate loop. */
export function shouldRegenerateNarration(
  row: ReportNarrationRow | null,
  content: ReportContent,
): boolean {
  return narrationRowIsStrandSuppressed(row) && contentHasStrandData(content);
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
