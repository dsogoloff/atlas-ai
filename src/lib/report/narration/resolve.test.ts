// Unit tests for resolveNarrationProse. Covers the brief's four cases:
// narration absent (null row), status:'failed', time_flag suppression
// (unreliable + mixed), and the happy path with full prose.

import { describe, expect, it } from "vitest";

import { resolveNarrationProse } from "./resolve";

const VALID_ROW = {
  status: "ok",
  placement_line: "Warm placement line.",
  strand_lede: "Strand intro.",
  misconceptions_lede: "Patterns came up.",
  recommendations_lede: "Short plan.",
};

describe("resolveNarrationProse", () => {
  it("returns prose fields when row is valid and time_flag is normal", () => {
    expect(resolveNarrationProse(VALID_ROW, "normal")).toEqual({
      placement_line: "Warm placement line.",
      strand_lede: "Strand intro.",
      misconceptions_lede: "Patterns came up.",
      recommendations_lede: "Short plan.",
    });
  });

  it("returns null when no row exists (narration not yet generated)", () => {
    expect(resolveNarrationProse(null, "normal")).toBeNull();
  });

  it("returns null when row.status !== 'ok' (validation failed downstream)", () => {
    expect(
      resolveNarrationProse({ ...VALID_ROW, status: "failed" }, "normal"),
    ).toBeNull();
  });

  it("suppresses prose on time_flag 'unreliable' even with a valid row (lock R5)", () => {
    expect(resolveNarrationProse(VALID_ROW, "unreliable")).toBeNull();
  });

  it("suppresses prose on time_flag 'mixed' even with a valid row (lock R5)", () => {
    expect(resolveNarrationProse(VALID_ROW, "mixed")).toBeNull();
  });

  it("maps null prose fields to undefined when only some fields are populated", () => {
    // Partial coverage — e.g. a Sonnet response that produced three fields
    // cleanly and one field as something invalid that the gate dropped.
    // Hypothetical given the all-or-nothing Piece 3 gate, but the resolver
    // must still handle per-field nullability cleanly because the DB
    // columns are nullable.
    expect(
      resolveNarrationProse({ ...VALID_ROW, strand_lede: null }, "normal"),
    ).toEqual({
      placement_line: "Warm placement line.",
      strand_lede: undefined,
      misconceptions_lede: "Patterns came up.",
      recommendations_lede: "Short plan.",
    });
  });
});
