"use server";

// Sign-out server action for the parent dashboard profile menu.
//
// supabase.auth.signOut() clears the auth cookie via the same cookie store
// createClient() wires for login (login/actions.ts). After clearing, redirect
// to /login — the public entry. Phase 1 Q7 deferred the profile dropdown /
// logout; this wires the logout half so the parent can actually sign out.

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
