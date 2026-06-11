// Unit tests for the pure helpers of the master QA-table generator
// (scripts/conversion/qa-table.ts).
//
// Lives under src/ (next to the stage4/stage5 tests) because the vitest
// config only discovers src/**/*.test.ts; the script itself stays in
// scripts/conversion/ alongside stages 1-5.
//
// ALL fixtures below are SYNTHETIC — fabricated answers written for these
// tests. No real S.A.M. licensed text appears here.

import { describe, expect, it } from "vitest";

import {
  analyzeAnswerSensitivity,
  buildCsvDocument,
  classifyNormalizationSensitivity,
  csvField,
  csvLine,
  flagAnswerKeyTrace,
  flagKeyConsistency,
  formatQaLogLine,
  isSingleNumberKey,
  mdCell,
  normalizeAnswer,
  provenanceOf,
  subStrandFromContentKey,
} from "../../../scripts/conversion/qa-table";
import type { CheckResult } from "../../../scripts/conversion/stage5-audit";

// ---------------------------------------------------------------------------
// CSV escaping (Excel-safe: BOM, CRLF, everything quoted)
// ---------------------------------------------------------------------------

describe("csvField", () => {
  it("quotes every field and doubles internal quotes", () => {
    expect(csvField("plain")).toBe('"plain"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });

  it("keeps commas and newlines inside the quoted field", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("normalizes embedded CRLF to LF so records stay CRLF-delimited", () => {
    expect(csvField("line1\r\nline2")).toBe('"line1\nline2"');
  });
});

describe("csvLine / buildCsvDocument", () => {
  it("joins quoted fields with commas", () => {
    expect(csvLine(["a", "b,c", 'd"e'])).toBe('"a","b,c","d""e"');
  });

  it("starts with a UTF-8 BOM and uses CRLF record separators", () => {
    const doc = buildCsvDocument([
      ["external_id", "stem"],
      ["SYN-1", "What is 9 × 3?"],
    ]);
    expect(doc.charCodeAt(0)).toBe(0xfeff);
    expect(doc).toBe('﻿"external_id","stem"\r\n"SYN-1","What is 9 × 3?"\r\n');
  });

  it("round-trips through a quote-aware parser", () => {
    const fields = ['comma, inside', 'quote " inside', "newline\ninside", "÷ × unicode"];
    const doc = buildCsvDocument([fields]);
    const body = doc.slice(1); // strip BOM
    const matches = [...body.matchAll(/"((?:[^"]|"")*)"/g)].map((m) =>
      m[1].replace(/""/g, '"'),
    );
    expect(matches).toEqual(fields);
  });
});

describe("mdCell", () => {
  it("escapes pipes and folds newlines so table rows stay intact", () => {
    expect(mdCell("a | b")).toBe("a \\| b");
    expect(mdCell("line1\nline2")).toBe("line1<br>line2");
  });
});

// ---------------------------------------------------------------------------
// P1 normalizer duplicate (PR #25) — pinned so drift is caught
// ---------------------------------------------------------------------------

describe("normalizeAnswer / isSingleNumberKey (PR #25 duplicate)", () => {
  it("lowercases, collapses separators, canonicalizes unit spacing", () => {
    expect(normalizeAnswer("1KM 750  m")).toBe("1 km 750 m");
    expect(normalizeAnswer("9:25AM")).toBe("9:25 am");
    expect(normalizeAnswer("10, 17,20")).toBe("10 17 20");
  });

  it("partitions single grouped numbers from lists", () => {
    expect(isSingleNumberKey(normalizeAnswer("42,800"))).toBe(true);
    expect(isSingleNumberKey(normalizeAnswer("42 800"))).toBe(true);
    expect(isSingleNumberKey(normalizeAnswer("10 17 20"))).toBe(false);
    expect(isSingleNumberKey(normalizeAnswer("648"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NORMALIZATION-SENSITIVE classification
// ---------------------------------------------------------------------------

describe("analyzeAnswerSensitivity", () => {
  it("returns no reasons for canonical plain numbers", () => {
    expect(analyzeAnswerSensitivity("648")).toEqual([]);
    expect(analyzeAnswerSensitivity("-3.5")).toEqual([]);
  });

  it("detects case, commas, units, grouping, and lists", () => {
    expect(analyzeAnswerSensitivity("Cylinder")).toContain("case");
    expect(analyzeAnswerSensitivity("10, 17, 20")).toContain("comma separator");
    expect(analyzeAnswerSensitivity("1 km 750 m")).toContain("unit tokens");
    expect(analyzeAnswerSensitivity("42 800")).toContain("thousands-grouped single number");
    expect(analyzeAnswerSensitivity("10 17 20")).toContain(
      "multi-token list (separator semantics)",
    );
  });
});

describe("classifyNormalizationSensitivity", () => {
  it("marks MULTIPLE_CHOICE not applicable (exact option-text grading)", () => {
    const flag = classifyNormalizationSensitivity("MULTIPLE_CHOICE", {
      options: ["1 km", "2 km"],
      correct_index: 0,
    });
    expect(flag.applicable).toBe(false);
    expect(flag.sensitive).toBe(false);
  });

  it("leaves canonical numeric answers unflagged", () => {
    const flag = classifyNormalizationSensitivity("NUMERIC_ENTRY", {
      correct_answer: "648",
    });
    expect(flag.applicable).toBe(true);
    expect(flag.sensitive).toBe(false);
  });

  it("flags grouped single numbers as P1-resolved", () => {
    const flag = classifyNormalizationSensitivity("NUMERIC_ENTRY", {
      correct_answer: "42 800",
    });
    expect(flag.sensitive).toBe(true);
    expect(flag.reasons).toContain("thousands-grouped single number");
    expect(flag.p1Resolves).toBe(true);
  });

  it("flags unit answers as P1-resolved with an exact-text caveat", () => {
    const flag = classifyNormalizationSensitivity("NUMERIC_ENTRY", {
      correct_answer: "1 km 750 m",
    });
    expect(flag.sensitive).toBe(true);
    expect(flag.reasons).toContain("unit tokens");
    expect(flag.p1Resolves).toBe(true);
    expect(flag.detail).toContain("exact normalized text still required");
  });

  it("classifies every DRAG_DROP order token", () => {
    const flag = classifyNormalizationSensitivity("DRAG_DROP", {
      items: ["9", "68", "81"],
      correct_order: ["9", "68", "81"],
    });
    expect(flag.sensitive).toBe(false);
    const sensitiveFlag = classifyNormalizationSensitivity("DRAG_DROP", {
      items: ["1 km", "900 m"],
      correct_order: ["900 m", "1 km"],
    });
    expect(sensitiveFlag.sensitive).toBe(true);
    expect(sensitiveFlag.reasons).toContain("unit tokens");
  });
});

// ---------------------------------------------------------------------------
// Flag derivation from Stage 5 audit checks
// ---------------------------------------------------------------------------

const pass = (name: string, detail = "ok"): CheckResult => ({ name, status: "pass", detail });
const fail = (name: string, detail = "bad"): CheckResult => ({ name, status: "fail", detail });
const skip = (name: string, detail = "n/a"): CheckResult => ({ name, status: "skip", detail });

describe("flagKeyConsistency", () => {
  it("fails when any internal-consistency check fails", () => {
    const r = flagKeyConsistency([
      pass("structure"),
      fail("stem-arithmetic", "keyed option = 27, stem wants 18"),
      pass("key-agreement"),
    ]);
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("stem-arithmetic");
  });

  it("passes with the arithmetic detail when the stem was recomputed", () => {
    const r = flagKeyConsistency([
      pass("structure"),
      pass("stem-arithmetic", "keyed option satisfies stem target 18"),
    ]);
    expect(r.status).toBe("PASS");
    expect(r.detail).toContain("18");
  });

  it("ignores key-agreement failures (those belong to ANSWER-KEY-TRACE)", () => {
    const r = flagKeyConsistency([
      pass("structure"),
      skip("stem-arithmetic"),
      fail("key-agreement"),
    ]);
    expect(r.status).toBe("PASS");
  });
});

describe("flagAnswerKeyTrace", () => {
  it("maps key-agreement pass/fail/skip to MATCH/MISMATCH/UNVERIFIED", () => {
    expect(flagAnswerKeyTrace([pass("key-agreement")]).status).toBe("MATCH");
    expect(flagAnswerKeyTrace([fail("key-agreement")]).status).toBe("MISMATCH");
    expect(flagAnswerKeyTrace([skip("key-agreement")]).status).toBe("UNVERIFIED");
    expect(flagAnswerKeyTrace([pass("structure")]).status).toBe("UNVERIFIED");
  });
});

describe("provenanceOf", () => {
  it("classifies the three origins", () => {
    expect(provenanceOf("generated", true).class).toBe("PDF-CONVERTED");
    expect(provenanceOf("hand-seeded", true).class).toBe("HAND-TRANSCRIBED");
    expect(provenanceOf("dev-placeholder", false).class).toBe("SYNTHETIC");
  });

  it("flags generated rows without a stage3 record as non-traceable", () => {
    const traced = provenanceOf("generated", true);
    expect(traced.traceable).toBe(true);
    const untraced = provenanceOf("generated", false);
    expect(untraced.traceable).toBe(false);
    expect(untraced.status).toContain("NOT TRACEABLE");
  });
});

// ---------------------------------------------------------------------------
// Misc pure helpers
// ---------------------------------------------------------------------------

describe("subStrandFromContentKey", () => {
  it("extracts the sub_strand from l<level>-<sub_strand>-<seq> keys", () => {
    expect(subStrandFromContentKey("l1-geometry-1")).toBe("geometry");
    expect(subStrandFromContentKey("l3-fractions-12")).toBe("fractions");
    expect(subStrandFromContentKey("l0a-whole-numbers-2")).toBe("whole-numbers");
    expect(subStrandFromContentKey("not-a-key")).toBeNull();
  });
});

describe("formatQaLogLine", () => {
  it("renders the conversion.log line shape", () => {
    expect(formatQaLogLine("2026-06-10T00:00:00.000Z", 80, 19)).toBe(
      "2026-06-10T00:00:00.000Z | qa-table | rows=80 | suspects=19 | output=QA-audit-L1-4.{md,csv}",
    );
  });
});
