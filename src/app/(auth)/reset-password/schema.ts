// Zod schema for the set-new-password form.
// password: min 12 (compliance.md §7, same minimum signup enforces) + sanity
// max. confirmPassword must match. Imported by both the client form (live
// validation) and the server action (trust — never trust client data).

import { z } from "zod";

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "At least 12 characters (compliance.md §7)")
      .max(200, "Too long"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
