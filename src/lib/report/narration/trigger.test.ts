// Tests for the narration trigger fired on session completion.
//
// Coverage per the brief:
//   * Happy path: completion triggers a narration row write (upsert).
//   * Thrown narration failure does NOT fail completion: when generate
//     throws, attemptNarration catches, logs, and resolves normally.
//   * Idempotency: upsert uses session_id as the conflict key.
//
// generateReportNarration is mocked so no live Sonnet call runs. The
// supabase service client is mocked enough to assert which calls are
// made and capture upsert payloads.

// vi.mock is hoisted; declare before importing the unit under test.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/report/narration/generate", () => ({
  generateReportNarration: vi.fn(),
}));

vi.mock("@/lib/report/assemble", () => ({
  assembleReportContent: vi.fn(),
}));

import type { SupabaseClient } from "@supabase/supabase-js";

import { assembleReportContent } from "@/lib/report/assemble";
import { generateReportNarration } from "@/lib/report/narration/generate";
import type {
  ReportContent,
  ReportNarration,
} from "@/lib/report/types";
import type { Database } from "@/lib/supabase/database.types";

import { attemptNarration } from "./trigger";

const mockAssemble = vi.mocked(assembleReportContent);
const mockGenerate = vi.mocked(generateReportNarration);

const SESSION_ID = "00000000-0000-4000-8000-00000a1de003";
const TENANT_ID = "00000000-0000-4000-8000-0000000a71a5";

// ---------------------------------------------------------------------------
// Fake supabase service client. Each table's .from() chain returns canned
// results; upsert calls are captured for assertion.
// ---------------------------------------------------------------------------

interface UpsertCall {
  table: string;
  row: Record<string, unknown>;
  options?: { onConflict?: string };
}

