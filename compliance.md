# Atlas Assessment — Compliance Reference

> **Status**: Authoritative compliance document for v1 MVP. The Compliance Agent reads this on every cycle. Any feature that touches user data, child data, question content, or external communications must be reviewed against this document before merge.
>
> **Scope**: v1 covers COPPA (consumer/parent-driven) and S.A.M. content licensing constraints. FERPA is **out of scope for v1** and will be added in v2 when school customers arrive.
>
> **Disclaimer**: This document is the implementation guide for engineering and the multi-agent system. It is not legal advice. Final compliance review with qualified counsel is required before public launch.

---

## 1. COPPA Compliance Overview

The Children's Online Privacy Protection Act (COPPA) applies to any online service that collects personal information from children under 13 in the United States. Atlas Assessment serves children aged 4–12, so COPPA applies to virtually every user.

**Core obligations** Atlas must meet:
1. Provide clear notice to parents about data collection, use, and sharing.
2. Obtain **verifiable parental consent** before collecting personal information from a child.
3. Give parents access to review their child's information and the ability to delete it.
4. Keep collected information secure and retain it only as long as needed.
5. Not condition a child's participation on disclosing more information than is reasonably necessary.

Atlas's compliance posture is intentionally **stricter than the minimum**. COPPA compliance is positioned as a competitive differentiator (per `userMemories` and the parent-facing one-pager), not a checkbox.

---

## 2. Verifiable Parental Consent — "Email Plus" Method

### Choice of VPC method

COPPA permits several VPC methods (signed consent form, credit card transaction, video conference, government ID, knowledge-based authentication, "email plus"). Atlas v1 uses **"email plus"** because:
- It does not require collecting financial or government identity information from parents.
- It is appropriate for free services (no transaction to anchor a more rigorous method).
- It can be implemented with rigor that exceeds the minimum bar — parent-positioned as a feature, not a friction.

### "Email plus" mechanics

The "email plus" method is a two-step consent process:

**Step 1 — Initial consent**: The parent signs up, reviews the privacy notice, and clicks an explicit consent checkbox before adding any child to their account.

**Step 2 — Confirmation step**: After the initial consent, the parent receives a confirmation email and must take a second affirmative action (e.g., clicking a verification link) to complete the consent.

This two-step structure is what FTC guidance permits as "email plus" for free, internal-use-only services.

### Implementation requirements

- **Consent checkbox** on the signup form must be unchecked by default and must reference the privacy notice. Required language pattern (final wording reviewed by counsel):
  > "I am the parent or legal guardian of the child(ren) I will register. I have read the [Privacy Policy] and I consent to the collection and use of my child's information as described."
- **Verification token**:
  - Generate a cryptographically secure random token (32+ bytes from a CSPRNG).
  - Store **only the SHA-256 hash** of the token in the database. Never store the plaintext token.
  - Token is included in a verification link sent to the parent's email.
  - Token expires 24 hours after generation.
  - Token is single-use — verifying invalidates it.
- **Verification link**:
  - Format: `https://[domain]/verify-consent?token=[plaintext_token]`
  - On click, the server hashes the incoming token and compares against the stored hash using a **timing-safe comparison** function.
  - Expired or invalid tokens return a generic error and offer to resend (no information leakage about whether the token existed).
- **Rate-limited resend**:
  - Parent can request a new verification email at most once every 60 seconds.
  - Maximum 5 resend requests per parent per 24-hour window.
  - Each resend invalidates the prior token.
  - Resend rate-limit state stored server-side, keyed by parent account.
