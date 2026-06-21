// Atlas Assessment — comprehensive per-pick level plan (Picker Calibration PR2).
//
// Bridges the pure level-split policy (engine/comprehensiveSplit.ts, which speaks
// only in integer offsets) to the picker's booklet axis: given the chosen strand
// and the outcome context, pick the next booklet OFFSET (the split target most
// under-served so far for that strand) and turn it into a single-booklet level
// allow-list + a difficulty target the picker can serve against.
//
// "Variable by level thickness" + ceiling/edge clamps come from availableOffsets:
// here, offsets whose resulting booklet ordinal is on the axis. PR3 narrows this
// further to offsets the bank can actually serve (floor-find / ceiling).

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  baseSplit,
  planNextOffset,
  strandAdjustedSplit,
} from "@/lib/engine/comprehensiveSplit";
import { levelTheta } from "@/lib/engine/levels";
import type { HalfGradeLevel, Strand } from "@/lib/engine/types";
import { readLatestShortOutcome } from "@/lib/shortTest/readOutcome";
import type { PassBand, StrandStat } from "@/lib/shortTest/outcome";
import type { Database } from "@/lib/supabase/database.types";

import {
  BOOKLET_LEVELS,
  halfGradesForBooklets,
} from "./levelBand";

/** What the comprehensive picker needs from the short-test hand-off to compose
 *  its draw. anchorOrdinal is a BOOKLET_LEVELS index (measured level, or the
 *  grade-derived intake when there's no outcome). */
export interface ComprehensiveOutcomeContext {
  anchorOrdinal: number;
  /** null = no outcome (neutral split on the intake anchor). */
  passBand: PassBand | null;
  /** Per-strand correct/seen/ratio from the short test (drives the per-strand
   *  override). Empty when there's no outcome. */
  strandMap: Record<string, StrandStat>;
}

export interface LevelPlan {
  /** Single-booklet half-grade allow-list for this pick. */
  levelBand: string[];
  /** Difficulty target (θ) at the planned booklet. */
  targetDifficulty: number;
  /** The chosen offset (diagnostics / tests). */
  offset: number;
}

/** Representative θ for a booklet ordinal — the θ of its lowest half-grade. */
function bookletTheta(ordinal: number): number {
  const halfGrades = halfGradesForBooklets([ordinal]);
  // halfGradesForBooklets returns in BOOKLET_ORDINAL_BY_HALF_GRADE key order;
  // any of a booklet's half-grades sits within ~one step, so the first is a fine
  // representative for the nearest-difficulty sort.
  const rep = (halfGrades[0] ?? "KA") as HalfGradeLevel;
  return levelTheta(rep);
}

/**
 * Plan the next pick's booklet level for one strand. Returns null only when no
 * split offset lands on the axis (caller falls back to the default band).
 */
export function planComprehensiveLevel(args: {
  strand: Strand;
  ctx: ComprehensiveOutcomeContext;
  /** Served counts by offset for THIS strand (from replayStrandOffsetCounts). */
  servedByOffset: ReadonlyMap<number, number>;
  /** Proportion base — the tier's target item count. */
  budget: number;
}): LevelPlan | null {
  const ratio = args.ctx.strandMap[args.strand]?.ratio ?? null;
  const split = strandAdjustedSplit(baseSplit(args.ctx.passBand), ratio);

  const maxOrdinal = BOOKLET_LEVELS.length - 1;
  const availableOffsets = new Set<number>();
  for (const { offset } of split) {
    const ord = args.ctx.anchorOrdinal + offset;
    if (ord >= 0 && ord <= maxOrdinal) availableOffsets.add(offset);
  }

  const offset = planNextOffset({
    split,
    servedByOffset: args.servedByOffset,
    totalBudget: args.budget,
    availableOffsets,
  });
  if (offset === null) return null;

  const ordinal = args.ctx.anchorOrdinal + offset;
  // "Variable by level thickness": serve from the target booklet ±1 (clamped),
  // with the difficulty target centred on the planned booklet. When the bank is
  // full the nearest-difficulty sort lands on the target level; a thin/empty
  // target falls through to a neighbour instead of starving the strand. The
  // ACTUAL served level is what replayStrandOffsetCounts attributes back to an
  // offset, so the split self-corrects (PR3 makes availableOffsets bank-aware).
  const bandOrdinals: number[] = [];
  for (let o = ordinal - 1; o <= ordinal + 1; o++) {
    if (o >= 0 && o <= maxOrdinal) bandOrdinals.push(o);
  }
  return {
    levelBand: halfGradesForBooklets(bandOrdinals),
    targetDifficulty: bookletTheta(ordinal),
    offset,
  };
}

/**
 * Resolve the comprehensive outcome context for a child: read the latest
 * ShortTestOutcome and anchor on its MEASURED level (else the neutral grade
 * anchor), carrying the pass_band, strand_map, and seen item ids. When the
 * child has no short outcome (enrolled straight to comprehensive, or legacy),
 * returns a neutral context on the grade anchor with no seen items.
 */
export async function loadComprehensiveOutcomeContext(args: {
  serviceClient: SupabaseClient<Database>;
  childId: string;
  /** Grade-derived booklet ordinal — the fallback / no-outcome anchor. */
  gradeAnchorOrdinal: number;
}): Promise<{ ctx: ComprehensiveOutcomeContext; seenItemIds: string[] }> {
  const outcome = await readLatestShortOutcome(args.serviceClient, args.childId);
  if (!outcome) {
    return {
      ctx: {
        anchorOrdinal: args.gradeAnchorOrdinal,
        passBand: null,
        strandMap: {},
      },
      seenItemIds: [],
    };
  }
  const measuredOrdinal = BOOKLET_LEVELS.indexOf(
    outcome.measured_level as (typeof BOOKLET_LEVELS)[number],
  );
  return {
    ctx: {
      anchorOrdinal: measuredOrdinal >= 0 ? measuredOrdinal : args.gradeAnchorOrdinal,
      passBand: outcome.pass_band,
      strandMap: outcome.strand_map,
    },
    seenItemIds: outcome.seen_item_ids,
  };
}
