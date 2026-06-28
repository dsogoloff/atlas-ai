import { describe, it, expect } from "vitest";

import {
  checkShortEligibleInvariant,
  formatViolations,
  readSeed,
} from "../../../scripts/conversion/short-eligible-invariant";

// Bank invariant guard (process-hardening): a non-servable (is_active=false) item
// must NEVER be short_test_eligible. The dev DB builds entirely from seed.sql, where
// short_test_eligible is set by per-row held blocks and key-driven IN-list backfills —
// either can mark an inactive row short-eligible (10-verify-prod-bank.ts found 8 such
// rows). This fails RED in the PR if any seed statement could set short=true on an
// inactive row, so the half-flag drift can't be re-introduced. The DB CHECK constraint
// questions_inactive_not_short_eligible is the authoritative guarantee at reset; this is
// the no-DB CI mirror. See scripts/conversion/short-eligible-invariant.ts.
describe("seed short-test eligibility invariant (is_active=false ⟹ short=false)", () => {
  it("no seed statement can set short_test_eligible=true on an inactive row", () => {
    const res = checkShortEligibleInvariant(readSeed());
    expect(res.statementsScanned).toBeGreaterThan(0);
    expect(res.shortSetters).toBeGreaterThan(0);
    expect(
      res.ok,
      res.ok
        ? ""
        : `\nHalf-flag risk — these seed statements could mark an inactive row short-test eligible\n` +
          `(violates is_active=false ⟹ short_test_eligible=false):\n\n` +
          formatViolations(res.violations) +
          `\n\nFix: in per-row held blocks set short_test_eligible = false; in IN-list ` +
          `backfills add \`and q.is_active\` to the WHERE.\n`,
    ).toBe(true);
  });
});
