import "server-only";

// Pilot-center notification for a short-test follow-up lead (Resend
// transactional email). DEFAULT-OFF + FAIL-SOFT: when LEAD_NOTIFY_LIVE is not
// 'true' this no-ops, so the lead still persists and nothing is sent / no money
// is spent until the founder configures Resend + flips the flag (mirrors the
// misconception-classifier / report-narration LLM gates). Never throws — a
// notification failure must not fail the parent's submit.
//
// DATA SCOPE: parent contact + child's school only (Tier 1/2 lead data). NO
// diagnostic result is included. Uses the Resend HTTP API directly via fetch
// (no SDK dependency).

import {
  getLeadNotifyFromEmail,
  getLeadNotifyToEmail,
  getResendApiKey,
  isLeadNotifyLive,
} from "@/lib/env";

export interface FollowUpLeadNotification {
  schoolName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  bestTimeToReach: string | null;
}

export async function notifyFollowUpLead(
  lead: FollowUpLeadNotification,
): Promise<void> {
  if (!isLeadNotifyLive()) return; // gated off → no send, no spend

  try {
    const lines = [
      "New short-test follow-up lead (manual triage):",
      "",
      `Child's school: ${lead.schoolName}`,
      `Parent: ${lead.parentName}`,
      `Email: ${lead.parentEmail}`,
      `Phone: ${lead.parentPhone ?? "(not provided)"}`,
      `Best time to reach: ${lead.bestTimeToReach ?? "(not provided)"}`,
      "",
      "Lead/contact data only — no assessment result is included.",
    ];
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getResendApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getLeadNotifyFromEmail(),
        to: getLeadNotifyToEmail(),
        subject: `New assessment lead — ${lead.schoolName}`,
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
