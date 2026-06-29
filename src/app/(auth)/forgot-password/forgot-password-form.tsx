"use client";

// Forgot-password request form. Single email field. On submit it calls the
// requestPasswordReset action and ALWAYS swaps to the same neutral success
// message — never revealing whether the email maps to an account
// (anti-enumeration). The auth chrome (card / header / footer) lives in
// page.tsx; this client component owns the form column proper.

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { requestPasswordReset } from "./actions";
import { ForgotPasswordSchema, type ForgotPasswordInput } from "./schema";

interface Props {
  /** True when arriving from /auth/reset after a failed/expired recovery
   *  link. Shows an informational note above the form. */
  resetFailed?: boolean;
}

export function ForgotPasswordForm({ resetFailed = false }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    try {
      // The result is always a neutral success; we never branch on it.
      await requestPasswordReset(values);
    } catch {
      // Anti-enumeration: even a thrown error shows the same neutral state.
    } finally {
      setSent(true);
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-stack-md" role="status">
        <span
          className="material-symbols-outlined text-sam-teal text-6xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          mark_email_read
        </span>
        <h2 className="font-headline-adult text-headline-adult text-sam-navy">
          Check your email
        </h2>
        <p className="font-body-regular text-body-regular text-sam-gray-mid max-w-md mx-auto">
          If an account exists for that email, we&rsquo;ve sent a reset link.
          Click it within the hour to choose a new password.
        </p>
        <p className="font-caption text-caption text-sam-gray-mid">
          Didn&rsquo;t arrive? Check your spam folder, then{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
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
      {resetFailed && (
        <div
          role="status"
          className="flex items-center gap-2 bg-sam-orange/10 text-sam-navy border border-sam-orange/30 px-4 py-3 rounded-xl font-caption text-caption"
        >
          <span
            className="material-symbols-outlined text-sam-orange text-base"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            info
          </span>
          <span>That reset link was invalid or expired — request a new one below.</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-2">
        <label
          className="font-caption text-caption text-sam-navy ml-1"
          htmlFor="email"
        >
          Email
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

      {/* Actions */}
      <div className="pt-4 space-y-4">
        <button
          className="w-full h-14 bg-sam-red text-white font-headline-adult rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
          type="submit"
          disabled={submitting}
        >
          <span>{submitting ? "Sending..." : "Send reset link"}</span>
          {!submitting && (
            <span className="material-symbols-outlined">arrow_forward</span>
          )}
        </button>
        <div className="flex items-center justify-center gap-2 font-caption text-caption text-sam-gray-mid">
          <span>Remembered it?</span>
          <Link className="text-sam-red font-bold hover:underline" href="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    </form>
  );
}