- **Multi-child support**:
  - After the first child is verified, the parent has a **24-hour skip window** during which adding additional children does not require a new verification email. The parent's prior consent applies to all children added in this window.
  - After 24 hours, adding a new child re-triggers the consent flow.
  - This balances UX (a parent registering 2-3 children in one sitting shouldn't get spammed with verification emails) with COPPA rigor.

### School-operator consent extension

Atlas v1 ships with an instructor portal (per `features.md` §6) where S.A.M. center instructors view assessment results for children whose parents have selected that center. COPPA permits this disclosure when the parent has given specific, informed consent at signup. Atlas implements that consent as an extension of the "email plus" flow:

- After the standard COPPA consent checkbox, the parent selects a `home_center_id` from a dropdown of active S.A.M. centers within the tenant. The selection is an explicit affirmative action — no default selection.
- The consent text covers ongoing disclosure of the child's **placement level, strand levels, detected misconceptions, and response patterns** to instructors at the selected center. Raw question text is **not** shared with the center (consistent with §8 licensing constraints) and the center **never** receives child data outside this scope (no child email — children don't have one — no payment info, no behavioral tracking).
- Required language pattern (final wording reviewed by counsel):
  > "I authorize Atlas to share my child's assessment results with instructors at the S.A.M. center I have selected ([Center Name]) for as long as my child is enrolled there. I understand I can change or remove the center at any time from my account settings. The center receives my child's placement, strand-level results, detected misconceptions, and response patterns — never the questions themselves. Removing or changing the center has a 30-day grace period during which I can restore the original center; after 30 days, the prior center loses access."
- Center identity (name and ID) is logged in the VPC audit trail alongside the consent event so the audit record reflects exactly which center the parent authorized.

### Revocation and center change

Parents can change or clear `home_center_id` at any time from account settings. The mechanic mirrors the soft-delete grace in §4:

- **Day 0 (change initiated)**: parent confirms the new center in the UI. Within the existing 24-hour skip window of the original consent, no new email-verification round is required; outside the window, a new verification email is sent for the center change. The system records `prior_center_id` and `center_changed_at` on the affected child(ren).
- **Days 1–30 (grace window)**:
  - Prior-center instructors retain **read-only** visibility into the child's existing assessment data. They cannot author new pedagogical notes for the child.
  - New-center instructors gain full visibility (read + author) immediately.
  - Parent can restore the prior-center association from account settings without a new email-verification round; restoration clears `prior_center_id` and `center_changed_at`.
- **Day 30 (hard revocation)**: a scheduled job clears `prior_center_id`. RLS stops returning the child's data to prior-center instructors on the next request. No further restoration without re-consent.
- **Removing a center entirely** (setting `home_center_id` to null) follows the same 30-day grace, after which the child is invisible to all instructors until a new center is selected and reconfirmed.
- **Pedagogical-note continuity**: notes authored by a prior-center instructor follow the child to the new center for continuity of care. The original `authored_at_center_id` is preserved on each note so the new-center instructor sees the source.

All center-change events are logged in the VPC audit trail (event types: `center_selected`, `center_changed`, `center_restored`, `center_removed`, `center_grace_expired`) with the same fields as the existing VPC audit (parent account ID, timestamp, IP, user agent).

### Audit trail for VPC

Every consent-related event is logged with:
- Parent account ID
- Event type (consent_initiated, verification_sent, verification_clicked, verification_succeeded, verification_failed, consent_revoked)
- Timestamp
- Source IP address
- User agent

Retention: VPC audit logs retained for the **lifetime of the parent account plus 7 years** after deletion, in case of regulatory inquiry.

---

## 3. Data Collection & Minimization

### What Atlas collects

**From parents**:
- Email address
- Password (hashed via bcrypt or Argon2 — never plaintext)
- Name (first name only required; last name optional)
- Selected S.A.M. center (`home_center_id`) — required at signup; covered by the school-operator consent extension in §2
- IP address and user agent (audit logging only)

**From children** (collected via the parent):
- First name (or nickname — parents may use a non-real name)
- Birth year (not full birth date)
- Grade level (optional)

**During assessment**:
- Question responses (answer given, time taken, timestamp)
- Detected misconceptions (derived from responses)
- Placement estimate (derived from responses)

### What Atlas does NOT collect

- Child's last name or full birth date
- Child's email address (children do not have accounts; they use the parent's tablet)
- Child's photo, voice, or biometric data
- Geolocation beyond IP-derived city level (and only for audit logging)
- Behavioral tracking across other websites or services
- Persistent identifiers used for advertising

### Data minimization principle

Every new field proposed in any feature must be reviewed against this question: **"Is this strictly necessary to deliver the assessment or comply with a legal obligation?"** If not, it is not collected. The Compliance Agent has authority to reject feature proposals that introduce non-essential data collection.

---

## 4. Data Retention & Deletion

### Retention policy

