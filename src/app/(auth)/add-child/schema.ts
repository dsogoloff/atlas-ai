// Zod schema for the add-child form.
// Imported by both the client form (for live validation) and the server
// action (for trust — never trust client-validated data).
//
// Field constraints:
//   * name: 1-100 chars. First name or nickname per compliance.md §3
//     (full name not required, last name not collected).
//   * birthYear: integer, 2000-2030 (matches the DB CHECK on
//     children.birth_year per migration 20260426000000). The form's
//     <select> tightens this to 2010-2022 for UX; the schema accepts
//     the full DB range as a safety net.
//   * gradeLevel: optional (compliance.md §3 + features.md §6). Stored
//     as free-text string; tier derivation in src/lib/tier/derive.ts
//     handles "K", bare digits, ordinals, word forms, Pre-K variants.

import { z } from "zod";

export const AddChildSchema = z.object({
  name: z
    .string()
    .min(1, "Required")
    .max(100, "Too long"),
  birthYear: z.coerce
    .number({ error: "Pick a birth year" })
    .int("Pick a year")
    .min(2000, "Out of range")
    .max(2030, "Out of range"),
  // Empty string from the optional <select> placeholder maps to
  // undefined so the DB receives null, not "".
  gradeLevel: z
    .string()
    .max(50, "Too long")
    .optional()
    .transform((v) => v?.trim() || undefined),
});

export type AddChildInput = z.infer<typeof AddChildSchema>;

// Input type (pre-transform) — what RHF holds in its field state. Diverges
// from AddChildInput (the output) because birthYear has z.coerce.number()
// (input is unknown) and gradeLevel has .optional().transform() (input is
// optional). Used as the first generic of useForm<...> so the resolver's
// input type aligns with TFieldValues.
export type AddChildFormInput = z.input<typeof AddChildSchema>;
