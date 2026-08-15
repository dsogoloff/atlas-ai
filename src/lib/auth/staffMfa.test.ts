// ATLAS-007 — the fail-closed decision core.
//
// This is the security property of the whole finding reduced to a pure
// function, so it can be exhaustively tested without a session, a database or a
// browser. If this file is right, the gate is right wherever it is called.

import { describe, expect, it } from "vitest";

import {
  decideStaffMfaStep,
  decisionAllows,
  generateRecoveryCode,
  mfaStepPath,
  normalizeRecoveryCode,
  RECOVERY_CODE_COUNT,
} from "./staffMfa";

describe("decideStaffMfaStep — the allow path is exactly one case", () => {
  it("staff at aal2 is allowed", () => {
    expect(
      decideStaffMfaStep({
        isStaff: true,
        aal: { currentLevel: "aal2", nextLevel: "aal2" },
      }),
    ).toBe("allow");
  });

  it("allows aal2 even if nextLevel is odd — currentLevel is what grants", () => {
    expect(
      decideStaffMfaStep({
        isStaff: true,
        aal: { currentLevel: "aal2", nextLevel: null },
      }),
    ).toBe("allow");
  });
});

describe("decideStaffMfaStep — routing below aal2", () => {
  it("aal1/aal1 (no factor) routes to enrollment", () => {
    expect(
      decideStaffMfaStep({
        isStaff: true,
        aal: { currentLevel: "aal1", nextLevel: "aal1" },
      }),
    ).toBe("enroll");
  });

  it("aal1/aal2 (factor enrolled, unverified this session) routes to challenge", () => {
    expect(
      decideStaffMfaStep({
        isStaff: true,
        aal: { currentLevel: "aal1", nextLevel: "aal2" },
      }),
    ).toBe("challenge");
  });
});

// ===========================================================================
// FAIL-CLOSED — the reason the rule is "!== aal2 denies", not "=== aal1 denies"
// ===========================================================================
describe("decideStaffMfaStep — anything indeterminate DENIES", () => {
  it("denies when the assurance level could not be read at all", () => {
    expect(decideStaffMfaStep({ isStaff: true, aal: null })).toBe("deny");
  });

  it.each([
    ["null current", { currentLevel: null, nextLevel: "aal2" }],
    ["undefined current", { currentLevel: undefined, nextLevel: "aal2" }],
    ["empty string", { currentLevel: "", nextLevel: "aal2" }],
    ["unrecognised level", { currentLevel: "aal3", nextLevel: "aal3" }],
    ["future/unknown value", { currentLevel: "AAL2", nextLevel: "AAL2" }],
    ["nonsense pair", { currentLevel: "aal1", nextLevel: "banana" }],
    ["both null", { currentLevel: null, nextLevel: null }],
  ])("denies on %s", (_label, aal) => {
    expect(decideStaffMfaStep({ isStaff: true, aal })).toBe("deny");
  });

  it("case matters — 'AAL2' is NOT aal2", () => {
    // A positive-form check that lowercased before comparing could be fooled by
    // a value we never verified. The rule only recognises the exact literal.
    expect(
      decideStaffMfaStep({
        isStaff: true,
        aal: { currentLevel: "AAL2", nextLevel: "AAL2" },
      }),
    ).not.toBe("allow");
  });

  it("only 'allow' permits privileged work", () => {
    expect(decisionAllows("allow")).toBe(true);
    for (const d of ["enroll", "challenge", "deny"] as const) {
      expect(decisionAllows(d)).toBe(false);
    }
  });
});

describe("decideStaffMfaStep — parents are never gated", () => {
  it.each([
    ["no aal at all", null],
    ["aal1", { currentLevel: "aal1", nextLevel: "aal1" }],
    ["garbage", { currentLevel: "???", nextLevel: null }],
  ])("a non-staff user with %s is allowed through untouched", (_label, aal) => {
    // The gate is staff-only by construction: a parent is never asked for a
    // factor, whatever their assurance level happens to be.
    expect(decideStaffMfaStep({ isStaff: false, aal })).toBe("allow");
  });
});

describe("mfaStepPath — preserves ?next through the round trip", () => {
  it("routes each decision to its step", () => {
    expect(mfaStepPath("enroll")).toBe("/mfa/enroll");
    expect(mfaStepPath("challenge")).toBe("/mfa/challenge");
  });

  it("sends an indeterminate deny to the challenge, which re-evaluates server-side", () => {
    expect(mfaStepPath("deny")).toBe("/mfa/challenge");
  });

  it("URL-encodes next so /admin survives", () => {
    expect(mfaStepPath("challenge", "/admin")).toBe(
      "/mfa/challenge?next=%2Fadmin",
    );
    expect(mfaStepPath("enroll", "/instructor/student/abc?x=1")).toBe(
      "/mfa/enroll?next=%2Finstructor%2Fstudent%2Fabc%3Fx%3D1",
    );
  });
});

describe("recovery codes", () => {
  /** Deterministic bytes so the shape assertions are stable. */
  const seq = (n: number) =>
    new Uint8Array(Array.from({ length: n }, (_, i) => i * 7 + 3));

  it("issues the agreed number per enrolment", () => {
    expect(RECOVERY_CODE_COUNT).toBe(10);
  });

  it("formats as two groups of five from an unambiguous alphabet", () => {
    const code = generateRecoveryCode(seq);
    expect(code).toMatch(/^[ACDEFGHJKLMNPQRTUVWXYZ2346789]{5}-[ACDEFGHJKLMNPQRTUVWXYZ2346789]{5}$/);
  });

  it("breaks every look-alike pair a human could misread off paper", () => {
    // One side of each confusable pair is dropped: O/0, I/1, S/5, and B (from
    // B/8). 8 survives precisely because B is gone, so nothing is left to
    // confuse it with — asserting 8 were absent would be testing a rule we
    // deliberately did not adopt.
    const many = Array.from({ length: 200 }, (_, i) =>
      generateRecoveryCode((n) =>
        new Uint8Array(Array.from({ length: n }, (_, j) => i * 13 + j)),
      ),
    ).join("");
    for (const forbidden of ["O", "0", "I", "1", "S", "5", "B"]) {
      expect(many, `${forbidden} is confusable and must not appear`).not.toContain(
        forbidden,
      );
    }
    expect(many).toContain("8"); // kept on purpose
  });

  it("normalises the way a human retypes a code", () => {
    const canonical = normalizeRecoveryCode("K7M2Q-XR94T");
    expect(normalizeRecoveryCode("k7m2q-xr94t")).toBe(canonical);
    expect(normalizeRecoveryCode("K7M2QXR94T")).toBe(canonical);
    expect(normalizeRecoveryCode(" K7M2Q - XR94T ")).toBe(canonical);
  });
});