| Data type | Retention period | Rationale |
|-----------|-----------------|-----------|
| Parent account data | Until parent deletes account | Required for ongoing service |
| Child profile data | Until parent deletes child or account | Required for ongoing service |
| Assessment responses | 24 months from assessment date | Calibration and growth tracking value declines after 24 months |
| Detected misconceptions | 24 months from assessment date | Same as above |
| Generated reports | 24 months from assessment date | Parents can re-export at any time within window |
| VPC audit logs | Lifetime of account + 7 years post-deletion | Regulatory inquiry protection |
| Email delivery logs | 90 days | Operational debugging only |
| Authentication logs | 90 days | Security investigation |

After 24 months, assessment-level data is **automatically purged** via a scheduled job. Aggregate, anonymized statistics (used for question calibration) may be retained indefinitely, provided they cannot be traced to an individual child.

### Parent-initiated deletion

Parents must be able to:
- Delete an individual child's profile (removes all assessment data for that child).
- Delete their own account (removes all parent and child data).
- Export all of their family's data before deletion (CSV/JSON download).

Deletion requirements:
- Initiated through the parent's account settings UI.
- Requires re-authentication (password or email confirmation).
- Soft-delete with a 30-day grace period during which the parent can restore.
- After 30 days, hard-delete from primary database.
- Backups containing deleted data are purged within 90 days of the hard-delete.
- VPC audit logs are retained per the table above (this is the one exception to deletion — required for regulatory compliance).
- Parent receives confirmation email when hard-delete completes.

### Implementation guardrails

- The Technical Feasibility agent must ensure every table containing parent or child data has a clear deletion path tested in CI.
- Deletion logic should cascade through foreign keys explicitly. No orphan records.
- The Compliance Agent maintains a **deletion checklist** that is verified on every schema change.

---

## 5. Privacy Notice (Parent-Facing)

### Required elements

The Atlas privacy policy must include, in plain language:
1. The operator's name, address, and contact information (Inspirea Labs, with parent-facing email).
2. The types of personal information collected from children.
3. How that information is used.
4. Whether the information is disclosed to third parties (and if so, who and why). For Atlas v1 this **must** explicitly enumerate disclosure to the parent's selected S.A.M. center, including: scope of disclosure (placement, strand levels, misconceptions, response patterns; not raw question text), which roles see the data (instructors only), and the 30-day-grace revocation mechanic.
5. Parental rights: review, deletion, refusal of further collection, **change or removal of the selected center**.
6. Procedures parents follow to exercise those rights, including the path to change `home_center_id` from account settings.
7. Notice that the operator will not require disclosure of more information than is reasonably necessary for participation.

### Accessibility

- Privacy notice must be linked from:
  - Footer of every page
  - Signup form (link from the consent checkbox)
  - Verification email
  - Account settings page
- Must be readable on mobile and desktop.
- A "What this means in plain language" summary at the top is recommended.

### Versioning

- Privacy policy is version-controlled in the repo.
- Material changes (changes to data collection, use, or sharing) trigger a re-consent flow: existing parents must re-consent at next login.
- Non-material changes (typo fixes, contact info updates) are versioned but do not trigger re-consent.

---

## 6. Third-Party Data Sharing

### Sub-processors used by Atlas

Each of these processes user data and must be disclosed in the privacy notice:

| Sub-processor | Purpose | Data shared |
|---------------|---------|-------------|
| Supabase | Database and auth hosting | All user and assessment data |
| Vercel | Application hosting | All user data in transit; logs |
| Anthropic | LLM for misconception classification and report generation | Question responses, misconception data, child first name (for personalized reports) |
| Resend | Transactional email delivery | Parent email, parent name, email content |

### S.A.M. centers (consent recipient, not a sub-processor)

The S.A.M. center selected by the parent at signup receives disclosed data under the school-operator consent extension in §2. This is **not** a sub-processor relationship in the data-protection sense — Atlas is not hiring the center to process data on Atlas's behalf; Atlas is disclosing data to a third party at the parent's specific direction with their informed consent.

Implications for the privacy notice:
- The center must be enumerated by name (the specific center the parent selected), not described generically.
- The scope of disclosure (placement, strand levels, misconceptions, response patterns) must be specified.
- The roles at the center who see the data (instructors only) must be specified.
- The revocation mechanic (change or remove `home_center_id` from settings; 30-day grace; hard revocation at day 30) must be specified.

