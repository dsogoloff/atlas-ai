import "server-only";

// Staff assessment alerts (Resend transactional email) — two operational
// notifications to the pilot center's inbox:
//
//   1. ACCOUNT CREATED   — a parent completed EMAIL CONFIRMATION (not raw
//                          signup: an unconfirmed signup is not an account).
//   2. ASSESSMENT DONE   — a child's assessment session was finalized
//                          server-side (the same seam that closes the session).
//
// Reuses the follow-up-lead transport wholesale: same RESEND_API_KEY, same
// verified LEAD_NOTIFY_FROM_EMAIL sender, same LEAD_NOTIFY_LIVE gate. The only
// new knob is the recipient (STAFF_ALERT_TO, which DEFAULTS in code to the
// pilot center inbox so this ships with no Vercel env action).
//
// DEFAULT-OFF + FAIL-SOFT, exactly like followUp/notify.ts: when
// LEAD_NOTIFY_LIVE !== 'true' these no-op, and neither function ever throws —
// a notification failure must never block email confirmation or assessment
// finalization. Failures land on the existing console.error path.
//
// ---------------------------------------------------------------------------
// COPPA PAYLOAD DISCIPLINE (mirrors the attribution-event / HubSpot Contract A
// whitelist): every field that leaves this box is enumerated on the typed
// interfaces below and hand-copied into the body. NEVER pass a whole account /
// child / session object through here, and NEVER add: score, placement level,
// strand mastery, misconception flags, item responses, report narrative, child
// NAME, or child DOB/birth year. The completion alert carries the child's GRADE
// only — enough for a director to prep a conversation, and no result.
// ---------------------------------------------------------------------------

import { getBranding } from "@/lib/branding";
import {
  getLeadNotifyFromEmail,
  getResendApiKey,
  getStaffAlertToEmail,
  isLeadNotifyLive,
} from "@/lib/env";

/**
 * Resend `from` with the tenant's sender display name applied. Identical rule
 * to followUp/notify.ts: an env value that already carries a display name
 * (`Name <addr>`) is left alone so the env var stays authoritative.
 */
function brandedFrom(): string {
  const raw = getLeadNotifyFromEmail().trim();
  if (raw.includes("<")) return raw;
  return `${getBranding().email.senderName} <${raw}>`;
}

/**
 * Post one alert to Resend. Never throws, never returns a failure the caller
 * has to handle — the caller's job (confirm redirect, session close) always
 * proceeds.
 */
async function send(subject: string, lines: string[]): Promise<void> {
  if (!isLeadNotifyLive()) return; // gated off → no send, no spend

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getResendApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: brandedFrom(),
        to: getStaffAlertToEmail(),
        subject,
        text: lines.join("\n"),
      }),
    });
    if (!res.ok) {
      console.error("[staffAlerts] notify failed", { status: res.status });
    }
  } catch (e) {
    console.error("[staffAlerts] notify threw", {
      err: e instanceof Error ? e.message : "unknown",
    });
  }
}

// ---------------------------------------------------------------------------
// 1. Account created (fired on email-confirm success)
// ---------------------------------------------------------------------------

/**
 * Allowlisted payload for the account-created alert. Parent contact only —
 * at confirm time there is usually no child yet, and there is never a result.
 */
export interface AccountCreatedAlert {
  /** Parent's name as captured at signup (`parents.name`, one field). */
  parentName: string;
  parentEmail: string;
  /** Absolute link to the internal admin record for this account. */
  adminUrl: string;
}

export async function notifyAccountCreated(
  alert: AccountCreatedAlert,
): Promise<void> {
  await send(`New S.A.M assessment account: ${alert.parentName}`, [
    "A parent confirmed their email and now has an assessment account.",
    "",
    `Parent: ${alert.parentName}`,
    `Email: ${alert.parentEmail}`,
    `Admin: ${alert.adminUrl}`,
    "",
    "Account/contact data only — no child data and no assessment result.",
  ]);
}

// ---------------------------------------------------------------------------
// 2. Assessment completed (fired on server-side session finalization)
// ---------------------------------------------------------------------------

/**
 * Allowlisted payload for the assessment-completed alert. Child GRADE is the
 * ONLY child attribute permitted — no name, no birth year, and emphatically no
 * score / level / strand mastery. Staff open the linked record for results.
 */
export interface AssessmentCompletedAlert {
  parentName: string;
  /** `children.grade_level`; null when the child's grade was never captured. */
  childGrade: string | null;
  /** Absolute link to the internal student-detail record. */
  studentUrl: string;
}

export async function notifyAssessmentCompleted(
  alert: AssessmentCompletedAlert,
): Promise<void> {
  const grade = alert.childGrade?.trim() || "not provided";
  await send(
    `S.A.M assessment completed: ${alert.parentName} (grade ${grade})`,
    [
      "A child finished their S.A.M assessment.",
      "",
      `Parent: ${alert.parentName}`,
      `Child grade: ${grade}`,
      `Student record: ${alert.studentUrl}`,
      "",
      "Results are NOT included in this email — open the student record to",
      "see the placement and report.",
    ],
  );
}
