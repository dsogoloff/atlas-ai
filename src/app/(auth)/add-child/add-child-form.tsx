"use client";

// Add-child form. Visual layout is the cycle-1 Stitch port (kept
// faithful), wrapped with react-hook-form + zod live validation and
// addChildAction wiring per Phase 2 of Item #7.
//
// On success, the form navigates to /dashboard via the router. On
// validation or server error, the message is surfaced inline.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { addChildAction, type AddChildResult } from "./actions";
import { CONSENT_TEXT } from "@/lib/consent/text";
import {
  AddChildSchema,
  type AddChildFormInput,
  type AddChildInput,
} from "./schema";

interface Props {
  /** Validated, same-origin path the page resolved from ?next= (or
   *  defaulted to /signup). Wired into the "Cancel and Go Back" link. */
  cancelHref: string;
}

export function AddChildForm({ cancelHref }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AddChildResult | null>(null);

  // Three-generic useForm: TFieldValues = pre-transform input (what RHF
  // holds), TContext = unused, TTransformedValues = post-transform output
  // (what handleSubmit's onSubmit receives). Required because the schema
  // has transforms (z.coerce.number on birthYear, .optional().transform
  // on gradeLevel) so input != output.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddChildFormInput, unknown, AddChildInput>({
    resolver: zodResolver(AddChildSchema),
    defaultValues: {
      name: "",
      // RHF holds "" until the user picks. birthYear is `unknown` in the
      // input type so "" is accepted directly; zod's coerce turns it
      // into NaN which fails the min check, surfacing "Out of range".
      birthYear: "",
      gradeLevel: "",
    },
  });

  async function onSubmit(values: AddChildInput) {
    setSubmitting(true);
    const r = await addChildAction(values);
    if (r.ok) {
      // Phase 2 → /dashboard (placeholder until Phase 1 lands).
      // Don't unset submitting — let navigation tear down the component.
      router.push("/dashboard");
      return;
    }
    setSubmitting(false);
    setResult(r);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {result && !result.ok && (
        <div
          role="alert"
          className="bg-error-container text-on-error-container px-4 py-3 rounded-xl font-caption text-caption"
        >
          {result.error}
        </div>
      )}

      {/* Child name */}
      <div className="space-y-2">
        <label
          className="block font-headline-adult text-sm font-semibold text-sam-navy ml-1"
          htmlFor="child-name"
        >
          Child&rsquo;s Name
        </label>
        <div className="relative">
          <input
            className="w-full px-5 py-4 bg-sam-cream border-2 border-transparent focus:border-sam-red focus:ring-0 rounded-2xl text-sam-navy placeholder:text-sam-gray-mid/60 transition-all font-medium outline-none aria-[invalid=true]:border-sam-red"
            id="child-name"
            placeholder="e.g. Alex"
            type="text"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-sam-gray-mid">
            person
          </span>
        </div>
        {errors.name && (
          <p className="text-caption text-sam-red ml-1">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Birth year + grade */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            className="block font-headline-adult text-sm font-semibold text-sam-navy ml-1"
            htmlFor="birth-year"
          >
            Birth Year
          </label>
          <div className="relative">
            <select
              className="w-full pl-5 pr-12 py-4 bg-sam-cream border-2 border-transparent focus:border-sam-red focus:ring-0 rounded-2xl text-sam-navy appearance-none cursor-pointer transition-all font-medium outline-none aria-[invalid=true]:border-sam-red"
              id="birth-year"
              aria-invalid={!!errors.birthYear}
              defaultValue=""
              {...register("birthYear")}
            >
              <option disabled value="">
                Select
              </option>
              {Array.from({ length: 13 }, (_, i) => 2010 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-sam-gray-mid pointer-events-none">
              calendar_month
            </span>
          </div>
          {errors.birthYear && (
            <p className="text-caption text-sam-red ml-1">
              {errors.birthYear.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label
            className="block font-headline-adult text-sm font-semibold text-sam-navy ml-1"
            htmlFor="grade"
          >
            Current Grade
          </label>
          <div className="relative">
            <select
              className="w-full pl-5 pr-12 py-4 bg-sam-cream border-2 border-transparent focus:border-sam-red focus:ring-0 rounded-2xl text-sam-navy appearance-none cursor-pointer transition-all font-medium outline-none aria-[invalid=true]:border-sam-red"
              id="grade"
              aria-invalid={!!errors.gradeLevel}
              defaultValue=""
              {...register("gradeLevel")}
            >
              <option disabled value="">
                Select grade
              </option>
              {/* Young band — Pre-K is age-qualified (age disambiguates 0A/0B);
                  from Kindergarten up, grade disambiguates. Each value maps to
                  exactly one S.A.M. booklet via parseGradeNumber +
                  anchorBookletForChild. Floor = Pre-K (age 4) → L0A. */}
              <option value="Pre-K (age 4)">Pre-K (age 4)</option>
              <option value="Pre-K (age 5)">Pre-K (age 5)</option>
              <option value="K">Kindergarten</option>
              {/* Grades 1–6 are the live S.A.M. booklet range. Grades 7 and 8
                  are greyed "(coming soon)" and non-selectable until their
                  booklets are converted — the bank has no >L6 content yet, so a
                  G7/G8 selection would band to an empty set. Defense-in-depth:
                  halfGradeToTaxLevelCode clamps any 7A/8B placement to l6. */}
              {Array.from({ length: 6 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={String(g)}>
                  Grade {g}
                </option>
              ))}
              {[7, 8].map((g) => (
                <option key={g} value={String(g)} disabled>
                  Grade {g} (coming soon)
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-sam-gray-mid pointer-events-none">
              school
            </span>
          </div>
          {errors.gradeLevel && (
            <p className="text-caption text-sam-red ml-1">
              {errors.gradeLevel.message}
            </p>
          )}
        </div>
      </div>

      {/* Help tip */}
      <div className="bg-sam-yellow/10 border border-sam-yellow/30 p-4 rounded-2xl flex gap-3">
        <span
          className="material-symbols-outlined text-sam-orange shrink-0"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          info
        </span>
        <p className="text-caption font-caption text-sam-navy/80 leading-snug">
          Providing the correct grade helps the engine tailor diagnostic
          questions to your child&rsquo;s level.
        </p>
      </div>

      {/* Per-child parental consent (Model B / COPPA Gate-B). Binding consent
          is captured here — the server action records a consent_records row
          keyed to this child, which the assessment gate checks. Discloses the
          automated (AI) processing as part of the consent (safeguard C2). */}
      <div className="bg-sam-cream p-4 rounded-2xl border border-sam-orange/20 space-y-3">
        <div className="flex items-start gap-3">
          <input
            className="w-5 h-5 mt-1 rounded border-sam-gray-light text-sam-red focus:ring-sam-red"
            id="consent"
            type="checkbox"
            aria-invalid={!!errors.consent}
            {...register("consent")}
          />
          <div className="space-y-1">
            <label
              className="font-caption text-[13px] leading-tight text-sam-navy font-bold flex items-center gap-1"
              htmlFor="consent"
            >
              <span
                className="material-symbols-outlined text-sam-orange text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              Parental Consent for This Child
            </label>
            {/* Rendered from the SINGLE source (CONSENT_TEXT) the server also
                persists verbatim, so the shown and stored attestation can never
                drift. The full disclosure is one tap away at /coppa. */}
            <p className="font-caption text-[12px] text-sam-gray-mid leading-relaxed">
              {CONSENT_TEXT}
            </p>
            <Link
              className="font-caption text-[12px] text-sam-red underline"
              href="/coppa"
            >
              Read the full COPPA Disclosure &amp; Parental Consent
            </Link>
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
          className="w-full py-5 bg-sam-red text-white font-display-child text-xl rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center justify-center gap-2"
          type="submit"
          disabled={submitting}
        >
          <span>{submitting ? "Adding..." : "Add Child"}</span>
          {!submitting && (
            <span className="material-symbols-outlined">arrow_forward</span>
          )}
        </button>
        <Link
          href={cancelHref}
          className="block w-full py-3 bg-transparent text-sam-navy/60 font-headline-adult text-sm font-semibold hover:text-sam-navy transition-colors text-center"
        >
          Cancel and Go Back
        </Link>
      </div>
    </form>
  );
}
