// Zod schema for the edit-child form. Mirrors the add-child schema's field
// constraints (name, birthYear, gradeLevel) WITHOUT the per-child consent
// literal — editing an existing child doesn't re-capture consent.
//
// Kept in lockstep with src/app/(auth)/add-child/schema.ts so an edit can never
// accept a value the intake form would have rejected.

import { z } from "zod";

export const EditChildSchema = z.object({
  name: z.string().min(1, "Required").max(100, "Too long"),
  birthYear: z.coerce
    .number({ error: "Pick a birth year" })
    .int("Pick a year")
    .min(2000, "Out of range")
    .max(2030, "Out of range"),
  gradeLevel: z
    .string()
    .trim()
    .min(1, "Please select your child's current grade")
    .max(50, "Too long"),
});

export type EditChildInput = z.infer<typeof EditChildSchema>;
// Pre-transform input type RHF holds (birthYear is coerced, so input is
// unknown / "" until a year is picked). Mirrors AddChildFormInput.
export type EditChildFormInput = z.input<typeof EditChildSchema>;
