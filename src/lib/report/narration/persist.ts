// Atlas Assessment — report_narrations upsert (shared by the completion
// trigger and the report-page self-heal).
//
// Both writers persist a ReportNarration the same way: map prose/findings onto
// the nullable DB columns and upsert on the session_id PK so a re-completion,
// retry, or self-heal overwrites cleanly. Centralised here so the mapping
// can't drift between the two call sites.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReportNarration } from "@/lib/report/types";
import type { Database } from "@/lib/supabase/database.types";

type NarrationInsert =
  Database["public"]["Tables"]["report_narrations"]["Insert"];

/** ReportNarration → report_narrations row columns. Absent prose / findings
 *  map to null (the columns are nullable; the page resolver treats null as
 *  "render this surface data-only"). */
export function narrationUpsertPayload(n: ReportNarration): NarrationInsert {
  return {
    session_id: n.session_id,
    tenant_id: n.tenant_id,
    generated_at: n.generated_at,
    model: n.model,
    status: n.status,
    placement_line: n.placement_line ?? null,
    strand_lede: n.strand_lede ?? null,
    findings_strengths: n.key_findings?.strengths ?? null,
    findings_growth_areas: n.key_findings?.growth_areas ?? null,
    recommendations_lede: n.recommendations_lede ?? null,
  };
}

/** Upsert a narration keyed on session_id (PK). Returns the Supabase result so
 *  each caller can log its own context on error. */
export function upsertNarration(
  client: SupabaseClient<Database>,
  narration: ReportNarration,
) {
  return client
    .from("report_narrations")
    .upsert(narrationUpsertPayload(narration), { onConflict: "session_id" });
}
