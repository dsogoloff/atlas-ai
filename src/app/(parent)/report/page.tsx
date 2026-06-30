// Parent Assessment Report (formerly "Diagnostic Report"). Server
// component — runs the page-level auth gate (R11), validates the `child`
// query param, fetches all data via two Supabase clients, and dispatches
// to one of seven rendering branches.
//
// Editorial reskin (docs/atlas-sample-report.html): ~720px reading column
// on a paper-white card centred over a paper-grey body, Playfair Display
// serif heads + DM Sans body, navy #1B3A6B / cyan #00B8D4. Layout chrome
// (topbar, hero, sections, next-steps, footer) is rendered inline below;
// the strand / findings / recommendations leaf components live alongside
// this file and have been restyled to the same editorial palette.
//
// Routing: /report?child=<uuid>. Linked from the Phase 1 dashboard
// child card "View Report" CTA.
//
// Branches (in evaluation order):
//   1. Missing/bad child UUID         → redirect /dashboard
//   2. Unauthenticated                → redirect /login?next=...
//   3. Orphan auth user (no parents)  → MinimalError, no chrome
//   4. Child not found / not yours    → MinimalError, no chrome
//   5. No COMPLETED session yet       → empty state inside report shell
//   6. session_time_flag unreliable|mixed → "ask child to re-take" banner
//                                       (no scores, no misconceptions)
//   7. session_time_flag rushed|struggling|normal → full report
//      (rushed + struggling render a caveat banner above the report)

import Link from "next/link";
import { redirect } from "next/navigation";

import { isLeadSchoolFieldEnabled } from "@/lib/env";
import { firstName } from "@/lib/format/firstName";
import { assembleReportContent } from "@/lib/report/assemble";
import { generateReportNarration } from "@/lib/report/narration/generate";
import { upsertNarration } from "@/lib/report/narration/persist";
import {
  failedNarrationMarker,
  narrationToRow,
  shouldRegenerateNarration,
} from "@/lib/report/narration/refresh";
import {
  resolveNarrationProse,
  type ReportNarrationRow,
} from "@/lib/report/narration/resolve";
import type { ReportNarration } from "@/lib/report/types";
import { isNarrationPending, nowMs } from "./narration-pending";
import { PreparingReport } from "./preparing-report";
import { isPlacementEstimateJson } from "@/lib/responseSubmit/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import {
  Footer,
  Hero,
  ReportArticle,
  ReportShell,
  Topbar,
} from "./report-article";
import { TimeFlagBanner } from "./time-flag-banner";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// Page
// =============================================================================

interface ReportPageProps {
  searchParams: Promise<{ child?: string }>;
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  // ---- Branch 1: validate the child param before doing anything else.
  const params = await searchParams;
  const childId = params.child?.trim() ?? "";
  if (!UUID_RE.test(childId)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // ---- Branch 2: auth gate (R11 page-level).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/report?child=${childId}`);
  }

  // Resolve the parent row (RLS-scoped to the auth user's own row).
  const { data: parent, error: parentErr } = await supabase
    .from("parents")
    .select("id, name")
    .maybeSingle();

  // ---- Branch 3: orphan auth user.
  if (parentErr || !parent) {
    console.error("[report] parent lookup failed", {
      authUserId: user.id,
      err: parentErr,
    });
    return (
      <MinimalError
        title="Account profile not found"
        body="We couldn't find your parent account. Please contact support."
      />
    );
  }

  // Resolve the child. RLS limits this to children whose parent_id
  // matches the parent row above. archived_at IS NULL hides a child the
  // parent has soft-deleted (a stale /report link resolves to not-found).
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id, name, grade_level, birth_year")
    .eq("id", childId)
    .is("archived_at", null)
    .maybeSingle();

  // ---- Branch 4: child not found / belongs to another parent.
  if (childErr || !child) {
    if (childErr) {
      console.error("[report] child lookup failed", {
        childId,
        err: childErr,
      });
    }
    return (
      <MinimalError
        title="Child not found"
        body="We couldn't find this child in your family. The link may be stale, or the child may have been removed."
      />
    );
  }

