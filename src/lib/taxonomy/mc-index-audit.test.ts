// Unit tests for the marker-interpretation pure functions of the QA
// Bucket 1 MC correct_index re-derivation audit
// (scripts/conversion/mc-index-audit.ts).
//
// Lives under src/ (next to the stage2/stage4 tests) because the vitest
// config only discovers src/**/*.test.ts; the script itself stays in
// scripts/conversion/.
//
// ALL fixtures below are SYNTHETIC — fabricated option lists and key
// markers modeled on the observed key layouts (L2/L4 "(N)" parenthesized
// option markers, L3 bare 1-based option numbers). No real S.A.M.
// licensed question text appears here.

import { describe, expect, it } from "vitest";

import {
  mcVerdict,
  rederiveMcIndex,
} from "../../../scripts/conversion/mc-index-audit";

// ---------------------------------------------------------------------------
// rederiveMcIndex — integer-ordinal reading
// ---------------------------------------------------------------------------

describe("rederiveMcIndex: integer-ordinal", () => {
  it("reads a bare small integer as a 1-based option ordinal", () => {
    // L3-style key: "3" means the third option, none of whose texts is "3".
    const red = rederiveMcIndex("3", ["120", "201", "210", "1200"]);
    expect(red.kind).toBe("UNIQUE");
    expect(red.readings).toHaveLength(1);
    expect(red.readings[0]).toMatchObject({ index: 2, basis: "ordinal" });
  });

  it("reads '1' as the FIRST option (index 0) — the SAM-L3-Q11 shape", () => {
    // Synthetic version of the proven off-by-one: key "1" (1-based) must
    // re-derive to index 0, not be taken as a 0-based index.
    const red = rederiveMcIndex("1", ["8 × 2", "8 × 3", "8 ÷ 2", "6 ÷ 3"]);
    expect(red.kind).toBe("UNIQUE");
    expect(red.readings[0]).toMatchObject({ index: 0, basis: "ordinal" });
  });

  it("treats an explicit '(N)' marker as definitive 1-based", () => {
    const red = rederiveMcIndex("(4)", ["6", "2", "3", "4"]);
    expect(red.kind).toBe("UNIQUE");
    expect(red.readings).toHaveLength(1);
    expect(red.readings[0]).toMatchObject({ index: 3, basis: "explicit-marker" });
  });

  it("survives OCR garble after an explicit marker", () => {
    const red = rederiveMcIndex('(4) \t19 !\n"', ["10", "20", "30", "40"]);
    expect(red.kind).toBe("UNIQUE");
    expect(red.readings[0]).toMatchObject({ index: 3, basis: "explicit-marker" });
  });
});

// ---------------------------------------------------------------------------
// rederiveMcIndex — text-match reading
// ---------------------------------------------------------------------------

describe("rederiveMcIndex: text-match", () => {
  it("matches the key against option text when not a plausible ordinal", () => {
    const red = rederiveMcIndex("16", ["12", "16", "20", "61"]);
    expect(red.kind).toBe("UNIQUE");
    expect(red.readings).toHaveLength(1);
    expect(red.readings[0]).toMatchObject({ index: 1, basis: "text-match" });
  });

  it("normalizes digit-group spaces when matching ('10 000' vs '10000')", () => {
    const red = rederiveMcIndex("10 000", ["37", "100", "9999", "10000"]);
    expect(red.kind).toBe("UNIQUE");
    expect(red.readings[0]).toMatchObject({ index: 3, basis: "text-match" });
  });

  it("matches non-numeric option text case-insensitively", () => {
    const red = rederiveMcIndex("Half circle", ["half circle", "triangle"]);
    expect(red.kind).toBe("UNIQUE");
    expect(red.readings[0]).toMatchObject({ index: 0, basis: "text-match" });
  });

  it("merges ordinal and text readings that agree into a UNIQUE result", () => {
    // Key "1" where option 0's text is also "1": both readings → index 0.
    const red = rederiveMcIndex("1", ["1", "5", "3", "7"]);
    expect(red.kind).toBe("UNIQUE");
    expect(red.readings.map((r) => r.index)).toEqual([0, 0]);
  });
});

