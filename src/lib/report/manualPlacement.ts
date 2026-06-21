// Atlas Assessment — comprehensive placement copy for the floor-find edges
// (Picker Calibration PR3). §2.4 discipline: a S.A.M. starting point, never
// "behind", never a school grade, no "above scope" language.
//
// Three cases the comprehensive report distinguishes:
//   * FLOOR FOUND — the walk-down settled at a level the child is solid at.
//     Parent sees the S.A.M. level framed as a STARTING POINT (not an
//     achievement/deficit). currentLevelLabel is the booklet label (e.g. "3").
//   * MANUAL PLACEMENT — the walk-down fell past the bottom of the loaded
//     library without a solid level (manual_placement_needed). Parent copy is
//     EXACT, founder-approved (spec PR3). The instructor gets the full
//     floor-find data + the flag and sets the starting point by hand.
//   * CEILING — the child topped out the loaded library; placed at the highest
//     AVAILABLE level with NO "above scope" / "maxed out" language.
//
// FOUNDER GATE: the floor-found + ceiling strings below are §2.4 parent-facing
// claims drafted by Code; only the manual-placement line is founder-locked
// verbatim. Batch the other two for founder confirmation (see the PR).

export const MANUAL_PLACEMENT_COPY = {
  /** Floor found — starting-point framing. `level` is the S.A.M booklet label. */
  floorFoundLine: (level: string): string =>
    `Based on this assessment, a good starting point for your child is S.A.M Level ${level}.`,

  /** Manual placement — EXACT, founder-approved (spec PR3). Shown when no solid
   *  floor was found within the loaded library. No level, no shaming. */
  manualPlacementLine: "the instructor will set the right starting point.",

  /** Ceiling — placed at the highest available level. No "above scope" framing. */
  ceilingLine: (level: string): string =>
    `Your child is working confidently at S.A.M Level ${level}, the top of what this assessment covers — a strong starting point.`,
} as const;
