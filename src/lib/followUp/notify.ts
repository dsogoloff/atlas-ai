import "server-only";

// Pilot-center notification for a short-test follow-up lead (Resend
// transactional email).
//
// THIS ALERT IS THE PRIMARY MECHANISM. A parent who ticks "have my local
// S.A.M center contact me" is asking to be phoned, and this email is how the
// director finds out. It is written to be ACTIONABLE ON A PHONE: the parent's
// name, a tappable phone number and a tappable email address lead the message,
// so a director can call straight from the notification without opening the
// portal, the database, or anything else.
//
// FAIL-SOFT but NEVER SILENT: the notifier still never throws — a mail failure
// must not fail the parent's submit — but every path that does NOT send now
// emits a structured `[followUp] lead NOT notified` line carrying a reason.
// The previous version returned silently when the gate was off, which is how a
// lead could reach nobody with no trace anywhere.
//
// Nothing is ever lost: submitFollowUpLeadCore persists the row BEFORE calling
// this, so a failed alert costs a delay, not a lead. The dead-letter line
// deliberately carries NO PII — the lead is recoverable from follow_up_leads.
//
// DATA SCOPE: parent contact + zip + child's school only (Tier 1/2 lead data).
// NO diagnostic result, NO child name, NO grade, NO placement level.

import { getBranding } from "@/lib/branding";
import {
  getLeadNotifyFromEmail,
  getLeadNotifyToEmail,
  getResendApiKey,
  isLeadNotifyLive,
} from "@/lib/env";

/**
 * Resend `from` with the tenant's sender display name applied, e.g.
 * `S.A.M New York <leads@…>`. LEAD_NOTIFY_FROM_EMAIL may already carry a
 * display name (`Name <addr>`) — in that case it is left alone so the env var
 * stays authoritative.
 */
function brandedFrom(): string {
  const raw = getLeadNotifyFromEmail().trim();
  if (raw.includes("<")) return raw;
  return `${getBranding().email.senderName} <${raw}>`;
}

/**
 * Single structured marker for every non-send. Greppable in the Vercel logs as
 * `[followUp] lead NOT notified`. No PII — the row is in follow_up_leads.
 */
function deadLetter(reason: string, extra: Record<string, unknown> = {}): void {
  console.error("[followUp] lead NOT notified", { reason, ...extra });
}

/** `tel:` target — strip everything a dialler cannot use, keep a leading +. */
function telHref(phone: string): string {
  const plus = phone.trim().startsWith("+") ? "+" : "";
  return `tel:${plus}${phone.replace(/[^0-9]/g, "")}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface FollowUpLeadNotification {
  /** Null when the school field is gated off (LEAD_SCHOOL_FIELD_LIVE). */
  schoolName: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  /** Parent zip/location (required on the form). */
  zip: string;
  /** When the lead came in. Defaults to now — the send is awaited inline with
   *  the insert, so "now" is the submission time to within milliseconds.
   *  Injectable so tests are deterministic. */
  submittedAt?: Date;
}

export async function notifyFollowUpLead(
  lead: FollowUpLeadNotification,
): Promise<void> {
  if (!isLeadNotifyLive()) {
    // Previously a silent `return`. A lead reaching nobody must leave a trace.
    deadLetter("LEAD_NOTIFY_LIVE is not 'true'");
    return;
  }

  try {
    const phone = lead.parentPhone?.trim() || null;
    const school = lead.schoolName?.trim() || null;
    const received = (lead.submittedAt ?? new Date()).toISOString();

    // Actionable fields FIRST — a director reading this on a phone should be
    // able to act from the first three lines.
    const lines = [
      "A parent asked their local S.A.M center to contact them about a full assessment.",
      "",
      `Parent:   ${lead.parentName}`,
      `Phone:    ${phone ?? "(not provided)"}`,
      `Email:    ${lead.parentEmail}`,
      `Zip:      ${lead.zip}`,
      `School:   ${school ?? "(not provided)"}`,
      `Received: ${received}`,
      "",
      "Contact details only — no assessment result and no child data are included.",
    ];

    // HTML twin so the phone number and email are TAPPABLE on mobile. Plain
    // text auto-linkification is client-dependent; explicit hrefs are not.
    const html = [
      `<p>A parent asked their local S.A.M center to contact them about a full assessment.</p>`,
      `<table cellpadding="4" style="font-family:system-ui,sans-serif;font-size:15px">`,
      `<tr><td><strong>Parent</strong></td><td>${escapeHtml(lead.parentName)}</td></tr>`,
      `<tr><td><strong>Phone</strong></td><td>${
        phone
          ? `<a href="${escapeHtml(telHref(phone))}">${escapeHtml(phone)}</a>`
          : "(not provided)"
      }</td></tr>`,
      `<tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(
        lead.parentEmail,
      )}">${escapeHtml(lead.parentEmail)}</a></td></tr>`,
      `<tr><td><strong>Zip</strong></td><td>${escapeHtml(lead.zip)}</td></tr>`,
      `<tr><td><strong>School</strong></td><td>${
        school ? escapeHtml(school) : "(not provided)"
      }</td></tr>`,
      `<tr><td><strong>Received</strong></td><td>${escapeHtml(received)}</td></tr>`,
      `</table>`,
      `<p style="color:#666;font-size:13px">Contact details only — no assessment result and no child data are included.</p>`,
    ].join("");

    // Subject names the PARENT so the alert is identifiable from a phone's
    // lock screen without opening it.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getResendApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: brandedFrom(),
        to: getLeadNotifyToEmail(),
        subject: `Call this parent — ${lead.parentName} (${lead.zip})`,
        text: lines.join("\n"),
        html,
      }),
    });
    if (!res.ok) {
      deadLetter("resend returned a non-OK status", { status: res.status });
    }
  } catch (e) {
    deadLetter("exception while sending", {
      err: e instanceof Error ? e.message : "unknown",
    });
  }
}