  // Most-recent COMPLETED session for this child.
  const { data: latestSession } = await supabase
    .from("assessment_sessions")
    .select(
      "id, tenant_id, started_at, completed_at, current_estimate, session_time_flag, test_type",
    )
    .eq("child_id", child.id)
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ---- Branch 5: empty state.
  if (!latestSession) {
    const childFirstName = firstName(child.name);
    // School grade is no longer surfaced to parents (founder decision
    // 2026-06-18, D5) — the empty state shows no meta line.
    return (
      <ReportShell>
        <Topbar reportId={null} />
        <Hero childName={childFirstName} metaLine={null} />
        <section
          className="px-12 max-sm:px-6 py-13 max-sm:py-10 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <p
            className="text-lg leading-[1.7] max-w-[660px]"
            style={{
              fontFamily: "var(--font-report-sans)",
              color: "var(--color-report-text-secondary)",
            }}
          >
            {childFirstName} hasn&rsquo;t completed an assessment yet. Once
            they finish their first session, the assessment report will
            appear here.
          </p>
          <Link
            href={`/assessment?child_id=${child.id}`}
            className="mt-7 inline-flex items-center gap-4 px-7 py-5 text-white text-[17px] font-medium hover:opacity-95 transition-opacity"
            style={{
              backgroundColor: "var(--color-report-navy)",
              fontFamily: "var(--font-report-sans)",
            }}
          >
            <span>Start assessment</span>
            <span
              className="text-2xl"
              style={{ fontFamily: "var(--font-report-serif)" }}
              aria-hidden="true"
            >
              &rarr;
            </span>
          </Link>
        </section>
        <Footer />
      </ReportShell>
    );
  }

  // ---- Branch 6 vs 7: defensive PlacementEstimate check.
  if (!isPlacementEstimateJson(latestSession.current_estimate)) {
    console.error("[report] completed session missing valid placement", {
      sessionId: latestSession.id,
      childId: child.id,
    });
    return (
      <MinimalError
        title="Report unavailable"
        body="We couldn't generate the report for this assessment. Please contact support."
      />
    );
  }
  const timeFlag: SessionTimeFlag = latestSession.session_time_flag ?? "normal";

  // ---- Branch 6: unreliable/mixed → "please re-take" banner only.
  if (timeFlag === "unreliable" || timeFlag === "mixed") {
    const childFirstName = firstName(child.name);
    // School grade is no longer surfaced to parents (D5) — meta line is the
    // assessed date only.
    const completed = formatDate(latestSession.completed_at);
    const metaLine = completed ? `Assessed ${completed}` : "";
    return (
      <ReportShell>
        <Topbar reportId={null} />
        <Hero
          childName={childFirstName}
          metaLine={metaLine || null}
        />
        <section
          className="px-12 max-sm:px-6 py-13 max-sm:py-10 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <TimeFlagBanner
            flag={timeFlag}
            childName={childFirstName}
            childId={child.id}
          />
        </section>
        <Footer />
      </ReportShell>
    );
  }

  // ---- Branch 7: full report.
  const serviceClient = createServiceClient();

  // Read the narration row first (cheap). A freshly-completed session's
  // narration is written a few seconds AFTER completion (the trigger generates
  // + persists post-completion), so a report opened in that gap has no row yet.
  // Show a brief "preparing your report" interstitial that polls until the row
  // lands, rather than flashing the pre-narration shell (generic strand lede,
  // no Strengths / Areas). The wait is bounded (narration-pending.ts): a
  // narration that fails or never arrives falls through to the normal report
  // below, so the parent is never trapped on an indefinite interstitial.
  const { data: narrationRow, error: narrationErr } = await supabase
    .from("report_narrations")
    .select(
      "status, placement_line, strand_lede, findings_strengths, findings_growth_areas, recommendations_lede",
    )
    .eq("session_id", latestSession.id)
    .maybeSingle();
  if (narrationErr) {
    console.error("[report] narration lookup failed", {
      sessionId: latestSession.id,
      err: narrationErr,
    });
  }

  if (
    isNarrationPending(
      narrationRow != null,
      latestSession.completed_at,
      nowMs(),
    )
  ) {
    const completed = formatDate(latestSession.completed_at);
    return (
      <PreparingReport
        childName={firstName(child.name)}
        metaLine={completed ? `Assessed ${completed}` : null}
      />
    );
  }

  let reportContent;
  try {
    reportContent = await assembleReportContent({
      readClient: supabase,
      serviceClient,
      session: latestSession,
      child,
    });
  } catch (err) {
    console.error("[report] assembly failed", {
      sessionId: latestSession.id,
      err,
    });
    return (
      <MinimalError
        title="Report unavailable"
        body="We couldn't load this assessment. Please try again in a moment, or contact support if the problem persists."
      />
    );
  }

