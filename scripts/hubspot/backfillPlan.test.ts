import { describe, expect, it } from "vitest";

import type { AttemptCrmSummary } from "../../src/lib/assessmentHistory/attempts";
import {
  ATTEMPT_PROPERTIES,
  childSlotNotes,
  mergeCrmSummaries,
  parseArgs,
  planAccount,
  resolveMode,
  toEpochMillis,
  type BackfillAccountInput,
} from "./backfillPlan";

// Pure logic only — no network, no database, no HubSpot. The grade -> enum
// mapping itself is owned and tested by src/lib/hubspot/childFields.ts; what is
// exercised here is this script's own decisions.

const NO_HISTORY: AttemptCrmSummary = {
  attemptCount: 0,
  firstStartedAt: null,
  firstCompletedAt: null,
  latestStartedAt: null,
  latestCompletedAt: null,
};

function summary(over: Partial<AttemptCrmSummary>): AttemptCrmSummary {
  return { ...NO_HISTORY, ...over };
}

function account(over: Partial<BackfillAccountInput> = {}): BackfillAccountInput {
  return {
    accountId: "acct-1",
    contactId: "101",
    children: [{ firstName: "Ada", grade: "3rd" }],
    archivedChildCount: 0,
    childSummaries: [
      summary({
        attemptCount: 1,
        firstStartedAt: "2026-01-05T10:00:00.000Z",
        firstCompletedAt: "2026-01-05T10:30:00.000Z",
        latestStartedAt: "2026-01-05T10:00:00.000Z",
        latestCompletedAt: "2026-01-05T10:30:00.000Z",
      }),
    ],
    attemptPropertiesLive: true,
    ...over,
  };
}

// ===========================================================================
// Argument parsing — argv ONLY
// ===========================================================================

describe("parseArgs", () => {
  it("defaults to a local, non-writing dry run", () => {
    expect(parseArgs([])).toEqual({
      target: "local",
      apply: false,
      confirm: false,
      limit: null,
      accountId: null,
    });
  });

  it("accepts --name=value (the existing script convention)", () => {
    const args = parseArgs([
      "--target=prod",
      "--limit=5",
      "--account=1f3c2a9e-0b4d-4a17-9c8e-2d5f6a7b8c90",
    ]);
    expect(args.target).toBe("prod");
    expect(args.limit).toBe(5);
    expect(args.accountId).toBe("1f3c2a9e-0b4d-4a17-9c8e-2d5f6a7b8c90");
  });

  it("also accepts --name value", () => {
    const args = parseArgs([
      "--target",
      "prod",
      "--limit",
      "2",
      "--account",
      "1f3c2a9e-0b4d-4a17-9c8e-2d5f6a7b8c90",
    ]);
    expect(args.target).toBe("prod");
    expect(args.limit).toBe(2);
    expect(args.accountId).toBe("1f3c2a9e-0b4d-4a17-9c8e-2d5f6a7b8c90");
  });

  it("never lets a value-less flag swallow the next flag", () => {
    // `--account --apply` must not read "--apply" as the account id and must
    // not silently drop it either.
    expect(() => parseArgs(["--account", "--apply"])).toThrow(/--account must be a uuid/);
  });

  it("rejects a non-uuid account", () => {
    expect(() => parseArgs(["--account=all"])).toThrow(/--account must be a uuid/);
  });

  it("rejects a non-positive or non-integer limit", () => {
    expect(() => parseArgs(["--limit=0"])).toThrow(/--limit must be a positive integer/);
    expect(() => parseArgs(["--limit=-3"])).toThrow(/--limit must be a positive integer/);
    expect(() => parseArgs(["--limit=2.5"])).toThrow(/--limit must be a positive integer/);
    expect(() => parseArgs(["--limit=lots"])).toThrow(/--limit must be a positive integer/);
  });

  it("rejects an unknown target", () => {
    expect(() => parseArgs(["--target=staging"])).toThrow(/--target must be/);
  });

  it("ignores the environment entirely — no env var can request a write", () => {
    const before = { ...process.env };
    process.env.APPLY = "true";
    process.env.HUBSPOT_BACKFILL_APPLY = "1";
    process.env.CI = "true";
    process.env.HUBSPOT_ATTEMPT_PROPERTIES_LIVE = "true";
    try {
      const args = parseArgs([]);
      expect(args.apply).toBe(false);
      expect(args.confirm).toBe(false);
      expect(resolveMode(args)).toEqual({ kind: "dry-run" });
    } finally {
      process.env = before;
    }
  });
});

