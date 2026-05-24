/**
 * Atlas Assessment — Report data contract (reconciled to the shipped in-app report).
 *
 * This is the SINGLE shared report contract. It describes the exact data the
 * shipped /report components consume. LLM-narration fields (parent-friendly
 * ledes, "What We Noticed" findings) are intentionally OMITTED here — they are
 * added at roadmap Step 4 (Items #14/#15), not invented now.
 *
 * Composed from canonical types — does not redefine StrandMastery,
 * AggregatedMisconception, etc. Import them from their source files.
 */

import type { Strand } from "@/lib/engine/types";
import type { AggregatedMisconception } from "@/lib/report/misconception-aggregate";
import type { StrandMastery } from "@/lib/report/strand-mastery";
import type { Database } from "@/lib/supabase/database.types";
import type { Tier } from "@/lib/tier/derive";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];
type HalfGradeLevel = Database["public"]["Enums"]["half_grade_level"];

export interface Recommendation {
  strand: Strand;
  level: HalfGradeLevel;
  primary: string;
  supplementary: string[]; // hidden v1 (RC3)
  notes: string | null; // hidden v1 (RC4)
}

export interface ReportContent {
  session_id: string;
  tenant_id: string;
  generated_at: string; // ISO8601

  child: {
    display_name: string; // demo: full name "Aiden Park"; live treatment TBD
    grade_label: string; // "Grade 3"
  };
  metadata: {
    assessed_date_display: string; // "May 19, 2026"
    duration_display: string; // "14 minutes"
    report_id: string; // "A-2026-051901"
  };

  // Drives the time-flag banner + whether scores render at all (lock R5).
  // ALWAYS present; value "normal" means render no banner.
  time_flag: SessionTimeFlag; // unreliable | mixed | rushed | struggling | normal

  placement: {
    sam_level: string; // pre-formatted "S.A.M. Level 3A" (samLevelLabel output)
    overall_percentage: number; // 0..100, R1 hybrid (correct/attempted)
    tier: Tier; // K_4 | G5_8
  };

  strand_mastery: StrandMastery[]; // always 6, canonical STRAND_ORDER;
  // feeds BOTH StrandRadar and StrandMap
  misconceptions: AggregatedMisconception[]; // 0..3, occurrence desc; empty array
  // is the ML1 positive-state signal — no separate flag
  recommendations: Recommendation[]; // band-sorted (page-owned sort), strand-keyed
}
