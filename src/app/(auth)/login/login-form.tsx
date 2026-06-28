"use client";

// Login form. Two-column branding+form layout (Phase 3 D1) lives in
// page.tsx; this client component owns the form column proper.
//
// On success, navigates to props.next (validated same-origin in
// page.tsx per Phase 3 D6) via router.push. On failure, surfaces a
// generic inline error from the action (D3).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginAction, type LoginResult } from "./actions";
import { LoginSchema, type LoginInput } from "./schema";

interface Props {
  /** Validated, same-origin redirect target. Page-level guard ensures
   *  this is always a safe path (defaults to "/dashboard"). */
  next: string;
  /** True when the user just confirmed their email (/auth/confirm → login).
   *  Shows an informational success banner above the form. */
  confirmed?: boolean;
  /** Email to prefill (carried from the confirm link), when available. */
  confirmedEmail?: string;
}

export function LoginForm({ next, confirmed = false, confirmedEmail = "" }: Props) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LoginResult | null>(null);

  // Schema has no transforms, so input == output. Single-generic useForm.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: confirmedEmail,
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const r = await loginAction(values);
    if (r.ok) {
      // Don't unset submitting — let navigation tear down the component.
      router.push(next);
      return;
    }
    setSubmitting(false);
    setResult(r);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-stack-md" noValidate>
      {confirmed && (
        <div
          role="status"
          className="flex items-center gap-2 bg-sam-teal/10 text-sam-navy border border-sam-teal/30 px-4 py-3 rounded-xl font-caption text-caption"
        >
          <span
            className="material-symbols-outlined text-sam-teal text-base"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            check_circle
          </span>
          <span>Email confirmed — please sign in to continue.</span>
        </div>
      )}

      {result && !result.ok && (
        <div
          role="alert"
          className="bg-error-container text-on-error-container px-4 py-3 rounded-xl font-caption text-caption"
        >
          {result.error}
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
          defaultValue={confirmedEmail}
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
            placeholder="Your password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
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

      {/* Actions */}
      <div className="pt-4 space-y-4">
        <button
          className="w-full h-14 bg-sam-red text-white font-headline-adult rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
          type="submit"
          disabled={submitting}
        >
          <span>{submitting ? "Signing in..." : "Sign in"}</span>
          {!submitting && (
            <span className="material-symbols-outlined">arrow_forward</span>
          )}
        </button>
        <div className="flex items-center justify-center gap-2 font-caption text-caption text-sam-gray-mid">
          <span>New to Atlas?</span>
          <Link className="text-sam-red font-bold hover:underline" href="/signup">
            Create an account
          </Link>
        </div>
      </div>
    </form>
  );
}
