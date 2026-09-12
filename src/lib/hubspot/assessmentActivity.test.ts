import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACTIVITY_MARKER,
  buildNoteBody,
  syncHubSpotAssessmentActivity,
  type AssessmentActivityEvent,
} from "./assessmentActivity";

const TOKEN = "hs_test_token";
const ACCOUNT_ID = "cdc2c196-eae4-4a71-ab72-2cf9cd455425";
const CONTACT_ID = "550914173668";
const NOTE_ID = "77112233";
const OCCURRED_AT = "2026-09-11T23:47:15.352Z";

const STARTED: AssessmentActivityEvent = {
  accountId: ACCOUNT_ID,
  event: "started",
  attemptNumber: 1,
  occurredAt: OCCURRED_AT,
};

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function res(status: number, body: unknown, ok = status < 300) {
  return { ok, status, json: async () => body };
}
const searchHit = () => res(200, { total: 1, results: [{ id: CONTACT_ID }] });
const noteCreated = () => res(201, { id: NOTE_ID });

function callBody(i: number): { properties: Record<string, unknown> } {
  return JSON.parse(fetchMock.mock.calls[i][1].body);
}

beforeEach(() => {
  vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", "");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

describe("buildNoteBody", () => {
  it("carries the stable machine marker a CRM agent keys on", () => {
    expect(buildNoteBody(STARTED)).toContain(ACTIVITY_MARKER.started);
    expect(buildNoteBody({ ...STARTED, event: "completed" })).toContain(
      ACTIVITY_MARKER.completed,
    );
  });

  it("labels the attempt number and the true timestamp", () => {
    const body = buildNoteBody({ ...STARTED, attemptNumber: 3 });
    expect(body).toContain("attempt 3");
    expect(body).toContain(OCCURRED_AT);
  });

  it("distinguishes started from completed unambiguously", () => {
    const started = buildNoteBody(STARTED);
    const completed = buildNoteBody({ ...STARTED, event: "completed" });
    expect(started).not.toContain(ACTIVITY_MARKER.completed);
    expect(completed).not.toContain(ACTIVITY_MARKER.started);
  });

  it("COMPLIANCE: the body carries no level, band, score or response data", () => {
    const body = buildNoteBody({ ...STARTED, attemptNumber: 2 });
    for (const forbidden of ["level", "band", "score", "strand", "correct", "answer"]) {
      expect(body.toLowerCase()).not.toContain(`${forbidden}:`);
    }
    // It says so out loud, so a human is not left hunting for a result.
    expect(body).toContain("not included");
  });
});

describe("syncHubSpotAssessmentActivity", () => {
  it("no-ops entirely when the sync token is unset (no fetch, no spend)", async () => {
    await syncHubSpotAssessmentActivity(STARTED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the note then associates it to the contact", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(noteCreated())
      .mockResolvedValueOnce(res(200, {}));

    await syncHubSpotAssessmentActivity(STARTED);

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [createUrl, createInit] = fetchMock.mock.calls[1];
    expect(createUrl).toBe("https://api.hubapi.com/crm/v3/objects/notes");
    expect(createInit.method).toBe("POST");

    const [assocUrl, assocInit] = fetchMock.mock.calls[2];
    expect(assocInit.method).toBe("PUT");
    // The v4 DEFAULT endpoint — no hardcoded numeric associationTypeId.
    expect(assocUrl).toBe(
      `https://api.hubapi.com/crm/v4/objects/notes/${NOTE_ID}/associations/default/contacts/${CONTACT_ID}`,
    );
    expect(assocInit.body).toBeUndefined();
  });

  it("stamps hs_timestamp with the attempt's TRUE instant, not now", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(noteCreated())
      .mockResolvedValueOnce(res(200, {}));

    await syncHubSpotAssessmentActivity(STARTED);
    expect(callBody(1).properties.hs_timestamp).toBe(OCCURRED_AT);
  });

  it("emits a SEPARATE note per attempt — re-takes are never collapsed", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    for (const attemptNumber of [1, 2, 3]) {
      fetchMock
        .mockResolvedValueOnce(searchHit())
        .mockResolvedValueOnce(noteCreated())
        .mockResolvedValueOnce(res(200, {}));
      await syncHubSpotAssessmentActivity({ ...STARTED, attemptNumber });
    }

    const bodies = [1, 4, 7].map((i) => callBody(i).properties.hs_note_body as string);
    expect(bodies).toHaveLength(3);
    expect(bodies[0]).toContain("attempt 1");
    expect(bodies[1]).toContain("attempt 2");
    expect(bodies[2]).toContain("attempt 3");
    // Three distinct notes, not one overwritten one.
    expect(new Set(bodies).size).toBe(3);
  });

  it("is UPDATE-ONLY: no contact match means no note and no create", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    fetchMock.mockResolvedValueOnce(res(200, { total: 0, results: [] }));

    await syncHubSpotAssessmentActivity(STARTED);

    expect(fetchMock).toHaveBeenCalledTimes(1); // the search only
    expect(errorSpy).toHaveBeenCalled();
  });

  it("shouts when the note was created but could not be associated", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    fetchMock
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(noteCreated())
      .mockResolvedValueOnce(res(400, {}));

    await syncHubSpotAssessmentActivity(STARTED);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("NOT associated"),
      expect.objectContaining({ noteId: NOTE_ID }),
    );
  });

  it("never throws when note creation fails", async () => {
    vi.stubEnv("HUBSPOT_ATLAS_SYNC_TOKEN", TOKEN);
    fetchMock.mockResolvedValueOnce(searchHit()).mockResolvedValueOnce(res(500, {}));

    await expect(syncHubSpotAssessmentActivity(STARTED)).resolves.toBeUndefined();
  });
});
