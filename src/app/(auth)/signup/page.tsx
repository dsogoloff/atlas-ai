/* eslint-disable @next/next/no-img-element */
// Signup page. Server component — fetches the active S.A.M. centers and
// hands them to the client form. Visual layout is the Stitch port from
// cycle 1 with the right-column form swapped for an interactive client
// component (./signup-form.tsx) that wires to the server action.

import { createServiceClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";

import { SignupForm } from "./signup-form";

// Loaded per-request (changes roughly never but we want dashboard edits to
// surface without a redeploy). Opting out of static prerender also keeps
// `pnpm build` from needing real Supabase env vars.
export const dynamic = "force-dynamic";

// Day-1 is single-center: the form no longer offers a selector. We load the
// one ACTIVE center's name purely to display it in the consent disclosure.
// The authoritative attach (and the >1-active-center guard) lives in the
// signup server action, not here.
async function loadCenterName(): Promise<string | null> {
  // Service role bypasses RLS so the public signup page can read the active
  // center without a session. Only the non-sensitive name is selected.
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("centers")
    .select("name")
    .eq("status", "ACTIVE")
    .order("name");
  if (error || !data || data.length === 0) return null;
  return data[0].name;
}

export default async function SignupPage() {
  const branding = getBranding();
  const centerName = await loadCenterName();

  return (
    <>
      <main className="w-full max-w-container-max px-gutter md:px-margin-desktop py-stack-lg flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter w-full bg-white rounded-[32px] overflow-hidden shadow-[0px_4px_24px_rgba(27,58,107,0.08)] min-h-[720px]">
          {/* Branding column — kept from the cycle-1 Stitch port. */}
          <div className="hidden md:flex flex-col justify-center items-center p-stack-lg bg-sam-navy/5 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-sam-yellow/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-sam-red/10 rounded-full blur-3xl" />
            <div className="relative z-10 text-center space-y-stack-md max-w-[440px]">
              <div className="flex justify-center mb-8">
                <img
                  alt={`${branding.mascotAlt} waving hello`}
                  className="w-full h-64 object-contain rounded-3xl shadow-lg border-4 border-white bg-sam-cream"
                  src="/mascot/waving.png"
                />
              </div>
              <h1 className="font-display-child text-display-child text-sam-navy">
                Welcome to the Journey.
              </h1>
              <p className="font-body-regular text-body-regular text-sam-gray-mid">
                {branding.productName} helps you understand your child&rsquo;s
                mathematical potential through engaging diagnostics and clear,
                actionable reporting.
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
                alt={branding.mascotAlt}
                className="w-20 h-20 object-contain"
                src="/mascot/waving.png"
              />
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-sam-gray-light relative">
                <p className="text-caption font-caption text-sam-navy italic">
                  &ldquo;Let&rsquo;s grow together!&rdquo;
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
                    {branding.productName}
                  </span>
                </div>
                <h2 className="font-headline-adult text-headline-adult text-sam-navy mb-2">
                  Create Parent Account
                </h2>
                <p className="font-body-regular text-body-regular text-sam-gray-mid">
                  Empower your child&rsquo;s math learning path today.
                </p>
              </header>
              <SignupForm centerName={centerName} />
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full py-stack-md flex justify-center border-t border-sam-gray-light/30">
        <p className="font-caption text-caption text-sam-gray-mid/60">
          {branding.copyrightLine}
        </p>
      </footer>
    </>
  );
}
