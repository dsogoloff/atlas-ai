// Atlas Assessment — SHORT-TEST sub-strand (AXIS-B) coverage resolution (Task 3).
//
// The short-test picker spreads the served set across the V2026 AXIS-B
// sub-strands the parent report measures (radar/bars) BEFORE deepening any one
// of them. To do that the picker needs two pieces of side-data, both built once
// per submit and threaded through PickerContext:
//
//   * subStrandByContentId — questions.content_id → V2026 sub-strand code, via
//     the join chain content_id → tax_content.sub_strand_id → tax_sub_strands.code.
//     Tenant-scoped; the taxonomy tables are tiny (≤12 sub-strands, ≤~145
//     content rows per tenant — see report/assemble.ts) so a full read is fine.
//
//   * servedSubStrands — the set of sub-strand codes already covered in THIS
//     session, derived from the session's responses' questions' content_ids
//     through the same map.
//
// Both are best-effort. content_id is sparsely backfilled (NULL for most rows
// today); any row that doesn't resolve simply doesn't participate in the
// coverage preference, and the picker degrades to its prior nearest-difficulty
// behaviour. This module NEVER throws on missing linkage — only on a hard DB
// error — so coverage can only ever IMPROVE over the AXIS-A-only baseline.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Tenant-wide content_id → V2026 sub-strand code map. Joins tax_content to
 * tax_sub_strands in TS (the hand-written database.types declares no usable
 * embed) over two small tenant-scoped reads. Empty map when the taxonomy isn't
 * seeded for the tenant — callers treat that as "no coverage signal" and fall
 * back to nearest-difficulty selection.
 */
export async function discoverSubStrandByContentId(
  serviceClient: SupabaseClient<Database>,
  tenantId: string,
): Promise<Map<string, string>> {
  const { data: subStrands, error: ssErr } = await serviceClient
    .from("tax_sub_strands")
    .select("id, code")
    .eq("tenant_id", tenantId);
  if (ssErr) {
    throw new Error(
      `[subStrandCoverage] tax_sub_strands read failed: ${ssErr.message}`,
    );
  }
  const codeBySubStrandId = new Map<string, string>();
  for (const ss of subStrands ?? []) codeBySubStrandId.set(ss.id, ss.code);

  const { data: content, error: cErr } = await serviceClient
    .from("tax_content")
    .select("id, sub_strand_id")
    .eq("tenant_id", tenantId);
  if (cErr) {
    throw new Error(
      `[subStrandCoverage] tax_content read failed: ${cErr.message}`,
    );
  }

  const byContentId = new Map<string, string>();
  for (const c of content ?? []) {
    const code = codeBySubStrandId.get(c.sub_strand_id);
    if (code) byContentId.set(c.id, code);
  }
  return byContentId;
}

/**
 * Sub-strand codes already SERVED in this session — the breadth-first
 * exclusion set the picker prefers AWAY from. Reads the session's responses,
 * resolves each answered question's content_id, and maps it through
 * `subStrandByContentId`. Rows with a NULL/unresolvable content_id contribute
 * nothing (no sub-strand to mark covered), which is correct: an unresolved
 * serve hasn't demonstrably covered any AXIS-B sub-strand.
 *
 * Service-role; no is_active filter (counts what was actually served, same
 * rationale as replayStrandCounts).
 */
export async function discoverServedSubStrands(
  serviceClient: SupabaseClient<Database>,
  sessionId: string,
  subStrandByContentId: ReadonlyMap<string, string>,
): Promise<Set<string>> {
  const served = new Set<string>();
  if (subStrandByContentId.size === 0) return served;

  const { data: responseRows, error: rErr } = await serviceClient
    .from("responses")
    .select("question_id")
    .eq("session_id", sessionId);
  if (rErr) {
    throw new Error(
      `[subStrandCoverage] responses read failed: ${rErr.message}`,
    );
  }
  const responses = responseRows ?? [];
  if (responses.length === 0) return served;

  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const { data: questionRows, error: qErr } = await serviceClient
    .from("questions")
    .select("id, content_id")
    .in("id", questionIds);
  if (qErr) {
    throw new Error(
      `[subStrandCoverage] questions read failed: ${qErr.message}`,
    );
  }

  for (const q of questionRows ?? []) {
    if (!q.content_id) continue;
    const code = subStrandByContentId.get(q.content_id);
    if (code) served.add(code);
  }
  return served;
}
