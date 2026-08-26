"use client";

// Signup form. Visual layout is the Stitch port from cycle 1 (kept
// faithful) with live validation via react-hook-form + zod.
//
// Day-1 is single-center: the parent is NOT asked to choose a center.
// The server attaches the one ACTIVE center on submit (see actions.ts).
// `centerName` is passed in purely so the consent disclosure can name the
// center the child's data will be shared with.

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getBranding } from "@/lib/branding";

import { signupAction, type SignupResult } from "./actions";
import { SignupSchema, type SignupInput } from "./schema";

interface Props {
  centerName: string | null;
}

export function SignupForm({ centerName }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SignupResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      consent: false as unknown as true,
    },
  });

  async function onSubmit(values: SignupInput) {
    setSubmitting(true);
    try {
      // signupAction returns a typed {ok:false,error} for handled failures,
      // but it can still THROW (server action runtime error, Vercel function
      // timeout, network failure reaching Supabase). Without this catch a
      // rejection would skip setSubmitting(false), leaving the button stuck on
      // "Creating account..." with no error shown. Surface it via the same
      // failed-result render path the form already uses.
      const r = await signupAction(values);
      setResult(r);
    } catch {
      setResult({
        ok: false,
        error: "Something went wrong creating your account. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="text-center space-y-stack-md">
        <span
          className="material-symbols-outlined text-sam-teal text-6xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          mark_email_read
        </span>
        <h2 className="font-headline-adult text-headline-adult text-sam-navy">
          Check your email
        </h2>
        <p className="font-body-regular text-body-regular text-sam-gray-mid max-w-md mx-auto">
          We sent a verification link to{" "}
          <span className="font-semibold text-sam-navy">{result.email}</span>.
          Click it within 24 hours to confirm your account and continue.
        </p>
        <p className="font-caption text-caption text-sam-gray-mid">
          Didn&rsquo;t arrive? Check your spam folder, then{" "}
          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-sam-red font-bold hover:underline"
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-stack-md" noValidate>
      {result && !result.ok && (
        <div
          role="alert"
          className="bg-error-container text-on-error-container px-4 py-3 rounded-xl font-caption text-caption"
        >
          {result.error}
        </div>
      )}

      {/* Name row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            className="font-caption text-caption text-sam-navy ml-1"
            htmlFor="first-name"
          >
            Parent&rsquo;s First Name
          </label>
          <input
            className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white aria-[invalid=true]:border-sam-red"
            id="first-name"
            placeholder="Enter parent's first name"
            type="text"
            aria-invalid={!!errors.firstName}
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="text-caption text-sam-red ml-1">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label
            className="font-caption text-caption text-sam-navy ml-1"
            htmlFor="last-name"
          >
            Parent&rsquo;s Last Name
          </label>
          <input
            className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white aria-[invalid=true]:border-sam-red"
            id="last-name"
            placeholder="Enter parent's last name"
            type="text"
            aria-invalid={!!errors.lastName}
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="text-caption text-sam-red ml-1">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label
          className="font-caption text-caption text-sam-navy ml-1"
          htmlFor="email"
        >
          Parent Email Address
        </label>
        <input
          className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white aria-[invalid=true]:border-sam-red"
          id="email"
          placeholder="example@email.com"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-caption text-sam-red ml-1">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label
          className="font-caption text-caption text-sam-navy ml-1"
          htmlFor="password"
        >
          Password
        </label>
        <div className="relative">
          <input
            className="w-full h-12 px-4 pr-12 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white aria-[invalid=true]:border-sam-red"
            id="password"
            placeholder="Min. 12 characters"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sam-gray-mid"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span className="material-symbols-outlined text-sm">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
        {errors.password && (
          <p className="text-caption text-sam-red ml-1">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Center selector removed — day-1 is single-center, so the parent
          is not asked to choose. The server attaches the one ACTIVE
          center on submit (actions.ts). The center is still named in the
          consent disclosure below so the parent knows where their child's
          data will be shared. */}

      {/* COPPA + school-operator consent — language tracks compliance.md §2 */}
      <div className="bg-sam-cream p-4 rounded-2xl border border-sam-orange/20 space-y-3">
        <div className="flex items-start gap-3">
          <input
            className="w-5 h-5 mt-1 rounded border-sam-gray-light text-sam-red focus:ring-sam-red"
            id="coppa"
            type="checkbox"
            aria-invalid={!!errors.consent}
            {...register("consent")}
          />
          <div className="space-y-1">
            <label
              className="font-caption text-[13px] leading-tight text-sam-navy font-bold flex items-center gap-1"
              htmlFor="coppa"
            >
              <span
                className="material-symbols-outlined text-sam-orange text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              COPPA &amp; School-Operator Consent
            </label>
            {/* CONSENT WORDING: the authorizing counterparty is tenant-
                resolved. Final wording is counsel-gated — see the PR's
                founder list.

                DO NOT put a JSX comment (or any other expression child)
                between two words of the sentence below. An expression child
                SPLITS the surrounding text into two nodes, and JSX then strips
                the newline-adjacent whitespace at the end of the first and the
                start of the second — silently fusing the words. A comment
                sitting between "will" and "register" is exactly how
                "I willregister." shipped to production in counsel-approved
                consent text. Rendered output is guarded by
                consent-text.test.tsx. */}
            <p className="font-caption text-[12px] text-sam-gray-mid leading-relaxed">
              I am the parent or legal guardian of the child(ren) I will
              register. I authorize {getBranding().productName} to share my
              child&rsquo;s assessment
              results (placement level, strand-level results, detected
              misconceptions, and response patterns — never the questions
              themselves) with instructors at{" "}
              <span className="font-semibold text-sam-navy">
                {centerName ?? "your S.A.M center"}
              </span>{" "}
              for as long as my child is enrolled there. I can change or remove
              the center any time from my account settings; a 30-day grace
              applies. See{" "}
              <Link className="text-sam-red underline" href="/coppa">
                full COPPA disclosure
              </Link>
              .
            </p>
          </div>
        </div>
        {errors.consent && (
          <p className="text-caption text-sam-red ml-1">
            {errors.consent.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 space-y-4">
        <button
          className="w-full h-14 bg-sam-red text-white font-headline-adult rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
          type="submit"
          disabled={submitting}
        >
          <span>
            {submitting ? "Creating account..." : "Create Parent Account"}
          </span>
          {!submitting && (
            <span className="material-symbols-outlined">arrow_forward</span>
          )}
        </button>
        <div className="flex items-center justify-center gap-2 font-caption text-caption text-sam-gray-mid">
          <span>Already have an account?</span>
          <Link className="text-sam-red font-bold hover:underline" href="/login">
            Sign in
          </Link>
        </div>
      </div>
    </form>
  );
}
