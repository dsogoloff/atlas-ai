// Set-new-password page. Server component — gated on the RECOVERY session that
// /auth/reset established via verifyOtp. If there is no session (the page was
// reached directly, or the recovery link expired before landing here), bounce
// to /forgot-password?error=reset_failed so the user can request a fresh link.
// Otherwise render the set-new-password form in the auth-chrome card.

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";

import { ResetPasswordForm } from "./reset-password-form";

// Reads cookies (auth.getUser) — opt out of static prerender.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const branding = getBranding();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No recovery session → the link was invalid/expired or the page was reached
  // directly. Send them back to request a new link rather than showing a form
  // whose submit would only fail.
  if (!user) {
    redirect("/forgot-password?error=reset_failed");
  }

  return (
    <>
      <main className="w-full max-w-container-max px-gutter md:px-margin-desktop py-stack-lg flex-1 flex items-center justify-center">
        <div className="w-full max-w-[520px] bg-white rounded-[32px] shadow-[0px_4px_24px_rgba(27,58,107,0.08)] p-8 md:p-margin-desktop">
          <header className="mb-stack-lg">
            <div className="mb-4">
              <span className="text-2xl font-black text-sam-navy">
                {branding.productName}
              </span>
            </div>
            <h2 className="font-headline-adult text-headline-adult text-sam-navy mb-2">
              Choose a new password
            </h2>
            <p className="font-body-regular text-body-regular text-sam-gray-mid">
              Pick a strong password you don&rsquo;t use anywhere else, then sign
              in with it.
            </p>
          </header>
          <ResetPasswordForm />
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
