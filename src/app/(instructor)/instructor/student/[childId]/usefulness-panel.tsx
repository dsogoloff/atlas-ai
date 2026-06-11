"use client";

// Instructor usefulness capture: "How useful was this report for placement?"
// A 1-5 rating + optional note, mirroring the parent report's feedback island
// (parent-report-feedback.tsx) but in instructor chrome. Talks only to the
// submitInstructorUsefulness server action, which re-runs the auth + access
// gate server-side; this component collects input and reflects the result.

import { useState } from "react";

import { submitInstructorUsefulness } from "../../lib/actions";

const RATINGS = [1, 2, 3, 4, 5] as const;

export function UsefulnessPanel({ sessionId }: { sessionId: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating === null || status === "saving") return;
    setStatus("saving");
    setErrorMsg(null);
    const result = await submitInstructorUsefulness({
      sessionId,
      rating,
      comment,
    });
    if (result.ok) {
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="font-display-child text-sam-navy text-2xl mb-1">
        How useful was this report for placement?
      </h2>
      <p className="text-sm text-sam-gray-mid mb-4">
        Your rating helps us improve these reports. Not shown to parents.
      </p>

      {status === "done" ? (
        <p className="text-sm text-sam-navy/70 bg-sam-gray-light/40 rounded-xl px-4 py-3">
          Thanks — your feedback was recorded.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-sam-gray-light/40 p-4">
          <fieldset
            className="flex flex-wrap gap-2.5 mb-4"
            aria-label="Rate this report from 1 to 5"
          >
            {RATINGS.map((value) => {
              const selected = rating === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRating(value)}
                  className={`h-11 w-11 text-base font-bold rounded-xl border transition-colors ${
                    selected
                      ? "bg-sam-navy text-white border-sam-navy"
                      : "bg-transparent text-sam-navy/70 border-sam-gray-light/60"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </fieldset>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything to add? (optional)"
            rows={3}
            maxLength={2000}
            className="w-full resize-y rounded-xl border border-sam-gray-light/60 px-3 py-2 text-sm text-sam-navy focus:outline-none focus:border-sam-navy"
          />

          {status === "error" && errorMsg && (
            <p className="text-sm text-sam-red mt-2" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={rating === null || status === "saving"}
              className="px-5 py-2 rounded-xl bg-sam-navy text-white text-sm font-bold disabled:opacity-40 hover:opacity-95 transition-opacity"
            >
              {status === "saving" ? "Saving…" : "Submit feedback"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
