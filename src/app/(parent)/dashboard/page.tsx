/* eslint-disable @next/next/no-img-element */
// Parent dashboard. Server component — runs the auth gate (redirect to
// /login?next=/dashboard if no session), fetches the parent row +
// children + most-recent COMPLETED session per child via four sequential
// Supabase queries, and renders one of two states:
//   * Empty (no children) — Sammy mascot + "Welcome to the Atlas Family!"
//     + "Add Your First Child" CTA. Stitch port from
//     stitch/module-d/02-parent-dashboard-empty-desktop.html and
//     04-parent-dashboard-mobile-empty.html.
//   * Populated — "Welcome back, [first]" greeting + grid of child cards
//     + Sammy + "Add Another Child" CTA. Stitch port from
//     01-parent-dashboard-populated-desktop.html and
//     03-parent-dashboard-mobile-populated.html. ChildCard is its own
//     file (./child-card.tsx) — viewport-aware via Tailwind utilities.
//
// Cycle-1 deviations from Stitch sources, intentionally NOT fixed:
//   * Source 02/04 alt text said "Instructor profile avatar"; corrected
//     here to "Parent profile avatar" (Phase 1 Q7).
//   * Mobile bottom nav (3-item Home/Children/Account) skipped — routes
//     don't exist (Phase 1 Q11).
//   * Footer skipped (Phase 1 Q13).
//   * Profile dropdown / logout not wired (Phase 1 Q7) — flagged as a
//     cycle-1 fixup.
//   * "Recent Mastery 82%" preview from source 01 card 2 dropped — no
//     schema backing; Item #8 owns mastery surfacing (Phase 1 Q8).

import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveStaff } from "@/app/(instructor)/instructor/lib/instructor";
import { getBranding } from "@/lib/branding";
import { CTA_LINKS } from "@/lib/cta-links";
import { firstName } from "@/lib/format/firstName";
import { createClient } from "@/lib/supabase/server";
import { deriveTier } from "@/lib/tier/derive";

import { ChildCard } from "./child-card";
import { ProfileMenu } from "./profile-menu";
import { recoverParentProfile } from "./recover-profile";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

