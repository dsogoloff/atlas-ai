// Tests for the assessment FSM. Pure reducer — no fetch, no React.

import { describe, expect, it } from "vitest";

import type { StartResponseBody } from "@/lib/sessionStart/types";
import type { SubmitResponseBody } from "@/lib/responseSubmit/types";

import {
  initialState,
  reduce,
  type Action,
  type ViewState,
} from "./reducer";

const startBody: StartResponseBody = {
  session_id: "00000000-0000-4000-8000-000000000001",
  question: {
    id: "q1",
    strand: "operations_algorithms",
    level: "3A",
    format: "MULTIPLE_CHOICE",
    content: { stem: "1+1?", options: ["1", "2", "3", "4"] },
  },
  next_request: { strand: "operations_algorithms", target_difficulty: 0, width: 0.5 },
  response_count: 0,
};

const resumeBody: StartResponseBody = {
  ...startBody,
  // Resume scenario: 3 responses already persisted from a prior tab/session.
  response_count: 3,
  resumed: true,
};

const submitNext: SubmitResponseBody = {
  is_correct: true,
  time_flag: "NORMAL",
  done: false,
  response_count: 1,
  next_request: { strand: "operations_algorithms", target_difficulty: 0.2, width: 0.5 },
  next_question: {
    id: "q2",
    strand: "operations_algorithms",
    level: "3A",
    format: "NUMERIC_ENTRY",
    content: { stem: "2+2?" },
  },
};