// ===========================================================================
// Dry-run vs --apply gating
// ===========================================================================

describe("resolveMode", () => {
  it("is a dry run with no flags", () => {
    expect(resolveMode(parseArgs([]))).toEqual({ kind: "dry-run" });
  });

  it("is still a dry run with --confirm alone", () => {
    expect(resolveMode(parseArgs(["--confirm"]))).toEqual({ kind: "dry-run" });
  });

  it("REFUSES --apply without --confirm rather than downgrading to a dry run", () => {
    const mode = resolveMode(parseArgs(["--apply"]));
    expect(mode.kind).toBe("refused");
    expect(mode.kind === "refused" && mode.reason).toMatch(/--apply requires --confirm/);
  });

  it("writes only with both flags", () => {
    expect(resolveMode(parseArgs(["--apply", "--confirm"]))).toEqual({ kind: "apply" });
  });
});

// ===========================================================================
// Account-level fold of per-child summaries
// ===========================================================================

describe("mergeCrmSummaries", () => {
  it("is the empty summary for an account with no children", () => {
    expect(mergeCrmSummaries([])).toEqual(NO_HISTORY);
  });

  it("takes the EARLIEST firsts and the LATEST latests, and sums the counts", () => {
    const merged = mergeCrmSummaries([
      summary({
        attemptCount: 2,
        firstStartedAt: "2026-03-01T00:00:00.000Z",
        firstCompletedAt: "2026-03-01T01:00:00.000Z",
        latestStartedAt: "2026-06-01T00:00:00.000Z",
        latestCompletedAt: "2026-06-01T01:00:00.000Z",
      }),
      summary({
        attemptCount: 1,
        firstStartedAt: "2026-01-15T00:00:00.000Z",
        firstCompletedAt: "2026-01-15T01:00:00.000Z",
        latestStartedAt: "2026-01-15T00:00:00.000Z",
        latestCompletedAt: "2026-01-15T01:00:00.000Z",
      }),
    ]);
    expect(merged).toEqual({
      attemptCount: 3,
      firstStartedAt: "2026-01-15T00:00:00.000Z",
      firstCompletedAt: "2026-01-15T01:00:00.000Z",
      latestStartedAt: "2026-06-01T00:00:00.000Z",
      latestCompletedAt: "2026-06-01T01:00:00.000Z",
    });
  });

  it("keeps a re-taker's ORIGINAL first dates, not the latest ones", () => {
    // The whole point of the backfill: HubSpot's live properties are
    // latest-wins, so only Atlas still knows 2025-09-02.
    const merged = mergeCrmSummaries([
      summary({
        attemptCount: 3,
        firstStartedAt: "2025-09-02T08:00:00.000Z",
        firstCompletedAt: "2025-09-02T08:40:00.000Z",
        latestStartedAt: "2026-05-11T08:00:00.000Z",
        latestCompletedAt: "2026-05-11T08:40:00.000Z",
      }),
    ]);
    expect(merged.firstStartedAt).toBe("2025-09-02T08:00:00.000Z");
    expect(merged.firstCompletedAt).toBe("2025-09-02T08:40:00.000Z");
  });

  it("ignores unparseable instants instead of letting NaN win", () => {
    const merged = mergeCrmSummaries([
      summary({ firstStartedAt: "not-a-date" }),
      summary({ firstStartedAt: "2026-02-02T00:00:00.000Z" }),
    ]);
    expect(merged.firstStartedAt).toBe("2026-02-02T00:00:00.000Z");
  });

  it("is null, never NaN, when every instant is unparseable", () => {
    expect(mergeCrmSummaries([summary({ firstStartedAt: "" })]).firstStartedAt).toBeNull();
  });
});