### Data Processing Agreements (DPAs)

A signed DPA must be in place with each sub-processor before launch. The Compliance Agent maintains a checklist of DPA status.

### LLM-specific guardrails

- **No question content is sent to LLMs for training purposes.** Per S.A.M. licensing, S.A.M. content cannot be used to train AI models. Atlas's LLM provider settings must explicitly disable training-on-customer-data (Anthropic offers this by default for API customers, but it must be verified).
- **No child names are sent to LLMs unless necessary.** For misconception classification, only the question, the correct answer, and the child's response are sent — not the child's name. For report narrative generation, the child's first name is included to personalize the report.
- **No persistent identifiers (e.g., user IDs) are sent to LLMs.** Each LLM call is stateless from the LLM's perspective.

### No advertising or marketing data sharing

Atlas does not share user data with advertisers, data brokers, or marketing platforms. This is a hard policy, not a configuration choice. The Compliance Agent must reject any proposal that introduces ad networks, marketing pixels, or third-party analytics that share user data.

### Permitted analytics

Privacy-preserving analytics (e.g., Plausible, Fathom, or self-hosted Umami) that do not use cookies and do not collect personal information are permitted. Google Analytics, Facebook Pixel, and similar are **not permitted**.

---

## 7. Security Controls

### Authentication

- Passwords hashed with bcrypt (work factor ≥ 12) or Argon2id.
- Password requirements: minimum 12 characters; no other complexity requirements (per NIST 800-63B guidance).
- Failed login attempts rate-limited (5 attempts per 15 minutes per account; exponential backoff after that).
- Session tokens are HTTP-only, Secure, SameSite=Lax cookies.
- Session length: 30 days idle, 90 days absolute.
- Password reset uses the same hashed-token mechanics as the VPC verification flow.

### Encryption

- All traffic over HTTPS/TLS 1.2+. HTTP requests redirect to HTTPS.
- Database encryption at rest (Supabase provides this by default).
- Backups encrypted at rest.
- API keys and secrets stored in Vercel environment variables, never in the repo.
- Verification tokens, password reset tokens, and any similar credentials hashed before storage.

### Access control (Row Level Security)

- Every table containing parent or child data has RLS policies enforcing per-tenant and per-user access.
- Pattern: `parent_id = auth.uid()` on parent-owned data; `parent_id IN (SELECT parent_id FROM children WHERE id = child_id)` on child-owned data.
- The Compliance Agent must produce explicit RLS test cases verifying:
  - A parent cannot read another parent's data via direct API access.
  - A parent cannot read another parent's children.
  - A parent cannot read assessment data for children not on their account.
  - An unauthenticated request cannot read any user data.
- These tests run in CI on every PR.

### Logging and monitoring

- Authentication events (login, logout, failed login, password reset, account lock) logged.
- Data access events (parent reads child data, parent deletes data, parent exports data) logged.
- Admin/internal access to user data logged with justification (planned for v2; v1 has no admin UI).
- Logs reviewed monthly during pilot phase for anomalies.

### Incident response

- Any suspected data breach triggers the incident response process:
  1. Contain the breach (revoke credentials, take affected systems offline if needed).
  2. Assess scope (which users, what data, what timeframe).
  3. Notify affected parents within 72 hours of confirming a breach.
  4. Notify FTC and any state AGs as required by applicable breach notification laws.
  5. Post-mortem within 14 days; remediation tracked to closure.

---

## 8. S.A.M. Content Licensing Constraints

The S.A.M. question bank is licensed content owned by Seriously Addictive Mathematics (Sam Chia / S.A.M. Holdings). Atlas's use of this content is governed by the licensing agreement with S.A.M. The following constraints apply regardless of whether they are explicit in the final license:

### Constraint 1 — No client-side raw question exposure

- Question content (the question text, answer choices, correct answer, and distractor analysis) is **never sent to the browser in bulk**.
- Questions are served **one at a time** via authenticated API calls.
- Each API call returns only the question being shown, never adjacent questions.
- Question metadata that could reveal answers (e.g., misconception tags on distractors) is stripped from the client-bound payload — only the question, answer choices, and an internal question ID are sent.
- The full question bank is never accessible via the public API, only individual questions during an active assessment session.

