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

// Form-B coverage: the generated l0-overlay block sets is_active / short_test_eligible as
// POSITIONAL VALUES booleans (v.is_active, v.short_test_eligible), not `= true`. The original
// guard's literal-assignment regex was blind to this, so 12 held rows shipped with short=true
// and only failed at `supabase db reset` (2026-06-29). These cases pin the VALUES-tuple scan.
describe("VALUES-tuple form (positional is_active, short_test_eligible)", () => {
  const insert = (active: string, short: string, key = "null") =>
    `with t as (select id from tenants where slug = 'x')\n` +
    `insert into questions\n` +
    `  (tenant_id, external_id, strand, level, difficulty, format, content, misconception_tags,\n` +
    `   word_count, operation_type, num_operations, representation, is_active, short_test_eligible, content_id)\n` +
    `select t.id, v.external_id, v.strand::strand, v.level::half_grade_level, v.difficulty,\n` +
    `       v.format::question_format, v.content::jsonb, v.misconception_tags, v.word_count,\n` +
    `       v.operation_type::operation_type, v.num_operations, v.representation::representation_kind,\n` +
    `       v.is_active, v.short_test_eligible, null\n` +
    `from t,\n  (values\n` +
    `    ('SAM-L0A-Q03', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',\n` +
    `     '{"stem":"Tap the big bowl.","_authoring":{"held":true,"requires_format_swap":true}}'::jsonb,\n` +
    `     array[]::text[],\n` +
    `     4, 'IDENTIFY', 1, 'PICTORIAL', ${active}, ${short}, ${key})\n` +
    `  ) as v(external_id, strand, level, difficulty, format, content, misconception_tags,\n` +
    `         word_count, operation_type, num_operations, representation, is_active, short_test_eligible, content_key);`;

  it("FLAGS a held tuple (is_active=false, short_test_eligible=true)", () => {
    const res = checkShortEligibleInvariant(insert("false", "true"));
    expect(res.ok).toBe(false);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0]).toMatchObject({ kind: "held", firstId: "SAM-L0A-Q03" });
  });

  it("ALLOWS an active+short tuple and a held+non-short tuple", () => {
    expect(checkShortEligibleInvariant(insert("true", "true")).ok).toBe(true);
    expect(checkShortEligibleInvariant(insert("false", "false")).ok).toBe(true);
  });

  it("does NOT false-match booleans inside the content jsonb", () => {
    // "held":true / "requires_format_swap":true live in content but are not a (b, b) tuple run.
    const res = checkShortEligibleInvariant(insert("false", "false", "'l0a-geometry-2'"));
    expect(res.ok).toBe(true);
  });
});
