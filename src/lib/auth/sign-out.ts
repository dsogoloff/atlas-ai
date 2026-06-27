"use server";

// Shared sign-out server action.
//
// supabase.auth.signOut() clears the auth cookie via the same cookie store
// createClient() wires for login (login/actions.ts). After clearing, redirect
// to /login — the public entry. Shared by the parent dashboard profile menu and
// the staff (instructor + admin) top bar, so it lives in @/lib/auth rather than
// any one feature folder.

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
