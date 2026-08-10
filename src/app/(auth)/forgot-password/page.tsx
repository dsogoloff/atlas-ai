// Forgot-password page. Server component — renders the reset-request form in
// a single-column card consistent with the login/signup auth chrome. Public
// (no session gate). A `?error=reset_failed` param (set by /auth/reset on an
// invalid/expired recovery link) surfaces an informational note on the form.

import { getBranding } from "@/lib/branding";

import { ForgotPasswordForm } from "./forgot-password-form";

// Reads searchParams — opt out of static prerender.
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const branding = getBranding();
  const { error } = await searchParams;
  const resetFailed = error === "reset_failed";

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
              Reset your password
            </h2>
            <p className="font-body-regular text-body-regular text-sam-gray-mid">
              Enter your account email and we&rsquo;ll send a link to set a new
              password.
            </p>
          </header>
          <ForgotPasswordForm resetFailed={resetFailed} />
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
