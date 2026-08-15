"use client";

// Enrolment UI: QR + manual secret -> 6-digit verify -> recovery codes shown
// ONCE, with an explicit acknowledgement before the user can continue.
//
// The codes are displayed a single time and never re-fetchable: only their
// digests are stored. The acknowledgement checkbox exists so "I never saw them"
// is not a plausible support case.

import { useEffect, useState } from "react";

import { startEnrollment, verifyEnrollment } from "../lib/actions";

type Stage = "loading" | "scan" | "codes" | "error";

export function EnrollForm({
  next,
  staffName,
}: {
  next: string;
  staffName: string;
}) {
  const [stage, setStage] = useState<Stage>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await startEnrollment();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setStage("error");
        return;
      }
      setFactorId(result.data.factorId);
      setQrCode(result.data.qrCode);
      setSecret(result.data.secret);
      setStage("scan");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyEnrollment(factorId, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecoveryCodes(result.data.recoveryCodes);
    setStage("codes");
  }

  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg bg-white rounded-3xl p-10 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
        <h1 className="font-display-child text-2xl text-sam-navy mb-2">
          Set up two-factor authentication
        </h1>
        <p className="font-body-regular text-sam-gray-mid mb-6">
          {staffName}, staff accounts need an authenticator app before they can
          open student records.
        </p>

        {stage === "loading" && (
          <p className="font-body-regular text-sam-gray-mid">Preparing…</p>
        )}

        {stage === "error" && (
          <p className="font-body-regular text-sam-red" role="alert">
            {error}
          </p>
        )}

        {stage === "scan" && (
          <>
            <ol className="font-body-regular text-sam-navy/90 space-y-2 mb-5 list-decimal pl-5">
              <li>Open your authenticator app (Google Authenticator, 1Password, Authy…).</li>
              <li>Scan this QR code, or type the setup key below it.</li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>

            {/* qr_code is an SVG data URI minted by Supabase for this factor. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Two-factor setup QR code"
              src={qrCode}
              className="w-48 h-48 mx-auto mb-4 border border-sam-gray-light rounded-xl bg-white"
            />

            <p className="font-caption text-caption text-sam-gray-mid text-center mb-1">
              Can&rsquo;t scan? Enter this setup key:
            </p>
            <p className="font-mono text-sm text-center break-all mb-6 text-sam-navy">
              {secret}
            </p>

            <form onSubmit={onVerify} className="space-y-4">
              <label
                className="block font-body-regular text-sam-navy"
                htmlFor="mfa-code"
              >
                6-digit code
              </label>
              <input
                id="mfa-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
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
                {busy ? "Checking…" : "Turn on two-factor"}
              </button>
            </form>
          </>
        )}

        {stage === "codes" && (
          <>
            <p className="font-body-regular text-sam-navy mb-2 font-semibold">
              Two-factor is on. Save these backup codes now.
            </p>
            <p className="font-body-regular text-sam-gray-mid mb-4">
              Each code works once, and this is the only time they are shown.
              They are the way back in if you lose your phone.
            </p>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm mb-5 p-4 bg-sam-cream/50 rounded-xl">
              {recoveryCodes.map((c) => (
                <li key={c} className="text-sam-navy">
                  {c}
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-3 font-body-regular text-sam-navy mb-5">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1"
              />
              <span>I have saved these codes somewhere safe.</span>
            </label>
            <a
              href={acknowledged ? next : undefined}
              aria-disabled={!acknowledged}
              className={`block text-center px-6 py-3 rounded-xl font-headline-adult font-bold transition-colors ${
                acknowledged
                  ? "bg-sam-red hover:bg-sam-red/90 text-white"
                  : "bg-sam-gray-light text-sam-gray-mid pointer-events-none"
              }`}
            >
              Continue
            </a>
          </>
        )}
      </div>
    </main>
  );
}
