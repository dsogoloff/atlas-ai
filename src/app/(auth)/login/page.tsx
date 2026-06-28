/* eslint-disable @next/next/no-img-element */
// Login page. Server component — runs the anonymous-only gate
// (Phase 3 D2 + P3), validates the ?next= searchParam (Phase 3 D6 + P2),
// and hands the safe path to the client form. Visual layout is the
// signup-style two-column branding + form (Phase 3 D1) with branding-
// column copy adapted for returning users (Phase 3 P1).

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

// Force dynamic so Next doesn't statically prerender — we read cookies
// (auth.getUser) and searchParams (next).
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ next?: string; confirmed?: string; email?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Validate ?next= same-origin (mirror auth/callback/route.ts:30).
  // Defaults to /dashboard when absent, malformed, or pointing off-origin.
  const {
    next: nextRaw,
    confirmed: confirmedRaw,
    email: emailRaw,
  } = await searchParams;
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard";

  // Informational "email confirmed" state, set by /auth/confirm after a
  // successful verifyOtp. Drives a success banner + email prefill on the form.
  const confirmed = confirmedRaw === "1";
  const confirmedEmail = confirmed ? (emailRaw ?? "") : "";

  // Anonymous-only gate (Phase 3 D2 + P3). If already signed in, honour the
  // VALIDATED next so /login?next=/admin sends an authenticated staff user to
  // their portal (it previously hard-redirected to /dashboard, landing a
  // signed-in admin/instructor on the parent dashboard, which then errored).
  // next is already same-origin-guarded above, so this can't bounce off-origin.
  if (user) {
    redirect(next);
  }

  return (
    <>
      <main className="w-full max-w-container-max px-gutter md:px-margin-desktop py-stack-lg flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter w-full bg-white rounded-[32px] overflow-hidden shadow-[0px_4px_24px_rgba(27,58,107,0.08)] min-h-[720px]">
          {/* Branding column — adapted from signup with returning-user copy. */}
          <div className="hidden md:flex flex-col justify-center items-center p-stack-lg bg-sam-navy/5 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-sam-yellow/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-sam-red/10 rounded-full blur-3xl" />
            <div className="relative z-10 text-center space-y-stack-md max-w-[440px]">
              <div className="flex justify-center mb-8">
                <img
                  alt="Atlas dachshund mascot waving hello"
                  className="w-full h-64 object-contain rounded-3xl shadow-lg border-4 border-white bg-sam-cream"
                  src="/mascot/waving.png"
                />
              </div>
              <h1 className="font-display-child text-display-child text-sam-navy">
                Welcome back.
              </h1>
              <p className="font-headline-adult text-2xl text-sam-gray-mid">
                Pick up where you left off.
              </p>
              <div className="pt-stack-md flex items-center justify-center gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-sam-gray-light flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-sam-teal"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    analytics
                  </span>
                  <span className="font-caption text-caption text-sam-navy">
                    Diagnostic Reports
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-sam-gray-light flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-sam-orange"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    trending_up
                  </span>
                  <span className="font-caption text-caption text-sam-navy">
                    Growth Tracking
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 flex items-center gap-4">
              <img
                alt="Atlas mascot"
                className="w-20 h-20 object-contain"
                src="/mascot/waving.png"
              />
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-sam-gray-light relative">
                <p className="text-caption font-caption text-sam-navy italic">
                  &ldquo;Good to see you again!&rdquo;
                </p>
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-sam-gray-light rotate-45" />
              </div>
            </div>
          </div>

          {/* Form column — interactive client component. */}
          <div className="p-8 md:p-margin-desktop flex flex-col justify-center">
            <div className="max-w-[480px] mx-auto w-full">
              <header className="mb-stack-lg">
                <div className="mb-4">
                  <span className="text-2xl font-black text-sam-navy">
                    Atlas Assessment
                  </span>
                </div>
                <h2 className="font-headline-adult text-headline-adult text-sam-navy mb-2">
                  Sign in to your account
                </h2>
                <p className="font-body-regular text-body-regular text-sam-gray-mid">
                  Continue your child&rsquo;s learning journey.
                </p>
              </header>
              <LoginForm
                next={next}
                confirmed={confirmed}
                confirmedEmail={confirmedEmail}
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full py-stack-md flex justify-center border-t border-sam-gray-light/30">
        <p className="font-caption text-caption text-sam-gray-mid/60">
          © 2026 Atlas Assessment by Inspirea Labs Inc. All rights reserved.
        </p>
      </footer>
    </>
  );
}
