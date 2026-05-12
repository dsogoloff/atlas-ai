// Parent diagnostic report — Detailed Answer Log.
//
// New route added in Item #12 Phase 7.6. Renders the per-question detail
// for a single completed assessment session: stem, child's answer,
// correct answer, right/wrong, time taken, strand, and any
// classified misconceptions.
//
// =============================================================================
// Audience-validation reversal (Item #8 → Item #12)
// =============================================================================
//
// Item #8 deliberately dropped Stitch's "View Detailed Answer Log" CTA
// at audience validation, on the grounds that it had been carried over
// from the instructor-report design and might over-expose answer
// content to parents. Item #12 Phase 7.6 reverses that decision:
// founder approved parent exposure of question content on a per-
// completed-assessment basis. This is a deliberate scope expansion,
// not an oversight rediscovered.
//
// Compliance.md §8 Constraint 1 is upheld:
//   * The /report/answers route is parent-scoped via auth + ownership
//     chain (same shape as /report).
//   * Service-role client fetches question content ONLY for the
//     authenticated parent's own session.
//   * The route does NOT widen exposure to instructor/admin/anon
//     surfaces. If a future instructor cohort view needs the same
//     data, it must own its own access policy and audit boundary —
//     do NOT re-export this server module across audiences.
//
// =============================================================================
// Data fetch
// =============================================================================
//
// Two clients:
//   * rlsClient (anon, RLS-enforced) → parents, children, sessions,
//     responses, misconceptions (the last has a tenant-scoped public
//     SELECT policy). RLS via auth.uid() restricts reads to the
//     calling parent's own data.
//   * serviceClient (service-role) → questions. Mirrors /report/page.tsx
//     and is the only way to get question content per compliance §8.
//     We pull stem + content (full payload — for DRAG_DROP we need
//     items + correct_order; for MULTIPLE_CHOICE options + correct_index;
//     for NUMERIC_ENTRY correct_answer). The answer-extraction is
//     inline at render time.

import Link from "next/link";
import { redirect } from "next/navigation";

import { timeFlagBadge } from "@/lib/display/progress";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

import { STRAND_LABELS } from "../strand-labels";

export const dynamic = "force-dynamic";

