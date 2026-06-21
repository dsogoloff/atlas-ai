// Atlas Assessment — read the child's latest ShortTestOutcome (Picker
// Calibration PR2). The comprehensive picker reads this hand-off surface (the
// short test persisted it on completion — see outcome.ts) to anchor on the
// MEASURED level and weight its draw by pass_band + strand_map, and to subtract
// the already-seen items.
//
// "Latest" = the child's most recent COMPLETED short session. If that session
// predates the outcome column (legacy) or the column is malformed, we return
// null and the picker falls back to the neutral grade-anchored split.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { PassBand, ShortTestOutcome, StrandStat } from "./outcome";

function isPassBand(v: unknown): v is PassBand {
  return v === "clean" || v === "mixed" || v === "weak" || v === "insufficient";
}

/**
 * Validate + narrow a raw jsonb value into a ShortTestOutcome, or null if it is
 * absent / malformed. strand_map entries and seen_item_ids are taken
 * best-effort (a malformed entry is dropped, not fatal).
 */
export function parseShortTestOutcome(raw: unknown): ShortTestOutcome | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.measured_level !== "string" ||
    typeof o.intake_level !== "string" ||
    typeof o.clean_pass_ratio !== "number" ||
    !isPassBand(o.pass_band)
  ) {
    return null;
  }

  const strand_map: Record<string, StrandStat> = {};
  if (o.strand_map && typeof o.strand_map === "object") {
    for (const [k, v] of Object.entries(o.strand_map as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        const s = v as Record<string, unknown>;
        if (
          typeof s.correct === "number" &&
          typeof s.seen === "number" &&
          typeof s.ratio === "number"
        ) {
          strand_map[k] = { correct: s.correct, seen: s.seen, ratio: s.ratio };
        }
      }
    }
  }

  const seen_item_ids = Array.isArray(o.seen_item_ids)
    ? o.seen_item_ids.filter((x): x is string => typeof x === "string")
    : [];

  return {
    measured_level: o.measured_level,
    intake_level: o.intake_level,
    pass_band: o.pass_band,
    clean_pass_ratio: o.clean_pass_ratio,
    strand_map,
    seen_item_ids,
  };
}

/**
 * The child's most recent completed short-test outcome, or null when none
 * exists (enrolled child going straight to comprehensive, or a legacy short
 * session with no persisted outcome). Service-role; throws on a DB error.
 */
export async function readLatestShortOutcome(
  serviceClient: SupabaseClient<Database>,
  childId: string,
): Promise<ShortTestOutcome | null> {
  const { data, error } = await serviceClient
    .from("assessment_sessions")
    .select("short_test_outcome")
    .eq("child_id", childId)
    .eq("test_type", "short")
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`[readOutcome] latest short outcome read failed: ${error.message}`);
  }
  if (!data) return null;
  return parseShortTestOutcome(data.short_test_outcome);
}
