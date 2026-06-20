import { describe, it, expect } from "vitest";

import {
  checkParity,
  formatFailures,
} from "../../../scripts/conversion/seed-activation-parity";

// Parity guard (process-hardening): the dev DB builds entirely from seed.sql because
// tenant-scoped migrations no-op during `supabase db reset`. So any activation a
// migration declares MUST have a seed mirror, or it silently vanishes from the dev DB.
// This test fails RED in the PR if a stacked-PR merge drops a seed mirror — instead of
// being discovered in QA. See scripts/conversion/seed-activation-parity.ts.
describe("seed ↔ migration activation parity", () => {
  it("every migration activation/correction has a matching seed.sql mirror", () => {
    const res = checkParity();
    expect(res.migrationsScanned).toBeGreaterThan(0);
    expect(
      res.ok,
      res.ok
        ? ""
        : `\nDropped seed mirror(s) — these activations are in a migration but NOT in seed.sql,\n` +
          `so a fresh \`supabase db reset\` will silently omit them:\n\n` +
          formatFailures(res.failures) +
          `\n\nFix: restore the missing block(s) in supabase/seed.sql ` +
          `(or run \`pnpm seed:regen-activations\`).\n`,
    ).toBe(true);
  });
});