### Constraint 2 — No LLM training on S.A.M. content

- S.A.M. question content is not used to fine-tune, train, or otherwise improve any LLM, including Atlas's own future models.
- LLM API calls that include question content (e.g., misconception classification) must use providers that explicitly do not train on customer data. Anthropic's API meets this requirement by default; this must be verified during integration and re-verified on any provider change.
- LLM-generated content derived from S.A.M. questions (e.g., report narratives that reference specific questions) is treated as a derivative work and is subject to the same licensing constraints.

### Constraint 3 — Audit logging of question access

- Every time a question is served from the bank, an audit record is written:
  - Question ID
  - Assessment session ID
  - Child ID (pseudonymized — internal UUID, not name)
  - Tenant ID
  - Timestamp
  - IP address
- Audit logs retained for the duration of the licensing agreement plus a buffer (recommend 24 months minimum).
- Logs available for export to S.A.M. on reasonable request, per licensing terms.

### Constraint 4 — No redistribution of question content

- Question content is not exported, copied, or shared outside Atlas's authenticated user-facing experience.
- Parents and instructors viewing reports see references to misconceptions and recommendations, but **not the full text of questions** their child saw. (Showing the questions would expose them to the next sibling who takes the assessment, defeating the diagnostic purpose.)
- A parent's data export (per Section 4) does not include question text — only the responses, derived misconceptions, and placement.

### Constraint 5 — Tenant scoping for content

- The S.A.M. starter library is owned by tenant `inspirea_starter_singapore_math` (per `architecture.md`).
- v1 uses this content directly under the licensing agreement.
- v2 schools that fork this content for customization will be subject to fork-specific licensing terms (to be defined when v2 is built).

---

## 9. FERPA — Out of Scope for v1

FERPA applies when an educational institution shares student records. Atlas v1 does not have school customers — it is direct-to-parent. FERPA therefore does not apply to v1.

