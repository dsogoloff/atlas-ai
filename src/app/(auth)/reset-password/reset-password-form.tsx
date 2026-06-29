"use client";

// Set-new-password form. New password + confirm, with show/hide and live
// validation (min 12 + match, via ResetPasswordSchema). On success the
// recovery session has been cleared server-side (see actions.ts), so we
// navigate to /login?reset=1 where the "Password updated" banner shows and the
// user signs in fresh. The auth chrome lives in page.tsx.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { resetPassword, type ResetPasswordResult } from "./actions";
import { ResetPasswordSchema, type ResetPasswordInput } from "./schema";

export function ResetPasswordForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResetPasswordResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    try {
      const r = await resetPassword(values);
      if (r.ok) {
        // Don't unset submitting — let navigation tear down the component.
        router.push("/login?reset=1");
        return;
      }
      setResult(r);
    } catch {
      setResult({
        ok: false,
        error: "Something went wrong. Please try again.",
      });
    } finally {
      // Only reached on the failure paths above (success returns early).
      setSubmitting(false);
    }
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

      {/* New password */}
      <div className="space-y-2">
        <label
          className="font-caption text-caption text-sam-navy ml-1"
          htmlFor="password"
        >
          New password
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

      {/* Confirm password */}
      <div className="space-y-2">
        <label
          className="font-caption text-caption text-sam-navy ml-1"
          htmlFor="confirm-password"
        >
          Confirm new password
        </label>
        <input
          className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white aria-[invalid=true]:border-sam-red"
          id="confirm-password"
          placeholder="Re-enter your new password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-caption text-sam-red ml-1">
            {errors.confirmPassword.message}
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
          <span>{submitting ? "Updating..." : "Update password"}</span>
          {!submitting && (
            <span className="material-symbols-outlined">arrow_forward</span>
          )}
        </button>
      </div>
    </form>
  );
}
