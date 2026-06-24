// Atlas Assessment — session-aware pick router.
//
// One entry point the handlers call instead of pickQuestion/pickShortTestQuestion
// directly. It (1) chooses the picker by test type and (2) computes the S.A.M.
// booklet level band from the child's grade (see levelBand.ts), so the level-lock
// is applied uniformly at every pick site:
//
//   * comprehensive → pickQuestion, band = ±1 booklet level around the child's
//     grade anchor (levelLockHalfGrades, HOLD HARD).
//   * short         → pickShortTestQuestion, band = the PREVIOUS booklet AND the
//     child's CURRENT booklet (shortTestLevelBand; {current}-only at the 0A
//     floor) + the short_test_eligible filter. Sampling both levels keeps the
//     readiness sample from collapsing to a single level (e.g. a 0B child would
//     otherwise see an all-0A test identical to a 0A child's).
//
// Both bands reach by bank level independent of which grades are selectable at
// signup (a 0C/Kindergarten child reaches 0B below the intake floor).

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import {
  anchorBookletForChild,
  levelLockHalfGrades,
  shortTestLevelBand,
} from "./levelBand";
import { pickQuestion } from "./picker";
import { pickShortTestQuestion } from "./shortTestPicker";
import type {
  Chooser,
  PickerRequest,
  PickerResult,
} from "./types";

export type SessionTestType = "short" | "comprehensive";

export interface SessionPickParams {
  testType: SessionTestType;
  /** children.grade_level (free text, nullable) — the band anchor source. */
  gradeLevel: string | null;
  /** children.birth_year — fallback when grade_level is unparseable. */
  birthYear: number;
}

export interface SessionPickContext {
  tenantId: string;
  servedQuestionIds: ReadonlyArray<string>;
  candidateLimit?: number;
  /** SHORT-TEST sub-strand coverage governor (Task 3). Passed straight through
   *  to the short picker's PickerContext; ignored for comprehensive picks.
   *  Both omitted ⇒ the short picker falls back to nearest-difficulty (the
   *  prior behaviour). See subStrandCoverage.ts for how these are built. */
  subStrandByContentId?: ReadonlyMap<string, string>;
  servedSubStrands?: ReadonlySet<string>;
}

/** Route to the right picker with the right level band for this session. */
export async function pickForSession(
  serviceClient: SupabaseClient<Database>,
  request: PickerRequest,
  base: SessionPickContext,
  session: SessionPickParams,
  chooser?: Chooser,
): Promise<PickerResult> {
  const anchor = anchorBookletForChild(session.gradeLevel, session.birthYear);
  // Defensive: if neither grade_level nor birth_year yields a usable anchor
  // (shouldn't happen in prod — birth_year is NOT NULL), skip the level lock
  // rather than band to an empty set. The pick then falls back to the
  // unconstrained (legacy) behavior for that session.
  const hasAnchor = Number.isFinite(anchor);

  if (session.testType === "short") {
    return pickShortTestQuestion(
      serviceClient,
      request,
      hasAnchor
        ? { ...base, levelBand: shortTestLevelBand(anchor) }
        : base,
      chooser,
    );
  }

  return pickQuestion(
    serviceClient,
    request,
    hasAnchor ? { ...base, levelBand: levelLockHalfGrades(anchor) } : base,
    chooser,
  );
}
