"use client";

// Signup form. Visual layout is the Stitch port from cycle 1 (kept
// faithful) plus a S.A.M. center selector (features.md §5) and live
// validation via react-hook-form + zod.

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signupAction, type SignupResult } from "./actions";
import { SignupSchema, type SignupInput } from "./schema";

export interface CenterOption {
  id: string;
  name: string;
}

interface Props {
  centers: CenterOption[];
}

export function SignupForm({ centers }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SignupResult | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      // Auto-select when exactly one ACTIVE center exists (Phase 4b /
      // Item #7). Otherwise the user picks via the multi-center <select>
      // rendered below.
      centerId: centers.length === 1 ? centers[0].id : "",
      consent: false as unknown as true,
    },
  });

  const selectedCenterId = useWatch({ control, name: "centerId" });
  const selectedCenter = centers.find((c) => c.id === selectedCenterId);

  async function onSubmit(values: SignupInput) {
    setSubmitting(true);
    const r = await signupAction(values);
    setSubmitting(false);
    setResult(r);
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
            First Name
          </label>
          <input
            className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white aria-[invalid=true]:border-sam-red"
            id="first-name"
            placeholder="Enter first name"
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
            Last Name
          </label>
          <input
            className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all placeholder:text-sam-gray-mid/50 bg-white aria-[invalid=true]:border-sam-red"
            id="last-name"
            placeholder="Enter last name"
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

      {/* Center selector — features.md §5. When exactly one ACTIVE
          center exists, auto-select it and render as a bordered chip
          (Phase 4b / Item #7); the hidden input keeps the field
          registered with react-hook-form so it's included in submission.
          When > 1, render the existing <select>. */}
      {centers.length === 1 ? (
        <div className="space-y-2">
          <label className="font-caption text-caption text-sam-navy ml-1">
            Your S.A.M. Center
          </label>
          <div className="flex items-center gap-3 px-4 py-3 bg-sam-cream border border-sam-orange/20 rounded-2xl">
            <span
              className="material-symbols-outlined text-sam-orange"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              business
            </span>
            <span className="font-headline-adult text-sam-navy font-semibold">
              {centers[0].name}
            </span>
          </div>
          <input type="hidden" {...register("centerId")} />
        </div>
      ) : (
        <div className="space-y-2">
          <label
            className="font-caption text-caption text-sam-navy ml-1"
            htmlFor="center"
          >
            Your S.A.M. Center
          </label>
          <select
            className="w-full h-12 px-4 rounded-xl border border-sam-gray-light focus:border-sam-red focus:ring-1 focus:ring-sam-red outline-none transition-all bg-white aria-[invalid=true]:border-sam-red"
            id="center"
            aria-invalid={!!errors.centerId}
            defaultValue=""
            {...register("centerId")}
          >
            <option value="" disabled>
              Select your center
            </option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.centerId && (
            <p className="text-caption text-sam-red ml-1">
              {errors.centerId.message}
            </p>
          )}
        </div>
      )}

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
            <p className="font-caption text-[12px] text-sam-gray-mid leading-relaxed">
              I am the parent or legal guardian of the child(ren) I will
              register. I authorize Atlas to share my child&rsquo;s assessment
              results (placement level, strand-level results, detected
              misconceptions, and response patterns — never the questions
              themselves) with instructors at{" "}
              <span className="font-semibold text-sam-navy">
                {selectedCenter?.name ?? "the S.A.M. center I&rsquo;ve selected"}
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
