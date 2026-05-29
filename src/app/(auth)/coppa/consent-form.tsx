"use client";

// Interactive footer for the /coppa disclosure card. Wires the (previously
// inert) agreement checkbox + "I Consent & Continue" button to the
// recordConsentAction server action, then advances to /add-child on success.
//
// The consent record is what the server-side assessment gate checks
// (src/lib/consent/verify.ts), so this submit is load-bearing for COPPA
// enforcement — not just navigation.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { recordConsentAction } from "./actions";

export function ConsentForm() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConsent() {
    setError(null);
    startTransition(async () => {
      const result = await recordConsentAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/add-child");
    });
  }

  return (
    <>
      {/* Agreement checkbox */}
      <div className="pt-6 border-t border-sam-gray-light">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-1">
            <input
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="peer h-5 w-5 rounded border-sam-gray-mid text-sam-red focus:ring-sam-red transition-all"
              type="checkbox"
            />
          </div>
          <span className="font-body-regular text-sam-navy group-hover:text-sam-red transition-colors">
            I verify that I am the parent/legal guardian and I give permission
            for Atlas Assessment to collect and use my child&rsquo;s diagnostic
            data as described above, including automated (AI) processing of
            assessment responses to identify learning patterns.
          </span>
        </label>
        {error && (
          <p
            role="alert"
            className="mt-3 text-sm text-sam-red font-body-regular"
          >
            {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-8 border-t border-sam-gray-light bg-surface-container-lowest rounded-b-[32px] flex flex-col md:flex-row justify-between items-center gap-4">
        <button
          type="button"
          className="w-full md:w-auto px-6 py-3 border-2 border-sam-navy text-sam-navy rounded-xl font-headline-adult text-sm hover:bg-sam-navy hover:text-white transition-all flex items-center justify-center gap-2 order-2 md:order-1"
        >
          <span className="material-symbols-outlined">picture_as_pdf</span>
          Download PDF
        </button>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto order-1 md:order-2">
          <Link
            href="/signup"
            className="px-8 py-3 text-sam-navy font-semibold hover:bg-sam-cream rounded-xl transition-colors text-center"
          >
            Decline
          </Link>
          <button
            type="button"
            onClick={onConsent}
            disabled={!agreed || pending}
            className="px-10 py-3 bg-sam-red text-white rounded-xl font-headline-adult text-base shadow-[0px_4px_12px_rgba(230,57,70,0.3)] enabled:hover:scale-105 enabled:active:scale-95 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Recording…" : "I Consent & Continue"}
          </button>
        </div>
      </div>
    </>
  );
}
