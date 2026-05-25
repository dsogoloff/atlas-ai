// Atlas Assessment — narration row → renderable prose resolver (Piece 4).
//
// Pure helper bridging the fetched report_narrations row to the four prose
// fields the report renders. Centralises the "should narration render?"
// rules so the page stays straightforward and the rules are unit-testable
// without page integration.
//
// Rules:
//   - time_flag is 'unreliable' | 'mixed' → no prose (lock R5: hide-scores
//     branches must not surface prose that describes scores).
//   - row is null (no narration generated for this session yet) → no prose.
//   - row.status !== 'ok' (validation failed downstream) → no prose.
//   - row.status === 'ok' → return each prose field, mapping null → undefined.
//     Any individual field may still be undefined per the ReportNarration
//     type; components handle that per surface.
//
// The time_flag check is belt-and-suspenders: page.tsx calls this helper
// from Branch 7 only (unreliable/mixed early-return above it), but encoding
// the rule here too keeps it testable and survives any future refactor of
// the page's branch structure.

import type { Database } from "@/lib/supabase/database.types";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

/** Shape of the report_narrations row the page selects. Mirrors the
 *  generated Database type columns; all prose fields are nullable. */
export interface ReportNarrationRow {
  status: string;
  placement_line: string | null;
  strand_lede: string | null;
  misconceptions_lede: string | null;
  recommendations_lede: string | null;
}

export interface NarrationProse {
  placement_line?: string;
  strand_lede?: string;
  misconceptions_lede?: string;
  recommendations_lede?: string;
}

export function resolveNarrationProse(
  row: ReportNarrationRow | null,
  timeFlag: SessionTimeFlag,
): NarrationProse | null {
  if (timeFlag === "unreliable" || timeFlag === "mixed") return null;
  if (!row) return null;
  if (row.status !== "ok") return null;
  return {
    placement_line: row.placement_line ?? undefined,
    strand_lede: row.strand_lede ?? undefined,
    misconceptions_lede: row.misconceptions_lede ?? undefined,
    recommendations_lede: row.recommendations_lede ?? undefined,
  };
}