type QuestionFormat = Database["public"]["Enums"]["question_format"];
type Strand = Database["public"]["Enums"]["strand"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AnswersPageProps {
  searchParams: Promise<{ session?: string }>;
}

export default async function AnswerLogPage({ searchParams }: AnswersPageProps) {
  const params = await searchParams;
  const sessionId = params.session?.trim() ?? "";
  if (!UUID_RE.test(sessionId)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // ---- Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/report/answers?session=${sessionId}`);
  }

  // ---- Parent row (own only).
  const { data: parent, error: parentErr } = await supabase
    .from("parents")
    .select("id, tenant_id")
    .maybeSingle();
  if (parentErr || !parent) {
    return (
      <MinimalError
        title="Account profile not found"
        body="We couldn't find your parent account. Please contact support."
      />
    );
  }

  // ---- Session — RLS scopes to the parent's children via the
  //      assessment_sessions policy chain. A hostile session UUID for
  //      another family returns null.
  const { data: session, error: sessionErr } = await supabase
    .from("assessment_sessions")
    .select("id, completed_at, status, child_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionErr || !session) {
    return (
      <MinimalError
        title="Session not found"
        body="We couldn't find this assessment in your account. The link may be old."
      />
    );
  }
  if (session.status !== "COMPLETED") {
    return (
      <MinimalError
        title="Assessment in progress"
        body="The answer log becomes available after the assessment is finished."
      />
    );
  }

  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("name")
    .eq("id", session.child_id)
    .maybeSingle();
  if (childErr || !child) {
    return (
      <MinimalError
        title="Child not found"
        body="We couldn't load the child for this assessment."
      />
    );
  }

  // ---- Responses — RLS-scoped via session_id (responses RLS keys on
  //      the session's child's parent). Item #12 Phase 7.7 adds
  //      time_flag to the projection for the per-row badge.
  const { data: responses, error: respErr } = await supabase
    .from("responses")
    .select(
      "question_id, answer_given, is_correct, time_taken_seconds, time_flag, detected_misconceptions, created_at",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (respErr || !responses) {
    return (
      <MinimalError
        title="Answer log unavailable"
        body="We couldn't load the answers for this assessment."
      />
    );
  }

  if (responses.length === 0) {
    return (
      <>
        <TopAppBar />
        <main className="flex-grow flex flex-col px-6 py-12 max-w-3xl mx-auto w-full">
          <TopBackLink childId={session.child_id} />
          <Header childName={child.name} count={0} />
          <p className="font-body-regular text-sam-gray-mid mt-4">
            No answers were recorded for this assessment.
          </p>
        </main>
      </>
    );
  }

  // ---- Questions — service-role per compliance §8.
  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const adminClient = createServiceClient();
  // NOTE: no `is_active` filter — these question_ids come from the
  // child's submitted responses. Filtering would silently drop answered
  // questions if any were deactivated between serve and read. See
  // Item #11 Phase 3 enumeration; same invariant as /report/page.tsx.
  const { data: questionRows, error: qErr } = await adminClient
    .from("questions")
    .select("id, format, strand, content")
    .in("id", questionIds);
  if (qErr || !questionRows) {
    return (
      <MinimalError
        title="Answer log unavailable"
        body="We couldn't load the questions for this assessment."
      />
    );
  }
  const questionById = new Map(questionRows.map((q) => [q.id, q]));

  // ---- Misconception labels — anon-client (tenant-scoped public SELECT).
  const allMisconceptionCodes = Array.from(
    new Set(responses.flatMap((r) => r.detected_misconceptions)),
  );
  let misconceptionLabel = new Map<string, string>();
  if (allMisconceptionCodes.length > 0) {
    const { data: mcRows } = await supabase
      .from("misconceptions")
      .select("code, label")
      .in("code", allMisconceptionCodes);
    misconceptionLabel = new Map((mcRows ?? []).map((m) => [m.code, m.label]));
  }

  return (
    <>
      <TopAppBar />
      <main className="flex-grow px-6 py-10 md:py-12 max-w-4xl mx-auto w-full">
        <TopBackLink childId={session.child_id} />
        <Header childName={child.name} count={responses.length} />

        <ol className="mt-8 space-y-4">
          {responses.map((r, i) => {
            const question = questionById.get(r.question_id);
            if (!question) {
              // Defensive: orphan response → render a minimal row
              // rather than crash. Shouldn't happen if the questions
              // table is consistent with the responses.
              return (
                <li
                  key={r.question_id}
                  className="bg-white rounded-2xl p-6 border border-sam-gray-light/30"
                >
                  <p className="text-sm text-sam-gray-mid">
                    Question {i + 1}: details unavailable.
                  </p>
                </li>
              );
            }

            const correct = extractCorrectAnswer(
              question.format,
              question.content,
            );
            const childAnswer = formatChildAnswer(
              question.format,
              r.answer_given,
            );
            const misconceptions = r.detected_misconceptions
              .map((c) => misconceptionLabel.get(c))
              .filter((l): l is string => Boolean(l));
            const timeBadge = timeFlagBadge(r.time_flag);

            return (
              <li
                key={r.question_id}
                className="bg-white rounded-2xl p-6 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <span className="text-[10px] md:text-xs font-bold text-sam-gray-mid uppercase tracking-wider">
                    Question {i + 1} · {STRAND_LABELS[question.strand as Strand]}
                  </span>
                  <div className="flex items-center gap-2">
                    {timeBadge !== null && (
                      <TimeFlagBadge copy={timeBadge} flag={r.time_flag} />
                    )}
                    <ResultBadge isCorrect={r.is_correct} />
                  </div>
                </div>

                <p className="font-headline-adult text-sam-navy text-base md:text-lg leading-relaxed mb-4">
                  {extractStem(question.content)}
                </p>

                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <dt className="text-sam-gray-mid">Child&rsquo;s answer</dt>
                    <dd
                      className={`font-bold ${
                        r.is_correct ? "text-sam-teal" : "text-sam-red"
                      }`}
                    >
                      {childAnswer}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sam-gray-mid">Correct answer</dt>
                    <dd className="font-bold text-sam-navy">{correct}</dd>
                  </div>
                  <div>
                    <dt className="text-sam-gray-mid">Time taken</dt>
                    <dd className="text-sam-navy/80">
                      {formatSeconds(r.time_taken_seconds)}
                    </dd>
                  </div>
                  {misconceptions.length > 0 && (
                    <div>
                      <dt className="text-sam-gray-mid">Pattern</dt>
                      <dd className="text-sam-navy/80">
                        {misconceptions.join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 print:hidden flex flex-col md:flex-row gap-3">
          <Link
            href={`/report?child=${session.child_id}`}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-sam-navy/20 rounded-2xl font-headline-adult text-sam-navy hover:bg-white hover:border-sam-red hover:text-sam-red transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Report
          </Link>
        </div>
      </main>
    </>
  );
}

// =============================================================================
// Helpers — pure shape extractors over Json question content.
// =============================================================================

function extractStem(content: Json): string {
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    return "(question unavailable)";
  }
  const stem = (content as Record<string, Json>).stem;
  return typeof stem === "string" ? stem : "(question unavailable)";
}

function extractCorrectAnswer(format: QuestionFormat, content: Json): string {
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    return "—";
  }
  const obj = content as Record<string, Json>;
  switch (format) {
    case "MULTIPLE_CHOICE": {
      const options = obj.options;
      const idx = obj.correct_index;
      if (
        Array.isArray(options) &&
        typeof idx === "number" &&
        Number.isInteger(idx) &&
        idx >= 0 &&
        idx < options.length
      ) {
        const opt = options[idx];
        return typeof opt === "string" ? opt : "—";
      }
      return "—";
    }
    case "NUMERIC_ENTRY": {
      const ans = obj.correct_answer;
      return typeof ans === "string" ? ans : "—";
    }
    case "DRAG_DROP": {
      const order = obj.correct_order;
      if (Array.isArray(order)) {
        return order
          .filter((x): x is string => typeof x === "string")
          .join(" → ");
      }
      return "—";
    }
  }
}

// Drag-drop answers are stored as JSON-encoded arrays in answer_given.
// MC + numeric are stored as plain strings. Parse only when format is DD.
function formatChildAnswer(format: QuestionFormat, answerGiven: string): string {
  if (format === "DRAG_DROP") {
    try {
      const parsed: unknown = JSON.parse(answerGiven);
      if (
        Array.isArray(parsed) &&
        parsed.every((x): x is string => typeof x === "string")
      ) {
        return parsed.join(" → ");
      }
    } catch {
      // Fall through to raw display.
    }
  }
  // MULTIPLE_CHOICE: answer_given is the chosen option's text (handler
  // stores it as-text, not as index). NUMERIC_ENTRY: child's typed
  // string. Both render verbatim.
  return answerGiven;
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}m ${rem.toFixed(0)}s`;
}

// =============================================================================
// Chrome — minimal versions for this leaf route. Kept inline to avoid a
// premature shared-chrome extraction; if a third parent route lands the
// TopAppBar / TopBackLink can move under (parent)/_components.
// =============================================================================

function TopAppBar() {
  return (
    <header className="bg-[#FEFBF6] sticky top-0 z-40 border-b border-[#F2EDE4] shadow-[0px_4px_12px_rgba(27,58,107,0.05)] flex justify-between items-center w-full px-6 py-4 print:hidden">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-sam-navy font-display-child">
          Atlas Assessment
        </span>
      </div>
    </header>
  );
}

function TopBackLink({ childId }: { childId: string }) {
  return (
    <Link
      href={`/report?child=${childId}`}
      className="inline-flex items-center gap-2 text-sam-navy/60 hover:text-sam-red transition-colors mb-6 font-headline-adult print:hidden"
    >
      <span className="material-symbols-outlined text-xl">arrow_back</span>
      <span>Back to Report</span>
    </Link>
  );
}

function Header({ childName, count }: { childName: string; count: number }) {
  return (
    <div>
      <h1 className="font-display-child text-sam-navy text-3xl md:text-[40px] tracking-tight">
        {childName}&rsquo;s Answer Log
      </h1>
      <p className="font-headline-adult text-sam-navy/60 mt-2">
        {count === 0
          ? "No answers recorded."
          : count === 1
            ? "1 question"
            : `${count} questions`}
      </p>
    </div>
  );
}

function TimeFlagBadge({
  copy,
  flag,
}: {
  copy: string;
  /** Drives the icon — speed for fast, hourglass for slow. */
  flag: Database["public"]["Enums"]["time_flag"];
}) {
  // Both badges share neutral styling — no penalty math (features.md §2:
  // time is a SECONDARY signal in v1, no score adjustment). The badge
  // is a contextual hint, not a verdict.
  const icon = flag === "TOO_FAST" ? "speed" : "hourglass_empty";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-sam-navy/5 px-3 py-1 text-xs font-bold text-sam-navy/70"
      aria-label={`Time observation: ${copy}`}
    >
      <span
        className="material-symbols-outlined text-base"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        {icon}
      </span>
      {copy}
    </span>
  );
}

function ResultBadge({ isCorrect }: { isCorrect: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
        isCorrect
          ? "bg-sam-teal/10 text-sam-teal"
          : "bg-sam-red/10 text-sam-red"
      }`}
    >
      <span
        className="material-symbols-outlined text-base"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        {isCorrect ? "check_circle" : "cancel"}
      </span>
      {isCorrect ? "Correct" : "Incorrect"}
    </span>
  );
}

function MinimalError({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12">
      <div className="max-w-md text-center bg-white rounded-3xl p-10 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
        <h1 className="font-display-child text-2xl text-sam-navy mb-4">
          {title}
        </h1>
        <p className="font-body-regular text-sam-gray-mid">{body}</p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-sam-navy/20 rounded-2xl font-headline-adult text-sam-navy hover:bg-white hover:border-sam-red hover:text-sam-red transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Family Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
