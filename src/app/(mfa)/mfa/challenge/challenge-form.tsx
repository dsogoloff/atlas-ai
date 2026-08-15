"use client";

import { useState } from "react";

import { verifyChallenge } from "../lib/actions";

export function ChallengeForm({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyChallenge(code);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    // Full navigation, not router.push: the session cookie was just upgraded to
    // AAL2 and the destination is server-rendered behind the gate. A hard load
    // guarantees the new cookie is the one the server reads.
    window.location.assign(next);
  }

  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
        <h1 className="font-display-child text-2xl text-sam-navy mb-2">
          Enter your code
        </h1>
        <p className="font-body-regular text-sam-gray-mid mb-6">
          Open your authenticator app and enter the current 6-digit code.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block font-body-regular text-sam-navy" htmlFor="code">
            6-digit code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 border border-sam-gray-light rounded-xl text-lg tracking-[0.3em] text-center"
          />
          {error && (
            <p className="font-body-regular text-sam-red" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || code.trim().length < 6}
            className="w-full px-6 py-3 bg-sam-red hover:bg-sam-red/90 disabled:opacity-50 text-white font-headline-adult font-bold rounded-xl transition-colors"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>

        <p className="font-caption text-caption text-sam-gray-mid mt-6 text-center">
          Lost your phone?{" "}
          <a
            className="underline"
            href={`/mfa/recovery?next=${encodeURIComponent(next)}`}
          >
            Use a backup code
          </a>
        </p>
      </div>
    </main>
  );
}