When v2 introduces school customers, FERPA will apply to those tenants, and the platform will need to support:
- School-as-data-controller model (school consents on parents' behalf for educational records).
- FERPA-compliant audit logs.
- Data residency options (some schools require US-only data).
- Parent rights under FERPA (access, amendment, complaints).
- Directory information opt-outs.

This is documented in `features.md` (Part B — Atlas Platform v2) and is not a v1 build requirement.

**v1 architectural guardrail relevant to FERPA**: The `tenant_id` field on every table makes per-tenant compliance regimes possible in v2. v1 must not introduce data structures that would block adding a FERPA layer per tenant.

---

## 10. Compliance Review Process

### Pre-merge review

The Compliance Agent reviews every feature proposal before it advances to build. Review criteria:
1. Does the feature collect any new types of data? If so, is it minimization-justified?
2. Does the feature change retention or deletion behavior?
3. Does the feature change who can access what data?
4. Does the feature add a new sub-processor or third-party integration?
5. Does the feature touch the consent flow, the verification flow, or the audit log?
6. Does the feature involve question content, and if so, is licensing constraint compliance preserved?
7. Does the feature change privacy notice content?
8. Does the feature change which centers a parent can select, the scope of data disclosed to a center, or the center-revocation flow? If yes, the school-operator consent text and privacy notice must be re-reviewed.

If any answer is yes, the Compliance Agent produces a **compliance impact assessment** that is reviewed by the founder before build proceeds.

### Pre-launch review

Before the v1 MVP launches publicly:
1. Final privacy policy reviewed by qualified counsel.
2. RLS policies audited (manual penetration test of API), including the center-based instructor access rules and the 30-day grace behavior.
3. Deletion flow tested end-to-end (including backup purging timeline).
4. VPC flow tested with edge cases (expired token, replayed token, rate-limit boundary, multi-child window, center-change re-confirmation, day-30 hard-revocation cutover).
5. Incident response runbook reviewed.
6. DPAs in place with all sub-processors.
7. S.A.M. licensing agreement signed.

### Ongoing review

- Monthly: review of audit logs for anomalies.
- Quarterly: review of sub-processor list and DPA status.
- Annually: full compliance review with counsel.
- On any material change: re-consent flow triggered for existing parents.

---

## 11. Compliance Agent Operating Procedure

The Compliance Agent in the multi-agent pipeline reads this document on every cycle. Its operating procedure:

1. **Read** `compliance.md`, `features.md`, and the current cycle's feature spec.
2. **Identify** any compliance-relevant aspects of the proposed feature using the pre-merge review criteria above.
3. **Produce** a compliance assessment in the cycle's documentation, including:
   - Affirmative statement that the feature complies, OR
   - List of specific compliance concerns and recommended mitigations.
4. **Block** advancement to build if any unmitigated compliance concern exists.
5. **Record** the assessment in `changelog.md` via the Scribe.

The Compliance Agent has authority to halt the cycle. The founder is the only one who can override a compliance hold, and any override is logged with reasoning.

---

## 12. Audit Trail and Config-Version Logging

Derived classifications persisted alongside user data must record the version of the algorithm that produced them. This is what makes responses re-analyzable when the algorithm is recalibrated, and what protects the audit trail when classifications change over time.

This applies to time-flagging in v1 and generalizes to misconception detection and placement-engine outputs as those land. The Compliance Agent enforces the version-on-row pattern on every new derived classifier.

### v1 scope — time-flagging

Every response row stores the four flagger-computed fields plus the config version active at write time:

| Column | Purpose |
|---|---|
| `responses.expected_time_sec` | Computed T_expected for the (level, format, tags) combination |
| `responses.time_ratio` | `actualTimeSec / expectedTimeSec` |
| `responses.time_flag` | Per-response classification: `INVALID` / `TOO_FAST` / `TOO_SLOW` / `NORMAL` |
| `responses.time_flag_config_version` | `TimeFlagConfig.version` active at flag-time |
| `responses.used_fallback` | True iff the row's tags came via `withFallbackTags` rather than DB-backed columns |

Session-level rollup (`assessment_sessions.session_time_flag` + `assessment_sessions.time_flag_summary` JSONB) carries the same `time_flag_config_version` so historical sessions stay coherent under newer norms.

### The version-on-row pattern

For any classifier whose outputs are persisted on user data:

1. Outputs include the algorithm version that produced them.
2. Versions are stamped per-row at write time, never derived from the environment (build hash, git SHA) at read time.
3. Newer algorithm versions don't overwrite older outputs; they produce new outputs alongside the old ones, or the parent row records both.
4. Per §4 retention: classifier outputs follow the same 24-month retention as the response data they're derived from.

### Fallback observability

The `used_fallback` field on responses, and the `fallback_count` / `fallback_ratio` aggregates on the session summary, are **diagnostic audit fields**, not user-facing data. They surface when the system has substituted defaults for missing item-tag data — a content-pipeline quality signal the Compliance Agent monitors during pilot to flag upstream tagging gaps.

In production the fallback path should rarely fire: Migration A1 enforces the four norm tags as NOT NULL on the `questions` table, so content reaching the system at all has been tagged. A persistent non-zero `fallback_ratio` across sessions indicates a code path that bypasses the row read — investigate as a content-pipeline bug rather than dismissing as edge-case telemetry.

### Re-analysis and recalibration

When synthetic norms are replaced with empirical norms (≥200–300 responses per item), historical rows are **not** silently re-flagged. They remain stamped with the synthetic version. New responses receive the empirical version. Re-analysis is an explicit audit operation: query the relevant rows by `time_flag_config_version`, re-run the flagger under the new config, and produce a comparison report. Original rows are not modified; the audit trail is preserved.

---

## 13. Open Items Pending Resolution

These are not blockers for engine/schema work but must be resolved before public launch:

1. **Final privacy policy text** — requires legal counsel review.
2. **S.A.M. licensing agreement** — pending Sam Chia conversation.
3. **DPAs with sub-processors** — Supabase, Vercel, Anthropic, Resend.
4. **Counsel selection** — identify qualified privacy counsel for pre-launch review.
5. **Insurance** — cyber liability and E&O insurance scoped before public launch.
6. **State-specific privacy laws** — California (CCPA/CPRA), Colorado (CPA), Connecticut (CTDPA), Virginia (VCDPA), and other state laws may impose additional requirements. Counsel review covers this.
7. **International users** — v1 targets US-only. If non-US users sign up, GDPR and other international laws may apply. v1 should geo-block non-US signups OR include the additional legal layer; decision pending.
