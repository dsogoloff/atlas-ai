import "server-only";

// Pilot-center notification for a short-test follow-up lead (Resend
// transactional email). DEFAULT-OFF + FAIL-SOFT: when LEAD_NOTIFY_LIVE is not
// 'true' this no-ops, so the lead still persists and nothing is sent / no money
// is spent until the founder configures Resend + flips the flag (mirrors the
// misconception-classifier / report-narration LLM gates). Never throws — a
// notification failure must not fail the parent's submit.
//
// DATA SCOPE: parent contact + zip + child's school only (Tier 1/2 lead data).
// NO diagnostic result is included. Uses the Resend HTTP API directly via fetch
// (no SDK dependency).

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

export interface FollowUpLeadNotification {
  /** Null when the school field is gated off (LEAD_SCHOOL_FIELD_LIVE). */
  schoolName: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  /** Parent zip/location (required on the form). */
  zip: string;
}

export async function notifyFollowUpLead(
  lead: FollowUpLeadNotification,
): Promise<void> {
  if (!isLeadNotifyLive()) return; // gated off → no send, no spend

  try {
    const lines = [
      "New short-test follow-up lead (manual triage):",
      "",
      `Child's school: ${lead.schoolName ?? "(not collected)"}`,
      `Parent: ${lead.parentName}`,
      `Email: ${lead.parentEmail}`,
      `Phone: ${lead.parentPhone ?? "(not provided)"}`,
      `Zip/location: ${lead.zip}`,
      "",
      "Lead/contact data only — no assessment result is included.",
    ];
    // Subject carries the school when present, else the zip — never an empty
    // "— " / "— null" tail when the school is blank or gated off.
    const subjectTag = lead.schoolName?.trim() || lead.zip;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getResendApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: brandedFrom(),
        to: getLeadNotifyToEmail(),
        subject: `New assessment lead — ${subjectTag}`,
        text: lines.join("\n"),
      }),
    });
    if (!res.ok) {
      console.error("[followUp] notify failed", { status: res.status });
    }
  } catch (e) {
    console.error("[followUp] notify threw", {
      err: e instanceof Error ? e.message : "unknown",
    });
  }
}
