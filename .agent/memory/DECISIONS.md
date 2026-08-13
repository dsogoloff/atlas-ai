# DECISIONS LOG (most recent first)

Durable, dated decisions. ⚑ = business/strategy/legal/privacy/pricing — requires Dimitri
to change. Unmarked = technical, reversible by Claude Code with cause.

## 2026-08-13

* **Staff assessment alerts reuse the follow-up-lead transport and its gate rather than introducing a second email path (PR #211, lane/staff-assessment-alerts, 2026-08-13).** `src/lib/staffAlerts/notify.ts` posts to Resend with the same `RESEND_API_KEY`, the same verified `LEAD_NOTIFY_FROM_EMAIL` sender (tenant display name applied via `src/lib/branding`), and the SAME `LEAD_NOTIFY_LIVE` flag as `followUp/notify.ts`. One switch turns on all outbound center email; there is deliberately no second on/off flag to get out of sync. The only new knob is the recipient, `STAFF_ALERT_TO`, which DEFAULTS IN CODE to `parents@samnewyork.com` — chosen so the feature ships with no Vercel env action, unlike the lead notifier's `required()` addresses.

* **"Account created" is EMAIL-CONFIRM success, not signup (PR #211, 2026-08-13).** The alert fires in `/auth/confirm` after `verifyOtp` succeeds, because an unconfirmed signup is not an account. Once-per-account is guarded on the durable VPC trail: a pre-existing `verification_succeeded` row for that parent means the account was already confirmed and already announced, so a re-sent confirmation link cannot double-send. The guard read happens BEFORE the audit insert. Chosen over a new column because the trail already records exactly this fact.

* **"Assessment completed" fires from the existing funnel-emit seam, not from `closeSession` (PR #211, 2026-08-13).** The alert sits alongside `emitTestCompleted` / `emitPlacementCreated` at the two FRESH-submit terminal paths (engine-terminated, bank-exhausted). That seam already carries the project's once-per-session guarantee: a sequential retry is rejected `409 session_completed` before either path, and a concurrent duplicate of the final answer loses the INSERT on 23505 and returns via `duplicateResult()`, which emits nothing. An atomic claim inside `closeSession` (a `.neq("status","COMPLETED")` conditional update) was considered and rejected — it would add a bespoke mechanism to a hot, heavily-scripted seam for a race the existing discipline already covers.

* ⚑ **Staff-alert payloads are a typed allowlist, enforced by a runtime test (PR #211, 2026-08-13).** Every field that leaves the box is enumerated on `AccountCreatedAlert` / `AssessmentCompletedAlert` and hand-copied into the email body — never a spread of an account/child/session object. Account alert: parent name, parent email, admin link. Completion alert: parent name, child GRADE only, student-record link. NEVER: score, placement level, strand mastery, misconception flags, item responses, report narrative, child name, child DOB/birth year. `notify.test.ts` passes a "careless caller" object carrying `childName`/`birthYear`/`overallLevel`/`score`/`strandMastery`/`misconceptions`/`narrative` and asserts the serialized request body contains none of them. Mirrors the attribution-event / HubSpot Contract A whitelist discipline.

* **The dead `#schedule-a-free-class` CTA becomes an INTERIM mailto, and the scheduler swap stays with the HubSpot lane (PR #212, lane/director-cta-mailto, 2026-08-13).** `CTA_LINKS.scheduleFreeClass` now opens `mailto:parents@samnewyork.com` with the director-call subject URL-encoded and no body prefill. Button labels are unchanged. The env-gated `SAM_SCHEDULER_URL` swap and its relabel ("Book a call with the SAM Center Manager") are Contract B and were deliberately NOT implemented here — this lane only replaces a dead anchor for the beta.

* **Single-center hardcoding is recorded as a known limit, not a bug (`todo.md`, 2026-08-13).** Both the director contact link and the staff-alert recipient point at one inbox. Vitalis directs the ONE current center, not future ones. When a second center exists, the parent selects a center first and BOTH resolve from the resolved `home_center_id` rather than a global constant.

* **Dead controls are REMOVED, not hidden (PR #213, lane/dead-link-cleanup, 2026-08-13).** Every `href="#"` anchor and every handler-less icon button on the Add-Child and parent-dashboard chrome was deleted rather than disabled or `display:none`'d — a control that does nothing when clicked reads as a broken app in the pilot. Each is to be reintroduced at the point its destination actually exists. `src/` now contains zero `href="#"` anchors. The one exception is the dashboard empty-state help link, which had a real destination available and was wired to the support inbox via a new `CTA_LINKS.accountSetupHelp` (same inbox as `questionsTalkToUs`, with a subject so staff can distinguish a stuck first-time setup).

* ⚑ **The on-screen COPPA disclosure is now the counsel PDF's text, verbatim, and CI enforces it (PR #214, lane/coppa-onscreen-copy, 2026-08-13).** `/coppa` had been rendering Stitch-derived placeholder copy that said something DIFFERENT from `public/legal/coppa-disclosure-v1.pdf` — the document its own Download button serves. Sections 1–10 plus the two opening paragraphs are transcribed into `src/app/(auth)/coppa/disclosure-copy.ts`; `page.tsx` owns layout only. Only STRUCTURE is ours (the PDF's lists render as `<ul>/<li>`; PDF line wrapping is dropped as a page-width artifact). `disclosure-copy.test.ts` extracts the text from the real PDF asset at test time and asserts every rendered string appears in it (71 assertions), so an agent "fixing a typo" in counsel wording fails CI rather than shipping a page that contradicts the parent's download. `src/lib/consent/text.ts` was NOT touched.

* **The AI-processing disclosure is kept and renumbered to section 11 (PR #214, 2026-08-13).** Safeguard C2 (M2 readiness) is app-authored and is NOT part of coppa-disclosure-v1. It is preserved, marked in code as ours, and placed AFTER the counsel sections so adding it never renumbers them. Its placement after counsel's section 10 consent affirmation is flagged for the founder/counsel, as is the fact that counsel's section 10 says "By checking the box below" while `/coppa` has no checkbox (the binding per-child consent lives at `/add-child`, Model B). The counsel wording was not altered to match the screen.

* **Two unsupported claims were dropped with the placeholder body (PR #214, 2026-08-13).** The Stitch "Bank-grade security protocols" badge asserts a security posture the counsel text does not (section 8 says "reasonable administrative, technical, and organizational safeguards"); its "No Advertising" pair was redundant with section 4 in counsel's own words. Also removed: the hardcoded "Updated: October 24, 2023" sub-header — Stitch filler, and wrong. A false effective date above counsel text is worse than none, so the sub-header now identifies the disclosure VERSION. No new parent-facing wording was authored to replace any of it.

* **`clampPlacementToServedCeiling` extracted so the backfill runs the LIVE function, not a copy (PR #215, lane/reclamp-backfill-script, 2026-08-13).** Moved from `handler.ts` to `src/lib/responseSubmit/clampPlacement.ts`, which has no `server-only` / `next/server` imports and therefore loads under `tsx`. `handler.ts` re-exports it, so every existing import site and `clamp-placement.test.ts` are unchanged. The alternative — a second implementation inside the script — was rejected because a backfill that drifts from the live clamp silently produces values the app would not.

* **The re-clamp backfill is dry-run-by-default, two-key to write, and read-checked (PR #215, 2026-08-13).** It floors pre-#206 sessions' stored `current_estimate.overall_level` to the highest level actually served, writing that ONE field (strand_levels and confidence pass through untouched; no other table). Writing requires `--apply` AND `--confirm`; the target is explicit (`--target=local|prod`) with prod credentials read only from the gitignored `.env.prod.local` and an abort if target and URL disagree in either direction. Per session it verifies COMPLETED status, a parseable estimate, non-empty responses, every served question resolving with a level, and that the proposed value is a FIXED POINT under a second clamp — any failure is reported SKIPPED and never written. The UPDATE is guarded on `status=COMPLETED` and re-runs converge.

* **Open / unconfirmed (needs Dimitri) — PRs #211–#215 (2026-08-13).** (a) Merge all five (independent; #212 and #213 touch different regions of `cta-links.ts`). (b) Flip `LEAD_NOTIFY_LIVE=true` when staff alerts should actually send — one switch that also enables the existing lead notifier; no other env var required. (c) Three counsel-facing COPPA questions from #214: real effective date, section-11 placement, and the "check the box below" wording vs. a page with no checkbox. (d) Whether and when to run the #215 backfill — it has NOT been run against prod or local; review the prod DRY RUN table first. (e) After any re-clamp run, regenerate narration for affected sessions already shown to a parent (not built; the script only prints a reminder). (f) Optional: align the dashboard's "Schedule a free class" label, which now opens the director mailto.

## 2026-08-10

* **Per-tenant white-label built as a branding CONFIG layer, not a S.A.M-NY hardcode (PR #209, lane/tenant-white-label, 2026-08-10).** `src/lib/branding/` introduces a `TenantBranding` contract + a registry of skins; every customer-facing brand string, asset path, meta/OG string and email sender identity resolves from it at render. Two skins ship: `sam-new-york` (default; the live tenant) and `atlas` (Inspirea's own product brand, RETAINED — Atlas is not globally removed). Resolution is per-deployment via `NEXT_PUBLIC_TENANT_BRAND` rather than per-request, because one deployment serves one tenant (app.samnewyork.com), the brand must be identical across server components / client components / static metadata, and a per-request lookup would force every branded page dynamic. `brandingForTenantSlug()` exists for call sites already holding a DB `tenants.slug`. Adding a franchisee skin = a file in `src/lib/branding/tenants/` + a registry line + the env var; no component change. This implements the already-locked ARCHITECTURE.md cross-cutting guardrail #5, so it is not a new architectural decision — it is that guardrail finally being honoured.

* **Internal Inspirea chrome is explicitly OUT of the white-label scope (2026-08-10).** The `(admin)` route group and `/dev` keep Atlas branding and do not read the branding config. The compliance requirement is a SKIN of the S.A.M New York customer surface, not global removal of Atlas branding. The guard test excludes those two directories by design.

* ⚑ **The operator/data-processor disclosure MOVES to legal fine print; it is not deleted (PR #209, 2026-08-10).** Rendered on `/coppa` from `branding.legal.processorDisclosure`. This is the ONE customer-facing place an Inspirea reference legitimately remains — it is a compliance statement, not branding. The current string is a clearly-marked COUNSEL-GATED placeholder; final wording comes from the founder after counsel review and must not be invented or "improved" by an agent. The guard test asserts the slot still exists and still references Inspirea, so a future rebrand cannot silently scrub it.

* **The VERSIONED consent text was deliberately NOT touched by the rebrand (2026-08-10).** `src/lib/consent/text.ts` drives the per-child consent version recorded at `/add-child` (Model B). Editing it changes consent semantics, which BUSINESS_RULES puts behind Dimitri/counsel — out of scope for a branding lane. The rebrand touched only the DISPLAY surfaces. The one consent-adjacent string that did change (the signup authorization line, "I authorize {productName} to share…") is flagged in PR #209 for counsel confirmation because it names the authorizing counterparty.

* **Brand mark enforced as the exact two-dot form `S.A.M` by an automated guard (2026-08-10).** `src/lib/branding/customer-surface.guard.test.ts` fails on any rendered `Atlas`/`Inspirea` outside the fine-print slot, on any three-dot `S.A.M.`, and on a vacuous file walk (asserts >20 files scanned). Three rendered three-dot occurrences were fixed: the root meta description, how-it-works prose, and the instructor recommendation note. The guard was verified non-vacuous by injecting a violation, observing the failure with `path:line`, then reverting — a compliance guard that cannot fail is worse than none.

* **Mascot art used AS-IS; no image tooling (2026-08-10).** `public/mascot/{waving,thinking,celebrating}.png` are byte-unchanged in PR #209. Only `alt` text was rebranded. Prior AI renders corrupted the S.A.M wordmark on the mascot's shirt (e.g. "Mathemstics"); the standing rule is that these files are never regenerated, upscaled, or passed through any AI image tooling.

* **Open / unconfirmed (needs Dimitri) — PR #209 assets and final strings (2026-08-10).** (a) Favicon/app icon: `src/app/favicon.ico` is still the Next.js default; `faviconHref` points at `/favicon.ico` so the S.A.M mark is a drop-in file swap. Not derived from the logo — cropping a wordmark makes a poor icon and brand art is not run through tooling. (b) OG share image: none exists, no `og:image` is emitted; supply 1200×630 and it is one config line. (c) Final S.A.M NY copy for meta description (placeholder is deliberately WEAKER than what it replaced — dropped "diagnostic"/"pinpoints" to stay inside BUSINESS_RULES §Claims), copyright line, report footer, email sender name. (d) Counsel wording for the processor disclosure and the consent authorization line. (e) Supabase Auth email templates (confirm signup, password reset) carry product branding but are configured in the Supabase dashboard, not in-repo — they still need the S.A.M New York treatment there. Nothing in PR #209 is blocked on any of these.

## 2026-06-29

* **SAM-L1-Q05 label-leak fixed by re-cropping to include the worksheet label row; format defect fixed by converting NUMERIC_ENTRY→MULTIPLE_CHOICE (PR #202, lane/fix-l1-q05-group-label-leak, 2026-06-29).** Two defects in one item (geometry / level 1A / content_id l1-geometry-1 / served as Q8 in the L1 short test). (1) Label leak: "Group A / Group B" labels were baked into the stem while the curated image showed the two animal boxes unlabelled. Root cause: migration 20260614120001 stmt 2 put the labels in the stem, and l1_crop.py cropped below the worksheet's label row. Fix: re-cropped to include the label row (source page-04; stray "5." whited out); sam-l1-q05.png re-minted. (2) Format defect: item was NUMERIC_ENTRY with a LETTER answer ("B"), rendering a numeric keypad (inputMode="decimal") un-enterable on touch — fails the live serve-and-submit gate. Fix: converted to MULTIPLE_CHOICE, options ["Group A","Group B"], correct_index 1, tap-to-answer; stem cleaned to "In which group does it belong?"; correct_answer removed. Unchanged: short_test_eligible, banding (1A), content_id, level, image_alt/image_required/image_path. Files: scripts/conversion/l1_crop.py (M); supabase/seed.sql (M); supabase/migrations/20260629120000_fix_l1_q05_group_label_leak.sql (A, forward, idempotent). Verify bar GREEN (pnpm test, tsc, lint); seed↔migration parity guard passes. PR #202 OPEN; nothing applied to prod.

* **Residual observation recorded (context only, not a decision): NUMERIC_ENTRY items keyed to a letter/word answer are a latent serve-gate hazard on touch (2026-06-29).** SAM-L1-Q05 was the found instance. No claim that others exist; no sweep commissioned.

* **Open / unconfirmed (needs Dimitri) — PR #202 prod follow-ups not yet executed (2026-06-29).** After PR #202 merges: (a) apply migration 20260629120000 on prod to convert the row from NUMERIC_ENTRY to MULTIPLE_CHOICE; (b) re-upload corrected l1/sam-l1-q05.png to prod question-images bucket (`pnpm convert:upload-activation-images:prod`). Both require prod creds and explicit go-ahead; cannot auto-execute.

* **`supabase db reset` unblocked: 12 held L0 overlay rows corrected to `short_test_eligible=false`
  at insert; generator and guard hardened against re-emission (PR #199,
  lane/fix-l0-overlay-short-invariant, 2026-06-29).** The `questions_inactive_not_short_eligible`
  CHECK (added in PR #191) fires per-row at statement time. The generated L0-overlay INSERT in
  `seed.sql` + mirror migration `20260616120100_l0_overlay_load.sql` inserted 12 HELD rows
  (`is_active=false`) with `short_test_eligible=true` in the VALUES tuple, violating the CHECK.
  Affected rows: SAM-L0A-Q03/Q05/Q06/Q07/Q10/Q13/Q14/Q15, SAM-L0B-Q03/Q04/Q06, SAM-L0C-Q04.
  Three fixes: (1) DATA — tuples flipped `false,true` → `false,false` in seed.sql and the mirror
  migration; (2) GENERATOR — `apply-l0-overlay.ts` now clamps `short_test_eligible` to `false`
  whenever `is_active` is `false` on both insert and update emit paths; (3) GUARD —
  `short-eligible-invariant.ts` gained Form-B detection for the positional VALUES-tuple form
  (`…, false, true, …`); previously only the literal `short_test_eligible = true` assignment form
  was matched (blind to the generated L0-overlay form — same VALUES-tuple blind-spot class as the
  PR #198 image-derivation bug). New unit tests in `src/lib/conversion/short-eligible-invariant.test.ts`.
  Verify bar GREEN (1440 tests, tsc, lint). Nothing applied to prod.

* **Decision: the `questions_inactive_not_short_eligible` CHECK is correct and stays; held rows must
  be inserted with `short_test_eligible=false`; `short=true` is set only at activation time when
  `is_active` is also flipped true (PR #199, 2026-06-29).** The CHECK is a per-row constraint
  enforced at statement time (not deferred). The canonical activation pattern — setting both
  `is_active=true` and `short_test_eligible=true` atomically in a single UPDATE — satisfies the
  constraint and must be followed for all future activations. The static invariant guard must cover
  the positional VALUES-tuple form used in generated INSERT blocks, not just literal `= true`
  assignment forms.

* **Image required-set is now derived from DB runtime truth, not seed text (PR #198,
  lane/content-completeness-verifier, 2026-06-29).** `activation-image-set.ts`
  `activeImagePaths()` was regex-based against `seed.sql` and matched only the inline-JSON
  `"image_path":"…"` form. It was blind to the `content || jsonb_build_object('image_path',
  v.image_path)` UPDATE-from-VALUES form used for L1 items (seed.sql lines 2654 and 4156).
  Decision: replace the seed-text approach with a DB query (`requiredImagePaths(supabase)`)
  that reads `image_path` values directly from the live questions table. The required set
  is now whatever the target DB actually contains — no parsing of seed SQL. New
  `scripts/conversion/minted-image-paths.ts` (`extractMintedPaths`: top-level + per-tile)
  mirrors the runtime `mintImage.ts` path exactly. `--check` mode stays offline (SOURCE_MAP
  disk pre-flight). CI unit test: `src/lib/conversion/minted-image-paths.test.ts`.
  Rationale: seed-text parsing is fragile; the DB is the authoritative source of truth for
  what images a running deployment needs.

* **Content-completeness adopted as a verified bring-up dimension (PR #198, 2026-06-29).**
  New `scripts/conversion/prod-bringup/12-verify-content-completeness.ts`
  (`pnpm convert:verify-content`) checks two sub-dimensions against the target DB:
  (1) images — every minted path resolves to a bucket object; (2) gradeability — real
  `toClientQuestion` + content-only `judgeAnswer` probe on every active question. Exits
  nonzero on any gap; designed to run against local or prod (`--prod`). Verified live
  against prod: images FAIL(4) — l1/sam-l1-q05/10/12/19.png absent — gradeability 0 throws.
  This verifier closes the class of misdiagnosis that produced the "answer_type NULL" false
  lead (that field does not exist in code or data).

* **Root cause of prod L1 serve-500 confirmed: 4 images never uploaded (PR #198,
  2026-06-29).** SAM-L1-Q05/Q10/Q12/Q19 had `content.image_path` set in the live prod row
  but their objects were absent from the prod `question-images` bucket.
  `mintQuestionImage(createSignedUrl)` threw "Object not found" → 500. The missing uploads
  were caused by the now-replaced seed-text regex in the uploader. Fix in code is in PR #198
  (OPEN); the actual prod upload is founder-gated (see NEXT_ACTIONS PARKED item). Nothing
  applied to prod this session.

* **Open / unconfirmed (needs Dimitri) — prod L1 image upload not yet executed
  (2026-06-29).** After PR #198 merges, Dimitri must run
  `pnpm convert:upload-activation-images:prod` to push the 4 missing L1 images to the prod
  `question-images` bucket, then `pnpm convert:verify-content --prod` to confirm resolution.
  Cannot auto-resolve; requires prod creds and explicit go-ahead.

## 2026-06-28

* **Full answer-key audit completed across all 9 booklets (L0A/L0B/L0C/L1-L6); committed
  answer-key-manifest + CI override-allowlist guard adopted as the recurrence control
  (PR #192, lane/l4-q17-answer-key-audit, 2026-06-28).** Licensed key PDFs are untracked
  and absent from CI; a full per-answer CI re-parse is not feasible. Recurrence guard
  adopted: a committed per-item manifest (`audit/answer-key-manifest.json`, 217 entries,
  id-set derived from seed) + a CI test (`answer-key-manifest.test.ts`) that fails if a
  new/edited question has no manifest entry and fails if the manifest records a key
  contradiction without an explicit override allowlist entry. 187 active items audited:
  165 MATCH, 2 confirmed overrides, 10 UNGRADEABLE_FROM_KEY (open/observational young-band
  key cells), 10 NO_KEY_ENTRY (blank key cells). ZERO accidental wrong answers; every active
  booklet has a covering key. Key PDFs for ALL levels now present in
  scripts/conversion/source/**. Level 2 has a key but no worksheet docx.

* ⚑ **Two key overrides CONFIRMED BY FOUNDER to stand (PR #192, 2026-06-28):**
  (1) SAM-L3-Q17 — stored answer 25 vs printed key 3. Picture-graph question: (9-4)x5=25.
  The printed key is wrong; the bank answer is correct. Founder confirmed.
  (2) SAM-L0B-Q06 — stored accepted {7,8} vs key "colour 7 and 6". Founder reinterpretation
  of a contradictory worksheet. Both overrides are recorded in the manifest override
  allowlist; the CI guard will fail any future key contradiction not in the allowlist.

* ⚑ **FOUNDER-ACKNOWLEDGED — 7 L6 fraction/decimal items are COMPUTED, not key-verified
  (PR #192, 2026-06-28).** SAM-L6-Q09/Q10/Q11/Q12/Q13/Q15/Q16 have blank key cells.
  Answers are mathematically derived (fraction/decimal computation); logged in the manifest
  with an L6-awareness note. Also 3 L1 items (Q07/Q13/Q15) have no key entry. These are
  not defects but are tracked explicitly as unverified-from-key.

* **SAM-L4-Q17 authored and activated (PR #192, lane/l4-q17-answer-key-audit, 2026-06-28).**
  Row was absent from local AND prod. TEXT_ENTRY question: "name a pair of perpendicular
  lines"; answer "AF and GC" (founder-confirmed from the now-present L4 key); order-tolerant
  accepted set (AF=FA, GC=CG, slot order). Level 4A; strand geometry; content_id
  l3-geometry-2; image l4/sam-l4-q17.png; is_active=true; short_test_eligible=true.
  Engine extension: TEXT_ENTRY judging now honors content.accepted_answers (mirrors
  NUMERIC_ENTRY any-of; server-side only) in src/lib/responseSubmit/correctness.ts.
  Mirrored in seed.sql + migration 20260628120000; image wired in activation-image-set.ts.
  Verify bar GREEN.

* **Bank source invariant enforced at DB and CI levels (PR #191, lane/bank-source-invariant-fix,
  MERGED, 2026-06-28).** Fixed local seed half-flagging where is_active=false rows could have
  short_test_eligible=true at source. Added CHECK constraint
  `questions_inactive_not_short_eligible`; added a short-eligible-invariant parity test.
  Now in ATLAS-ASSESSMENT.

## 2026-06-27

* **Prod bring-up schema analysis completed as analysis-only artifacts (PR #181,
  lane/prod-bringup-schema-analysis, 2026-06-27).** Analysis-only session; no prod
  connection, no writes, no DB commands. PROD = atlas-assessment (project ref
  `ntfaqzueppqymfkefadm`), the LIVE DB — not atlas-assessment-2 (dead). Prod was
  hand-applied via Studio (no CI); schema is behind repo migrations; the
  `schema_migrations` log may be stale. All artifacts trust `information_schema`/
  `pg_catalog`, not the migration log. Two confirmed prod gaps carried in from ATLAS:
  `questions.short_test_eligible` column missing; `question-images` storage bucket
  missing. Deliverables: `scripts/conversion/prod-bringup/01-inspect-prod-schema.sql`
  (100% read-only inspection — enum types+values, questions columns, serve/report tables,
  assessment_sessions columns, constraints, active question counts by level, taxonomy
  row count, bucket + object count); `scripts/conversion/prod-bringup/02-catchup-additive-schema.sql`
  (ADDITIVE-ONLY idempotent catch-up; no DROP, no destructive ALTER, no data; each
  statement tagged with its source migration; ordered types→tables→columns/FK→constraints);
  `scripts/conversion/prod-bringup/README.md` (bring-up order, migration→object coverage
  table, excluded non-additive contingencies). Migrations covered in the catch-up script:
  20260507000000, 20260610170000/20260614120000/20260615120000, 20260616120000,
  20260616120050, 20260525000001, 20260525000003, 20260611090000, 20260621130000,
  20260510000000, 20260612090000, 20260613120000, 20260525000000/20260526000000,
  20260625120400. Key non-additive finding flagged but NOT in catch-up script: migration
  `20260511000200` recasts the `strand` enum uppercase→lowercase; if prod still has the
  old uppercase enum the bank will not load and a separate reviewed destructive recast
  migration is required. The inspection step 1 reports prod's actual strand values.
  Also excluded: question-images bucket (step 2); taxonomy reference rows + question-bank
  rows (step 4 data). No L5/L6-specific schema (L5/L6 is data-only; 5A/6A are base
  `half_grade_level` values). Verify GREEN: 1371 tests / 105 files, tsc 0, lint 0 errors
  (2 known warnings), seed↔migration parity PASS (81 migrations; artifacts live under
  scripts/, not supabase/migrations/, so parity/CI are unaffected). Codex manual/skipped
  (relay unauth). All prod bring-up actions are founder-gated on prod service_role creds
  + explicit go-ahead; manual Studio/uploader path throughout.

* **Open / unconfirmed (needs Dimitri) — prod strand enum case (prod bring-up, 2026-06-27).**
  The inspection script will report whether prod's `strand` enum values are lowercase
  (correct, matches current bank) or uppercase (legacy, would block bank load). If
  uppercase, a non-additive destructive recast migration must be written and reviewed
  before the bank load can proceed. Cannot auto-resolve; inspection output needed.

## 2026-06-26

* **Migration version collision resolved by renaming the later file, not the canonical anchor
  (PR #174, lane/fix-migration-version-collision, 2026-06-26).** Two migration files held
  version prefix 20260625120000 after PRs #169 and #170 merged independently on the same day.
  Decision: keep `20260625120000_l5l6_booklet_reband.sql` unchanged — it anchors the
  120000–120300 batch and is referenced by siblings (`load_missing_rows`, `q27_activate`
  comments) and the seed.sql mirror header. Rename the later admin file to the next free
  slot: `20260625120000_admins_tenant_view.sql` → `20260625120400_admins_tenant_view.sql`
  (git mv; rename only; content unchanged). The admin migration had no seed mirror and no
  version-keyed references; no later migration depends on the admins table; DDL order is
  preserved. Zero duplicate version prefixes remain across all 81 migration files. Verify
  GREEN: 1359 tests / 104 files, tsc 0, lint 0 errors (2 known warnings), seed↔migration
  parity PASS (81 migrations). Codex manual/skipped (relay unauth).
  Recurring lesson (3rd incident): parallel `lane/*` branches independently pick timestamp-
  style version prefixes and can collide when two lanes pick the same minute and both merge.
  The `schema_migrations` PK is on version, so a duplicate breaks `supabase db reset` only
  AFTER both merge (each lane's own reset passes in isolation). No automated guard exists
  in CI; see TECHNICAL_DEBT.md.


* **Answer log now resolves tap/id-set answers to readable labels via a dedicated
  `humanize.ts` module; raw JSON never surfaces to parents (PR #171,
  lane/answer-log-humanize, 2026-06-26).** Root cause: `answers/page.tsx` stringified
  the raw `answer_given` JSONB for tap- and id-keyed formats (CLICK_IMAGE_SINGLE/MULTI,
  SELECT_MULTIPLE, IMAGE_ORDERING, VISUAL_MATCHING, MULTI_BLANK, EQUATION_SET). Fix: new
  `src/app/(parent)/report/answers/humanize.ts` maps each format's stored id(s) back to
  the matching option or tile label using the question's served content; MC/numeric/text/
  drag-drop are passed through unchanged. The function never throws and never returns raw
  JSON. `fetchItemReview` in the instructor/admin path does NOT select `answer_given` and
  is unaffected. Verify GREEN 1346 tests.

* **Narration self-heal guard: broaden the regeneration predicate to cover the no-row
  case, then prevent a regen loop with an at-most-once sentinel row (PR #173,
  lane/l4-narrative-fix, 2026-06-26).** Root cause: when `attemptNarration` throws on a
  transient `callSonnet` failure at session completion, the catch-all returns without
  persisting any `report_narrations` row; every subsequent page load re-enters the
  generation path, potentially looping or silently showing a generic-lede report forever.
  Fix: `shouldRegenerateNarration` in `src/lib/report/narration/refresh.ts` now triggers
  a regen when (a) there is no cached row AND (b) the assembled content carries strand
  data (new predicate `narrationRowIsSelfHealAttempted`). At-most-once guard: if the
  triggered regen fails, `report/page.tsx` persists a `status:"failed"` sentinel row
  (`failedNarrationMarker`) so the next request sees a row, `narrationRowIsSelfHealAttempted`
  returns true, and the page settles into the data-only fallback instead of looping.
  Existing strand-suppressed rows are never clobbered. Rationale for the sentinel-row
  pattern: it piggybacks on the existing `report_narrations` table with no schema change,
  is idempotent, and keeps the fallback deterministic after one regen attempt per session.
  Verify GREEN 1346 tests.

## 2026-06-25

* **Admin scope implemented as ADDITIVE RLS SELECT policies + a SECURITY DEFINER tenant
  resolver, not by altering instructor policies (PR #170, lane/admin-tenant-view,
  2026-06-25).** A new `app_current_admin_tenant_id()` SECURITY DEFINER function
  (auth.uid()-scoped, ACTIVE-gated, mirrors `app_current_instructor_id` in shape)
  serves as the tenant resolver for admins. New SELECT policies on children /
  assessment_sessions / pedagogical_notes filter on
  `tenant_id = app_current_admin_tenant_id()`. These are ADDITIVE (Postgres ORs
  permissive policies): instructors retain their existing center-scoped policies
  unchanged; admins gain tenant-wide scope via the new policies; a non-admin caller
  gets NULL from the helper, which matches no rows. No existing instructor policy was
  touched. Rationale: additive policies require no migration of existing rows, preserve
  regression-safety for the instructor path, and the NULL-safe helper means the new
  policies are inert for any caller that is not an active admin.

* **The instructor surface (roster, stats, shared student detail) is REUSED for admins,
  not duplicated (PR #170, 2026-06-25).** A new `resolveStaff(client)` function returns
  `{kind:'instructor'|'admin', ...}` from a single query path; both routes call the same
  `fetchRoster` (which gains `centerName` + center-sort), the same shared
  `roster-view.tsx` component (new, with an optional Center column), and the same
  `/instructor/student/[childId]` detail page. The shell accepts optional `roleLabel` /
  `homeHref` props (labeled "Admin" for the admin route; defaults preserve existing
  instructor callers). Duplication avoided by parameterizing at the component/prop level
  rather than copying routes. `resolveInstructor` is kept for instructor-only write paths
  (note authoring).

* **Admins are read-only: no note authoring, no usefulness rating, no report-viewed
  tracking (PR #170, 2026-06-25).** The DB has no admin write policies (only additive
  SELECT policies were added); the UI additionally hides the add-note form, the
  post-note usefulness rating widget, and the `instructor_report_viewed` tracking call
  when `resolveStaff` returns `kind==='admin'`. `NotesPanel` gained a `readOnlyMessage`
  prop for the read-only state. Report content, strand bars, misconceptions, and item
  review render for both instructor and admin. Compliance is unchanged (no parent PII
  exposed; licensed question content gated).

* ⚑ **LOCKED — L5/L6 content bands at BOOKLET LEVEL, not difficulty or per-question Level
  column (PR #169, lane/l5l6-booklet-reband-load-images, 2026-06-25).** Founder-locked
  decision: SAM-L5-* rows band to 5A (L5 booklet floor); SAM-L6-* rows band to 6A (L6
  booklet floor). The A/B difficulty suffix (derived from the per-question "Level" column
  in the source worksheet) is dropped and collapsed to the booklet floor. Content_id (skill
  sub-strand node) is untouched. This SUPERSEDES the already-merged
  `20260623150000_l5l6_releveling` migration, which had banded by the per-question Level
  column (L5 review→4A/4B, L6 review→5A/5B, A/B preserved for non-review items). The
  superseding re-band is in migration `20260625120000_l5l6_booklet_reband.sql`. Rationale:
  L5/L6 review content bands at the BOOKLET LEVEL, not at the difficulty/question-granularity
  level. The A/B collapse is reversible via one UPDATE if the decision changes. This decision
  resolves the "Level review (founder/picker decision)" follow-up from the
  l5l6-conversion-status-2026-06-23 session.

* **L5/L6 conversion: 6 skipped rows loaded; 15 inactive image rows wired; SAM-L5-Q26
  options corrected (PR #169, 2026-06-25).** Six gradeable rows that the prior pipeline run
  had skipped are now loaded at booklet-level band (5A/6A): SAM-L5-Q01 (place-value MC),
  SAM-L5-Q10 (order fractions DRAG_DROP), SAM-L5-Q16 (order decimals DRAG_DROP),
  SAM-L5-Q18 (decimal→fraction MC), SAM-L6-Q22 (unit conversion NUMERIC), SAM-L6-Q27
  (fraction>50% MC). All six are short_test_eligible=true (Short Test column = Y in the
  source key; key-driven, not manual). Ordering items authored as DRAG_DROP. Separately,
  single-stimulus image_path values were wired for 15 inactive L5/L6 image rows (L5
  Q08/Q14/Q25/Q26; L6 Q14/Q15/Q16/Q19/Q25/Q26/Q30/Q31/Q32/Q33/Q34); those rows remain
  is_active=false (activation-ready once images are uploaded). SAM-L5-Q26 corrected: the
  loaded row had fabricated options C/D that do not appear on the worksheet; worksheet shows
  only figures A and B, so options are ["A","B"] with correct_index 1 (answer key = B). All
  content source-verified against worksheet pages + answer-key PDFs + Question Summary this
  session. SAM-L5-Q27 HELD: 4 options are each a separate shape image; no single stimulus
  exists; per-tile minting for image-option MC not yet in serveQuestion.ts. SAM-L6-Q18
  excluded (text-only, cube volume, already active). Three migrations + seed.sql mirror
  (78 total); parity PASS. Verify GREEN 1336 tests / 102 files, tsc 0, lint 0 errors.
  Codex manual/skipped (relay unauth).

* **SAM-L5-Q27 activated after founder supplied a combined 4-shape crop (follow-up commit on
  PR #169 lane, 2026-06-25).** SAM-L5-Q27 had been HELD in the prior commit because its four
  answer choices were each a separate shape image (circle/hexagon/heart/rectangle) with no
  single stimulus, and per-tile image minting for image-option MC is not yet in
  serveQuestion.ts. The founder supplied a single combined crop at
  `scripts/conversion/source/5/L5-27.png` showing all four shapes with in-image labels
  (1)-(4), resolving the per-tile problem: Q27 is now a standard single-stimulus MC whose
  text options reference the in-image labels. Migration `20260625120300_l5_q27_activate.sql`
  + seed.sql mirror block (`l5-q27-activate`, appended after `l5l6-image-path-wire`): UPDATE
  sets content (image_path `l5/sam-l5-q27.png` + sharpened image_alt) and is_active=true.
  Stem/options/correct_index already correct and unchanged: "Which of the shapes has the most
  lines of symmetry?"; options ["(1)","(2)","(3)","(4)"]; correct_index 0 (circle has
  infinitely many lines of symmetry). Banding 5A; short_test_eligible=true; content_id
  l4-geometry-3 (Symmetry node) — all already set by prior migrations, untouched. SOURCE_MAP
  entry `l5/sam-l5-q27.png` added in `scripts/conversion/activation-image-set.ts` (l5 now
  5 keys). Source-verified: worksheet page-13 + answer-key PDF + new L5-27.png crop. Verify
  GREEN 1336 tests / 102 files, tsc 0, lint 0 errors, seed↔migration parity PASS (79
  migrations), convert:upload-activation-images --check PASS. Codex manual/skipped (relay
  unauth). NOTE: unlike the other 15 image rows (is_active=false, activation-ready), Q27 is
  now LIVE (is_active=true); founder must upload l5/sam-l5-q27.png to the private
  question-images bucket BEFORE or with `supabase db reset` post-merge, or the active row
  will 500 at serve time.

* **`purge-staging.ts` utility added for clearing stray conversion-staging/ bucket renders
  (PR #169, 2026-06-25).** `scripts/conversion/purge-staging.ts` + `convert:purge-staging`
  npm script. Founder-run; dry-run default; --apply flag to execute deletes. Targets the 15
  full-page renders under `question-images/conversion-staging/` that were uploaded during
  prior pipeline runs and are now superseded by the curated per-question crops.

* ⚑ **Pre-narration gap closed with a bounded polling interstitial (founder Option 1)
  (PR #166, lane/young-band-narration-render, 2026-06-25).** Root cause: `report_narrations`
  is written ~8s after session completion by a background job; a report opened in that
  window had no narration row and rendered the pre-narration shell (generic strand lede,
  no Strengths/Areas). Fix: `src/app/(parent)/report/page.tsx` (Server Component) reads the
  narration row first; when a freshly-completed session has no row yet, `isNarrationPending`
  in new `narration-pending.ts` returns true (bounded by `NARRATION_WAIT_BOUND_MS` = 30s
  after `session.completed_at`). While pending, a brief `<PreparingReport>` interstitial
  renders (`preparing-report.tsx`) which issues a client-side `router.refresh()` to poll.
  Once the row lands the full report reveals. On failure or after the 30s bound the existing
  generic-lede report is shown — never an indefinite spinner. New `nowMs()` helper isolates
  the impure clock read from the Server Component render scope (react-compiler purity).
  Founder was presented two options; chose Option 1 (interstitial + refresh polling) over
  Option 2 (server-side polling before render). Design constraint: no indefinite spinner;
  any narration timeout degrades gracefully to the existing fallback path.

* **Railed-placement fix applied as a served-ceiling clamp at the `assembleReportContent`
  layer, shared by report label and narration prompt (PR #166, 2026-06-25).** Root cause
  CONFIRMED: `engine.ts` `placementEstimate` computes `overallLevel = LEVELS[argmax(avg
  posterior)]` across the full 0A…8B axis. A floor/sparse all-correct run has no ceiling
  items to pull the posterior down, so the argmax rails to the top index (8B), producing
  "S.A.M Level 8" for a 0A child. That railed level also propagated into the narration
  prompt via `assembleReportContent → generateReportNarration`. Decision: apply the fix
  as a ceiling clamp at the `assembleReportContent` placement-resolution layer
  (`clampLevelToServedCeiling(level, ceiling)` in `src/lib/report/assemble.ts`), bounding
  the resolved level by the highest level actually served (`questions.level`, newly
  selected). This single choke point corrects both the placement label and the narrated
  level with no engine recalibration. NO change to `engine.ts`. Normal multi-level runs
  where a ceiling item was served are entirely unchanged (the clamp only ever LOWERS a
  railed estimate). Raw engine level continues to drive `taxLevelCode` (sub-strand
  grid/radar), so visuals are unchanged. Rationale for not fixing in `engine.ts`: the
  engine's posterior is mathematically correct for the items it was asked — the issue is
  that an under-stimulated (floor/sparse) run has not enough information, and the
  appropriate correction is to cap the reported output to what was actually measured,
  not to recalibrate the model.

## 2026-06-24

* **Confirmed merge state (session start):** PRs #150, #153, #155, #156, #157, #158 all
  MERGED to ATLAS-ASSESSMENT; origin head `e69671b`.

* **Grades 7/8 disabled in add-child intake with "(coming soon)"; `halfGradeToTaxLevelCode`
  clamps >L6 to l6 (PR #159, lane/intake-grades78-disable-l6clamp, 2026-06-24).** This
  change had been dispatched in a prior session but no PR was returned; recreated this
  session. The add-child grade selector now greys grades 7 and 8 and renders them
  "(coming soon)" non-selectable, preventing intake of children at levels the platform
  does not yet serve. `halfGradeToTaxLevelCode` previously returned null for 7A/7B/8A/8B,
  which downstream caused empty `strand_mastery` rows in the report; it now clamps to `l6`
  as the ceiling. Function exported; unit test added. No migration. Verify GREEN (CI SUCCESS).

* **Low-level reports (0A/0B/L1/L2) now populate strand section via engine-strand fallback
  when content_id resolution yields zero sub-strands (PR #160,
  lane/report-low-level-strand-fix, 2026-06-24).** Root cause: `strand_mastery` is keyed
  on the V2026 sub-strand axis resolved through `questions.content_id →
  tax_content.sub_strand_id`. The bridge backfill migration (20260525000003) only tagged
  l1–l6 + 3 of 6 engine strands; L0 rows are outside its range; seeded SAM-L2 items are
  deliberately unmapped. When no response resolves a sub-strand, every `strand_mastery` row
  is `no_data` and the report renders an empty radar, no bars, and a generic lede —
  observable for 0A/0B/L1/L2 while 0C/L3-L6 populate. The fix adds a fallback: when
  `subStrandByQuestion.size === 0`, the engine 6-strand axis (`questions.strand`, always
  populated) is mapped onto V2026 sub-strands (`number_sense` &
  `operations_algorithms` → `whole_numbers`; `fractions_decimals` → `fractions`;
  `geometry`/`measurement`/`data_statistics` 1:1). The gate (`size === 0`) preserves
  existing behavior for all working levels. 0A + L1 regression tests added. Note: the
  readiness/placement-card suppression for 0A (controlled independently by `readiness.ts`)
  was left untouched and queued for Dimitri to confirm on preview. No migration. Verify
  GREEN (CI SUCCESS).

* **Short-test picker is now sub-strand-aware (AXIS-B breadth-first before deepening)
  (PR #161, lane/short-test-strand-coverage, 2026-06-24).** Root cause: the picker
  operated on the 6-value engine strand (AXIS A) only; it was blind to the 12 V2026
  sub-strands (AXIS B) that the report measures. Within a strand the picker chose purely
  by nearest difficulty, so it repeatedly deepened one sub-strand and skipped uncovered
  siblings (e.g. an L6 test left Geometry/Ratio/Algebra/Statistics unassessed). Fix: a
  new sort stage in the short picker sorts eligible candidates PRIMARY by sub-strand
  coverage (an item whose AXIS-B sub-strand has not yet been served this session sorts
  first) and SECONDARY by the existing nearest-difficulty order; this spreads breadth
  across sub-strands before deepening, within the existing 10/15 bounds. The
  `short_test_eligible` flag, the band, and the AXIS-A router are all untouched. NULL
  `content_id` is treated as already-covered, so items without a sub-strand tag degrade
  gracefully to the prior difficulty-only sort. New file
  `src/lib/questionPicker/subStrandCoverage.ts`; wired through handler → pickForSession →
  short picker; types updated; new + updated tests. Verify GREEN locally (1284 tests); CI
  pending at session close. Cross-lane follow-up required: after PR #161 merges, the
  CONVERSION lane must regenerate the served-order crosswalk (served ORDER changes).

* **Technical debt noted: report-visible sub-strand coverage (both #160 fallback fidelity
  and #161 breadth) is bounded by the sparse content_id backfill.** A fuller content_id
  backfill onto the V2026 taxonomy is a separate lane; queued in TECHNICAL_DEBT.md.

## 2026-06-23

* **In-question footer mascot extended to ALL tiers (PR #146, lane/inquestion-mascot-all-tiers).**
  The `QuestionShell` footer mascot (thinking idle + per-submit celebrate hop) rendered only on
  K_4; the G5_8 branch had no footer, so older kids saw no in-question mascot. Now both tiers'
  footers host `<QuestionMascot>` — G5_8 gets a mascot-ONLY footer (no "Read carefully!" text,
  preserving its measured chrome). New `questionMascotIsLively(reduceMotion)` in `lib/mascot.ts`
  is the in-question motion policy: animated for EVERY tier, gated ONLY by reduced motion; the
  bookend `mascotIsLively` (Welcome/Completion, K_4-only) is left UNCHANGED. Kept by design: the
  hop is correctness-agnostic (correctness is never sent to the child client), in-flow poses stay
  thinking + celebrating (waving/completion stay on the bookend screens), reduced-motion users
  get the static thinking image. Real `public/mascot/*.png` reused; no content/bank change, no
  migration. +5 tests. Verify GREEN 1237/92.

## 2026-06-22

* **Short-test length cap confirmed live (10–15); the crosswalk model corrected (PR #144,
  lane/short-test-hardcap-15).** Audit result: the LIVE short test ALREADY enforces soft floor
  10 / HARD cap 15 — `responseSubmit.decideTermination` uses `shortTestShouldTerminate` for
  every short session (the `short` context is always present in prod; `shortTest.test.ts` pins
  `hardCap === 15`). The earlier "served up to 25" was a STALE CROSSWALK-SCRIPT model:
  `build-served-crosswalk.ts` replayed with the generic engine stop (`shouldTerminate` /
  MAX_QUESTIONS = 25) + generic router, which overstated served length once PRs #139/#140
  widened the eligible pools past 25. Fixes: the crosswalk now replays the real short-test stop
  + coverage router (regenerated `served-crosswalk.{md,json}` show served 10–12 across all
  cohorts, deep pools L1 35 / L2 52 / L3 38); the unreachable no-anchor short fallback hardened
  to also cap at 15; stale "short uses shouldTerminate unchanged" comments corrected.
  Comprehensive length untouched (target 20/30, hardCap 26/36). Progress denominator confirmed
  ≤15 (`computeMaxQuestions` = `min(15, eligible pool)`). No content/bank change, no migration.
  Verify GREEN 1232/91.

* **Short-test sampling band changed to {previous, current} booklet (PR #139,
  lane/young-band-sampling-band).** The short test sampled the PREVIOUS booklet ONLY for every
  level, so a 0B child got an all-0A test identical to a 0A child's. Per the intended design the
  band is now {previous, current} above the floor and {0A} only at the 0A floor (0B→{0A,0B},
  0C→{0B,0C}, grade1→{0C,1A,1B}, … grade5→{4A,4B,5A,5B}). Helper renamed
  `previousBookletHalfGrades` → `shortTestLevelBand`; all three short-path call sites updated
  (pick band, eligible-count discovery, `max_questions` ceiling) so they stay consistent. The
  floor collapses naturally (previous==current==0 → {0A}); KA/KB still fold into the 0C booklet
  ordinal. **SCOPE: this changes the served band for EVERY non-floor level, not just the young
  band — the prior behavior was uniformly previous-only (a grade-5 child sampled grade 4 only;
  now grade 4 + grade 5).** Comprehensive picker UNAFFECTED (it anchors on measured level via
  `levelLockHalfGrades` / the per-pick comprehensive plan, never this function). No content/bank
  change, no migration. Verify GREEN 1232/91. **This supersedes the 2026-06-22 Task C(c) verdict
  that framed L0A==L0B as a content-bank identity issue: the picker band was the cause; PR #138
  (CONVERSION lane, `l0ab-content-identity-2026-06-22.md`) separately confirmed the bank content
  is not duplicated.** Follow-up DONE: PR #140 (lane/crosswalk-regen-band-20260622, MERGED)
  regenerated the served-order crosswalk artifacts (`served-crosswalk.{md,json}`) against the
  new band — per-QA-cohort eligible counts widened old→new: Zero-A 17→30, Zero-C 13→21,
  L1 8→35, L2 27→52, L3 25→38, L4 13→18.

* **Parent-instructions screen restored (default-ON) with FINAL founder-approved copy
  (PRs #135 + #136).** `ENABLE_PARENT_INTRO` flipped to default-ON (`!== "false"`, mirroring
  BETA_WELCOME_LIVE) so the age-dependent screen renders by default (read-aloud ≤ grade 2 /
  no-assistance ≥ grade 3 — logic was already implemented, only gated off). ⚑ The DRAFT copy in
  `src/lib/proctoring/copy.ts` was replaced verbatim with the founder-approved FINAL wording
  (#136). Read-aloud now shows only the boxed summary (the italic "Doing any of these…" note was
  dropped); no-assistance gained a concept-help point (parent may explain a unit conversion,
  then let the child do the math); button is "Start the assessment". §2.4 discipline retained;
  any future wording change is parent-facing claims language → still gate to Dimitri.

* **Short-test progress bar reflects a per-session ceiling, not a fixed 25 (PR #135).** /start
  now stamps `max_questions` on the wire: short = `min(SHORT_TEST_CONFIG.hardCap 15, eligible
  pool size in the previous-booklet band)`; comprehensive = engine `MAX_QUESTIONS`. So a thin
  band shows "of up to 8" (exhaustion-bound) and a deep band "of up to 15" (cap-bound). Computed
  best-effort in the start handler (discovery failure falls back to the cap), threaded through
  types→api→reducer→`computeProgressDisplay`. Display-only; never blocks the start path.

* **Beta-welcome relocated to a once-only onboarding step; add-child grade made required
  (PR #135).** The beta-welcome screen no longer gates every assessment — it shows ONCE between
  COPPA and child setup via a localStorage flag (`atlas_beta_welcome_seen`) on `/add-child`
  (a beta notice, not a legal record → no DB column). "Current grade" on add-child is now a
  required selection (anchors the picker band); the DB column stays nullable, so this is a
  UI-only requirement and compliance.md §3 data-minimization at the storage layer is unchanged.

* **Task C picker verdicts — confirm-only, no code change.** (a) Short-test L1 = 8 is GENUINE
  bank exhaustion (the previous-booklet eligible pool is exactly 8), not a stop-short bug —
  matches the prior served-order crosswalk. (b) The short-test sampling level band is FIXED for
  the session (never widened on interim results); question order is RE-DERIVED adaptively each
  pick. (c) L0A==L0B is NOT a picker mis-map (0A/0B are distinct booklet ordinals with disjoint
  filters); if they render identically it is a content-bank identity issue → flagged for the
  CONVERSION lane (ATLAS lane does not touch bank content).

* **Duplicate-migration version 20260620120000 collision verified already resolved on
  trunk — no new work this session.** The 20-commit fast-forward already present at session
  start contained the rename: `l0a_taxonomy_activation` → `20260620120001`; `follow_up_leads_optin_zip`
  kept on `20260620120000`. No duplicate version prefixes remain. All references (seed mirror,
  `regen-seed-activations.ts`) confirmed consistent. Session item closed as confirm-only.

* **Young-band missing stimuli fixed by faithfully cropping the rendered worksheet pages
  (PR #134, lane/young-l3-qa-defects-20260622, 2026-06-22).** Missing or incorrect stimulus
  images for SAM-L0A-Q11, SAM-L0B-Q02, SAM-L0C-Q13, and SAM-L0B-Q03 were resolved by
  cutting crops directly from the Word-rendered PDF pages of the corresponding S.A.M.
  worksheets using the committed reproducible generator
  `scripts/conversion/gen_young_qa_stimuli.py` (Word→PDF→PNG→crop). No images were
  re-drawn, reconstructed from memory, or approximated. SAM-L0C-Q13 also received a
  verbatim stem re-author from the worksheet and a choice reduction to two options
  (Friday/Fryday). Three DB rows updated via migration `20260622120000`; SAM-L0B-Q03
  received only a SOURCE_MAP re-point (no DB change). Source PNGs are gitignored; founder
  uploads to the private `question-images` bucket post-merge.

* **SAM-L0C-Q04 fact-family fixed by re-authoring EQUATION_SET → MULTI_BLANK; the
  "EQUATION_SET prefill gap" framing was over-scoped (2026-06-22, superseded same day).**
  Initial read: the row rendered blank because `EquationSet.tsx` seeds all cells empty (no
  given/prefill concept), so it was parked as a cross-cutting "prefill" lane. On founder
  re-scoping, the correct fix is far simpler and needs NO new concept: MULTI_BLANK already
  renders an inline `tokens` template (text + blank slots). Re-authored content so the
  GIVEN operands are visible `text` tokens (3+6 / 6+3 / 9-3 / 9-6) and each result is its
  own `blank`; per-blank numeric grading reuses the same answers the EQUATION_SET
  `canonical` held (9, 9, 6, 3). Migration `20260622130000` + seed mirror (overrides the
  earlier EQUATION_SET activation block, last-write-wins), folded into PR #134. Lesson:
  prefer an EXISTING format that already fits the worksheet shape over inventing a new
  cross-cutting capability for a single QA item.

## 2026-06-21

* **Short-test outcome persisted as structured jsonb on session close (PR #119,
  lane/picker-short-outcome, 2026-06-21).** New `ShortTestOutcome` type in
  `src/lib/shortTest/outcome.ts` captures `measured_level`, `intake_level`,
  `pass_band` (clean/mixed/weak/insufficient — 8-graded-item floor; clean ≥0.8 /
  mixed 0.5–0.8 / weak <0.5 / insufficient <8 graded), `clean_pass_ratio`,
  `strand_map{correct,seen,ratio}`, and `seen_item_ids`. Persisted to new nullable
  jsonb column `assessment_sessions.short_test_outcome` (migration `20260621130000`; no
  seed mirror) on session close via `persistShortTestOutcome` in `responseSubmit/handler.ts`
  (gated to short sessions). Readiness line in `report/readiness.ts` requires ≥8 graded
  AND clean ratio; 0A current level suppressed. Pass-band thresholds are canonical in
  `outcome.ts`. Verify GREEN 1220 tests / 91 files; tsc 0; lint 0 errors (2 known warnings);
  build OK. Codex manual/skipped (relay unauth).

* **Short picker replaced with stratified coverage-first draw (PR #119).** New
  `src/lib/engine/shortTest.ts` implements a coverage-first router (~2 questions per strand,
  fewest-served then max-variance fill) with a coverage+count stop condition (10–15
  questions; no SE gate). In-scope strands are those with ≥1 active `short_test_eligible`
  item in the previous-booklet band (new `picker.discoverShortEligibleCounts`). Floor clamps
  to pool availability so thin pools still terminate in range. Wired into
  `responseSubmit` decideTermination/buildRouter for the short path; short picker filter +
  previous-booklet band unchanged.

* **Comprehensive picker anchors on measured short-test level with pass_band global split
  (PR #121, lane/picker-comprehensive, 2026-06-21).** `loadComprehensiveOutcomeContext`
  reads the child's latest completed short session's `ShortTestOutcome`; derives the
  BOOKLET_LEVELS index of `measured_level` as the anchor (neutral grade when no outcome).
  Global split by pass_band in new `src/lib/engine/comprehensiveSplit.ts`: clean 30/50/20
  over M-1/M/M+1; mixed 50/30/20 over M-1/M/M-2; weak below-weighted (floor-find seed);
  insufficient/none neutral 50/30/20. `planNextOffset` steers each pick to the
  largest-deficit offset. Per-strand override `strandAdjustedSplit` redistributes each
  strand's offsets by its `strand_map` ratio. Per-pick plan in new
  `src/lib/questionPicker/comprehensiveLevelPlan.ts` maps offset to target±1 booklet band
  + difficulty centred on the planned booklet (thin pool falls through to a neighbour; no
  starvation). `replay.replayStrandOffsetCounts` attributes actual served level back to an
  offset so the split self-corrects. `seen_item_ids` always excluded
  (`PickContext.extraExcludedIds`, merged in both handlers). Comprehensive length 20–30,
  cap 30; G5_8 `hardCap` 36→30 (K_4 stays target 20 / cap 26). `NextQuestionRequest` /
  `PickerRequest` gain optional per-pick `levelBand`; `pickForSession` honours it for
  comprehensive; short + legacy paths untouched. No new migration (uses PR #119 column).
  Verify GREEN 1250 / 94 files; tsc 0; lint 0 errors (2 known warnings); build OK.

* **Bank-aware ceiling/floor and floor-find walk-down added (PR #122,
  lane/picker-floor-ceiling, 2026-06-21).** New `picker.discoverAvailableBooklets` →
  `availableOrdinals` limits the split to booklets the active bank actually serves
  (CEILING = no reach above highest available; FLOOR = walk-down stops at lowest loaded
  booklet). Floor-find for `weak` pass_band: hands level to adaptive engine over
  `floorFindBand` (at-and-below available band) so it walks down M-1→M-2→… until solid.
  Wired in `responseSubmit` router + sessionStart first pick. `evaluateFloorFind` sets
  `manual_placement_needed = true` when engine settled at/below the lowest loaded booklet
  AND child is still not solid (< `FLOOR_FIND_SOLID_RATIO` 0.5). New nullable boolean
  column `assessment_sessions.manual_placement_needed` (migration `20260621140000`; no seed
  mirror), persisted on comprehensive completion (`persistComprehensivePlacement`; no-op for
  short). `src/lib/report/manualPlacement.ts` carries the manual-placement copy line
  (founder-locked verbatim) and §2.4 DRAFT lines (`floorFoundLine`, `ceilingLine`) pending
  Dimitri confirmation. Verify GREEN 1260 / 94 files; tsc 0; lint 0 errors (2 known
  warnings); build OK. Codex manual/skipped (relay unauth). Post-merge requires
  `supabase db reset`.

* ⚑ **Open / unconfirmed (needs Dimitri) — §2.4 draft parent copy in
  `src/lib/report/manualPlacement.ts` (PR #122).** `floorFoundLine` and `ceilingLine` are
  parent-facing outcome claims drafted this session but NOT confirmed by Dimitri. These
  sentences explain to a parent what it means when the assessment hit the bottom or top of
  the question bank. They must not render until Dimitri approves the exact wording. Batched
  in PR #122 body as gate item (1). Follow-up lane (render + instructor surface) is also
  blocked on this decision — gate item (2) in PR #122.
* **Short-eligible / comprehensive over-set audit (L0A–L4) — key parity VERIFIED
  COMPLETE; over-set ceiling is source-key capped (PR #123, lane/short-eligible-overset-audit,
  commit `a084d0e`, off trunk `a2c0b28`).** Task 2 result: ZERO key-parity gaps — every
  active, source-Short=Y row is already `short_test_eligible=true` (the
  `l1-l4-short-eligible-backfill` migration 20260619080000 + young-band L0 authoring both
  honor the key exactly). Zero over-flags (no row is STE while source `Short≠Y`). No UPDATE
  applied. Task 3 result: no strand×booklet cell reaches the ~15–18 target (max = booklet-2
  number_sense = 13). Per-booklet active&STE pools: 0A=18, 0B=13, 0C=8, booklet-1=27,
  booklet-2=25, booklet-3=13, booklet-4=5. Ceiling is set by source Short=Y counts, not by
  mis-flagging. Structural finding: each worksheet's questions band across MULTIPLE booklets
  (L1→0C+1, L2→1+2, L3→1+2+3, L4→2+3+4), so per-worksheet Short=Y totals overstate
  per-booklet reserve. Validation: source Short=Y docx counts exactly match backfill IN-lists
  (L1 17/L2 21/L3 20/L4 25); per-booklet pools reproduce the prior served-crosswalk exactly.
  Three source-Short=Y rows (`SAM-L3-Q04`, `SAM-L3-Q23`, `SAM-L4-Q17`) have no DB row
  (converter-skipped) — recoverable only by re-authoring. Reusable helpers committed:
  `overset-state.mts`, `_extract_short_keys.py`, `build-overset-matrix.mjs`,
  `bank-final-state.json`. Licensed source tree + `source-short-keys.json` gitignored.
  Verify GREEN 1196/89, tsc clean, lint 2 known warnings. Two items PARKED for Dimitri:
  thin-booklet content decision + ATLAS comprehensive-picker architecture question.

* **Trunk head advanced past `ce9a676`.** Local memory cited a stale head; trunk reached
  `a2c0b28` during the over-set audit work, then `c4a67e8` once PR #123 merged — the current
  ATLAS-ASSESSMENT head (PR #119 Picker Calibration PR1 is also merged, at `c3ad839`).

## 2026-06-20

* **CORRECTION — the Atlas taxonomy / `content_id` codes / level design / banding are
  an INTERNAL Atlas scheme, NOT S.A.M.-controlled.** A false belief had propagated
  across sessions that Sam Chia / S.A.M. owns or must approve Atlas's curriculum
  structure, and that NULL-`content_id` items were "SAM-gated / blocked on a taxonomy
  code." This is wrong. **The truth:** (a) Sam Chia's only role is content **licensing**
  — he supplied the S.A.M. placement worksheets and approved their use; the only
  curriculum signal from Sam is each worksheet's last-page "Concepts and Skills" + "Topic"
  table. (b) Sam does NOT own/define/approve Atlas taxonomy, `content_id` codes, level
  design, or banding; there is no external "locked S.A.M. taxonomy." (c) `content_id`
  codes are an internal scheme created by Code during conversion; a NULL `content_id` is
  an internal tagging job we finish, never externally gated. (d) The ONLY genuine S.A.M.
  dependencies are content-licensing (granted) and franchisor/pilot approval (granted).
  Corrected across repo memory/instruction + audit/conversion notes in
  lane/correct-sam-taxonomy-belief. The previously-"gated" L0 items were finished
  internally in PRs #103–#105 (new nodes l0a-geometry-5/6, l0c-geometry-4,
  l0c-whole_numbers-6; 0B position → existing l0b-geometry-1). Supersedes any earlier
  "needs founder/S.A.M. taxonomy decision" wording.

## 2026-06-18

* **Tasks 1 & 3 verified already-implemented on trunk; no fabricated changes shipped.** The 2026-06-18 session brief asserted "wire the short picker live" (Task 1) and "lead-notification email send path" (Task 3) were outstanding. Both were verify-confirmed done as of trunk `ae281dd` (trunk had advanced past PR #81, lane/short-test-readiness-report, merged, which itself followed commits f877285 + a23097c). Task 1: the short path already routes through `src/lib/questionPicker/pickForSession.ts:67` with `short_test_eligible` filter + previous-booklet band; both live handlers call pickForSession; `test_type` defaults to "short" at sessionStart handler:238; dispatch + filter covered by existing tests. Task 3: `src/lib/followUp/submit.ts` already calls `src/lib/followUp/notify.ts` (Resend/fetch, `LEAD_NOTIFY_LIVE`-gated, fail-soft). Both shipped confirm-only (Task 1) or test-only PR #82 (Task 3) rather than fabricating redundant changes.

* ⚑ **COPPA consent flow now binds each consent row to a versioned disclosure PDF + content hash (consent-of-record), and `LEAD_SCHOOL_FIELD_LIVE` default flipped ON per counsel clearance (PR #84, lane/coppa-consent-of-record, 2026-06-18).** Key changes: (a) `CONSENT_TEXT` in `src/lib/consent/text.ts` updated to counsel-approved checkbox attestation (version "2026-06-18.v2"); single source used by both the rendered form and the `add-child` action (killed rendered-vs-persisted drift). (b) `docs/legal/COPPA_Disclosure.docx` committed with two edits vs counsel original (§2 removed "school name" from not-collected list; §10 placeholder filled with privacy@samnewyork.com); served PDF `public/legal/coppa-disclosure-v1.pdf` generated via `tools/legal/build_coppa_pdf.py`; `/coppa` "Download PDF" button wired. (c) New `consent_records` columns `disclosure_version` + `disclosure_content_sha256` (migration `20260618120000_consent_disclosure_asset.sql`); add-child action captures `DISCLOSURE_VERSION` ("coppa-disclosure-v1") + PDF sha256 (`a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea`) on every row; `src/lib/consent/text.test.ts` recomputes the PDF hash and asserts equality (drift guard). (d) `LEAD_SCHOOL_FIELD_LIVE` default flipped from `=== "true"` to `!== "false"` (ON by default) in `src/lib/env.ts`; "school not collected" statement removed from disclosure and env; `.env.example` updated. Verify GREEN 1170 tests / 84 files, tsc 0, lint 0 errors (2 known warnings), build GREEN. Codex manual/skipped. Requires `supabase db reset` after merge (2 nullable columns; pre-existing rows unaffected). Three batched gate items in the PR body for Dimitri review.

* **Mascot welcome screen — tap-to-start replaces auto-advancing loading screen (PR #83, lane/mascot-welcome, 2026-06-18).** New `src/app/(child)/assessment/components/Welcome.tsx` (playful "Welcome!" lettering + waving mascot + one red "Let's go!" button; tier-aware). Child's tap is now the sole releaser of `startConfirmed` in `assessment-client.tsx`; the start effect + network call only fire on tap, never in background. Parent-intro + dev pilot-chooser gates now only acknowledge/advance (`introAcknowledged` / new `testModeChosen`); they no longer release the start. New `Welcome.test.tsx` (renderToString smoke, Mascot stubbed). Reducer unchanged. Verify GREEN 1170/84. Codex manual/skipped.

* **Trunk advanced to `ae281dd` (PR #81, lane/short-test-readiness-report, merged, 2026-06-18).**

## 2026-06-16

* **L0/L1/L2 activation wave — 19 FLIP-READY rows activated end-to-end (PR #78, lane/l0-l2-activation, 2026-06-16).** All answer formats now wired: input + serialize + grade + mint. Activation follows #71 (3 click-image formats) + #77 (per-tile minting); both must be on trunk before this PR applies. Formats flipped: CLICK_IMAGE_SINGLE (L0A Q08/Q11; L0B Q02; L2 Q06), SELECT_MULTIPLE (L0C Q03), EQUATION_SET (L0C Q04), MULTI_BLANK (L0C Q08/Q11/Q16; L1 Q14+image), NUMERIC_ENTRY (L0C Q14), MC+image (L1 Q02/Q03/Q16), VISUAL_MATCHING text-tile (L1 Q11/Q27), VISUAL_MATCHING+images (L1 Q13/Q15), IMAGE_ORDERING (L1 Q17). Each activation: atomic UPDATE guarded on `is_active=false`; activated content carries NO `_authoring.requires_format_swap` (satisfies `questions_held_rows_inactive` CHECK). `activation-spec.md` documents per-format content shapes. Verify GREEN: 1091 tests / 76 files, tsc 0, lint 0 errors (2 known warnings), build OK. PR #78 OPEN — blocked on founder uploading images to `question-images` bucket before merge.

* **Rule confirmed: every activated row must have an existing uploadable image — else held.** Two rows demoted from FLIP-READY to one-image-away during this pass: SAM-L0A-Q17 (group-of-balloons image absent; only single-balloon crops exist) and SAM-L0B-Q07 (two sorted-shapes part-crops need compositing into one image). Pattern: do not flip `is_active=true` for image-bearing questions until the image file exists in the `question-images` bucket.

* **Trunk advanced to `a98f3e5` (PRs #74/#75/#76/#77 merged: L0 bank, L0 memory, short-test-eligible picker, per-tile minting).** PR #78 branches off this head.

## 2026-06-15

* ⚑ **`half_grade_level` enum extended with pre-K bands 0A / 0B / 0C (founder-directed,
  2026-06-15).** 0A = age 3 / Nursery 3; 0B = age 4 / pre-K; 0C = age 5 / Kindergarten.
  Kept DISTINCT — not collapsed into existing KA/KB — per founder instruction. Added BEFORE
  KA in the enum DDL (`20260616120000_add_prek_grade_levels.sql`; enum-DDL-only, no seed
  mirror). Rationale: preserves ordering semantics and avoids back-compat breakage on KA/KB
  rows already in the bank.

* **SAM-L0 verbatim re-author over the 2026-06-11 pipeline rows (PR #74, lane/l0-authoring,
  2026-06-15).** The 2026-06-11 full-library pipeline run (migration `20260611134158`) had
  loaded 21 SAM-L0* rows mis-banded KA/KB with model-reconstructed content (e.g. literal
  "Option B (unknown)"). Decision: re-author all 21 verbatim-from-docx via three additive
  overlays (l0a/l0b/l0c-authoring.json) + 28 new inserts (49 total tasks). Mis-modeled
  pipeline actives SAM-L0C-Q03/Q08/Q16 deactivated. Result: 8 active (text-answerable
  arithmetic, bands 0A/0B), 3 held-A (image-essential), 31 held-C (non-wired interaction),
  7 inactive (drawing/tracing/colouring/oral). Short-test eligibility stored in the real
  boolean column `questions.short_test_eligible` (ATLAS-authoritative name; migration
  `20260616120050`, default false), set per docx Summary (31/49) — NOT a content key.
  Verify GREEN 1074/75; tsc 0; lint 0 errors (2 known warnings); build OK.
  PR #74 OPEN — awaiting founder merge + `supabase db reset`.

## 2026-06-14

* **L1 art curation — wired curated images + activated 5 image-essential L1 items
  (SAM-L1-Q04/Q05/Q10/Q12/Q19).** Art extracted from the founder's Level 1 worksheet `.docx`
  (rendered via Word→PDF→200 DPI, cropped by `scripts/conversion/l1_*.py`), uploaded by founder
  to the private `question-images/l1/` bucket. Migration
  `20260614120000_l1_art_wire_activate.sql` (+ seed.sql mirror) sets `image_path` +
  `is_active=true`. Cleaned dead `[object]`/`[image]` stem placeholders on Q05/Q12 (player has
  no placeholder substitution; they would have rendered literally). Held pending Track B input
  wiring: Q13/Q15 (visual-matching), Q07 (click/matching display plumbing), Q17 (image-ordering
  lane) — all carry `_authoring.requires_format_swap`, so the `questions_held_rows_inactive`
  guardrail keeps them inactive.

* **SAM-L1-Q22 kept TEXT-ONLY — not re-imaged (founder decision).** The l1-overlay
  (`20260613120100`) already activated Q22 with a stem that states the numbers ("6 and 3 make
  9. … 2 and 6 make ___") and auto-grades from text. Adding the cropped bond image only adds a
  render dependency for no grading benefit. → v1.5 enhancement: add the number-bond visual via
  the Atlas parametric primitive (logged in ROADMAP Deferred). The uploaded `sam-l1-q22.png`
  stays in the bucket, unused, for that future work.

## 2026-06-13

* **G1-3 visual-primitive + answer-input + grading library built as app code, own PR #59
  off ATLAS-ASSESSMENT (lane/visual-primitives-g1-3, branched from head f8c0f30 — NOT
  stacked), per founder brief.** Bank untouched; CONVERSION session owns all bank-side
  changes. Adds: 11 stem SVG primitives (`src/components/visual-primitives/`), 3 answer-input
  components (`src/components/answer-inputs/`), standalone grading module (`src/lib/grading/`),
  2 spec docs (`docs/visual-primitives-spec.md`, `docs/answer-model-spec.md`), dev-only gallery
  at `/dev/visual-primitives`. Verify GREEN 979 tests / 72 files (+64/+16 over 915/56
  baseline), tsc 0 errors, lint 0 errors (2 known warnings), `pnpm build` GREEN.

* **Grading kept as a standalone pure module (`src/lib/grading/`), explicitly NOT wired into
  `responseSubmit/handler.ts`.** Rationale: avoids entangling with or regressing the Issue-1
  served-question gate; grading logic is exercised by its own spec suite and can be integrated
  cleanly in a dedicated wiring lane after the gate is stable.

* ⚑ **Hard rule documented: every ACTIVE assessment item must be auto-gradeable.**
  Non-auto-gradeable answer types (free drawing, open production) cannot be active items.
  Gradeability flag raised for SAM-L1-Q25 ("write a fact family 6,8,2") — the one active
  G1-3 item not yet mapped to an auto-gradeable answer type; queued for CONVERSION re-authoring
  (equation-set answer input + set-equality grading model per `docs/answer-model-spec.md`).

* **Dev gallery (`/dev/visual-primitives`) gated by a standalone env flag
  (`ENABLE_VISUAL_PRIMITIVES_GALLERY` / `isVisualPrimitivesGalleryEnabled`) kept OUT of the
  §12 `ROLLOUT_FLAGS` registry.** Rationale: it gates an internal developer eyeball page, not
  a user-facing feature; adding it to the registry would break the existing test that pins the
  registry's default-off count. Flag is always-on in dev/test, 404 in prod unless the env var
  is set.

* **New shared UI home `src/components/` introduced (reversible call).** No shared component
  directory existed in the repo before this lane. The split (`visual-primitives/` and
  `answer-inputs/` subdirs) is consistent with standard Next.js layout conventions.

* **Read-only audit extended — Appendix A added to `docs/sam-content-authenticity-audit.md`.**
  29 active G1-3 items classified by rendering bucket: 13 pure-text / 15 math-notation /
  1 parametric-visual / 0 bespoke-image / 0 drawing. Answer-format breakdown: 15 single /
  9 MC / 4 ordering-matching / 1 set-of-equations. One gradeability flag: SAM-L1-Q25 (see
  above). Active G1-3 set has ZERO bespoke-image items. Moved off lane/served-gate-multirow-fix
  (to keep PR #58 = Issue-1 fix only) into its own follow-up PR `lane/memory-audit-2026-06-13`
  off ATLAS-ASSESSMENT, bundled with this session's three memory/run-state files (not stacked).

* **Issue-1 (submit 500 / served-gate multirow) fix is on PR #58, OPEN — the QA-unblocking
  priority.** `lane/served-gate-multirow-fix`, commit `7245826`. The fix: the
  `question_access_log` existence check in `responseSubmit/handler.ts` switched from
  `.maybeSingle()` (raises PGRST116/500 on >1 row) to `.limit(1)` (0-or-1 array), so the
  served-gate tolerates multiple access-log rows on first submit / Strict-Mode resume. Verified
  on origin 2026-06-13: trunk (head f8c0f30) STILL has `.maybeSingle()` (handler.ts:385) — the
  fix is NOT on trunk; `.limit(1)` exists only on the lane branch. PR #58 is MERGEABLE / CLEAN /
  verify-bar SUCCESS / Vercel SUCCESS — needs only the attended merge button. PR #58 also carries
  two read-only docs (the base `sam-content-authenticity-audit.md` + `picker-level-band-proposal.md`).
  (Earlier same-session note "uncommitted, no PR" was true at session start; superseded — the
  founder committed + opened #58 mid-session.)

* **Content-integrity gate PARKED for the CONVERSION session (bank-owned).** Root cause:
  the `questions` table has NO provenance/rights/"model-reconstructed" column, so authenticity
  is only inferable from `external_id` + migration comments. ~5 ACTIVE model-reconstructed/
  vision-recovered SAM-* rows need PDF-faithful re-authoring before they can be trusted as
  served items: **SAM-L3-Q15** (mojibake-page MC, options invented then dropped → TEXT_ENTRY
  "4/6"), **SAM-L3-Q03** (options were model value-equivalents, since replaced with page-verbatim —
  re-confirm), **SAM-L6-Q09/Q11/Q12** (fraction answers vision-recovered from symbol-font keys),
  plus **SAM-L4-Q15** (answer "1 km 750 m" self-flagged suspect — pending founder PDF check).
  Separately, **24 inactive image-essential L1-3 rows** (L1 6 / L2 8 / L3 10) need either curated
  per-question images OR re-authoring against the new parametric primitives before activation.
  All of this is CONVERSION-owned; other sessions coordinate via repo memory only.

* **Picker level-band widening decided-in-principle: ±3 half-grades with graceful widening**
  (see `docs/picker-level-band-proposal.md`, carried on PR #58). IMPLEMENT AFTER the CONVERSION
  re-authoring above — widening the served band before the model-reconstructed rows are
  PDF-faithful would surface untrusted content more often. Sequencing decision, not yet built.

* **Grading machinery (PR #59) is built but deliberately NOT wired to the live submit path —
  gated on CONVERSION authoring `correctAnswer` models.** The `src/lib/grading/` rules are
  proven by their own suite; wiring them into `responseSubmit` is a future lane that can only
  add value once bank records carry `correctAnswer` (CorrectAnswerModel) per
  `docs/answer-model-spec.md`. Until then the live path is unchanged.

## 2026-06-12

* ⚑ **PROCESS RULE HARDENED — "GitHub auto-retargets on parent merge" is FALSE (third
  stranded-PR incident, 2026-06-12).** PR #51 (duplicate-response unique constraint) was
  opened STACKED on its parent lane branch `lane/served-question-gate` (PR #50). The PR #51
  body asserted its base would auto-retarget to `ATLAS-ASSESSMENT` once #50 merged. It did
  NOT: after #50 merged, #51's base still pointed at the now-dead parent lane branch, so
  merging it would have stranded the unique-constraint commit + migration off the default
  branch (a fourth would-be incident, caught before merge). Resolution: #51 was CLOSED and
  superseded by **PR #55**, opened directly against `ATLAS-ASSESSMENT` with the same content
  (commit `4b31baa`, migration 20260612090000_responses_unique_session_question). #55 merged
  clean. **Rule (canonical, supersedes the optimistic half of the prior entry):** GitHub only
  auto-retargets a child PR when the parent branch is DELETED, never merely on parent *merge*.
  Before merging any stacked child PR, MANUALLY verify the base label reads `ATLAS-ASSESSMENT`
  (`gh pr view <n> --json baseRefName`); if it still names a lane branch, either retarget it
  (`gh pr edit <n> --base ATLAS-ASSESSMENT`) or re-open it fresh against the trunk. Do NOT
  trust a PR-body claim that it "will auto-retarget." Prefer NOT stacking security/migration
  PRs at all — open each independently against `ATLAS-ASSESSMENT`. Incidents: #35 (2026-06-10),
  #42/#46 (2026-06-12), #51 (2026-06-12).

* **Security lanes all merged to ATLAS-ASSESSMENT; verify baseline → 915/56 (2026-06-12).**
  Merge order landed: #50 (served-question gate, `ea53da5`) → #55 (unique constraint +
  conflict-safe submit, `4b31baa`; replaces stranded/closed #51) → #52 (AI data
  minimization, `57e5f93`) → #53 (Next 16.2.4→16.2.9 + CI build step, `1997b3d`) → #54
  (memory). PRs #48 and #51 closed. ATLAS-ASSESSMENT head `970698e`. `supabase db reset`
  run (applies 20260612090000 + 20260611090000). Full verify on the merged head: **915
  tests / 56 files GREEN**, tsc 0 errors, lint 2 known warnings (profile-menu.tsx:48 img,
  layout.tsx:56 font), `pnpm build` success. New verify baseline = 915/56.

* ⚑ **PROCESS RULE — Stacked-PR hygiene (second incident; founder-instructed, 2026-06-12).**
  Before merging any stacked (child) PR, confirm its base is `ATLAS-ASSESSMENT` (not a
  parent lane branch). If the parent branch was already merged and not deleted, the child PR
  will show "MERGED" but its commits land on the dead parent branch — stranded off the
  default branch. Prevention: retarget the child PR's base to `ATLAS-ASSESSMENT` (or delete
  the parent lane branch so GitHub auto-retargets) BEFORE merging the child. After merging
  any parent PR, immediately delete its lane branch. First incident: CONVERSION PR #35
  (2026-06-10). Second incident: PRs #42/#46 (2026-06-12) — see re-landing record below.

* **Stranded PRs #42/#46 re-landed via cherry-pick PR #49 (merged to ATLAS, 2026-06-12).**
  Root cause: #42 (consent regression test, 7e7c37e) and #46 (comprehensive engine,
  2dad26c) had merged into their stacked parent lane branch (lane/comprehensive-instructor-analytics,
  already merged as #41), not ATLAS-ASSESSMENT. ATLAS-ASSESSMENT was verified to have
  882/54 tests (missing both commits). First reland attempt PR #48 conflicted (#45
  full-library-conversion and #47 instructor-portal-polish had landed since #41). PR #48
  CLOSED. PR #49 cherry-picked both commits onto current ATLAS head, resolving one
  single-file conflict (instructor student page: #47 added per-item strand labels; #46
  adds per-strand coverage summary — both coexist via import union resolution). Verified
  GREEN 900/55. Founder-authorized merge. ATLAS-ASSESSMENT head is now b9b0662.
  Verify baseline updated: 900 tests / 55 files.

* **Four security-remediation PRs opened (external audit findings), all verify GREEN,
  Codex skipped (relay credential-blocked), awaiting attended merge (2026-06-12).**
  - PR #50 (lane/served-question-gate, base ATLAS): served-question gate in responseSubmit —
    requires a question_access_log row for (tenant,session,question) AND no existing response
    before scoring; else 403 question_not_served. Removes silent idempotent-retry;
    already_answered is now a hard 409. Verify 901/55.
  - PR #51 (lane/duplicate-response-constraint, STACKED on #50 — MERGE #50 FIRST): migration
    20260612090000_responses_unique_session_question.sql adds unique(session_id,question_id)
    on responses; insert is conflict-safe (23505 detection) returns existing result
    deterministically — converts #50's 409 into a race-safe idempotent return. Seed check
    clean (no violations). DDL-only (no seed.sql mirror needed). Verify 902/55.
  - PR #52 (lane/ai-data-minimization, base ATLAS, independent): (a) misconception classifier
    math-safe sanitizer for TEXT_ENTRY answer_given (allowlist digits/ws/operators/symbols,
    max 40 chars) — non-conforming skips the Haiku call, returns fail-soft method:'none', so
    PII never reaches the model; MC path unchanged. (b) narration sends FIRST NAME only via
    firstName(display_name); voice-locked Step-4 SYSTEM prompt TEXT unchanged (data-only).
    (c) .env.example MISCONCEPTION_CLASSIFIER_LIVE default flipped true→false. Verify 913/56.
  - PR #53 (lane/next-upgrade-ci, base ATLAS, independent): next + eslint-config-next
    16.2.4→16.2.9 (exact pins; lockfile regenerated; no code fixes); 'pnpm build' step added
    to .github/workflows/verify.yml. Post-upgrade pnpm audit: 3 MODERATE transitive advisories
    (postcss/ws/brace-expansion) — no high/critical; transitive pins not chased per scope.
    Verify 900/55 + build GREEN.

## 2026-06-11

* ⚑ **Comprehensive-test instrumentation is "instrument-only" for this session — adaptive
  engine reparameterization DEFERRED.** Decision by Dimitri 2026-06-11 (Option 1 of a
  clarifying question). Rationale: adds the test_type discriminator + fires
  comprehensive_* / short_* / instructor_* analytics events + ships a consent regression
  test without touching the adaptive engine (item cap, confidence stop, routing depth).
  Engine reparameterization is deferred to the SEPARATE comprehensive-assembly session that
  owns the question-bank/session-split boundary. Instruments M2 comprehensive-pilot funnel
  KPIs without colliding with that work. TODO(comprehensive-engine) marker left in codebase
  at the hook point.

* **Comprehensive instructor analytics lane built (PR #41, lane/comprehensive-instructor-analytics).**
  Migration 20260611090000_comprehensive_instructor_analytics.sql: 6 new
  analytics_event_name enum values; new assessment_test_type enum +
  assessment_sessions.test_type column (default 'short'); instructor_usefulness table +
  RLS mirroring pedagogical_notes. Events wired: comprehensive_test_started/_item_answered/
  _completed (test_type='comprehensive'), short_test_started/_item_answered/_completed
  (test_type='short'), instructor_report_viewed (tracker island + server action),
  placement_recommendation_created (fires once at session completion, both terminal paths,
  props {sam_level, termination_reason}, PII-free), instructor_usefulness_submitted (1-5 +
  optional note; RLS table + server action + client island; event carries {rating,
  has_comment} only), short_result_viewed (parent report view, test_type='short').
  sessionStart honors a comprehensive? flag only when ENABLE_COMPREHENSIVE_PILOT is on
  (fail-safe to short). Hand-edited database.types.ts to match DDL (supabase gen types not
  runnable by assistant). Migration NOT exercised by CI — validated on founder's
  supabase db reset. Verify GREEN: 882 tests / 54 files; tsc clean; lint 0 errors (2
  pre-existing warnings). Codex SKIPPED (relay credential-blocked). Awaiting attended merge.

* **Consent-gate regression test — comprehensive session (PR #42, lane/consent-gate-comprehensive,
  STACKED on PR #41).** Regression test only: asserts dual server-side consent gate
  (sessionStart + responseSubmit) fails closed for a comprehensive session exactly as for
  short — 403 consent_required, no session created / no response accepted. No handler fix
  needed (gate runs unconditionally before test_type resolution). Verify GREEN: 884 tests /
  54 files. Base PR auto-retargets to ATLAS-ASSESSMENT once PR #41 merges — MERGE #41 FIRST.

* **Ops runbook gaps closed (PR #43, lane/ops-runbook-gaps, docs only).** docs/ops-runbook.md
  §3 rewritten as "Stuck / abandoned sessions, and report regeneration": Option A
  reset-by-delete (cascades responses/question_access_log, nulls analytics_events.session_id)
  and Option B force-close to COMPLETED (sets completed_at per check constraint, no-narration
  caveat). §4 consent revoke: companion vpc_audit_log insert + revoke-all-children-of-a-parent
  variant. §7: new "child can't start a new assessment" scenario. Narration-regen KNOWN GAP
  (§3) remains open — needs a service-role script, not SQL; documented as an optional
  code follow-on. Verify GREEN: baseline (docs-only change). Codex SKIPPED. Awaiting
  attended merge.

* **Verify baseline confirmed at 864 tests / 52 files on ATLAS-ASSESSMENT head (2026-06-11).**
  Earlier per-lane snapshots (644/47, 554) were pre-merge counts from specific worktrees.
  CLAUDE.md's pinned "554" is stale — treat the live pnpm test count as authoritative
  (CLAUDE.md updated to say this in commit 86f8cad on lane/verify-baseline-count).

## 2026-06-10

* ⚑ **G1 LIFTED — S.A.M. founder granted permission to digitize the entire test library
  (2026-06-10).** Stage 4 (DB load script) fully unblocked. Geography, duration, and
  derivative/brand rights of the license remain open (see Open / unconfirmed below).

* **Marketing §2.4 — remaining "diagnostic" scrub merged (PR #20); precision-claim fix
  open (PR #21).** PR #20 (`lane/marketing-diagnostic-scrub`, commit `e6d9515`, merged in
  `d4743c7`) scrubbed the remaining rendered "diagnostic" claims to "assessment". PR #21
  (`lane/marketing-precision-claim`, commits `e52258c`+`32f35d6`, DONE-pending-merge)
  removes the unbacked "98% accuracy" precision claim and renames the "Diagnostic
  Precision" card heading to "Misconception Mapping". PR #21 awaits Dimitri's attended
  merge after Vercel preview review.

* **CONVERSION Stage 4 DB load script built (PR #23, lane/conversion-stage4-load,
  commit `40d32b3`, worktree `atlas-stage4`).** `pnpm convert:load` emits a timestamped
  questions migration + byte-identical `seed.sql` mirror; idempotent; `image_required`
  rows load `is_active=false`; source pages upload to private `question-images` bucket
  under `conversion-staging/<external_id>/`; missing creds → graceful skip + manifest.
  Verify GREEN: 604 tests / 44 files. DONE-pending-merge.

* **Content-id backfill built (PR #22, lane/questions-content-id-backfill, commits
  `5b249f5`+`c6e1485`, worktree `atlas-backfill`).** Maps all 11 SAM-L2 questions to
  `content_id`. Seed.sql mirror placed AFTER the `tax_content` seed block (ordering
  matters; new drift test pins this). Verify GREEN: 569 tests / 44 files.
  DONE-pending-merge.

## 2026-06-05

* **§2.4 marketing hero pill line-74 fix shipped as PR #16 (lane/marketing-assessment-wording,
  DONE-pending-merge).** `(marketing)/page.tsx:74` hero pill changed from
  "S.A.M Mathematical Diagnostic Suite" → "S.A.M Mathematical Assessment Suite". CI GREEN,
  Vercel preview pass. Five additional visible parent/educator-facing occurrences of
  "diagnostic" on the marketing page (lines 84, 135, 170, 298, 313) were left untouched by
  design (lane scoped to line 74); these are flagged for a Dimitri §2.4 call before any
  follow-up lane. Line 131 is a non-rendered code comment — not a concern.

* **Codex confirmed NOT programmatically reachable on this box — credential blocker, not
  transport.** Evidence documented in PR #17 (lane/codex-reachability-finding,
  DONE-pending-merge): codex-cli 0.130.0 installed; api.openai.com reachable (Cloudflare
  cf-ray returned); but no `~/.codex/auth.json` and no `OPENAI_API_KEY`; `codex exec`
  returns `401 Unauthorized: Missing bearer or basic authentication`. Manual-mode relay
  (`manual_codex_review.ps1`) remains the fallback. Automated-relay upgrade and `.mcp.json`
  remain PARKED pending Dimitri authenticating the CLI (`codex login`) or providing
  `OPENAI_API_KEY` on this box. `tools/relay/README.md` updated with a
  "Reachability check — 2026-06-05" section. CI GREEN.

## 2026-05-31

* **Relay built in MANUAL mode first.** `tools/relay/manual_codex_review.ps1` bundles a
  lane diff for Codex review and validates the JSON reply against
  `tools/schemas/codex_review.schema.json`; `codex-finding-resolver` then applies accepted
  findings. Automated transport and `.mcp.json` deferred until Codex reachability is
  confirmed (parked). Script is ASCII-only for PS 5.1 compatibility; secret scrub matches
  secret values (not key names) to avoid false positives; local-only (`tools/relay/.reviews/`
  gitignored). Tooling-only lane (no app code changed). Implemented in PR #9, merge
  `164a1b2`. CI GREEN: 554 tests / 41 files. Codex review SKIPPED (manual harness; no
  Codex endpoint wired this session).

* **Orchestration workflow moved to lane/* branch → PR → CI (verify-bar) → manual Codex →
  Dimitri merges attended via Vercel preview.** ATLAS-ASSESSMENT is protected by the
  "Branch Protection" GitHub ruleset (requires a pull request and the `verify-bar` status
  check to pass; direct pushes rejected). The agent never merges or pushes to the protected
  branch — merging is Dimitri's attended action. Rationale: protected branch rejects direct
  pushes; lane PRs make report-fix changes reviewable with a Vercel preview before merge.
  Implemented in PR #7 (no-ff merge `016e4ea`): `.github/workflows/verify.yml`,
  `.github/pull_request_template.md`, CLAUDE.md step 6 + RUNBOOK step 8 reconciled. CI
  passed GREEN: 554 tests / 41 files, no `ANTHROPIC_API_KEY` (classifier/narration mocked).

* **Ruleset scope corrected `~ALL` → `~DEFAULT_BRANCH`.** As first activated, the "Branch
  Protection" ruleset targeted `~ALL` branches, so the `required_status_checks`/`deletion`
  rules applied to every ref — which blocked pushing a new `lane/*` branch to origin
  (`Required status check "verify-bar" is expected`) and blocked deleting merged lane
  branches. That breaks the lane→PR flow (you can't create the lane on origin to open a PR
  from). Rescoped the ruleset's `conditions.ref_name.include` to `["~DEFAULT_BRANCH"]`
  (ATLAS-ASSESSMENT is the default branch) via `gh api`, authorized attended by Dimitri.
  ATLAS-ASSESSMENT remains fully protected (PR + `verify-bar`, no direct push, no deletion,
  no non-fast-forward); `lane/*` branches are now pushable and deletable. Surfaced by
  dogfooding the flow on the PR #8 memory lane.

## 2026-05-30

* ⚑ **Admin/support tooling for the pilot = ops runbook first; admin UI deferred.**
  Decision by Dimitri 2026-05-30. Rationale: no admin role exists in the schema; an admin
  UI surfacing child data is privacy-sensitive; the pilot can be operated via
  Supabase/Vercel dashboards. `docs/ops-runbook.md` shipped (merge `5709c13`). Admin UI
  remains deferred indefinitely unless Dimitri directs otherwise. OPTIONAL follow-on: a
  service-role script calling `attemptNarration` to regenerate a report narration without
  a re-take (noted as a KNOWN GAP in ops-runbook §3; build only if the pilot needs it).

* **Feature-flag mechanism = env-var boolean getters (not DB-backed) for the
  single-tenant pilot.** 11 §12 staged-rollout flags added to `src/lib/env.ts`, all
  default-off (only `'true'` enables): `enable_short_test_beta`,
  `enable_comprehensive_pilot`, `enable_center_routing`, `enable_external_centers`,
  `enable_diagnostic_snapshot_sharing`, `enable_full_history_sharing`,
  `enable_machine_generated_items`, `enable_instructor_assigned_practice`,
  `enable_socratic_assistant`, `enable_multi_tenant`, `enable_franchisor_dashboard`.
  `ROLLOUT_FLAGS` registry exported for introspection. New `src/lib/env.test.ts` pins the
  default-off invariant. `.env.example` documents all 11 (commented/off) + the previously
  missing `REPORT_NARRATION_LIVE` entry. DB-backed per-tenant flag table deferred to
  multi-tenant v2. Fix `efccf4f`, merge `a9d45ba`. Verify GREEN: 554 tests. Codex
  SKIPPED (relay not wired).

* **Brand-dot scrub applied to client-facing copy.** Lane `brand-dot-scrub`, fix
  `ffa77e5`, merged `47f9e59`, pushed; origin head `47f9e59`. Trailing dot removed from
  "S.A.M" in 9 rendered strings across 7 files: parent report footer disclaimer and
  next-steps body (`page.tsx`), parent-report-feedback, instructor portal empty-state and
  item-review note, signup center-selector labels (x3 in `signup-form.tsx`), assessment
  QuestionShell top bar, marketing hero pill. Deliberately excluded: code comments / logs
  / type docs / tests; marketing footer sentence-final "S.A.M." (grammatically correct);
  `layout.tsx` description metadata. The "Diagnostic" wording at `(marketing)/page.tsx:74`
  is a separate §2.4 open question — not touched and not resolved. Verify GREEN: 550
  tests, 0 type errors, 1 known font lint warning. Codex SKIPPED (relay not wired).

* **Narration anti-fabrication guard implemented (§2.4 / credibility).** Lane
  `report-narration-events`, fix `43b24c8`, merged `fbe8c5b`, pushed; origin head
  `fbe8c5b`. When every sub-strand band is `no_data` / total 0, `strand_lede` is
  suppressed and `key_findings.strengths` cleared deterministically post-validation;
  `placement_line`, `recommendations_lede`, and misconception-derived `growth_areas` are
  kept. Implementation is a data-path guard only — the voice-locked Step-4 prompt is
  untouched. New test added. Verify bar GREEN: 550 tests (+3), 0 type errors, 1 known font
  lint warning, pre- and post-merge. Codex review SKIPPED (relay not wired, no
  `.mcp.json`).

* **Both report-resident funnel events wired.** `parent_report_generated` emitted after
  successful `report_narrations` upsert (fail-soft, PII-free, service client) in
  `trigger.ts`. `center_followup_opted_in` wired via new server action
  `recordCenterFollowupOptIn` in `feedback-actions.ts` (mirrors `recordReportViewed` RLS
  ownership check) and new client wrapper `center-followup-cta.tsx` firing on CTA click.
  Href stays `CTA_LINKS` placeholder. New tests added. Same commit/merge as above.

* **Report CTA label applied in `page.tsx`.** "Schedule a conversation with a S.A.M center
  director" (no trailing dot) applied at the CTA render site. The `:63` entry is resolved
  from the brand-dot scrub list.

* **Bugs 1 (placement bar) and 3 (radar / sub-strand pills) PARKED pending founder
  confirmation.** These affect only the degraded/"unreliable" branch (speed-run with too
  few clean responses). The banner-only render on that branch is consistent with §2.4
  (no strand findings asserted when data absent). Needs on-screen check against a real
  completed assessment by Dimitri (he runs the dev server). See NEXT_ACTIONS.md PARKED
  entry for the full question.

* ⚑ **Report CTA label resolved (consultative wording).** Label is **"Schedule a
  conversation with a S.A.M center director"**. The commercial alternative "Schedule a
  free class" was explicitly rejected. Href stays a placeholder until real scheduling is
  wired; this decision covers the label only. Brand token is "S.A.M" with no trailing
  dot, consistent with BUSINESS_RULES §"Claims & language". Label to be applied when the
  CTA is wired.

* **Report bug 1 fixed — page `<title>` scrub (§2.4).** `src/app/layout.tsx:40` title
  changed from `"Atlas Assessment | Diagnostic Excellence"` to
  `"Atlas Assessment | Assessment Report"`. Lane: `report-title-scrub` off
  `ATLAS-ASSESSMENT`. Fix commit `c487f1c`, merged `--no-ff` as `a74c613`, pushed to
  origin. Verify bar GREEN (547 tests, 0 type errors, 1 known font lint warning) pre- and
  post-merge. Codex review SKIPPED — relay not wired, no `.mcp.json` in this repo.
  Remaining report bugs (3) and unwired analytics events (2) remain open.

## 2026-05-29

* ⚑ **Comprehensive test = longer parameterization of the existing adaptive engine**, not
a separate fixed blueprint. Config, not a build. License-gated.
* ⚑ **Anthropic API may serve under-13 users** for this product (product is the Anthropic
customer; child never interacts with the model directly; safeguards implemented).
Classifier taken off stub in code; production flip needs Vercel env. (Gate G4 resolved.)
* ⚑ **Consent is per-child (COPPA Model B)** — captured at `/add-child`; `/coppa` is
disclosure-only; server-side gate keyed to `child\_id`; fails closed.
* ⚑ **Report named "Assessment Report," not "Diagnostic"** (§2.4). Headline proficiency
donut dropped (unsupported precision pre-M1.5).
* **Adopt the editorial report format** (founder's `atlas-sample-report.html`).
Layout-only reskin first; 4-beat findings depth + narration voice re-tune deferred (to
avoid re-opening the voice-locked Step 4 prompt before the SAM deck). Radar stays
3-strand; sub-strand list maps to `tax\_\*` (ignore the sample's illustrative 5 names).
* **M2 lanes built via git worktrees**, one branch each off `ATLAS-ASSESSMENT`, merged one
at a time with the verify bar between. `pnpm install` per worktree; no `node\_modules`
junction.
* **Instructor portal gates raw S.A.M question content** — misconceptions +
recommendations + response-derived item review only; no parent PII; center-scoped via RLS.
* **Analytics emits are fail-soft and PII-free**; satisfaction is a self-contained island
mounted by one additive line on the report page (report internals untouched).

## 2026-05-28

* **Subagent fleet, two layers.** Layer 1 (coupled product DESIGN debate) stays an
in-thread conversation. Layer 2 (parallelizable EXECUTION) = `verify` + `audit` (haiku,
read-only) + `product-manager` orchestrator delegating to built-in `general-purpose`
workers. Fleet lives in `.claude/agents/`.
* **ROI test for any new agent (all five must hold):** repeated use; independent /
parallelizable; context-isolation pays; execution not coupled design; maintenance cost
justified. Default is NO new agent.
* **Rejected:** custom worker agents (backend/frontend/test) — use scoped
`general-purpose`; peer-to-peer "agent teams"; a six-role day-one fleet.

## 2026-05-29 (repo migration / orchestration — this session)

* **Move technical orchestration into Claude Code**; this chat retains business/strategy
only. Durable memory migrated into the repo under `.agent/memory/`; live state under
`.agent/runs/`.
* **Relay topology:** Code orchestrator is the only hub; Code→Codex and Code→subagents;
subagents never talk laterally (summary-in/summary-out). (Re-affirms the rejected
peer-to-peer model.)
* **Repo `.agent/runs/` replaces the technical `\*\_handover.md` files** (ATLAS / CONVERSION
/ AGENTS). Chat handover files retained for business/strategy topics only.
* **Codex's proposed fleet pared down:** keep existing `verify` / `audit` /
`product-manager`; add only `codex-finding-resolver`. Dropped `orchestrator-reviewer`
(conflicts with product-manager), `backend-/frontend-implementer`, `test-engineer`.
* **De-duped memory:** single decision log at `.agent/memory/DECISIONS.md`; `ROADMAP.md`
is technical-only and defers milestone definitions to `atlas\_assessment\_strategy.md`.
* Repo moved to a short path `C:\\Users\\Acer\\PROJECTS\\atlas-ai` (old nested path with `!`
and spaces was a tooling hazard). Old worktrees removed. Fresh checkout confirmed origin
head `71205e5` (analytics merge) — all three M2 lanes pushed; codebase complete.
* `AGENTS.md` reconciled (deduped garbled autonomy stub; full autonomy rules promoted to
§1; worktree/verify-bar/taxonomy conventions added). `CLAUDE.md` is now a distinct
orchestration file, NOT a symlink to `AGENTS.md`; `GEMINI.md` symlink optional.
* Fleet = `product-manager` / `verify` / `audit` / `codex-finding-resolver` /
`repo-memory-maintainer` (5). Codex's `orchestrator-reviewer` / `backend-` / `frontend-`
/ `test-engineer` rejected; its duplicate `Business-Rules.md` / `Next-Actions.md` /
`Claude-Code-Orchestrator.md` discarded (canonical files exist).

## 2026-05-26 / 2026-05-25 (taxonomy + CONVERSION)

* **Taxonomy V2026 locked:** `tax\_\*` tables (`tax\_` prefix locked); `questions.content\_id`
nullable FK; `tax\_levels.mvp` + `tax\_content.mvp` carry the L1–4 MVP cut (read-time
gating). Old flat six-strand taxonomy dropped.
* **CONVERSION pipeline** = standalone 5-stage CLI in `scripts/conversion/`. Stages 1–3
(extract / segment / tag) built + verified; Stage 4 (DB load) single-gated on S.A.M.
licensing. Stage 3 tagging uses forced Anthropic tool-use (Sonnet), strict schema, the
21 misconception codes; quality reviewed and accepted.
* ⚑ Answer keys ship for ALL worksheets (Sam-confirmed). Anthropic-API processing of
licensed question text for tagging is permitted — processing, not training (Sam-confirmed).
* ⚑ MVP bank = lightly adaptive + public-item supplementation later; not S.A.M. questions
1:1 as the whole bank.

## 2026-05-05 (architecture baseline — see ARCHITECTURE.md)

* Supabase Auth + Postgres; Anthropic Haiku+Sonnet; Vercel; Resend; no offline v1; no
paywall v1. Cross-cutting guardrails (tenant\_id, subject-agnostic schema, taxonomy/recs
as data, themeable UI, abstraction layers, auth-user indirection, no raw question
client-side). **Superseded since:** LLM calls now direct `@ai-sdk/anthropic` (gateway
removed); report narration is fire-and-forget via `after()`, not job-ID/poll.

## Standing / carried

* ⚑ `atlas\_assessment\_strategy.md` is canonical; read-only for agents; flag deviations.
* ⚑ No consumer paywall; B2B2C; school sales out of scope; per-child consent;
licensed-asset treatment of S.A.M. content (see BUSINESS\_RULES.md).
* Verify bar (`pnpm test` + `tsc --noEmit` + lint) green before every commit.

## Open / unconfirmed (need Dimitri)

* Franchisor pilot-approval routing (Sam vs. franchisor) — G2.
* License scope specifics (geography, duration, derivative/brand rights) — G1.
* Pricing model — all options still open.