function makeServiceClient(opts: {
  session?: Record<string, unknown> | null;
  child?: Record<string, unknown> | null;
  upsertError?: { message: string } | null;
}): { client: SupabaseClient<Database>; upserts: UpsertCall[] } {
  const upserts: UpsertCall[] = [];
  const client = {
    from(table: string) {
      if (table === "assessment_sessions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.session ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "children") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.child ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "report_narrations") {
        return {
          upsert: async (
            row: Record<string, unknown>,
            options?: { onConflict?: string },
          ) => {
            upserts.push({ table, row, options });
            return { error: opts.upsertError ?? null };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
  return { client, upserts };
}

// ---------------------------------------------------------------------------

const SESSION_ROW = {
  id: SESSION_ID,
  tenant_id: TENANT_ID,
  child_id: "child-xxxx",
  started_at: "2026-05-19T15:30:00.000Z",
  completed_at: "2026-05-19T15:44:00.000Z",
  current_estimate: {},
  session_time_flag: "normal",
};

const CHILD_ROW = {
  name: "Aiden Park",
  birth_year: 2017,
  grade_level: "3",
};

const FAKE_REPORT_CONTENT: ReportContent = {
  session_id: SESSION_ID,
  tenant_id: TENANT_ID,
  generated_at: "2026-05-19T15:44:01.000Z",
  child: { display_name: "Aiden Park", grade_label: "3rd Grade" },
  metadata: {
    assessed_date_display: "May 19, 2026",
    duration_display: "14 minutes",
    report_id: SESSION_ID,
  },
  time_flag: "normal",
  placement: { sam_level: "S.A.M Level 3A", overall_percentage: 70, tier: "K_4" },
  strand_mastery: [],
  misconceptions: [],
  recommendations: [],
};

const FAKE_NARRATION_OK: ReportNarration = {
  session_id: SESSION_ID,
  tenant_id: TENANT_ID,
  generated_at: "2026-05-19T15:44:02.000Z",
  model: "claude-sonnet-4-6",
  status: "ok",
  placement_line: "Placement line.",
  strand_lede: "Strand lede.",
  misconceptions_lede: "Misconceptions lede.",
  recommendations_lede: "Recommendations lede.",
};

beforeEach(() => {
  mockAssemble.mockReset();
  mockGenerate.mockReset();
});

describe("attemptNarration", () => {
  it("writes a narration row on successful completion (happy path)", async () => {
    mockAssemble.mockResolvedValue(FAKE_REPORT_CONTENT);
    mockGenerate.mockResolvedValue(FAKE_NARRATION_OK);
    const { client, upserts } = makeServiceClient({
      session: SESSION_ROW,
      child: CHILD_ROW,
    });

    await attemptNarration(client, SESSION_ID);

    expect(upserts).toHaveLength(1);
    expect(upserts[0].table).toBe("report_narrations");
    expect(upserts[0].row.session_id).toBe(SESSION_ID);
    expect(upserts[0].row.tenant_id).toBe(TENANT_ID);
    expect(upserts[0].row.status).toBe("ok");
    expect(upserts[0].row.placement_line).toBe("Placement line.");
    expect(upserts[0].row.strand_lede).toBe("Strand lede.");
    expect(upserts[0].row.misconceptions_lede).toBe("Misconceptions lede.");
    expect(upserts[0].row.recommendations_lede).toBe("Recommendations lede.");
  });

  it("uses session_id as the upsert conflict key (idempotency)", async () => {
    mockAssemble.mockResolvedValue(FAKE_REPORT_CONTENT);
    mockGenerate.mockResolvedValue(FAKE_NARRATION_OK);
    const { client, upserts } = makeServiceClient({
      session: SESSION_ROW,
      child: CHILD_ROW,
    });

    await attemptNarration(client, SESSION_ID);

    expect(upserts[0].options?.onConflict).toBe("session_id");
  });

  it("writes status:'failed' rows from generate (audit) without throwing", async () => {
    // Piece 3 hands back status:'failed' with prose undefined when the
    // Sonnet output is shape-invalid. The trigger upserts it normally —
    // null-coerce per-field — so the audit row exists.
    mockAssemble.mockResolvedValue(FAKE_REPORT_CONTENT);
    mockGenerate.mockResolvedValue({
      session_id: SESSION_ID,
      tenant_id: TENANT_ID,
      generated_at: "2026-05-19T15:44:02.000Z",
      model: "claude-sonnet-4-6",
      status: "failed",
    });
    const { client, upserts } = makeServiceClient({
      session: SESSION_ROW,
      child: CHILD_ROW,
    });

    await attemptNarration(client, SESSION_ID);

    expect(upserts).toHaveLength(1);
    expect(upserts[0].row.status).toBe("failed");
    expect(upserts[0].row.placement_line).toBeNull();
    expect(upserts[0].row.strand_lede).toBeNull();
    expect(upserts[0].row.misconceptions_lede).toBeNull();
    expect(upserts[0].row.recommendations_lede).toBeNull();
  });

  it("never throws when generateReportNarration throws (failure isolation)", async () => {
    // Network / parse / SDK throw from the live Sonnet call. The whole
    // narration step must catch and resolve so the caller (closeSession)
    // is unaffected. Completion logic is the critical path.
    mockAssemble.mockResolvedValue(FAKE_REPORT_CONTENT);
    mockGenerate.mockRejectedValue(new Error("simulated Sonnet failure"));
    const { client, upserts } = makeServiceClient({
      session: SESSION_ROW,
      child: CHILD_ROW,
    });

    await expect(attemptNarration(client, SESSION_ID)).resolves.toBeUndefined();
    // Nothing written — the throw happened before the upsert.
    expect(upserts).toHaveLength(0);
  });

  it("never throws when assembleReportContent throws", async () => {
    mockAssemble.mockRejectedValue(new Error("simulated assembly failure"));
    const { client, upserts } = makeServiceClient({
      session: SESSION_ROW,
      child: CHILD_ROW,
    });

    await expect(attemptNarration(client, SESSION_ID)).resolves.toBeUndefined();
    expect(upserts).toHaveLength(0);
    // generate must not be called when assembly fails.
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns cleanly when the session row is missing", async () => {
    const { client, upserts } = makeServiceClient({
      session: null,
      child: CHILD_ROW,
    });

    await expect(attemptNarration(client, SESSION_ID)).resolves.toBeUndefined();
    expect(upserts).toHaveLength(0);
    expect(mockAssemble).not.toHaveBeenCalled();
  });
});
