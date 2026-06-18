"use client";

// Universal comprehensive CTA for the short-test report (shown to every
// short-test taker, pass or not). The button opens a short capture form
// (child's school + parent contact + best time), an EXPLICIT opt-in submit
// persists a follow-up lead and notifies the pilot center, then a generic
// confirmation shows (the online line is a no-date capture incentive). All
// copy is founder-approved (READINESS_COPY); only Tier 1/2 lead data is
// collected — no diagnostic result.

import { useState } from "react";

import { READINESS_COPY } from "@/lib/report/readiness";

import { submitFollowUpLead } from "./feedback-actions";

const C = READINESS_COPY;

interface Props {
  sessionId: string;
}

export function FollowUpCta({ sessionId }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const [schoolName, setSchoolName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [bestTimeToReach, setBestTimeToReach] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(false);
    const result = await submitFollowUpLead({
      sessionId,
      schoolName,
      parentName,
      parentEmail,
      parentPhone,
      bestTimeToReach,
    });
    setSubmitting(false);
    if (result.ok) setDone(true);
    else setError(true);
  }

  if (done) {
    return (
      <div className="mt-2">
        <h3 className="font-display-child text-base font-bold text-sam-navy">
          {C.confirmationHeading}
        </h3>
        <p className="mt-1 text-sm text-sam-gray-dark">{C.confirmationBody}</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <h2 className="font-display-child text-base font-bold text-sam-navy">
        {C.comprehensiveCtaHeading}
      </h2>
      <p className="mt-1 text-sm text-sam-gray-dark">{C.comprehensiveCtaBody}</p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-sam-teal px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sam-teal/90"
        >
          {C.comprehensiveCtaButton}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <Field label={C.form.schoolLabel} value={schoolName} onChange={setSchoolName} required />
          <Field label={C.form.parentNameLabel} value={parentName} onChange={setParentName} required />
          <Field label={C.form.emailLabel} type="email" value={parentEmail} onChange={setParentEmail} required />
          <Field label={C.form.phoneLabel} type="tel" value={parentPhone} onChange={setParentPhone} />
          <Field label={C.form.bestTimeLabel} value={bestTimeToReach} onChange={setBestTimeToReach} />
          {error && (
            <p role="alert" className="text-sm font-medium text-sam-red">
              {C.form.errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-sam-teal px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sam-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? C.form.submittingButton : C.form.submitButton}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-sam-navy">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-sam-gray-light px-3 py-2 text-sam-navy focus:border-sam-teal focus:outline-none"
      />
    </label>
  );
}
