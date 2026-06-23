// Atlas Assessment — per-sub-strand "areas to confirm" supporting detail.
//
// Pure aggregation: turns the session's resolved responses into one
// GrowthSignal per assessed sub-strand, carrying the evidence the narration
// prompt needs to write a SPECIFIC, evidence-scaled "area to confirm" note —
// served count (how much we actually saw), the topic labels of items answered
// incorrectly, any misconception labels tied to those responses, and a coarse
// pace signal from per-item timing.
//
// Carries NO question content and NO PII: skill names are taxonomy topic
// labels (tax_content.name), misconception labels are the curated catalogue
// labels, pace is derived from per-item time_flag. assemble.ts resolves each
// response's sub-strand / skill name / misconception labels before calling in.

import type { GrowthSignal, Strand } from "@/lib/report/types";
import type { Database } from "@/lib/supabase/database.types";

type TimeFlag = Database["public"]["Enums"]["time_flag"];

/** One resolved response: assemble.ts maps question_id → sub-strand + skill
 *  name + misconception labels before passing in. Responses that don't resolve
 *  to a sub-strand are filtered out upstream. */
export interface GrowthResponseInput {
  strand: Strand;
  isCorrect: boolean;
  /** tax_content.name of the served item, or null if unresolved. */
  skillName: string | null;
  timeFlag: TimeFlag;
  /** Resolved misconception labels detected on this response (may be empty). */
  misconceptionLabels: readonly string[];
}

/** Cap how many distinct missed-skill / misconception labels travel to the
 *  prompt per sub-strand — keeps the supporting-detail block compact and the
 *  note focused; the narrator only needs a few concrete anchors. */
const MAX_MISSED_SKILLS = 4;
const MAX_MISCONCEPTIONS = 3;

function derivePace(
  fast: number,
  slow: number,
  served: number,
): GrowthSignal["pace"] {
  if (served === 0) return "typical";
  if (fast > 0 && slow > 0) return "mixed";
  if (fast > 0 && fast >= Math.ceil(served / 2)) return "fast";
  if (slow > 0 && slow >= Math.ceil(served / 2)) return "slow";
  return "typical";
}

interface Acc {
  served: number;
  correct: number;
  fast: number;
  slow: number;
  missed: string[];
  missedSeen: Set<string>;
  misconceptions: string[];
  mcSeen: Set<string>;
}

/** One GrowthSignal per assessed sub-strand, in first-seen response order
 *  (the prompt re-orders for display; order here is just deterministic). */
export function buildGrowthSignals(
  responses: readonly GrowthResponseInput[],
): GrowthSignal[] {
  const acc = new Map<Strand, Acc>();

  for (const r of responses) {
    let g = acc.get(r.strand);
    if (!g) {
      g = {
        served: 0,
        correct: 0,
        fast: 0,
        slow: 0,
        missed: [],
        missedSeen: new Set(),
        misconceptions: [],
        mcSeen: new Set(),
      };
      acc.set(r.strand, g);
    }
    g.served += 1;
    if (r.isCorrect) g.correct += 1;
    if (r.timeFlag === "TOO_FAST") g.fast += 1;
    else if (r.timeFlag === "TOO_SLOW") g.slow += 1;

    if (!r.isCorrect && r.skillName && !g.missedSeen.has(r.skillName)) {
      g.missedSeen.add(r.skillName);
      if (g.missed.length < MAX_MISSED_SKILLS) g.missed.push(r.skillName);
    }
    for (const label of r.misconceptionLabels) {
      if (!g.mcSeen.has(label)) {
        g.mcSeen.add(label);
        if (g.misconceptions.length < MAX_MISCONCEPTIONS) {
          g.misconceptions.push(label);
        }
      }
    }
  }

  const out: GrowthSignal[] = [];
  for (const [strand, g] of acc) {
    out.push({
      strand,
      served: g.served,
      correct: g.correct,
      missed_skills: g.missed,
      misconceptions: g.misconceptions,
      pace: derivePace(g.fast, g.slow, g.served),
    });
  }
  return out;
}