describe("toEpochMillis", () => {
  it("converts an ISO instant to epoch millis", () => {
    expect(toEpochMillis("2026-01-05T10:00:00.000Z")).toBe(
      Date.parse("2026-01-05T10:00:00.000Z"),
    );
  });

  it("returns null for null and for garbage, so the property is omitted", () => {
    expect(toEpochMillis(null)).toBeNull();
    expect(toEpochMillis("whenever")).toBeNull();
  });
});

// ===========================================================================
// Per-account decisions
// ===========================================================================

describe("planAccount", () => {
  it("writes child fields and first-attempt fields for a normal account", () => {
    const row = planAccount(account());
    expect(row.verdict).toBe("would-write");
    expect(row.skipReason).toBeNull();
    expect(row.properties).toEqual({
      child_1_name: "Ada",
      child_1_grade: "3",
      // datetime — full precision.
      [ATTEMPT_PROPERTIES.firstStartedAt]: Date.parse("2026-01-05T10:00:00.000Z"),
      // `date` in the portal — midnight UTC of the completion day, or HubSpot
      // rejects the whole PATCH. 10:30Z on the 5th floors to the 5th.
      [ATTEMPT_PROPERTIES.firstCompletedAt]: Date.UTC(2026, 0, 5),
      [ATTEMPT_PROPERTIES.attemptCount]: 1,
    });
  });

  it("emits NOTHING level-, band-, score- or response-shaped", () => {
    const row = planAccount(account());
    const keys = Object.keys(row.properties).join(" ").toLowerCase();
    for (const banned of ["level", "band", "score", "response", "estimate", "sam_"]) {
      expect(keys).not.toContain(banned);
    }
  });

  it("skips with no-hubspot-contact when the contact could not be resolved", () => {
    const row = planAccount(account({ contactId: null }));
    expect(row.verdict).toBe("skipped");
    expect(row.skipReason).toBe("no-hubspot-contact");
    expect(row.properties).toEqual({});
  });

  it("prefers no-hubspot-contact over any other reason", () => {
    const row = planAccount(account({ contactId: null, children: [] }));
    expect(row.skipReason).toBe("no-hubspot-contact");
  });

  it("skips with no-children when the account has no active child", () => {
    const row = planAccount(account({ children: [], childSummaries: [] }));
    expect(row.skipReason).toBe("no-children");
  });

  it("skips with nothing-to-write when Atlas can assert nothing", () => {
    const row = planAccount(
      account({
        children: [{ firstName: "   ", grade: "Honors" }],
        childSummaries: [NO_HISTORY],
      }),
    );
    expect(row.skipReason).toBe("nothing-to-write");
    expect(row.properties).toEqual({});
  });

  it("still writes child fields for an account that never assessed", () => {
    const row = planAccount(
      account({ children: [{ firstName: "Bo", grade: "K" }], childSummaries: [NO_HISTORY] }),
    );
    expect(row.verdict).toBe("would-write");
    expect(row.properties).toEqual({ child_1_name: "Bo", child_1_grade: "k" });
    expect(row.properties).not.toHaveProperty(ATTEMPT_PROPERTIES.attemptCount);
  });

  it("omits attempt_count rather than writing a meaningless 0", () => {
    const row = planAccount(
      account({
        childSummaries: [summary({ attemptCount: 0, firstStartedAt: "2026-01-05T10:00:00.000Z" })],
      }),
    );
    expect(row.properties).not.toHaveProperty(ATTEMPT_PROPERTIES.attemptCount);
    expect(row.properties).toHaveProperty(ATTEMPT_PROPERTIES.firstStartedAt);
    expect(row.properties).not.toHaveProperty(ATTEMPT_PROPERTIES.firstCompletedAt);
  });

  it("WITHHOLDS the three not-yet-created properties when the gate is off", () => {
    const row = planAccount(account({ attemptPropertiesLive: false }));
    expect(row.verdict).toBe("would-write");
    expect(row.properties).toEqual({ child_1_name: "Ada", child_1_grade: "3" });
    expect(row.notes.join(" ")).toMatch(/attempt properties WITHHELD/);
  });

  it("skips a history-only account when the gate is off", () => {
    // Nothing would be left in the patch, so there is no point PATCHing.
    const row = planAccount(
      account({
        attemptPropertiesLive: false,
        children: [{ firstName: "", grade: null }],
      }),
    );
    expect(row.skipReason).toBe("nothing-to-write");
  });

  it("sums attempts across siblings into the one contact-level count", () => {
    const row = planAccount(
      account({
        children: [
          { firstName: "Ada", grade: "3" },
          { firstName: "Bo", grade: "K" },
        ],
        childSummaries: [
          summary({
            attemptCount: 2,
            firstStartedAt: "2026-04-01T00:00:00.000Z",
            firstCompletedAt: "2026-04-01T01:00:00.000Z",
          }),
          summary({
            attemptCount: 1,
            firstStartedAt: "2026-02-01T00:00:00.000Z",
            firstCompletedAt: "2026-02-01T01:00:00.000Z",
          }),
        ],
      }),
    );
    expect(row.properties[ATTEMPT_PROPERTIES.attemptCount]).toBe(3);
    expect(row.properties[ATTEMPT_PROPERTIES.firstStartedAt]).toBe(
      Date.parse("2026-02-01T00:00:00.000Z"),
    );
    expect(row.properties.child_1_name).toBe("Ada");
    expect(row.properties.child_2_name).toBe("Bo");
  });

  it("reports archived children rather than writing them", () => {
    const row = planAccount(account({ archivedChildCount: 2 }));
    expect(row.notes.join(" ")).toMatch(/2 archived child\(ren\) excluded/);
    expect(Object.keys(row.properties)).not.toContain("child_2_name");
  });

  it("reports the account summary even on a skipped row", () => {
    const row = planAccount(account({ contactId: null }));
    expect(row.summary.attemptCount).toBe(1);
    expect(row.summary.firstStartedAt).toBe("2026-01-05T10:00:00.000Z");
  });
});

