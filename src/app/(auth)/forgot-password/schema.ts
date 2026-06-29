// Zod schema for the forgot-password (reset request) form.
// Email only. Mirrors the login/signup email constraints so we never
// reject an address those forms accepted.

import { z } from "zod";

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Required")
    .email("Enter a valid email address")
    .max(254, "Too long"),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