  // Self-heal a missing or stale narration, AT MOST ONCE per session. Two
  // recoverable shapes (see shouldRegenerateNarration):
  //   (1) NO cached row at all + live content has strand data — the
  //       completion-time trigger (attemptNarration) threw before persisting
  //       (a transient callSonnet failure as the session completed). The report
  //       renders data-only with no strengths/growth narrative. This is the L4
  //       defect.
  //   (2) A strand-suppressed "ok" row + live content now has strand data — a
  //       pre-#160 young-band row narrated when sub-strand resolution was empty,
  //       so generate.ts's anti-fabrication guard suppressed strand_lede +
  //       strengths. The radar/bars already reflect #160 (assembled live above);
  //       the cached narrative does not.
  // In both, regenerate once from the already-assembled content and re-cache.
  //
  // REGEN-LOOP GUARD: when there was NO prior row and regeneration fails (throws
  // or comes back thin), persist a status:"failed" marker so the next view sees
  // a row → shouldRegenerateNarration is false → the report settles into the
  // data-only fallback instead of regenerating on every load. A deterministically
  // failing session converges; it never loops. For the strand-suppressed case a
  // useful row already exists (placement/recs), so we never clobber it with a
  // failed marker — it keeps its existing re-attempt-on-success behavior.
  // Fail-soft throughout: any error serves the data-only fallback, never blocks.
  let effectiveNarrationRow: ReportNarrationRow | null = narrationRow ?? null;
  if (shouldRegenerateNarration(effectiveNarrationRow, reportContent)) {
    const hadCachedRow = effectiveNarrationRow !== null;
    let fresh: ReportNarration | null = null;
    try {
      fresh = await generateReportNarration(reportContent);
    } catch (err) {
      console.error("[report] narration self-heal generation threw", {
        sessionId: latestSession.id,
        err: err instanceof Error ? err.message : "unknown",
      });
    }
    if (fresh && fresh.status === "ok" && fresh.strand_lede) {
      // Regeneration filled the strand prose — adopt + re-cache.
      const { error: healErr } = await upsertNarration(serviceClient, fresh);
      if (healErr) {
        console.error("[report] narration self-heal upsert failed", {
          sessionId: latestSession.id,
          err: healErr,
        });
      } else {
        effectiveNarrationRow = narrationToRow(fresh);
      }
    } else if (!hadCachedRow) {
      // No prior row + regeneration failed or thin → persist the once-guard
      // marker. effectiveNarrationRow stays null, so this view also renders the
      // data-only fallback; the marker only stops the NEXT view from retrying.
      const marker = failedNarrationMarker(
        reportContent,
        fresh?.model ?? "narration-self-heal",
      );
      const { error: markErr } = await upsertNarration(serviceClient, marker);
      if (markErr) {
        console.error("[report] narration self-heal marker upsert failed", {
          sessionId: latestSession.id,
          err: markErr,
        });
      }
    }
    // else: a strand-suppressed row existed and regeneration failed/was thin —
    // keep the cached row (it still carries placement/recs); never clobber it.
  }

  const narrationProse = resolveNarrationProse(
    effectiveNarrationRow,
    reportContent.time_flag,
  );

  return (
    <ReportArticle
      reportContent={reportContent}
      narrationProse={narrationProse}
      childId={child.id}
      schoolFieldEnabled={isLeadSchoolFieldEnabled()}
    />
  );
}

// MinimalError keeps its own simple chrome — no full editorial shell —
// because these branches fire before we have any report data to render.
function MinimalError({ title, body }: { title: string; body: string }) {
  return (
    <main
      className="flex-grow flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "var(--color-report-paper)" }}
    >
      <div
        className="max-w-md text-center bg-white p-10"
        style={{ border: "1px solid var(--color-report-border)" }}
      >
        <h1
          className="text-2xl mb-4"
          style={{
            fontFamily: "var(--font-report-serif)",
            color: "var(--color-report-navy)",
          }}
        >
          {title}
        </h1>
        <p
          className="text-[17px] leading-[1.65]"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-text-secondary)",
          }}
        >
          {body}
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-white text-[17px] font-medium hover:opacity-95 transition-opacity"
          style={{
            backgroundColor: "var(--color-report-navy)",
            fontFamily: "var(--font-report-sans)",
          }}
        >
          Back to family dashboard
        </Link>
      </div>
    </main>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
