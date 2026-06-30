// Edit-child page. Server component — auth-gated, loads the child (RLS-scoped to
// the calling parent, archived rows excluded) and hands the current values to
// the client form. A missing / archived / not-owned child redirects to the
// dashboard rather than rendering a form that could only fail on submit.

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { EditChildForm } from "./edit-child-form";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function EditChildPage({ params }: Props) {
  const { childId } = await params;
  if (!UUID_RE.test(childId)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/edit-child/${childId}`);
  }

  // RLS (children_parent_all) scopes this to the parent's own children;
  // archived_at IS NULL hides a soft-deleted child.
  const { data: child } = await supabase
    .from("children")
    .select("id, name, grade_level, birth_year")
    .eq("id", childId)
    .is("archived_at", null)
    .maybeSingle();

  if (!child) {
    redirect("/dashboard");
  }

  return (
    <>
      <header className="bg-[#FEFBF6] top-0 z-40 border-b border-[#F2EDE4] shadow-[0px_4px_12px_rgba(27,58,107,0.05)] flex justify-between items-center w-full px-6 py-4">
        <span className="text-2xl font-black text-sam-navy font-display-child">
          Atlas Assessment
        </span>
      </header>

      <main className="flex-grow flex items-center justify-center px-gutter py-stack-lg relative overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-sam-yellow/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-sam-teal/10 rounded-full blur-3xl" />

        <div className="w-full max-w-[540px] bg-white rounded-3xl shadow-[0px_4px_24px_rgba(27,58,107,0.08)] p-10 relative z-10 border border-sam-gray-light/30">
          <div className="text-center mb-8">
            <h1 className="font-display-child text-display-child text-sam-navy mb-2">
              Edit child
            </h1>
            <p className="text-sam-gray-mid font-headline-adult text-lg">
              Update {child.name}&rsquo;s details.
            </p>
          </div>

          <EditChildForm
            childId={child.id}
            defaultName={child.name}
            defaultBirthYear={child.birth_year}
            defaultGradeLevel={child.grade_level}
            cancelHref="/dashboard"
          />
        </div>
      </main>

      <footer className="p-6 text-center text-sam-gray-mid/50 text-caption font-caption">
        © 2026 Atlas Assessment by Inspirea Labs Inc. All rights reserved.
      </footer>
    </>
  );
}
