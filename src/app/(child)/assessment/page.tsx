// Child-facing assessment route entry.
//
// Server component. Performs the gating before AssessmentClient mounts:
//   1. Parse child_id from the query string (per Item #5 ambiguity #3:
//      query string carries the child id).
//   2. Auth check via supabase.auth.getUser() (per ambiguity #7: render
//      an inline ErrorPanel with /signup link rather than redirect).
//   3. Fetch children.name, grade_level, birth_year (RLS-scoped to the
//      calling parent) — name for the completion greeting, grade_level
//      and birth_year for tier derivation.
//   4. Derive tier via @/lib/tier/derive (grade_level first, birth_year
//      fallback — see derive.ts header for precedence rationale).
//   5. Render <AssessmentClient> with the derived tier so K-4 vs 5-8
//      chrome variants can switch internally.
//
// Errors here render the same ErrorPanel surface as runtime errors from
// AssessmentClient. We pass canRetry=false (server-rendered errors have
// nothing to retry) and omit onRetry (functions don't cross the RSC
// boundary).

import { createClient } from "@/lib/supabase/server";
import { deriveTier } from "@/lib/tier/derive";

import { AssessmentClient } from "./assessment-client";
import { ErrorPanel } from "./components/ErrorPanel";

// RFC 4122 UUID. Loose hex match — Postgres accepts any version, so we
// match any version too. Defends against e.g. ?child_id=../../etc/passwd
// before it reaches Supabase.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  searchParams: Promise<{ child_id?: string | string[] }>;
}

export default async function AssessmentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.child_id)
    ? params.child_id[0]
    : params.child_id;

  if (!raw || !UUID_RE.test(raw)) {
    return <ErrorPanel kind="not_found" canRetry={false} />;
  }
  const childId = raw;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <ErrorPanel kind="unauthorized" canRetry={false} />;
  }

  // RLS on `children` (per supabase/migrations/20260426000100_rls_policies.sql)
  // restricts to rows whose parent_id maps to the calling auth user.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("name, grade_level, birth_year")
    .eq("id", childId)
    .maybeSingle();

  if (childErr) {
    return <ErrorPanel kind="server" canRetry={false} />;
  }
  if (!child) {
    return <ErrorPanel kind="not_found" canRetry={false} />;
  }

  const tier = deriveTier({
    grade_level: child.grade_level,
    birth_year: child.birth_year,
  });

  return (
    <AssessmentClient
      childId={childId}
      childName={child.name}
      tier={tier}
    />
  );
}
