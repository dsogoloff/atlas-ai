// Zod schema for the login form.
// Imported by both the client form (for live validation) and the server
// action (for trust — never trust client-validated data).
//
// Field constraints:
//   * email: valid format, max 254 chars (RFC 5321). Mirrors signup so
//     we never reject an address signup accepted.
//   * password: non-empty + sanity max only. Login checks that the
//     submitted value MATCHES what's stored — Supabase Auth is the
//     source of truth on password validity. A min(12) rule here (the
//     compliance.md §7 signup minimum) would lock out any legacy
//     account whose password predated the rule. None exist today, but
//     the principle holds: signup enforces strength, login only
//     enforces "we have something to send."

import { z } from "zod";

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Required")
    .email("Enter a valid email address")
    .max(254, "Too long"),
  password: z
    .string()
    .min(1, "Required")
    .max(200, "Too long"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
