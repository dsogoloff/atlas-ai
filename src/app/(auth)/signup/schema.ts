// Zod schema for the signup form.
// Imported by both the client form (for live validation) and the server
// action (for trust — never trust client-validated data).

import { z } from "zod";

export const SignupSchema = z.object({
  firstName: z
    .string()
    .min(1, "Required")
    .max(100, "Too long"),
  lastName: z
    .string()
    .min(1, "Required")
    .max(100, "Too long"),
  email: z
    .string()
    .min(1, "Required")
    .email("Enter a valid email address")
    .max(254, "Too long"),
  password: z
    .string()
    .min(12, "At least 12 characters (compliance.md §7)")
    .max(200, "Too long"),
  // No `centerId`: day-1 is single-center, so the form never asks the
  // parent to choose. The server attaches the one ACTIVE center itself
  // (see actions.ts). Reintroduce this field alongside a selector when we
  // go multi-center (ENABLE_MULTI_TENANT).
  consent: z
    .literal<true>(true, { error: "Consent is required to register a child" }),
});

export type SignupInput = z.infer<typeof SignupSchema>;
