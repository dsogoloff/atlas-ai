"use client";

import { useState } from "react";

import { redeemRecoveryCode } from "../lib/actions";

export function RecoveryForm({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await redeemRecoveryCode(code);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    // The lost factor is gone; set up a new one. This is the ONLY thing a
    // recovery code buys — it never grants access on its own.
    window.location.assign(`/mfa/enroll?next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
        <h1 className="font-display-child text-2xl text-sam-navy mb-2">
          Use a backup code
        </h1>
        <p className="font-body-regular text-sam-gray-mid mb-6">
          Enter one of the backup codes you saved when you set up two-factor.
          It works once, and it will let you set up a new authenticator.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block font-body-regular text-sam-navy" htmlFor="code">
            Backup code
          </label>
          <input
            id="code"
            name="code"
            autoComplete="off"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXXX-XXXXX"
            className="w-full px-4 py-3 border border-sam-gray-light rounded-xl text-lg tracking-widest text-center font-mono"
          />
          {error && (
            <p className="font-body-regular text-sam-red" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || code.trim().length === 0}
            className="w-full px-6 py-3 bg-sam-red hover:bg-sam-red/90 disabled:opacity-50 text-white font-headline-adult font-bold rounded-xl transition-colors"
          >
            {busy ? "Checking…" : "Use this code"}
          </button>
        </form>

        <p className="font-caption text-caption text-sam-gray-mid mt-6 text-center">
          Out of backup codes? Contact your S.A.M administrator.
        </p>
      </div>
    </main>
  );
}