export default async function ParentDashboardPage() {
  const branding = getBranding();
  // Auth gate (Phase 1 Q5b): page-level. Mirrors Phase 2/3 idiom.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // Resolve the parent row (RLS-scoped to the auth user's own row).
  const { data: existingParent, error: parentErr } = await supabase
    .from("parents")
    .select("id, name")
    .maybeSingle();

  let parent = existingParent;
  if (parentErr || !parent) {
    // A signed-in admin/instructor legitimately has no parent row — route them
    // to their own portal instead of the orphan error (staff used to land here
    // and hit "Account profile not found"). resolveStaff is RLS-scoped to the
    // caller's own row; only a caller who is neither a parent NOR active staff
    // falls through to the genuine-orphan branch below.
    const staff = await resolveStaff(supabase);
    if (staff?.kind === "admin") redirect("/admin");
    if (staff?.kind === "instructor") redirect("/instructor");

    // Orphaned auth user — the parents-row insert failed at signup, so this
    // account can authenticate but has no profile. Don't dead-end: self-heal
    // by rebuilding the parents row from the auth identity (recover-profile.ts
    // mirrors the signup tenant/center attach), then render the dashboard
    // normally. Only if recovery ALSO fails do we show a graceful "still
    // setting up" message with a retry instead of a permanent error.
    const recovered = await recoverParentProfile(user);
    if (!recovered) {
      console.error("[dashboard] orphan recovery failed", {
        authUserId: user.id,
        err: parentErr,
      });
      return (
        <main className="flex-grow flex items-center justify-center px-6 py-12">
          <div className="max-w-md text-center bg-white rounded-3xl p-10 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
            <h1 className="font-display-child text-2xl text-sam-navy mb-4">
              We&rsquo;re finishing setting up your account
            </h1>
            <p className="font-body-regular text-sam-gray-mid mb-6">
              Give us a moment and try again. If this keeps happening, please
              contact support.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-sam-red hover:bg-sam-red/90 text-white font-headline-adult font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Try again
            </Link>
          </div>
        </main>
      );
    }
    parent = recovered;
  }

  // Children for this parent (RLS-scoped via children_parent_all). Archived
  // (soft-deleted) children are hidden from the parent — archived_at IS NULL.
  const { data: children, error: childrenErr } = await supabase
    .from("children")
    .select("id, name, grade_level, birth_year")
    .eq("parent_id", parent.id)
    .is("archived_at", null)
    .order("created_at");
  if (childrenErr) {
    // Soft failure — render the empty state. Logging surfaces the bug.
    console.error("[dashboard] children lookup failed", {
      parentId: parent.id,
      err: childrenErr,
    });
  }
  const childList = children ?? [];

  // Most-recent COMPLETED session per child (Phase 1 Q3). Single query
  // sorted desc; build a Map<child_id, completed_at> on first-seen.
  // Skip the query entirely when there are no children.
  const lastCompletedByChild = new Map<string, string>();
  if (childList.length > 0) {
    const { data: sessions } = await supabase
      .from("assessment_sessions")
      .select("child_id, completed_at")
      .in(
        "child_id",
        childList.map((c) => c.id),
      )
      .eq("status", "COMPLETED")
      .order("completed_at", { ascending: false });
    for (const s of sessions ?? []) {
      if (s.completed_at && !lastCompletedByChild.has(s.child_id)) {
        lastCompletedByChild.set(s.child_id, s.completed_at);
      }
    }
  }

  return (
    <>
      {/* TopAppBar — ported from Stitch source 01. The profile menu now wires
          Sign out (Phase 1 Q7 deferral). The "Resources" placeholder link and
          the notifications bell were both removed — neither had a destination
          or a handler, and a control that does nothing when clicked reads as a
          broken app. Bring the bell back when notifications actually land. */}
      <header className="bg-[#FEFBF6] sticky top-0 z-40 border-b border-[#F2EDE4] shadow-[0px_4px_12px_rgba(27,58,107,0.05)] flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-sam-navy font-display-child">
            {branding.productName}
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <nav className="hidden md:flex space-x-8">
            <a
              className="text-sam-red border-b-2 border-sam-red pb-1 font-display-child font-semibold transition-colors"
              href="/dashboard"
            >
              Family Dashboard
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <ProfileMenu name={parent.name} email={user.email} />
          </div>
        </div>
      </header>

      {childList.length === 0 ? (
        // Empty state — Stitch source 02 (desktop) + 04 (mobile) port.
        <main className="flex-grow flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-2xl w-full text-center">
            <h1 className="font-display-child text-display-child text-sam-navy mb-12">
              Welcome to the {branding.shortName} Family!
            </h1>
            <div className="relative flex flex-col items-center space-y-8">
              <div className="relative w-full max-w-md mx-auto mb-4">
                <div className="bg-white px-8 py-6 mb-12 mx-auto inline-block border border-sam-gray-light/50 rounded-3xl shadow-[0px_4px_12px_rgba(27,58,107,0.08)] relative">
                  <p className="font-body-regular text-body-regular text-sam-navy italic">
                    &ldquo;Let&rsquo;s see what amazing things they can do today!&rdquo;
                  </p>
                  <div className="absolute -bottom-3 left-[20%] w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-white" />
                </div>
                <div className="relative">
                  <div className="w-64 h-64 mx-auto rounded-full bg-gradient-to-br from-white to-sam-orange/10 flex items-center justify-center p-2">
                    <img
                      alt="Sammy the brown long-haired mini dachshund mascot"
                      className="w-full h-full object-contain"
                      src="/mascot/waving.png"
                    />
                  </div>
                  <div className="absolute top-0 right-1/4 w-12 h-12 bg-sam-teal/10 rounded-xl flex items-center justify-center text-sam-teal -rotate-12">
                    <span className="material-symbols-outlined">calculate</span>
                  </div>
                  <div className="absolute bottom-4 left-1/4 w-10 h-10 bg-sam-yellow/20 rounded-lg flex items-center justify-center text-sam-orange rotate-12">
                    <span className="material-symbols-outlined">star</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="font-headline-adult text-headline-adult text-sam-navy">
                  Let&rsquo;s get started
                </h2>
                <p className="font-body-regular text-body-regular text-sam-gray-mid max-w-sm mx-auto">
                  Add your first child to begin their personalized math journey
                  and discover their true mathematical potential.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/add-child?next=/dashboard"
                  className="bg-sam-red hover:bg-sam-red/90 text-white font-display-child font-bold text-lg px-10 py-5 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all inline-flex items-center gap-3"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  Add Your First Child
                </Link>
              </div>
              <div className="pt-8">
                <a
                  className="text-sam-navy/60 hover:text-sam-navy font-caption text-caption underline underline-offset-4 decoration-sam-yellow decoration-2 transition-all"
                  href={CTA_LINKS.accountSetupHelp}
                >
                  Need help setting up your account?
                </a>
              </div>
            </div>
          </div>
        </main>
      ) : (
        // Populated state — Stitch source 01 (desktop) + 03 (mobile) port.
        <main className="max-w-container-max mx-auto px-6 md:px-10 pt-10 md:pt-16 pb-24">
          <div className="mb-10 md:mb-12">
            <h1 className="font-display-child text-sam-navy text-3xl md:text-[48px] tracking-tight mb-2">
              Welcome back, {firstName(parent.name)}
            </h1>
            <p className="font-headline-adult text-sam-navy/60">
              Here&rsquo;s how your family is doing.
            </p>
          </div>

          {/* Mobile: vertical stack. Desktop: 2-col grid. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {childList.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                lastCompletedAt={lastCompletedByChild.get(child.id) ?? null}
                tier={deriveTier(child)}
              />
            ))}
          </div>

          {/* Mascot + Add Another Child CTA (Phase 1 Q12). Speech bubble
              is desktop-only (md:block) — too cramped on mobile. */}
          <div className="mt-20 flex flex-col items-center">
            <div className="relative mb-12">
              <div className="absolute -top-16 -left-20 bg-white p-4 rounded-2xl shadow-md border border-sam-gray-light/30 max-w-[200px] transform -rotate-3 hidden md:block">
                <p className="text-sm font-medium leading-relaxed">
                  Let&rsquo;s see what amazing things they can do today!
                </p>
                <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r border-b border-sam-gray-light/30 rotate-45" />
              </div>
              <div className="w-32 h-32 relative">
                <img
                  alt="Sammy the dachshund mascot"
                  className="w-full h-full object-contain"
                  src="/mascot/waving.png"
                />
              </div>
            </div>
            <Link
              href="/add-child?next=/dashboard"
              className="flex items-center gap-2 px-8 py-4 border-2 border-sam-navy/20 rounded-2xl font-headline-adult text-sam-navy hover:bg-white hover:border-sam-red hover:text-sam-red transition-all group"
            >
              <span className="material-symbols-outlined text-sam-red group-hover:rotate-90 transition-transform">
                add
              </span>
              Add Another Child
            </Link>
          </div>

          {/* Dashboard CTA block — slimmer counterpart to the end-of-report
              version. Same two actions, same shared URLs. Sits at the
              bottom of the dashboard so families discover scheduling +
              support without it competing with the per-child cards. */}
          <div className="mt-12 pt-8 border-t border-sam-gray-light/30 flex flex-col md:flex-row justify-center items-center gap-3">
            <Link
              href={CTA_LINKS.scheduleFreeClass}
              className="inline-flex items-center gap-2 px-6 py-3 bg-sam-red hover:bg-sam-red/90 text-white font-headline-adult font-bold rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">
                event_available
              </span>
              Schedule a free class
            </Link>
            <Link
              href={CTA_LINKS.questionsTalkToUs}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sam-navy/70 hover:text-sam-red font-headline-adult transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                chat_bubble
              </span>
              Questions? Talk to us
            </Link>
          </div>
        </main>
      )}
    </>
  );
}
