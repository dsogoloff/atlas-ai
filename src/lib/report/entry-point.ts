// Surface the EXISTING half-level from a placement label as plain entry-point
// copy. This is a read of existing engine output (samLevelLabel), NOT a new
// schema field and NOT a new "mid-point" concept:
//
//   "S.A.M Level 2B" -> { band: "S.A.M Level 2", half: "second half" }
//   "S.A.M Level 2A" -> { band: "S.A.M Level 2", half: "first half" }
//
// A = first half, B = second half (the only two halves per level, per
// SAM_LEVEL_BY_HALF_GRADE in assemble.ts). Provisional phrasing — kept here so
// it is trivial to reword after the S.A.M. discussion.

export type HalfLabel = "first half" | "second half";

export interface EntryPoint {
  /** Placement band with the half-level letter stripped, e.g. "S.A.M Level 2". */
  band: string;
  /** Plain half-level phrase, or null if the label has no trailing A/B. */
  half: HalfLabel | null;
}

export function splitEntryPoint(samLevel: string): EntryPoint {
  const trimmed = samLevel.trim();
  const last = trimmed.slice(-1).toUpperCase();
  const band = trimmed.replace(/[A-Za-z]$/, "").trimEnd();
  const half: HalfLabel | null =
    last === "A" ? "first half" : last === "B" ? "second half" : null;
  return { band, half };
}