const submitDone: SubmitResponseBody = {
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

const runningInitial: ViewState = {
  kind: "running",
  sessionId: startBody.session_id,
  question: startBody.question,
  responseCount: 0,
  resumed: false,
  submitting: false,
};

describe("initial state", () => {
  it("starts in 'starting'", () => {
    expect(initialState.kind).toBe("starting");
  });
});

describe("START_OK / START_RESUME / START_ERR", () => {
  it("START_OK from starting → running with resumed:false", () => {
    const next = reduce(initialState, { type: "START_OK", body: startBody });
    expect(next).toEqual({
      kind: "running",
      sessionId: startBody.session_id,
      question: startBody.question,
      responseCount: 0,
      resumed: false,
      submitting: false,
    });
  });

  it("START_RESUME from starting → running with resumed:true", () => {
    const next = reduce(initialState, { type: "START_RESUME", body: resumeBody });
    expect(next.kind).toBe("running");
    if (next.kind === "running") expect(next.resumed).toBe(true);
  });

  // Item #12 Phase 7.7 — responseCount plumbing for the progress chrome.
  it("START_OK copies response_count from wire (fresh: 0)", () => {
    const next = reduce(initialState, { type: "START_OK", body: startBody });
    expect(next.kind).toBe("running");
    if (next.kind === "running") expect(next.responseCount).toBe(0);
  });

  it("START_RESUME copies response_count from wire (resume: > 0)", () => {
    const next = reduce(initialState, { type: "START_RESUME", body: resumeBody });
    expect(next.kind).toBe("running");
    // resumeBody is defined above with response_count: 3 (resume scenario).
    if (next.kind === "running") expect(next.responseCount).toBe(3);
  });

  it("START_OK from running is a no-op (defensive)", () => {
    const next = reduce(runningInitial, { type: "START_OK", body: startBody });
    expect(next).toBe(runningInitial);
  });

  it.each([
    ["network", true],
    ["server", true],
    ["unauthorized", false],
    ["forbidden", false],
    ["not_found", false],
    ["unavailable", false],
  ] as const)(
    "START_ERR with %s → error { canRetry:%s, resumeFrom:'start' }",
    (kind, canRetry) => {
      const next = reduce(initialState, {
        type: "START_ERR",
        error: { kind },
      });
      expect(next.kind).toBe("error");
      if (next.kind === "error") {
        expect(next.reason).toBe(kind);
        expect(next.canRetry).toBe(canRetry);
        expect(next.resumeFrom).toEqual({ kind: "start" });
      }
    },
  );
});

describe("SUBMIT", () => {
  it("from running { submitting:false } → running { submitting:true, pending }", () => {
    const next = reduce(runningInitial, {
      type: "SUBMIT",
      answerGiven: "2",
      timeMs: 5000,
    });
    expect(next.kind).toBe("running");
    if (next.kind === "running") {
      expect(next.submitting).toBe(true);
      expect(next.pending).toEqual({ answerGiven: "2", timeMs: 5000 });
    }
  });

  it("ignores double-submit while already submitting", () => {
    const submitting: ViewState = {
      ...runningInitial,
      submitting: true,
      pending: { answerGiven: "2", timeMs: 5000 },
    };
    const next = reduce(submitting, {
      type: "SUBMIT",
      answerGiven: "3",
      timeMs: 9000,
    });
    expect(next).toBe(submitting);
  });

  it("ignores SUBMIT outside running state", () => {
    const next = reduce(initialState, {
      type: "SUBMIT",
      answerGiven: "2",
      timeMs: 5000,
    });
    expect(next).toBe(initialState);
  });
});

describe("SUBMIT_OK_NEXT / SUBMIT_OK_DONE", () => {
  const submitting: ViewState = {
    ...runningInitial,
    submitting: true,
    pending: { answerGiven: "2", timeMs: 5000 },
  };

  it("SUBMIT_OK_NEXT → running with the new question, submitting:false, no pending", () => {
    const next = reduce(submitting, { type: "SUBMIT_OK_NEXT", body: submitNext });
    expect(next.kind).toBe("running");
    if (next.kind === "running") {
      expect(next.question).toEqual(submitNext.next_question);
      expect(next.submitting).toBe(false);
      expect(next.pending).toBeUndefined();
      expect(next.resumed).toBe(false);
      // Item #12 Phase 7.7 — responseCount advances from the wire.
      expect(next.responseCount).toBe(submitNext.response_count);
    }
  });

  it("SUBMIT_OK_NEXT with done:true is a no-op (mismatch)", () => {
    const next = reduce(submitting, {
      type: "SUBMIT_OK_NEXT",
      body: submitDone,
    });
    expect(next).toBe(submitting);
  });

  it("SUBMIT_OK_DONE → completed", () => {
    const next = reduce(submitting, { type: "SUBMIT_OK_DONE", body: submitDone });
    expect(next.kind).toBe("completed");
    if (next.kind === "completed") {
      expect(next.placement).toEqual(submitDone.placement);
      expect(next.terminationReason).toBe(submitDone.termination_reason);
    }
  });

  it("SUBMIT_OK_DONE with done:false is a no-op (mismatch)", () => {
    const next = reduce(submitting, {
      type: "SUBMIT_OK_DONE",
      body: submitNext,
    });
    expect(next).toBe(submitting);
  });

  it("SUBMIT_OK_NEXT outside running.submitting is a no-op", () => {
    const next = reduce(runningInitial, {
      type: "SUBMIT_OK_NEXT",
      body: submitNext,
    });
    expect(next).toBe(runningInitial);
  });
});

describe("SUBMIT_ERR", () => {
  const submitting: ViewState = {
    ...runningInitial,
    submitting: true,
    pending: { answerGiven: "2", timeMs: 5000 },
  };

  it("network error → error { canRetry:true, resumeFrom:'submit' with answer/timeMs }", () => {
    const next = reduce(submitting, {
      type: "SUBMIT_ERR",
      error: { kind: "network" },
    });
    expect(next.kind).toBe("error");
    if (next.kind === "error") {
      expect(next.canRetry).toBe(true);
      expect(next.resumeFrom).toEqual({
        kind: "submit",
        sessionId: submitting.sessionId,
        question: submitting.question,
        responseCount: 0,
        answerGiven: "2",
        timeMs: 5000,
      });
    }
  });

  it("session_completed → error with canRetry:false", () => {
    const next = reduce(submitting, {
      type: "SUBMIT_ERR",
      error: { kind: "session_completed" },
    });
    expect(next.kind).toBe("error");
    if (next.kind === "error") {
      expect(next.reason).toBe("session_completed");
      expect(next.canRetry).toBe(false);
    }
  });

  it("ignored when not submitting", () => {
    const next = reduce(runningInitial, {
      type: "SUBMIT_ERR",
      error: { kind: "network" },
    });
    expect(next).toBe(runningInitial);
  });
});

describe("RETRY_FROM_ERROR", () => {
  it("from start-error (canRetry:true) → starting", () => {
    const errored: ViewState = {
      kind: "error",
      reason: "network",
      canRetry: true,
      resumeFrom: { kind: "start" },
    };
    const next = reduce(errored, { type: "RETRY_FROM_ERROR" });
    expect(next).toEqual({ kind: "starting" });
  });

  it("from submit-error (canRetry:true) → running { submitting:true, pending preserved }", () => {
    const errored: ViewState = {
      kind: "error",
      reason: "server",
      canRetry: true,
      resumeFrom: {
        kind: "submit",
        sessionId: "s1",
        question: startBody.question,
        responseCount: 0,
        answerGiven: "2",
        timeMs: 5000,
      },
    };
    const next = reduce(errored, { type: "RETRY_FROM_ERROR" });
    expect(next.kind).toBe("running");
    if (next.kind === "running") {
      expect(next.submitting).toBe(true);
      expect(next.pending).toEqual({ answerGiven: "2", timeMs: 5000 });
      expect(next.sessionId).toBe("s1");
      expect(next.resumed).toBe(false);
    }
  });

  it("ignored when canRetry:false", () => {
    const errored: ViewState = {
      kind: "error",
      reason: "unauthorized",
      canRetry: false,
      resumeFrom: { kind: "start" },
    };
    const next = reduce(errored, { type: "RETRY_FROM_ERROR" });
    expect(next).toBe(errored);
  });

  it("ignored outside error state", () => {
    const next = reduce(runningInitial, { type: "RETRY_FROM_ERROR" });
    expect(next).toBe(runningInitial);
  });
});

describe("misc state isolation", () => {
  it("actions outside their valid origin state are no-ops (sample sweep)", () => {
    const completed: ViewState = {
      kind: "completed",
      placement: submitDone.placement!,
      terminationReason: "confidence-threshold-met",
    };
    const samples: Action[] = [
      { type: "START_OK", body: startBody },
      { type: "SUBMIT", answerGiven: "x", timeMs: 1 },
      { type: "SUBMIT_OK_NEXT", body: submitNext },
      { type: "SUBMIT_ERR", error: { kind: "network" } },
      { type: "RETRY_FROM_ERROR" },
    ];
    for (const action of samples) {
      expect(reduce(completed, action)).toBe(completed);
    }
  });
});