// ---------------------------------------------------------------------------
// rederiveMcIndex — ambiguity (never guess)
// ---------------------------------------------------------------------------

describe("rederiveMcIndex: ambiguous", () => {
  it("marks AMBIGUOUS when ordinal and text readings disagree", () => {
    // Key "1": as an ordinal it means option index 0 ("3"); as text it
    // matches option index 1 ("1"). Both must be recorded, none chosen.
    const red = rederiveMcIndex("1", ["3", "1", "2"]);
    expect(red.kind).toBe("AMBIGUOUS");
    expect(red.readings).toHaveLength(2);
    expect(red.readings).toContainEqual(
      expect.objectContaining({ index: 1, basis: "text-match" }),
    );
    expect(red.readings).toContainEqual(
      expect.objectContaining({ index: 0, basis: "ordinal" }),
    );
  });

  it("records value-matches as secondary evidence, not as readings", () => {
    // Key "27" is not an ordinal (out of range) and no option TEXT is
    // "27", but one option evaluates to 27 — evidence only.
    const red = rederiveMcIndex("27", ["9 × 2", "9 × 3"]);
    expect(red.kind).toBe("NONE");
    expect(red.readings).toHaveLength(0);
    expect(red.valueEvidence).toHaveLength(1);
    expect(red.valueEvidence[0]).toMatchObject({ index: 1, basis: "value-match" });
  });
});

// ---------------------------------------------------------------------------
// rederiveMcIndex — out-of-range / uninterpretable
// ---------------------------------------------------------------------------

describe("rederiveMcIndex: out-of-range and uninterpretable", () => {
  it("does not read an integer beyond the option count as an ordinal", () => {
    const red = rederiveMcIndex("7", ["a", "b", "c", "d"]);
    expect(red.kind).toBe("NONE");
    expect(red.readings).toHaveLength(0);
  });

  it("rejects an explicit marker beyond the option count", () => {
    const red = rederiveMcIndex("(9)", ["a", "b", "c", "d"]);
    expect(red.kind).toBe("NONE");
  });

  it("does not read 0 as an ordinal (keys are 1-based)", () => {
    const red = rederiveMcIndex("0", ["a", "b", "c", "d"]);
    expect(red.kind).toBe("NONE");
  });

  it("returns NONE for prose keys and empty input", () => {
    expect(rederiveMcIndex("Circle the bigger flower.", ["a", "b"]).kind).toBe("NONE");
    expect(rederiveMcIndex("", ["a", "b"]).kind).toBe("NONE");
    expect(rederiveMcIndex("2", []).kind).toBe("NONE");
  });
});

// ---------------------------------------------------------------------------
// mcVerdict
// ---------------------------------------------------------------------------

describe("mcVerdict", () => {
  it("MATCH when the stored index equals the unique re-derived index", () => {
    const red = rederiveMcIndex("3", ["120", "201", "210", "1200"]);
    expect(mcVerdict(2, red)).toBe("MATCH");
  });

  it("MISMATCH on the SAM-L3-Q11 shape (key '1' stored as index 1)", () => {
    const red = rederiveMcIndex("1", ["8 × 2", "8 × 3", "8 ÷ 2", "6 ÷ 3"]);
    expect(mcVerdict(1, red)).toBe("MISMATCH");
    expect(mcVerdict(0, red)).toBe("MATCH");
  });

  it("AMBIGUOUS when readings disagree, regardless of the stored index", () => {
    const red = rederiveMcIndex("1", ["3", "1", "2"]);
    expect(mcVerdict(0, red)).toBe("AMBIGUOUS");
    expect(mcVerdict(1, red)).toBe("AMBIGUOUS");
    expect(mcVerdict(2, red)).toBe("AMBIGUOUS");
  });

  it("NO-KEY when there is no key or no mechanical reading", () => {
    expect(mcVerdict(1, null)).toBe("NO-KEY");
    expect(mcVerdict(1, rederiveMcIndex("see worked solution", ["a", "b"]))).toBe("NO-KEY");
  });

  it("MISMATCH when the stored index is null but a unique reading exists", () => {
    const red = rederiveMcIndex("(2)", ["a", "b", "c"]);
    expect(mcVerdict(null, red)).toBe("MISMATCH");
  });
});
