/* eslint-disable @next/next/no-img-element */
// Ported from stitch/module-a/04-add-child-desktop.html.
//
// Cycle 1 deviations from source (faithful otherwise):
//  - Stripped `dark:` Tailwind variants.
//  - Replaced inline `font-['Plus_Jakarta_Sans']` with `font-display-child`.
//  - Replaced 2 broken Stitch CDN images (instructor avatar, mascot) with
//    local placeholder SVGs.
//  - Birth Year extended to 2010-2022 and Grade extended to K-8 to match
//    the K-8 architecture target locked in features.md (Stitch source only
//    covered K-5 / 2014-2019). Range is illustrative; tighten when the
//    real grade-eligibility logic lands.
//  - Help-tip wording: replaced "Sammy" with "the engine" (mascot name not
//    yet locked).
//
// Phase 2 of Item #7 wired the form to Supabase. The interactive form
// markup is now a client component, <AddChildForm /> in
// ./add-child-form.tsx, validated by ./schema.ts and submitted via
// ./actions.ts. Cycle-1 form-side deviations (Birth Year 2010-2022,
// Grade K-8, help-tip wording) live in those files now.
//
// Phase 3 of Item #7 (D6): unauth redirect now /login?next=/add-child (was /signup).
//
// Spec gaps still to address (intentionally NOT fixed in Phase 2):
//  - The inherited home_center_id is not surfaced visually on this form
//    (the action copies it server-side from the parent's row). Surface
//    in the dashboard child card when Phase 1 lands.
//
// Cancel link routing: the Cancel target depends on entry path. From
// /coppa (signup flow) it's /signup; from /dashboard's "Add Another
// Child" CTA it's /dashboard. We mirror the /login?next= pattern —
// callers pass ?next=/dashboard to override the default. Same-origin
// validation matches login/page.tsx:36-39.

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isBetaWelcomeEnabled } from "@/lib/env";

import { getBranding } from "@/lib/branding";

import { AddChildForm } from "./add-child-form";
import { BetaWelcomeGate } from "./beta-welcome-gate";

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function AddChildPage({ searchParams }: Props) {
  const branding = getBranding();
  // Page-level auth gate per Phase 2 decision D3. Defense-in-depth in
  // addition to the auth check inside addChildAction.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/add-child");
  }

  // Validate ?next= same-origin (mirror login/page.tsx:36-39 + auth/
  // callback/route.ts:30). Defaults to /signup, the cancel target for
  // the signup → coppa → add-child path. /dashboard callers pass
  // ?next=/dashboard explicitly.
  const { next: nextRaw } = await searchParams;
  const cancelHref =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/signup";

  return (
    <BetaWelcomeGate enabled={isBetaWelcomeEnabled()}>
      {/* TopAppBar */}
      <header className="bg-[#FEFBF6] font-display-child font-semibold top-0 z-40 border-b border-[#F2EDE4] shadow-[0px_4px_12px_rgba(27,58,107,0.05)] flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-sam-navy">
            {branding.productName}
          </span>
        </div>
        {/* The Students / Reports / Add Child tabs and the Notifications +
            Help icon buttons were removed: the tabs were href="#" (they went
            nowhere) and the buttons had no handler. A control that does
            nothing when clicked reads as a broken app in the pilot, so the bar
            now carries only the brand and the avatar. Restore each one at the
            point its destination actually exists. */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
              <img
                alt="Parent profile"
                src="/img/placeholder-avatar.svg"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-gutter py-stack-lg relative overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-sam-yellow/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-sam-teal/10 rounded-full blur-3xl" />

        {/* Add Child Card */}
        <div className="w-full max-w-[540px] bg-white rounded-3xl shadow-[0px_4px_24px_rgba(27,58,107,0.08)] p-10 relative z-10 border border-sam-gray-light/30">
          {/* Mascot */}
          <div className="flex justify-center -mt-24 mb-6">
            <div className="w-32 h-32 relative">
              <img
                alt={`${branding.mascotAlt} waving hello`}
                className="w-full h-full object-contain"
                src="/mascot/waving.png"
              />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="font-display-child text-display-child text-sam-navy mb-2">
              Welcome!
            </h1>
            <p className="text-sam-gray-mid font-headline-adult text-lg">
              Let&rsquo;s start your child&rsquo;s learning journey.
            </p>
          </div>

          <AddChildForm cancelHref={cancelHref} />
        </div>
      </main>

      <footer className="p-6 text-center text-sam-gray-mid/50 text-caption font-caption">
        {branding.copyrightLine}
      </footer>
    </BetaWelcomeGate>
  );
}