// ===========================================================================
// Slot notes — WHY a name or grade is missing from the patch
// ===========================================================================

describe("childSlotNotes", () => {
  it("says nothing for a clean single child", () => {
    expect(childSlotNotes([{ firstName: "Ada", grade: "3rd" }])).toEqual([]);
  });

  it("flags an unmapped grade by child", () => {
    const notes = childSlotNotes([{ firstName: "Ada", grade: "Honors" }]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/Ada: grade omitted — "Honors" does not map/);
  });

  it("does not flag an absent or blank grade as unmapped", () => {
    expect(childSlotNotes([{ firstName: "Ada", grade: null }])).toEqual([]);
    expect(childSlotNotes([{ firstName: "Ada", grade: "   " }])).toEqual([]);
  });

  it("no longer flags a third child's name — child_3_name exists as of 2026-09-12", () => {
    // Slot 3 was name-less while the portal lacked child_3_name. The property
    // has since been created, so all three names are writable and there is
    // nothing to warn about. The note itself is kept for any FUTURE slot that
    // has no name property (CHILD_SLOTS still models `name: string | null`).
    const notes = childSlotNotes([
      { firstName: "Ada", grade: "3" },
      { firstName: "Bo", grade: "1" },
      { firstName: "Cy", grade: "K" },
    ]);
    expect(notes.join(" ")).not.toMatch(/first name NOT written/);
  });

  it("flags children beyond the last portal slot", () => {
    const notes = childSlotNotes([
      { firstName: "Ada", grade: "3" },
      { firstName: "Bo", grade: "1" },
      { firstName: "Cy", grade: "K" },
      { firstName: "Di", grade: "5" },
    ]);
    expect(notes.join(" ")).toMatch(/1 child\(ren\) beyond slot 3 ignored/);
  });
});
