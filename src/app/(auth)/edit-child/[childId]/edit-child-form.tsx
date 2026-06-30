"use client";

// Edit-child form. Mirrors the add-child form (same fields, grade options, and
// validation) minus the per-child consent block, with the current values
// prefilled. On success it navigates back to /dashboard; on validation/server
// error the message surfaces inline.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateChildAction, type EditChildResult } from "./actions";
import {
  EditChildSchema,
  type EditChildFormInput,
  type EditChildInput,
} from "./schema";

interface Props {
  childId: string;
  defaultName: string;
  defaultBirthYear: number;
  defaultGradeLevel: string | null;
  /** Same-origin path for the Cancel link (defaults to /dashboard). */
  cancelHref: string;
}

export function EditChildForm({
  childId,
  defaultName,
  defaultBirthYear,
  defaultGradeLevel,
  cancelHref,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EditChildResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditChildFormInput, unknown, EditChildInput>({
    resolver: zodResolver(EditChildSchema),
    defaultValues: {
      name: defaultName,
      birthYear: String(defaultBirthYear),
      gradeLevel: defaultGradeLevel ?? "",
    },
  });

  async function onSubmit(values: EditChildInput) {
    setSubmitting(true);
    const r = await updateChildAction(childId, values);
    if (r.ok) {
      // Let navigation tear down the component; keep submitting=true.
      router.push("/dashboard");
      router.refresh();
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
            defaultValue={defaultName}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-sam-gray-mid">
            person
          </span>
        </div>
        {errors.name && (
          <p className="text-caption text-sam-red ml-1">{errors.name.message}</p>
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
              defaultValue={String(defaultBirthYear)}
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
              defaultValue={defaultGradeLevel ?? ""}
              {...register("gradeLevel")}
            >
              <option disabled value="">
                Select grade
              </option>
              {/* Mirrors add-child: Pre-K age-qualified, K, Grades 1–6 live;
                  Grades 7/8 greyed "(coming soon)" and non-selectable. */}
              <option value="Pre-K (age 4)">Pre-K (age 4)</option>
              <option value="Pre-K (age 5)">Pre-K (age 5)</option>
              <option value="K">Kindergarten</option>
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

      {/* Actions */}
      <div className="pt-4 space-y-4">
        <button
          className="w-full py-5 bg-sam-red text-white font-display-child text-xl rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center justify-center gap-2"
          type="submit"
          disabled={submitting}
        >
          <span>{submitting ? "Saving..." : "Save changes"}</span>
          {!submitting && (
            <span className="material-symbols-outlined">check</span>
          )}
        </button>
        <Link
          href={cancelHref}
          className="block w-full py-3 bg-transparent text-sam-navy/60 font-headline-adult text-sm font-semibold hover:text-sam-navy transition-colors text-center"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
