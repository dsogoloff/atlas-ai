// Tests for the /start and /submit fetch wrappers.
// fetch is stubbed via vi.stubGlobal — vitest config runs in node environment
// so the global is replaceable. Each test installs a fresh mock implementation.

import { afterEach, describe, expect, it, vi } from "vitest";

import type { StartResponseBody } from "@/lib/sessionStart/types";
import type { SubmitResponseBody } from "@/lib/responseSubmit/types";

import {
  startSession,
  submitResponse,
  type ApiErrorKind,
} from "./api";

const startBody: StartResponseBody = {
  session_id: "00000000-0000-4000-8000-000000000001",
  question: {
    id: "00000000-0000-4000-8000-000000000002",
    strand: "operations_algorithms",
    level: "3A",
    format: "MULTIPLE_CHOICE",
    content: { stem: "1+1?", options: ["1", "2", "3", "4"] },
  },
  next_request: { strand: "operations_algorithms", target_difficulty: 0, width: 0.5 },
  response_count: 0,
};

const submitBodyNext: SubmitResponseBody = {
  is_correct: true,
  time_flag: "NORMAL",
  done: false,
  response_count: 1,
  next_request: { strand: "operations_algorithms", target_difficulty: 0.2, width: 0.5 },
  next_question: {
    id: "00000000-0000-4000-8000-000000000003",
    strand: "operations_algorithms",
    level: "3A",
    format: "NUMERIC_ENTRY",
    content: { stem: "2+2?" },
  },
};

const submitBodyDone: SubmitResponseBody = {
  is_correct: true,
  time_flag: "NORMAL",
  done: true,
  response_count: 25,
  placement: {
    overall_level: "3A",
    strand_levels: {
      operations_algorithms: "3A",
      number_sense: "3A",
      fractions_decimals: "2B",
      measurement: "2B",
      geometry: "2B",
      data_statistics: "2B",
    },
    confidence: 0.85,
  },
  termination_reason: "confidence-threshold-met",
};

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

function mockFetchThrows(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("network down");
    }),
  );
}

function mockFetchMalformed(status: number): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response("not-json{", {
        status,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startSession", () => {
  it("200 fresh → ok with resumed:false and body", async () => {
    mockFetchOnce(200, startBody);
    const r = await startSession("child-id");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resumed).toBe(false);
      expect(r.body.session_id).toBe(startBody.session_id);
    }
  });

  it("200 with body.resumed → ok with resumed:true (resume flows into the session)", async () => {
    const resumeBody: StartResponseBody = {
      ...startBody,
      response_count: 3,
      resumed: true,
    };
    mockFetchOnce(200, resumeBody);
    const r = await startSession("child-id");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resumed).toBe(true);
      expect(r.body.response_count).toBe(3);
    }
  });

  // P3 regression: the legacy resume shape was HTTP 409 + body.error
  // "session_in_progress" wrapped around a complete session payload.
  // Treating it as an error trapped returning children in a sterile
  // "Something went wrong" → Try again loop. Any complete session
  // payload must route into the in-progress flow.
  it("legacy 409 (resume payload) → ok with resumed:true (NOT an error)", async () => {
    const legacyResumeBody = {
      ...startBody,
      response_count: 3,
      error: { code: "session_in_progress", message: "resumed" },
    };
    mockFetchOnce(409, legacyResumeBody);
    const r = await startSession("child-id");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.resumed).toBe(true);
      expect(r.body.session_id).toBe(startBody.session_id);
    }
  });

  // P3 hardening: even an error status carrying a complete session
  // payload resolves to the session — "Try again" must never loop while
  // a live session is being handed to us.
  it("error status with a complete session payload → ok (routes into the session)", async () => {
    mockFetchOnce(500, { ...startBody, resumed: true });
    const r = await startSession("child-id");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.resumed).toBe(true);
  });

  it.each<[number, ApiErrorKind]>([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [422, "unavailable"],
    [500, "server"],
    [502, "server"],
  ])("%i → kind: %s", async (status, kind) => {
    mockFetchOnce(status, { error: { code: "x", message: "x" } });
    const r = await startSession("child-id");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe(kind);
  });

  it("network failure → kind: network", async () => {
    mockFetchThrows();
    const r = await startSession("child-id");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("network");
  });

  it("malformed JSON on 200 → kind: server with status 200", async () => {
    mockFetchMalformed(200);
    const r = await startSession("child-id");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("server");
      expect(r.error.status).toBe(200);
    }
  });

  it("malformed JSON on 409 → kind: server with status 409", async () => {
    mockFetchMalformed(409);
    const r = await startSession("child-id");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("server");
      expect(r.error.status).toBe(409);
    }
  });
});

describe("submitResponse", () => {
  const args = {
    sessionId: "00000000-0000-4000-8000-000000000001",
    questionId: "00000000-0000-4000-8000-000000000002",
    answerGiven: "2",
    timeMs: 5000,
  };

  it("200 with done:false → ok with next_question body", async () => {
    mockFetchOnce(200, submitBodyNext);
    const r = await submitResponse(args);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body.done).toBe(false);
      expect(r.body.next_question?.id).toBe(submitBodyNext.next_question?.id);
    }
  });

  it("200 with done:true → ok with placement body", async () => {
    mockFetchOnce(200, submitBodyDone);
    const r = await submitResponse(args);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body.done).toBe(true);
      expect(r.body.placement?.overall_level).toBe("3A");
    }
  });

  it.each<[number, ApiErrorKind]>([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "session_completed"], // submit-specific: NOT a resume signal
    [500, "server"],
    [502, "server"],
  ])("%i → kind: %s", async (status, kind) => {
    mockFetchOnce(status, { error: { code: "x", message: "x" } });
    const r = await submitResponse(args);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe(kind);
  });

  it("network failure → kind: network", async () => {
    mockFetchThrows();
    const r = await submitResponse(args);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("network");
  });

  it("malformed JSON on 200 → kind: server with status 200", async () => {
    mockFetchMalformed(200);
    const r = await submitResponse(args);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("server");
      expect(r.error.status).toBe(200);
    }
  });

  it("posts the snake_case wire shape", async () => {
    let captured: { body: string } | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        captured = { body: String(init?.body ?? "") };
        return new Response(JSON.stringify(submitBodyNext), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    await submitResponse(args);
    expect(captured).not.toBeNull();
    const parsed = JSON.parse(captured!.body);
    expect(parsed).toEqual({
      session_id: args.sessionId,
      question_id: args.questionId,
      answer_given: args.answerGiven,
      time_ms: args.timeMs,
    });
  });
});
