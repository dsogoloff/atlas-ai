# NEXT ACTIONS — Ordered Queue

> Volatile. The orchestrator works top-down. PARKED items need Dimitri (don't auto-resolve;
> skip to the next ungated item). Tick/move items as they complete; record outcomes in
> CURRENT_STATE.md and durable decisions in DECISIONS.md.

## 0. 2026-08-13 — Staff alerts, director CTA, dead links, COPPA copy, re-clamp (PRs #211–#215 OPEN)

Five INDEPENDENT PRs (not stacked), all verify-bar GREEN and CI green, none merged.

- [ ] **Dimitri: merge PRs #211–#215** after Vercel preview review. They do not depend on
      each other and can merge in any order. #212 and #213 both touch `src/lib/cta-links.ts`
      in different regions — if the second one conflicts, it is a trivial two-key merge.

- [ ] **Dimitri: flip `LEAD_NOTIFY_LIVE=true` in Vercel when ready for staff alerts to
      actually send (#211).** Until then the alerts no-op — no send, no spend. The flip also
      enables the EXISTING follow-up-lead notifier, so it is one switch for both. No other
      env var is needed: the recipient defaults in code to `parents@samnewyork.com`.
      Set `STAFF_ALERT_TO` only to route alerts somewhere else (e.g. a QA inbox).

- [ ] **PARKED — COPPA disclosure, three counsel-facing questions (#214, needs Dimitri +
      counsel).** All flagged on the PR; none block merge.
      (a) The sub-header now shows the disclosure VERSION instead of the old hardcoded
      "Updated: October 24, 2023", which was Stitch filler and wrong. Supply a real
      effective date and it goes back.
      (b) The app-authored AI-processing disclosure sits at section 11, AFTER counsel's
      section 10 consent affirmation — that keeps counsel numbering intact but does place a
      disclosure after the affirmation. Moving it earlier renumbers counsel text.
      (c) Counsel's section 10 reads "By checking the box below and continuing…", but
      `/coppa` has no checkbox (it is disclosure-only; the binding per-child consent with
      the checkbox is at `/add-child`, Model B). The wording was NOT altered to match the
      screen. Either the PDF wording or the page flow should move — counsel's call.

- [ ] **PARKED — run the re-clamp backfill (#215, needs Dimitri).** The script has NOT been
      run against prod or local. Review order: `pnpm backfill:reclamp:dry -- --target=prod`
      (READ-ONLY) → read the would-change table → only then
      `pnpm backfill:reclamp -- --target=prod --apply --confirm`. See
      `scripts/backfill/README.md`.

- [ ] **Follow-up after any re-clamp run (#215):** report narration prose generated BEFORE
      the correction may still quote the old level. If an affected report has already been
      shown to a parent, regenerate its narration. Not built — the script only prints a
      reminder.

- [ ] **Dimitri (optional, presentational): dashboard "Schedule a free class" label (#212).**
      The parent dashboard shares `CTA_LINKS.scheduleFreeClass` under its own existing
      label, which now opens the director mailto. Per the "do not relabel" instruction the
      label was left as-is; say the word to align it in a follow-up.

- [ ] **Multi-center follow-on (recorded in `todo.md` by #212; not built).** Once more than
      one center exists, the parent selects a center FIRST and both the director contact
      link AND the staff-alert recipient resolve to that center's director/inbox (via
      `home_center_id`, not a global constant). Vitalis directs the one current center only.
## 1. 2026-08-11 — ATLAS: analytics page-context redaction + GA4 queue (PR #210 MERGED)

PR #210 (lane/analytics-privacy-redaction) **MERGED** into ATLAS-ASSESSMENT (commit c325897).
Verify-bar was GREEN (1614 tests, tsc clean, lint 0 errors). The follow-ups below are still
open.

Root cause of the "#208 custom events not firing" report: **they were firing.** Verified on
live prod — dedupe keys set, `event|assessment_start` / `event|assessment_complete` in
`dataLayer`, outbound `/g/collect` POSTs made. The absence was GA4 standard-report processing
latency (24–48h on a NEW event name, checked ~36h after deploy), with a DebugView that showed
ZERO events — proving the Tag Assistant debug channel never attached, not that events were
missing. No code defect. The 503 seen on collect requests is an observation artifact: the
known-good `page_view` hit returns 503 in the same observer.

The live trace did surface two real findings, which PR #210 fixes:
- COPPA: `/report?child=<uuid>` put the child UUID in GA4 `dl`/`dp`/`dr` and Meta `dl`/`rl` —
  page context the #208 payload allowlist cannot see. Confirmed leaking on prod (Meta HTTP 200).
- GA4 had no retry queue (event lost permanently when `gtag` was absent) while Meta queued.

- [x] **Dimitri: merge PR #210 (lane/analytics-privacy-redaction)** — DONE (c325897).

- [ ] **Dimitri: mark `assessment_start` / `assessment_complete` as Key events** in GA4 Admin →
      Data display → Events. GA4 only offers an event name after it has seen it, so this is a
      dashboard action, not code. Use Reports → **Realtime** (no processing latency) to confirm
      collection rather than the Event-count report.

- [ ] **PARKED — accept deferred Meta `assessment_complete`, or prioritise the structural URL
      change (needs Dimitri).** The Meta Pixel offers no supported way to override the URL it
      reports, so PR #210 stops it sending from any document whose URL carries a child
      identifier; the conversion is queued and flushed from the next clean parent surface, and
      Meta gets no report PageView. Privacy was chosen over conversion immediacy. Restoring an
      immediate Meta conversion needs the child id out of the query string (path segment with an
      opaque token, or a server-resolved id) — a routing change that risks colliding with
      existing report links, so it was deliberately NOT done in #210. Business call.

- [ ] **PARKED — Preview-environment verification is blocked (needs Dimitri).** The Vercel
      preview for #210 sits behind Vercel deployment protection (serves "Login – Vercel"), so
      the deployed bundle could not be checked from this session. Either open the preview
      yourself and confirm the report route's outbound GA4 `dl` carries `child=redacted`, or
      confirm on prod after merge.

## 2. 2026-08-10 — ATLAS: per-tenant white-label, S.A.M New York skin (PR #209 OPEN)

PR #209 (lane/tenant-white-label) OPEN, verify-bar GREEN (1554 tests, tsc clean, lint 0 errors),
CI green, Vercel preview deployed. NOT merged.

Customer-facing surface is now skinned per tenant from `src/lib/branding/`. Atlas branding is
RETAINED for Inspirea's own use (the `atlas` skin) and in internal chrome (`(admin)`, `/dev`).
Nothing below blocks the PR — every item is a drop-in swap after merge.

- [ ] **Dimitri: merge PR #209 (lane/tenant-white-label)** after Vercel preview review.
      Suggested preview check: the landing hero should read "S.A.M New York Math Assessment"
      with no ™ and no "Powered by Inspirea Labs"; the browser tab title should carry no
      "Atlas"; the parent report footer should read "S.A.M New York"; and the COPPA page
      should still show the operator disclosure in fine print at the bottom of the sections.

- [ ] **PARKED — favicon / app icon asset (needs Dimitri).** `src/app/favicon.ico` is still
      the Next.js default. Drop the S.A.M mark in at that path — `faviconHref` already points
      to `/favicon.ico`, so no code change is needed. Not derived from `sam-logo.png`:
      cropping a wordmark makes a poor icon, and brand art is not run through tooling.

- [ ] **PARKED — OG / social share image (needs Dimitri).** No `og:image` is emitted today.
      Supply a 1200×630 PNG and it becomes one line in
      `src/lib/branding/tenants/sam-new-york.ts`.

- [ ] **PARKED — final S.A.M New York copy (needs Dimitri).** All one-line swaps in
      `src/lib/branding/tenants/sam-new-york.ts`: meta description (current placeholder is
      deliberately weaker than the copy it replaced — dropped "diagnostic"/"pinpoints" to
      stay inside BUSINESS_RULES §Claims), copyright line, report footer name, email sender
      display name.

- [ ] **PARKED — counsel wording, operator/data-processor disclosure (needs Dimitri +
      counsel).** `branding.legal.processorDisclosure` holds a clearly-marked placeholder.
      Do NOT let an agent invent or "improve" this wording. The slot renders in fine print on
      `/coppa`; the guard test asserts it still exists so a future rebrand cannot scrub it.

- [ ] **PARKED — counsel wording, signup consent authorization line (needs Dimitri +
      counsel).** Now reads "I authorize S.A.M New York Math Assessment to share…". It names
      the authorizing counterparty, so counsel should confirm. The VERSIONED consent text
      (`src/lib/consent/text.ts`) was deliberately left untouched.

- [ ] **PARKED — Supabase Auth email templates (needs Dimitri; outside this repo).** Confirm
      signup and password reset emails carry product branding and are configured in the
      Supabase dashboard, not in-repo. They still need the S.A.M New York treatment there
      (sender name, subject, body, footer).

---

## 0. 2026-06-29 — CONVERSION: SAM-L1-Q05 label-leak + format fix (PR #202 OPEN)

PR #202 (lane/fix-l1-q05-group-label-leak) OPEN, verify-bar GREEN (pnpm test, tsc, lint; seed↔migration parity guard passes). NOT merged. Nothing applied to prod.

Two defects in SAM-L1-Q05 (L1 grouping item, geometry / 1A / content_id l1-geometry-1, served as Q8):
(1) Label-leak: "Group A / Group B" baked into stem while image showed boxes unlabelled. Fix: re-cropped to include label row; sam-l1-q05.png re-minted.
(2) Format defect: NUMERIC_ENTRY with letter answer "B" rendered an un-enterable numeric keypad on touch. Fix: converted to MULTIPLE_CHOICE, options ["Group A","Group B"], correct_index 1.

- [ ] **Dimitri: merge PR #202 (lane/fix-l1-q05-group-label-leak)** after Vercel preview
      review. No `supabase db reset` needed (the migration converts the existing row in
      place; no new schema objects).
      Suggested preview check: serve SAM-L1-Q05 in a short test for a Level 1 child —
      the image should show labelled Group A / Group B boxes, and the answer should present
      as a two-option tap choice (not a numeric keypad).

- [ ] **PARKED — prod migration apply (needs Dimitri / prod access).** After PR #202 merges,
      apply migration 20260629120000_fix_l1_q05_group_label_leak.sql on prod to convert
      the row from NUMERIC_ENTRY to MULTIPLE_CHOICE. The migration is forward and idempotent.

- [ ] **PARKED — prod image re-upload (needs Dimitri / prod creds).** After PR #202 merges,
      run `pnpm convert:upload-activation-images:prod` to push the corrected
      l1/sam-l1-q05.png to the prod question-images bucket. The prod row already has
      image_path set; the old uncorrected (unlabelled) crop must be replaced with the
      re-minted version that includes the label row.

## 0. 2026-06-29 — L0 overlay short-invariant fix (`supabase db reset` unblocked) (PR #199 OPEN)

PR #199 (lane/fix-l0-overlay-short-invariant) OPEN, verify-bar GREEN (1440 tests).
`supabase db reset` was failing on the `questions_inactive_not_short_eligible` CHECK
(PR #191); root cause was 12 held L0 overlay rows inserted with `is_active=false,
short_test_eligible=true`. Three fixes shipped (data + generator + guard). No schema
change; no `supabase db reset` step needed as part of the merge — the fix IS what
unblocks reset.

- [ ] **Dimitri: merge PR #199 (lane/fix-l0-overlay-short-invariant)** after review.
      No migration; no `supabase db reset` needed as part of the merge itself. After merge,
      run `supabase db reset` to confirm it now completes without the
      `questions_inactive_not_short_eligible` violation.

## 0. 2026-06-29 — prod serve/submit 500 fix + content-completeness verifier (PR #198 MERGED — DONE)

PR #198 (lane/content-completeness-verifier) MERGED. Founder re-ran the prod image upload;
prod content-completeness re-verified PASS. L1 serve-500 closed.

- [x] **DONE — PR #198 merged** (runtime-truth image required-set + content-completeness verifier).

- [x] **DONE (2026-06-29) — prod content-completeness verified PASS** (read-only,
      `pnpm convert:verify-content --prod`, after the founder re-ran
      `pnpm convert:upload-activation-images:prod`). 188 active prod items:
        • images — 125/125 minted paths resolve, 0 missing;
        • gradeability — 0 throws (real `toClientQuestion` + content-only `judgeAnswer`).
      The 4 L1 incident images now resolve live: `l1/sam-l1-q05.png`, `l1/sam-l1-q10.png`,
      `l1/sam-l1-q12.png`, `l1/sam-l1-q19.png`. `SAM-L1-Q04` is correctly imageless (active
      but `image_path` null → not minted, can't 500). **L1 serve-500 closed.**
      (Was: PARKED — upload 4 missing L1 images to prod + verify.)

## 0. 2026-06-28 — full answer-key audit + SAM-L4-Q17 + CI manifest guard (PR #191 MERGED / #192 OPEN)

PR #191 (lane/bank-source-invariant-fix) MERGED: bank source invariant (is_active=false ⟹
short_test_eligible=false) enforced at source + CHECK constraint
`questions_inactive_not_short_eligible` + short-eligible-invariant parity test. Now in
ATLAS-ASSESSMENT. PR #192 (lane/l4-q17-answer-key-audit) OPEN, verify-bar GREEN; awaiting
Dimitri's attended merge after Vercel preview review.

- [ ] **Dimitri: merge PR #192 (lane/l4-q17-answer-key-audit)** after Vercel preview review.
      Migration 20260628120000 present — **`supabase db reset` required after merge** (adds
      SAM-L4-Q17 row). Then upload l4/sam-l4-q17.png to the local question-images bucket
      BEFORE or with `supabase db reset` — the row is is_active=true and will 500 if the
      image is absent.
      Suggested preview check: confirm TEXT_ENTRY judging with accepted_answers works for
      a perpendicular-lines response ("AF", "GC", "FA", "CG" all accepted in either slot).

- [x] **DONE 2026-06-28 — prod catch-up for SAM-L4-Q17 + bank audit verified (read-only
      re-verify via PROD_DATABASE_URL, verifier 4/4 PASS).** All prod steps confirmed live:
      - SAM-L4-Q17 in prod: is_active=true, short_test_eligible=true,
        content_id → l3-geometry-2, image_path = l4/sam-l4-q17.png,
        accepted_answers = 16 forms, format TEXT_ENTRY.
      - CHECK constraint questions_inactive_not_short_eligible present on questions:
        CHECK ((is_active OR (NOT short_test_eligible))).
      - 0 prod invariant violators; 217 question ids (excl PLACEHOLDER) — structural
        parity with canonical local, Q17 included.
      - 4-id remediation (SAM-L0C-Q11, SAM-L2-Q04, SAM-L5-Q08, SAM-L6-Q26) confirmed
        both-false in prod.
      - Image l4/sam-l4-q17.png present in the prod question-images bucket (23998 bytes,
        matches local L4-17.png).
      - Repo build-breaker fixed: PR #193 (::representation → ::representation_kind in
        seed + migration 20260628120000) + new guard
        src/lib/conversion/seed-cast-types.test.ts.

- [ ] **Image upload (founder's local run):** `pnpm convert:upload-activation-images`
      to upload l4/sam-l4-q17.png to local question-images storage before `supabase db
      reset` QA after #192 merges.

- [x] **RESOLVED — "L4 answer key absent" item.** Answer keys for ALL levels (L0A through
      L6) are now present in scripts/conversion/source/**. No level is key-absent. The
      audit/answer-key-manifest.json (217 entries) records the per-item verification status
      for all 187 active items across all 9 booklets.

- [ ] **Minor anomalies to review (not defects; Dimitri awareness):**
      - SAM-L5-Q12: stem says 65° vs key 68° (inactive draw task; no active serve risk).
      - SAM-L3-Q15: stem/source fraction conflict (stem 4/6 vs source 4/5; pre-existing,
        already blocked; stored as TEXT_ENTRY "4/6").
      - SAM-L6-Q26: activation gap (answer matches key 60%; image wired but row not
        activated).

## 0. 2026-06-27 — prod schema reconciliation + bank-flag loader (PRs #186 MERGED / #188 OPEN)

PR #186 (prod-bringup batch 1: introspect + 06-gen-catchup + catchup artifacts) MERGED at
`dfb82a6` (now in ATLAS-ASSESSMENT). PR #188 (batch 2: full-attribute rewrite 07, 09
remediation, compare.ts, accepted-drift allowlist, 06→direct Postgres) OPEN, verify-bar CI
GREEN, Vercel preview pass.

- [ ] **Dimitri: merge PR #188 (lane/prod-bringup-inspect-fix)** after Vercel preview
      review. No migration; no `supabase db reset` needed (tooling-only; no app DB schema
      change). `catchup.generated.sql` and `remediation.generated.sql` are both empty —
      nothing is applied to prod by this merge. Merging lands the verified introspection +
      verification + remediation tooling (`introspect.ts` direct-Postgres path, `compare.ts`,
      `07`, `09`) in ATLAS-ASSESSMENT for future use.

- [ ] **OPEN QUESTION — prod bank upsert status (needs Dimitri to confirm).** Plain-English:
      has the live `--prod` upsert (`05-load-bank-prod.ts --prod`) been executed against the
      production database? If yes, do prod's per-level `is_active` / `short_test_eligible`
      counts match the audited local bank? This session only ran read-only introspection;
      whether the loader has run live against prod is unconfirmed. Dimitri to confirm before
      this item can be marked resolved.

- [ ] **POST-BETA (not a beta gate): retire the 4 accepted-for-beta nullable drifts.**
      `responses` columns `expected_time_sec`, `time_ratio`, `time_flag_config_version`,
      `used_fallback` are NOT NULL in local but NULLABLE in prod. Tightening was deferred
      past beta because it requires a data backfill first. After beta: (a) backfill any NULL
      rows in prod for these columns, (b) run `ALTER COLUMN … SET NOT NULL` for each, (c)
      re-run `07-verify-prod-schema.ts` to confirm green without the allowlist entries. Do
      not action until explicitly directed post-beta.

## 0. 2026-06-26 — answer-log humanize + L4 narrative self-heal (PRs #171 / #173 — OPEN)

Two independent lane PRs opened off `ATLAS-ASSESSMENT`; not stacked; both verify-bar GREEN
(1346 tests). No migration in either — **no `supabase db reset` needed.**

- [ ] **Dimitri: merge PR #171 (lane/answer-log-humanize)** after Vercel preview review.
      No migration; no `supabase db reset` needed.
      Suggested preview check: open the answer log on a completed session that used image-tap
      or select-multiple questions — answers should show readable option/tile labels, not raw
      JSON `{"tappedId":"…"}` strings. MC / numeric / text / drag-drop answers unchanged.

- [ ] **Dimitri: merge PR #173 (lane/l4-narrative-fix)** after Vercel preview review.
      No migration; no `supabase db reset` needed.
      Suggested preview check: open the report for a session that previously showed no
      strengths/growth narrative due to a missed narration write (e.g., session
      `7a903c1e-2218-4e9f-99d6-98833d00ec3f` on the dev DB if available). On first load the
      page should trigger a one-time re-generation attempt; if it succeeds, the full
      narrative renders; if it fails, the page settles into the data-only fallback (no
      infinite loop or blank screen on subsequent views). Confirm that sessions with an
      already-present narration row are not affected.

## 0. 2026-06-25 — admin tenant view (PR #170 — OPEN)

**Origin head entering this session: `bf792cc`** (after PRs #163/#164/#165 merged).
One new PR opened; independent off `ATLAS-ASSESSMENT`, not stacked; verify-bar GREEN.
Migration present — **`supabase db reset` required after merge.**

- [ ] **Dimitri: merge PR #170 (lane/admin-tenant-view)** after Vercel preview review,
      then run `supabase db reset` (applies migration `20260625120000_admins_tenant_view.sql`
      — adds admins table, admin_status enum, app_current_admin_tenant_id SECURITY DEFINER
      function, and additive SELECT policies on children/assessment_sessions/
      pedagogical_notes; seeds dev admin admin@atlas.local / admin-password).
      Suggested preview checks:
      (a) Sign in as admin@atlas.local / admin-password → /admin — should show the
          tenant-wide roster WITH a Center column listing all children across all centers.
      (b) Click a roster row — should open the shared student detail at
          /instructor/student/[childId].
      (c) On the student detail as admin: notes are read-only (no add-note form, no
          usefulness rating, no report-viewed tracking); report / strand bars /
          misconceptions / item review all render normally.
      (d) Sign in as a normal instructor — roster shows center-only children (unchanged),
          can still author notes (unchanged).

## 0. 2026-06-27 — CONVERSION: prod bring-up step 1 (PR #181 — OPEN)

**Trunk head entering this session: `25b5a7c`** (after PRs up to #174 merged).
Analysis-only session; no prod connection, no writes, no DB commands made. One new PR
opened (#181); independent off `ATLAS-ASSESSMENT`, not stacked; verify-bar GREEN (1371
tests / 105 files). Artifacts are in `scripts/conversion/prod-bringup/`.

PROD = atlas-assessment (project ref `ntfaqzueppqymfkefadm`), the LIVE DB.
NOT atlas-assessment-2 (dead). All actions below are founder-gated on prod
`service_role` creds + explicit go-ahead; manual Studio/uploader path only.

- [ ] **Dimitri: merge PR #181 (lane/prod-bringup-schema-analysis)** — docs/artifacts only;
      no migration, no seed change, no DB command. Merge at leisure; no `supabase db reset`
      needed.

- [ ] **PARKED — prod bring-up step 1 inspection (needs Dimitri / prod creds).**
      Run `01-inspect-prod-schema.sql` in prod Studio (atlas-assessment,
      ref `ntfaqzueppqymfkefadm`). Paste results back to unblock step 2 and confirm which
      catch-up sections apply. KEY question: does prod `strand` enum have lowercase values
      (number_sense/operations_algorithms/…) or the OLD uppercase
      (NUMBER_SENSE/OPERATIONS/…)? If uppercase, a separate destructive recast migration is
      required BEFORE the bank can load — cannot proceed to step 4 until confirmed.

- [ ] **PARKED — prod bring-up step 2: apply additive schema catch-up (needs step 1 results
      + Dimitri go-ahead).**
      After reviewing step 1 inspection output, apply `02-catchup-additive-schema.sql` in
      prod Studio. Script is idempotent (IF NOT EXISTS guards throughout); safe to run
      multiple times. Each statement is tagged with its source migration for traceability.

- [ ] **PARKED — prod bring-up step 3: create question-images bucket in prod (needs
      Dimitri).**
      Create the `question-images` bucket in prod Supabase Storage (private; follows
      migration `20260512000000` DDL). This is a manual Studio action — there is no
      additive-only SQL for bucket creation.

- [ ] **PARKED — prod bring-up step 4: retarget uploader + upload crops (needs Dimitri).**
      Set prod URL + service_role key in `.env.prod.local`. Run
      `pnpm convert:upload-activation-images` targeting prod. Images-first then activate
      image-essential rows individually once files are confirmed present in the bucket.

- [ ] **PARKED — prod bring-up step 5: audited prod bank load 0A-L4 (needs Dimitri
      go-ahead).**
      Run the audited bank loader against prod. Includes taxonomy reference-data seed
      (tax_content rows so content_id FKs resolve). NEVER run the dev `seed.sql` against
      prod. L5/L6 geometry activation held until their images are in the prod bucket.

- [ ] **PARKED — prod bring-up step 6: verify clean serve path (needs Dimitri).**
      Confirm no missing-image 500s on prod; prod content matches audited bank; no
      dev/QA seed contamination.

- [ ] **NOTE (not CONVERSION's task):** ATLAS must set prod env vars (narration +
      lead-notify). Founder handles deliverability/DMARC + Supabase paid plan upgrade.

## 0. 2026-06-26 — fix: migration version collision (PR #174 — OPEN)

**Trunk head entering this session: `861bc43`** (after PRs #169–#173 merged).
One new PR opened (#174); independent off `ATLAS-ASSESSMENT`, not stacked; verify-bar GREEN.
Rename-only fix — no schema or data change.

- [ ] **Dimitri: merge PR #174 (lane/fix-migration-version-collision)** after review.
      No migration data change; no `supabase db reset` needed as part of the merge itself.
      After merge: run `supabase db reset` to confirm the PK collision (version 20260625120000)
      is resolved and reset applies cleanly end-to-end.

- [x] **RESOLVED — duplicate migration version 20260625120000.** `supabase db reset` was
      failing with `duplicate key value violates unique constraint "schema_migrations_pkey"`.
      Root cause: PR #169 and PR #170 (two same-day lanes) independently assigned version
      20260625120000. Fix: kept `20260625120000_l5l6_booklet_reband.sql` (canonical anchor
      for the 120000–120300 batch + referenced by siblings and seed mirror); renamed
      `20260625120000_admins_tenant_view.sql` → `20260625120400_admins_tenant_view.sql`
      (git mv; rename only; content unchanged). Zero duplicate version prefixes remain across
      all 81 migration files. See CURRENT_STATE and TECHNICAL_DEBT for the recurring-lesson
      note (3rd duplicate-migration-version incident).

## 0. 2026-06-26 — CONVERSION: L5/L6 geometry activation (PR #172 — MERGED `861bc43`)

**Trunk head entering that session: `db1e9ac`** (after PRs #169 and #170 merged).
PR #172 opened then merged as part of the PRs #169–#173 batch; trunk head now `861bc43`.

- [x] **Dimitri: merge PR #172 (lane/l5l6-geometry-activation)** — MERGED (`861bc43`).
      Then, in order:
      (a) `supabase db reset` — applies `20260626120000_l5l6_geometry_activation.sql`; seed
          rebuilds the 13 newly activated rows as active.
      (b) Confirm the L5/L6 crops are present in the private `question-images` bucket. Per
          the QA report they are already uploaded; an active row whose bucket file is absent
          will 500 at serve time.
      Check: run a short test for an L5 or L6 child — geometry, area_volume, and percentage
      sub-strands should now appear (were previously unserved because all 15 image rows were
      is_active=false).

- [x] **RESOLVED — CROSS-LANE FLAG (PR #161): served-order crosswalk regenerated (PR #170,
      MERGED `db1e9ac`, lane/regen-served-crosswalk-substrand).** Artifacts
      `scripts/conversion/audit/served-crosswalk.{md,json}` regenerated to reflect the
      sub-strand-aware served order. Closes the PR #161 cross-lane follow-up.

- [x] **RESOLVED — the 15 PR #169 image rows "activation-ready (is_active=false)":** 13 of
      those 15 rows are now activated by PR #172 (geometry, area_volume, percentage sub-strands).
      The two intentionally left inactive: SAM-L5-Q08 (line graph, data_statistics) and
      SAM-L6-Q26 (percentage, rectangles shaded) — not in ATLAS's activation list.

## 0. 2026-06-25 — CONVERSION: L5/L6 booklet re-band + load 6 missing rows + wire image_path + SAM-L5-Q27 activation (PR #169 — MERGED)

**Origin head entering this session: `f5947d5`** (after PR #168 merged).
One new PR opened (#169); independent off `ATLAS-ASSESSMENT`, not stacked; verify-bar GREEN locally.
Four new migrations — **`supabase db reset` required after merge. CRITICAL: upload
l5/sam-l5-q27.png to the private question-images bucket BEFORE or with `supabase db reset` —
SAM-L5-Q27 is now is_active=true and will 500 at serve time if the image is absent.**

LOCKED DECISION (founder): L5/L6 content bands at BOOKLET LEVEL — SAM-L5-* → 5A, SAM-L6-* → 6A.
Supersedes `20260623150000_l5l6_releveling` (difficulty/Level-column banding). Clears the prior
"Level review (founder/picker decision)" follow-up from the l5l6-conversion-status-2026-06-23 work.

- [x] **Dimitri: merge PR #169 (lane/l5l6-booklet-reband-load-images)** — MERGED `db1e9ac`.
      Then, in order:
      (a) **CRITICAL FIRST:** Run `pnpm convert:upload-activation-images` to upload
          `l5/sam-l5-q27.png` (combined 4-shape crop) to the private `question-images` bucket.
          SAM-L5-Q27 is now is_active=true — if the image is missing in the bucket the row will
          500 at serve time. Do this BEFORE or simultaneously with `supabase db reset`.
      (b) Run `supabase db reset` (applies all 4 migrations: `20260625120000`, `20260625120100`,
          `20260625120200`, `20260625120300`).
      (c) `pnpm convert:upload-activation-images` also pushes the 15 other L5/L6 image crops
          (L5 Q08/Q14/Q25/Q26; L6 Q14/Q15/Q16/Q19/Q25/Q26/Q30/Q31/Q32/Q33/Q34) to the private
          `question-images` bucket. Those 15 rows remain is_active=false; flip them individually
          once images are confirmed present in the bucket.
      (d) Run `pnpm convert:purge-staging --apply` to clear the 15 stray full-page renders in
          `question-images/conversion-staging/` bucket prefix.

- [ ] **BATCHED GATE ITEMS for Dimitri (in PR #169 body, non-blocking before merge):**
      (1) Confirm 5A/6A is the intended booklet half-grade for L5/L6 content. The A/B collapse
          (i.e. dropping difficulty-derived A/B suffixes in favour of the booklet floor) is
          reversible via a single UPDATE if you want to restore A/B splits later.
      (2) SAM-L5-Q27 — RESOLVED. Founder supplied a combined 4-shape crop (L5-27.png at
          scripts/conversion/source/5/L5-27.png); Q27 activated via migration
          20260625120300. No open gate item.

- [x] **RESOLVED — SAM-L5-Q27 (was PARKED "provide composite 4-shape crop OR defer").** Founder
      supplied a single combined crop (scripts/conversion/source/5/L5-27.png) showing all four
      shapes with in-image labels (1)–(4): circle/hexagon/heart/rectangle. Resolves the per-tile
      problem — Q27 is now a standard single-stimulus MC whose options reference the in-image
      labels. Activated via migration `20260625120300_l5_q27_activate.sql` + seed.sql mirror.
      is_active=true; short_test_eligible=true; banding 5A; content_id l4-geometry-3. Verify
      GREEN 1336 tests / 102 files, seed↔migration parity PASS (79 migrations).

## 0. 2026-06-25 — young-band narration render (PR #166 — MERGED)

**Origin head entering this session: `bf792cc`** (after PRs #163/#164/#165 merged).
One new PR opened; independent off `ATLAS-ASSESSMENT`, not stacked; verify-bar GREEN locally.
No migration — **no `supabase db reset` needed.**

- [ ] **Dimitri: merge PR #166 (lane/young-band-narration-render)** after Vercel preview review.
      No migration; no `supabase db reset` needed.
      Suggested preview checks:
      (a) Open a freshly-completed young-band session's report immediately after finishing —
          it should show a brief "Preparing…" interstitial state, then the full narrative
          report once the narration row lands (within ~30s); on timeout it falls through to
          the generic-lede report (no indefinite spinner).
      (b) An all-correct 0A floor session should place at the floor level (0A / "S.A.M Level 0A"),
          not "S.A.M Level 8", in both the placement label and the narration prose.

## 0. 2026-06-24 — intake grades-7/8 disable + low-level strand fix + short-test sub-strand coverage (PRs #159 / #160 / #161 — all OPEN)

**Confirmed merged state at session start:** PRs #150, #153, #155, #156, #157, #158 all
MERGED to ATLAS-ASSESSMENT; origin head was `e69671b`.

Three new PRs opened this session (all independent off `origin/ATLAS-ASSESSMENT`; not
stacked; all verify-bar GREEN locally). Dimitri merges attended after Vercel preview review.

- [ ] **Dimitri: merge PR #159 (lane/intake-grades78-disable-l6clamp)** after Vercel
      preview review. No migration; no `supabase db reset` needed.
      Check: grades 7/8 greyed and non-selectable on add-child; L7/L8 intake paths clamp
      to l6 without producing empty strand_mastery.

- [ ] **Dimitri: merge PR #160 (lane/report-low-level-strand-fix)** after Vercel preview
      review. No migration; no `supabase db reset` needed.
      Validate on Vercel preview against:
      - Broken 0A child `c7299380-b690-43fe-ba09-994e43a466df` — radar/bars/narrative/
        placement should now render (was all no_data / empty).
      - Working 0C child `0e0a3167-2dab-4691-a7b5-ac735aa75c94` — unchanged (fallback is
        gated strictly on `subStrandByQuestion.size===0`).
      - [ ] **PARKED — 0A readiness/placement-card suppression (needs Dimitri).**
            The "Great news… ready for Level X" readiness line is gated on `readiness.ready`
            (overall %) in `readiness.ts`, independently of the strand-fallback fix. For a
            0A child the readiness line may be intentionally suppressed. Plain-English:
            on the preview, check whether the 0A report shows a placement card / readiness
            statement. If it is missing, confirm whether this is deliberate (0A is
            pre-assessment placement; readiness suppressed by design) or a defect.

- [ ] **Dimitri: merge PR #161 (lane/short-test-strand-coverage)** after Vercel preview
      review. No migration; no `supabase db reset` needed.
      Validate on Vercel preview against:
      - L6 child `0ca3029e-e11d-40d0-8c30-c67921e1f9cd` — Geometry/Ratio/Algebra/
        Statistics should now get representation in the short test (were being skipped
        under the prior difficulty-only sort).
      - [ ] **CROSS-LANE FLAG — after PR #161 merges, CONVERSION lane must regenerate
            the served-order crosswalk.** PR #161 changes the short-test served ORDER
            (sub-strand-aware sort); the current `served-crosswalk.{md,json}` will be
            stale. Queue crosswalk regen in the CONVERSION lane; do NOT action in this
            lane.

## 0. 2026-06-23 — in-question mascot extended to all tiers (PR #146 — MERGED)

Trunk head **`e93d5cd`**. UI-only; no migration / no `supabase db reset`.

- [x] **PR #146 (lane/inquestion-mascot-all-tiers) MERGED (`e93d5cd`)** — the in-question footer
      mascot (thinking idle + per-submit celebrate hop) now renders for ALL tiers, not just K_4.
      The G5_8 `QuestionShell` branch gets a mascot-only footer (no "Read carefully!" text). New
      `questionMascotIsLively` policy (all tiers, reduced-motion gated only); bookend
      `mascotIsLively` (Welcome/Completion, K_4-only) unchanged. Kept by design: hop stays
      correctness-agnostic, in-flow poses stay thinking + celebrating, reduced-motion gate kept.
      +5 tests. Verify GREEN 1237/92.

## 0. 2026-06-22 — short-test length cap confirmed (PR #144 — MERGED)

Trunk head **`cc93799`**. Docs/audit-tooling only; no migration / no `supabase db reset`.

- [x] **PR #144 (lane/short-test-hardcap-15) MERGED (`cc93799`)** — AUDIT: the LIVE short test
      ALREADY caps at soft floor 10 / HARD cap 15 (`responseSubmit` uses `shortTestShouldTerminate`;
      `shortTest.test.ts` pins `hardCap === 15`). The "served up to 25" was a stale crosswalk-
      SCRIPT model (`build-served-crosswalk.ts` used the generic engine stop `shouldTerminate` /
      MAX_QUESTIONS = 25 + generic router) that overstated length once #139/#140 widened pools
      past 25. Fixed: the crosswalk now replays the real short-test stop + coverage router;
      regenerated `served-crosswalk.{md,json}` show served **10–12** (deep pools L1 35 / L2 52 /
      L3 38). Hardened the unreachable no-anchor short fallback to also cap at 15; comprehensive
      length untouched (20–30); progress denominator confirmed ≤15.
      NOTE: this corrects the #140 crosswalk regen below, which had rebuilt the artifacts for the
      band widening but still using the generic 25-cap script — the served counts are now right.

## 0. 2026-06-22 — short-test sampling band fix (PR #139 — MERGED; PR #138 CONVERSION — MERGED)

Trunk head **`17fa2bf`**. No migration / no `supabase db reset`.

- [x] **PR #139 (lane/young-band-sampling-band) MERGED (`17fa2bf`)** — short-test band →
      {previous, current} at every non-floor level, {0A} only at the 0A floor. Renamed
      `previousBookletHalfGrades` → `shortTestLevelBand`; 3 short-path call sites updated
      (pick band, eligible-count discovery, `max_questions` ceiling). SCOPE: changes the served
      band for EVERY non-floor level (prior behavior was uniformly previous-only). Comprehensive
      picker unaffected. Supersedes the earlier Task C(c) content-identity verdict.
- [x] **PR #138 (lane/l0ab-content-identity-20260622) MERGED (`d1dcc31`, CONVERSION)** —
      confirmed L0A/L0B bank content is NOT duplicated; the identical-rendering cause was the
      band (fixed in #139).

- [x] **CONVERSION lane — regenerate the served-order crosswalk artifacts — DONE (PR #140,
      MERGED `872f044`).** `scripts/conversion/audit/served-crosswalk.{md,json}` were rebuilt
      against the new `shortTestLevelBand` by re-running `build-served-crosswalk.ts` over
      `seed.sql`. Memory record in PR #143.

## 0. 2026-06-22 — ATLAS UI / onboarding session (PRs #133 / #135 / #136 — ALL MERGED)

Trunk head **`1f0196a`**. No migration in any of the three — no `supabase db reset` needed.

- [x] **PR #133 (lane/landing-page-cleanup) MERGED (`55d5b8d`)** — landing/auth cleanup (Task A).
- [x] **PR #135 (lane/assessment-flow-fixes) MERGED (`2e388bd`)** — assessment/onboarding flow
      (Task B): beta-welcome once-only on /add-child, parent-intro restored (default-ON),
      duplicate mascot screen removed, per-session progress ceiling, required grade, real mascots.
- [x] **PR #136 (lane/parent-intro-final-copy) MERGED (`1f0196a`)** — FINAL founder-approved
      parent-instructions copy; env.ts merge conflict (shared flag flip) resolved.

- [x] **RESOLVED — L0A vs L0B "identical rendering" (Task C(c)).** The earlier verdict framed
      this as a content-bank identity issue. CORRECTED: the cause was the short-test sampling
      band (a 0B child was served an all-0A test), fixed in **PR #139**. PR #138 (CONVERSION)
      separately confirmed the 0A/0B bank content is NOT duplicated. No bank de-dupe needed.
- [x] **PR #140 (lane/crosswalk-regen-band-20260622) MERGED (`872f044`)** — regenerated the
      served-crosswalk artifacts (`served-crosswalk.{md,json}`) against the new
      {previous,current} band; docs/artifacts only, no migration / no `supabase db reset`.
      Verify GREEN 1232/91. Closes the #139 crosswalk follow-up above.
- [ ] **Dimitri: merge PR #143 (lane/memory-crosswalk-band-20260622)** — this memory record
      (CURRENT_STATE / NEXT_ACTIONS / DECISIONS) for the #140 regeneration + Task C(c) closure.
      Docs/memory only; no DB change.

- **RESOLVED (was PR #135 gate item):** parent-intro DRAFT copy — founder approved the FINAL
  wording, landed in PR #136. The `proctoring/copy.ts` banner now reads FINAL/approved; future
  wording changes remain §2.4 gate-to-Dimitri.

## 0aaaa. 2026-06-22 — Young-band + L3 QA defect batch (PR #134, lane/young-l3-qa-defects-20260622)

**Trunk head entering this work: `f95920c`. PR #134 OPEN — CI GREEN, Vercel GREEN.**
Verify: 1225 tests / 91 files GREEN, tsc 0, lint 0 errors (2 known warnings), build OK,
seed-migration parity PASS (71 migrations). Codex manual/skipped (relay unauth).

- [ ] **Dimitri: merge PR #134 (lane/young-l3-qa-defects-20260622)** after Vercel preview
      review. Then, in order:
      (a) Run `pnpm convert:upload-activation-images` to push the 3 new stimulus images
          (`sam-l0a-q11-stimulus.png`, `sam-l0b-q02-stimulus.png`,
          `sam-l0c-q13-stimulus.png`) and the re-pointed cake image
          (`sam-l0b-q03-stimulus.png`) to the private `question-images` bucket.
      (b) Re-upload `scripts/conversion/source/4/L4-21.png` with a corrected version
          that includes dimension labels (exact values from the worksheet — do NOT
          fabricate). Then re-run the image upload step for that key.
      (c) Run `supabase db reset` (applies `20260622120000_young_qa_image_stem_fixes.sql`
          — 3 UPDATEs on SAM-L0A-Q11, SAM-L0B-Q02, SAM-L0C-Q13 — AND
          `20260622130000_l0c_q04_factfamily_multiblank.sql` — SAM-L0C-Q04).

- [x] **RESOLVED — SAM-L0C-Q04 fact-family (was "EQUATION_SET prefill lane").** The
      prefill framing was over-scoped. Re-authored to MULTI_BLANK (migration
      `20260622130000` + seed mirror, same PR #134 lane): operands shown as `text` tokens
      (3+6 / 6+3 / 9-3 / 9-6), each result its own `blank` slot, per-blank numeric grading
      reusing canonical answers (9,9,6,3). No new prefill concept, no cross-cutting change.

- [ ] **PARKED — SAM-L4-Q21 corrected source PNG (needs Dimitri).** The file
      `scripts/conversion/source/4/L4-21.png` is a blank blue rectangle with no
      dimension labels. Plain-English: the question asks about the area of a rectangle
      but the image shows no numbers. The correct dimensions must come from the real
      S.A.M. Level 4 worksheet — they must NOT be invented. Founder to re-upload the
      correct source PNG (with labels), then re-run the image upload for that key.
      No DB change was made.

## 0aaa. 2026-06-21 — Picker Calibration (PRs #119 / #121 / #122, stacked)

**Trunk head entering this work: `ce9a676` (PR #115). PR #119 now MERGED → current trunk
head `c3ad839`.** All three PRs verify-bar GREEN; Codex manual/skipped (relay unauth).
Merge order #119 → #121 → #122.

- [x] **PR #119 (lane/picker-short-outcome) MERGED** (`c3ad839`). **Dimitri: run
      `supabase db reset`** if not already done after the merge — adds nullable
      `assessment_sessions.short_test_outcome` column (migration `20260621130000`). No image
      upload.
- [ ] **Dimitri: check PR #121's base now that #119 merged** —
      `gh pr view 121 --json baseRefName`; if still `lane/picker-short-outcome`, run
      `gh pr edit 121 --base ATLAS-ASSESSMENT`.
- [ ] **Dimitri: merge PR #121 (lane/picker-comprehensive)** after Vercel preview review.
      No new migration; no `supabase db reset` needed after this PR alone. After merge:
      retarget PR #122's base to ATLAS-ASSESSMENT if needed.

- [ ] **Dimitri: merge PR #122 (lane/picker-floor-ceiling)** (after #121 merged +
      retargeted), then run `supabase db reset` (adds nullable
      `assessment_sessions.manual_placement_needed` column, migration `20260621140000`).
      Then resolve the 3 batched gate items in PR #122:
      (1) Confirm (or edit) the §2.4 draft parent copy lines `floorFoundLine` and
          `ceilingLine` in `src/lib/report/manualPlacement.ts`.
      (2) Decide: render floor-found/manual/ceiling copy in the parent report + surface
          `manual_placement_needed` in the instructor view. Not yet built; needs copy
          decision first.
      (3) Thin-pool coverage: parametric item generation is out of scope; readiness min-N
          floor + comprehensive confidence intervals are the current mitigations. Confirm
          acceptable.

- [ ] **PARKED — §2.4 draft copy in `manualPlacement.ts` (needs Dimitri).** The
      `floorFoundLine` and `ceilingLine` strings are parent-facing outcome claims (§2.4).
      Plain-English: these are the sentences that tell a parent what it means when the
      assessment hit the bottom or top of the question bank. They are drafted but founder
      must confirm the exact wording before they render. No build until confirmed.

- [ ] **PARKED — instructor view for `manual_placement_needed` (needs Dimitri copy
      decision above first).** Once §2.4 copy is approved, a follow-up lane will render
      the placement guidance in the parent report and surface the flag + floor-find data
      in the instructor view.

## 0aab. 2026-06-21 — short-eligible / comprehensive over-set audit L0A–L4 (PR #123, lane/short-eligible-overset-audit)

**Finding: key-parity is COMPLETE (zero gaps, zero over-flags). Over-set ceiling is source-key capped, not under-flagged.** No migration, no seed change, no flag change — docs and reusable helpers only.

- [x] **PR #123 (lane/short-eligible-overset-audit) MERGED** (`c4a67e8`, docs/helpers only).
      Deliverables: `scripts/conversion/audit/short-eligible-overset-audit.md`,
      `overset-state.mts`, `_extract_short_keys.py`, `build-overset-matrix.mjs`,
      `bank-final-state.json`.

- [ ] **PARKED — thin booklets (needs Dimitri / product decision).** Per-booklet active&STE
      pools: booklet-4=5 rows (critically under), booklet-0C=8 (thin). Plain-English: do we
      accept thinner per-strand coverage in these booklets, or commission more converted
      Short=Y content to fill them? Also: `SAM-L3-Q04`, `SAM-L3-Q23`, `SAM-L4-Q17` are
      Short=Y in the source key but have NO DB row (converter-skipped) — these are recoverable
      only by re-authoring. No build until directed.

- [ ] **PARKED — ATLAS comprehensive-picker open question (architecture).** The full active
      previous-booklet bank is far larger than the STE subset (e.g. booklet-4: 37 active vs 5
      STE). NOTE: the Picker Calibration comprehensive picker (PR #121) draws previous/at/reach
      items from the FULL active bank (`is_active`, via `pickQuestion`), reserving
      `short_test_eligible` for the SHORT test only — so the over-set concern is largely moot
      under that design. Confirm when #121 lands.

## 0aac. 2026-06-21 — young-band short-test gate audit (PR #120, lane/young-band-image-activation-audit)

**Finding: the young-band (0A/0B/0C) SHORT-TEST beta has NO remaining content gate.**
The short-test-eligible image set is fully active on trunk `ce9a676`. The 9 inactive
image rows are FOUNDER-ADJUDICATED EXCLUDED from the short test — **not a content gap,
not a beta gate.** Docs/memory-only PR records + reconciles this.

- [ ] **Dimitri: merge PR #120 (lane/young-band-image-activation-audit) at leisure**
      (docs/memory only — findings doc + this record + CURRENT_STATE). No DB change, no
      migration, no seed change, no image upload, no `supabase db reset`. Verify GREEN
      1196/89; seed↔migration parity PASS.
- **Result:** 53 young-band rows = 36 active / 17 inactive. 26 active IMAGE rows (0A=11,
  0B=6, 0C=9). The 9 excluded image rows (SAM-L0A-Q09/Q12, L0B-Q01/Q08/Q12/Q13,
  L0C-Q01/Q06/Q12) carry `short_test_eligible=false` + `is_active=false`, picker-enforced
  (`shortTestPicker.ts:50-51`) — inert to the short test regardless of art. Exclusion is
  machine-readable; no new flag needed. (Earlier note that mislabelled these as
  "blocked on missing art" is corrected in this PR.)
- **COMPREHENSIVE-ONLY / future (NOT a short-test or beta concern):** if any of the 9
  excluded rows are ever pulled into the comprehensive bank, they would need curated
  per-question crops + deliberate re-adjudication. Also carried: SAM-L0B-Q05 count-back
  blank-layout ambiguity. Full audit:
  `scripts/conversion/audit/young-band-image-activation-status.md`. **Do NOT re-surface
  these as short-test blockers.**

## 0aa. 2026-06-21 session — QA merges + crosswalk re-pin (lane/qa-crosswalk-l1l2)

**Trunk merges since the 2026-06-18 snapshot (all MERGED to ATLAS-ASSESSMENT):**
PR #109 (fix-dup-migration-version, `e489312`) · #110 (restore-seed-mirrors, `8d3d09c`)
· #111 (seed-parity-guard, `20127b0`) · #112 (l0c-qa-fix-batch, `3c5dfc0`) · #113
(qa-fixes-l1-l4 — L1 Q1/Q2/Q4/Q8 + L4-Q06, `f5fdbc9`) · #114 (short-test-followup-form,
`7f2a737`). **Trunk head = `7f2a737`.**

- [ ] **Dimitri: merge the crosswalk re-pin PR (lane/qa-crosswalk-l1l2)** after Vercel
      preview review, then run `supabase db reset` (applies migration
      `20260621120000_l1_q28_stem_rework.sql` — one stem correction; seed mirror also
      carries it on the dev path). No image upload, no new asset. Verify GREEN 1181/87,
      tsc 0, lint 0 errors (2 known warnings).
      - Crosswalk integrity confirmed: the "MISMATCH" was a stale manual estimate, not a
        served≠eligible gap. Per-child served counts are all correct (0B/L1/L4 =
        bank-exhaustion; L2/L3 = 25-question cap). No picker-stops-short defect.
      - L2-Q1 (served order) = SAM-L1-Q28: stem reworded to "Arrange the numbers in order,
        from smallest to largest." (was duplicating the 17/20/10 tiles); stays DRAG_DROP,
        served shuffled, grading unchanged. FIXED.
      - L2-Q2 = SAM-L1-Q23 (ribbon word problem): no image defect — text-complete (7+3=10),
        not triangle-counting. REPORTED, no fix. See decision queue below.
      - L1-Q3 = SAM-L1-Q01 (same-color): already source-correct — reds interleaved at
        tiles 1/3/5 matching the worksheet; id-keyed grading. REPORTED, no fix.
      - Artifacts committed: `scripts/conversion/audit/build-served-crosswalk.ts`,
        `served-crosswalk.{md,json}`, `repin-findings.md`.

- [ ] **DECISION QUEUE — SAM-L1-Q23 (L2-Q2) ribbon art (needs Dimitri).** The ribbon word
      problem is fully answerable as text; the worksheet shows 7 blue + 3 red ribbon
      figures (crops L1-23_1/_2). Add illustrative art (crop+upload, image_required:false)
      for visual parity, or keep text-only? No bug either way — content/product call.

## 0a. 2026-06-18 session — open PRs (all off trunk ae281dd)

- [ ] **Dimitri: merge PR #82 (lane/lead-notify-test)** after Vercel preview review. Test-only; no DB change; no supabase db reset needed.
- [ ] **Dimitri: merge PR #83 (lane/mascot-welcome)** after Vercel preview review. No DB change; no supabase db reset needed.
- [ ] **Dimitri: LEGAL — merge PR #84 (lane/coppa-consent-of-record)** after careful Vercel preview review (PDF + /coppa + /add-child checkbox; see CURRENT_STATE founder action #14 for checklist). After merge, run `supabase db reset`. Then resolve 3 batched gate items documented in the PR.
- [ ] **PARKED — /coppa page body reconciliation (needs Dimitri).** The on-screen `/coppa` page still has Stitch placeholder copy and does NOT yet match the counsel-reviewed disclosure PDF. This is parent-facing claims language (§2.4). Plain-English: after PR #84 merges, someone needs to update the rendered `/coppa` page text to match the PDF. Needs Dimitri direction before any copy change is written.

## 0. Setup (migration — DONE 2026-05-29)
- [x] New repo is a real git checkout with code present; origin head `71205e5`
      (analytics merge) recorded in CURRENT_STATE.md.
- [x] Analytics merge confirmed on origin (it's the head).
- [x] `AGENTS.md` reconciled (deduped; full autonomy rules; conventions added).
- [x] `CLAUDE.md` is a distinct orchestration file; `GEMINI.md` symlink optional.
- [ ] Confirm no stray `package-lock.json` in or above the repo; `pnpm install` in the
      new path (Dimitri to verify after first `pnpm dev`).

## 0b. Workflow / infra
- [x] **DONE 2026-05-31 — Dimitri selected `verify-bar` as the required status check.**
  Implemented via the "Branch Protection" GitHub ruleset (requires PR + verify-bar check;
  no direct pushes). PR #7 (lane/workflow-pr-ci) merged as `016e4ea`; CI ran GREEN
  (554 tests / 41 files). Required check is live.
- [x] **DONE 2026-05-31 — Rescoped ruleset `~ALL` → `~DEFAULT_BRANCH`.** The initial `~ALL`
  scope blocked pushing/deleting `lane/*` branches (required-check + deletion rules applied
  to every ref), which broke the lane→PR flow. Rescoped to the default branch
  (ATLAS-ASSESSMENT) via `gh api`, attended-authorized by Dimitri. Lane branches are now
  pushable/deletable; ATLAS-ASSESSMENT stays fully protected. See DECISIONS 2026-05-31.

## 1. Report fix pass (immediate)
- [x] Scrub page `<title>` metadata — remove "Diagnostic Excellence"; report is
      "Assessment Report" everywhere (§2.4). DONE 2026-05-30 (`c487f1c`, merged `a74c613`).
- [x] Narration anti-fabrication guard: when every sub-strand band is `no_data` / total 0,
      `strand_lede` suppressed and `key_findings.strengths` cleared deterministically
      post-validation; placement_line, recommendations_lede, and misconception-derived
      growth_areas kept. Data-path guard only — voice-locked Step-4 prompt untouched.
      New test added. DONE 2026-05-30 (fix `43b24c8`, merge `fbe8c5b`).
- [x] Wire `parent_report_generated` (emitted after report_narrations upsert; fail-soft,
      PII-free, service client) and `center_followup_opted_in` (new server action
      `recordCenterFollowupOptIn` in `feedback-actions.ts` + client wrapper
      `center-followup-cta.tsx` firing on CTA click). New tests added.
      DONE 2026-05-30 (fix `43b24c8`, merge `fbe8c5b`).
- [x] Wire report CTA: label **"Schedule a conversation with a S.A.M center director"**
      applied in `page.tsx`. Href stays placeholder. DONE 2026-05-30 (`43b24c8`/`fbe8c5b`).
- **PARKED — needs Dimitri:** Placement bar (navy fill + white text) and radar / sub-strand
  pill list are missing on the degraded/"unreliable" assessment branch. Plain-English
  context: on a speed-run with too few clean responses the report intentionally shows only
  a red "Score not reliable" banner — no placement bar, no radar, no sub-strand pills —
  because the score is not trustworthy (this matches the rule against asserting strand
  findings when data is absent). On a REAL completed assessment the full report DOES show
  the navy placement bar + radar + pills. Question for Dimitri: (a) leave the unreliable
  branch as-is (recommended) and just confirm the full report looks right on a real
  completed assessment on screen; or (b) you want some styled placement/summary shown even
  on the unreliable branch — which would need a product/credibility call. Needs on-screen
  confirmation against a real assessment (Dimitri runs the dev server).

## 1b. Brand-dot scrub — client-facing copy — DONE 2026-05-30 (fix `ffa77e5`, merge `47f9e59`)
- [x] Scrubbed trailing dot from "S.A.M" in 9 client-facing rendered strings across 7
      files: parent report footer disclaimer + next-steps body; parent-report-feedback;
      instructor portal empty-state + item-review note; signup center-selector labels
      (x3 in signup-form.tsx); assessment QuestionShell top bar; marketing hero pill.
      Left untouched: code comments/logs/type docs/tests; marketing footer sentence-final
      "S.A.M." (correct); layout.tsx description metadata. Verify GREEN (550 tests, 0
      type errors, 1 known font lint warning). Codex skipped (relay not wired).
- [x] **MERGED PR #16 — `(marketing)/page.tsx:74` hero pill "Diagnostic Suite" →
  "Assessment Suite".** lane/marketing-assessment-wording. Merged in origin head `d4743c7`.
  NOTE: 5 further visible "diagnostic" occurrences remain on the marketing page (lines 84,
  135, 170, 298, 313) — parked pending §2.4 call with Dimitri. See Parked-for-Dimitri below.
- [x] **MERGED PR #20 — remaining rendered "diagnostic" claims scrubbed to "assessment"
  (§2.4).** lane/marketing-diagnostic-scrub (commit `e6d9515`). Merged in origin head
  `d4743c7`.
- [x] **MERGED PR #21 — lane/marketing-precision-claim** (merge `a3d7d46`) — removes the
  unbacked "98% accuracy" precision claim (`e52258c`) and renames the "Diagnostic
  Precision" card heading to "Misconception Mapping" (`32f35d6`). §2.4 scrub complete
  across PRs #16/#20/#21.

## 2. Relay / unattended run loop (not gated)
- [x] **DONE 2026-05-31 — Manual-mode relay built & merged (PR #9, `164a1b2`).**
      `tools/relay/manual_codex_review.ps1` bundles a lane diff (with local-only secret
      scrub) into a Codex review request; `-FindingsFile` validates the JSON reply against
      `tools/schemas/codex_review.schema.json`; `codex-finding-resolver` then applies
      accepted findings. ASCII-only script (PS 5.1 compatibility). Local-only; `.gitignore`
      excludes `tools/relay/.reviews/`. CI GREEN: 554 tests / 41 files.
- [x] **ANSWERED 2026-06-05 (PR #17) — Codex is NOT programmatically reachable on this box.**
      Evidence: codex-cli 0.130.0 installed; api.openai.com reachable (cf-ray returned);
      but no `~/.codex/auth.json` (`codex login status` → "Not logged in") and no
      `OPENAI_API_KEY`; `codex exec` returns `401 Unauthorized: Missing bearer or basic
      authentication`. Credential blocker, not transport. Documented in
      `tools/relay/README.md` ("Reachability check — 2026-06-05" section). Manual-mode
      relay (`manual_codex_review.ps1`) remains the fallback.
- [ ] **PARKED — needs Dimitri action:** run `codex login` (or provide `OPENAI_API_KEY` on
      this box) to unblock the automated-relay upgrade and `.mcp.json` finalization.
      Plain-English: open a terminal, run `codex login`, follow the browser prompt, then
      tell the agent "Codex auth done." The agent will then wire the automated relay.
- [ ] Finalize `.mcp.json` once Codex CLI is authenticated (blocked on item above).

## 3. M2 build (not gated on G1)
- [x] Feature flags — DONE 2026-05-30 (fix `efccf4f`, merge `a9d45ba`). 11 §12 rollout
      flags added to `src/lib/env.ts`, all default-off (only `'true'` enables); `ROLLOUT_FLAGS`
      registry; new `src/lib/env.test.ts` pins the default-off invariant; `.env.example`
      documents all 11 + `REPORT_NARRATION_LIVE`. Verify GREEN: 554 tests.
- [x] Admin/support tooling — ops runbook DONE 2026-05-30 (merge `5709c13`). Operator
      stuck-session gap + consent-revoke companion insert + §7 new scenario closed by PR #43
      (lane/ops-runbook-gaps, docs/ops-runbook.md — awaiting merge). Admin UI deferred by
      decision 2026-05-30 (no admin role in schema; privacy-sensitive; pilot operable via
      Supabase/Vercel dashboards).
- [ ] OPTIONAL follow-on: service-role report-narration regen script (only if pilot needs
      it — no operator mechanism exists today to regenerate a narration without a re-take;
      see `docs/ops-runbook.md` §3 KNOWN GAP — now explicitly documented in PR #43 as an
      optional code follow-on).

## 3b. Comprehensive-test instrumentation (M2 KPI coverage) — COMPLETE on ATLAS

- [x] **MERGED to ATLAS via PR #49 (2026-06-12).** PRs #41 (instrumentation) and #46
      (engine) had landed in the stacked parent lane branch and were stranded. PR #48
      (reland attempt) CLOSED (conflicts). PR #49 cherry-picked commits 7e7c37e (#42 consent
      regression) + 2dad26c (#46 engine) onto current ATLAS head; single conflict resolved
      (instructor student page import union). Verify 900/55. ATLAS head b9b0662. Migration
      20260611090000 present — requires `supabase db reset` (see founder actions).

- [x] **MERGED to ATLAS via PR #49 — consent gate regression test (was PR #42).**

- [ ] **Comprehensive-engine reparameterization** — item cap / confidence stop / routing
      depth for the comprehensive test type. DEFERRED to the SEPARATE
      comprehensive-assembly session (decision 2026-06-11). TODO(comprehensive-engine)
      marker in codebase identifies the hook point.

- [ ] **OPEN PR #43 — lane/ops-runbook-gaps (docs only). Dimitri: merge in any order;
      no supabase db reset needed.** docs/ops-runbook.md §3 (stuck/abandoned sessions +
      Option A reset-by-delete / Option B force-close); §4 consent revoke + vpc_audit_log
      insert + revoke-all-children variant; §7 new scenario. Narration-regen KNOWN GAP
      documented as optional code follow-on.

## 3c. Security remediation lanes (external audit) — 2026-06-12 — ALL MERGED

All four security lanes are merged to ATLAS-ASSESSMENT (head 970698e). `supabase db reset`
run (applies 20260612090000 + 20260611090000). Verify baseline 915/56/build GREEN.

- [x] **MERGED PR #50 (ea53da5) — lane/served-question-gate.** responseSubmit requires
      question_access_log row for (tenant,session,question) AND no existing response; else 403
      question_not_served. already_answered is hard 409.

- [x] **MERGED PR #55 (4b31baa) — supersedes CLOSED PR #51.** PR #51 stacked on
      lane/served-question-gate; did NOT auto-retarget on #50's merge (third stranded-PR incident;
      DECISIONS.md updated). PR #51 closed; PR #55 opened directly against ATLAS-ASSESSMENT.
      Migration 20260612090000: unique(session_id,question_id) on responses; conflict-safe insert.

- [x] **MERGED PR #52 (57e5f93) — lane/ai-data-minimization.** TEXT_ENTRY math-safe sanitizer
      (allowlist, max 40; PII never reaches Haiku; fail-soft method:'none'). Narration firstName
      only. .env.example MISCONCEPTION_CLASSIFIER_LIVE default → false. Voice-locked Step-4
      SYSTEM prompt TEXT unchanged.

- [x] **MERGED PR #53 (1997b3d) — lane/next-upgrade-ci.** next + eslint-config-next
      16.2.4→16.2.9. 'pnpm build' step added to verify.yml. 3 MODERATE transitive advisories
      (postcss/ws/brace-expansion) — no high/critical.

## 3d. Pre-scale security mediums (NOT in scope this session — pre-pilot-hardening)

These were identified during the external audit but are out of scope until the 4 security
lanes above are merged and stable. Do not build until Dimitri confirms prioritization.

- [ ] **PARKED (pre-scale):** Rate limiting on assessment/submit endpoints.
- [ ] **PARKED (pre-scale):** Trusted-IP extraction for question_access_log / audit
      (don't trust client-supplied IP).
- [ ] **PARKED (pre-scale):** RLS integration tests — prove cross-parent / cross-center
      isolation at the DB layer.

## 3e. QA-prep for founder's end-to-end run — DELIVERED 2026-06-12

- [x] Dev-only idempotent SQL script: `supabase/dev-seed-instructor-roster.sql`.
      Creates qa-instructor@atlas.test / Atlas-Pilot-2026; aligns instructor center to
      parent's children's center; parent-email param at top; Studio-paste-ready.
- [x] Env lines confirmed: `docs/qa-prep-e2e-run.md` documents REPORT_NARRATION_LIVE +
      MISCONCEPTION_CLASSIFIER_LIVE in `.env.local`; 4-grade coverage recommendation
      Grade 1/3/4/5.
- [x] Coverage checked. Key QA findings surfaced in the doc:
      - **COMPREHENSIVE not reachable from UI** — startSession sends only `{child_id}`;
        requires ENABLE_COMPREHENSIVE_PILOT=true AND manual POST to /api/assess/start
        with `comprehensive:true`. Short-path assessment unaffected.
      - **data_statistics strand: 0 active questions** — auto-excluded from scope.
      - **geometry strand: only 4 active questions bank-wide** — thin coverage.
- [ ] **OPEN PR (lane/qa-prep-2026-06-12) — Dimitri: merge after Vercel preview review.**
      Adds supabase/dev-seed-instructor-roster.sql + docs/qa-prep-e2e-run.md.
- [ ] **PARKED — needs Dimitri decision:** COMPREHENSIVE test UI reachability. Options:
      (a) leave as manual-POST only for pilot (no UI change; document for pilot testers);
      (b) add a dev-mode toggle in the assessment start flow. Plain-English: the
      "comprehensive" assessment mode cannot be triggered by a parent clicking Start — it
      needs a direct API call. Is that acceptable for the pilot, or do you want a UI
      path? Needs product call before building.

## 3f. Visual-primitive + answer-input library (G1-3) — PR #59 OPEN 2026-06-13

- [ ] **PARKED — needs Dimitri:** Eyeball the gallery on the PR #59 Vercel preview. Steps:
      (1) set `ENABLE_VISUAL_PRIMITIVES_GALLERY=true` in the Vercel Preview env for this PR,
      (2) redeploy the preview, (3) open `/dev/visual-primitives`. Then merge if satisfied.
      No DB change; no supabase db reset needed.

- [ ] **★ PRIORITY (QA-unblocking) — MERGE PR #58 (Issue-1 served-gate multirow fix).**
      lane/served-gate-multirow-fix, commit `7245826`. `responseSubmit/handler.ts` access-log
      existence check `.maybeSingle()` → `.limit(1)`. Verified 2026-06-13: the fix is NOT on
      trunk (head f8c0f30 still `.maybeSingle()` at handler.ts:385); first-submit/Strict-Mode
      resume still 500s on trunk. PR #58 is MERGEABLE/CLEAN, verify-bar SUCCESS, Vercel SUCCESS —
      attended merge only; no DB change / no supabase db reset. (Earlier "uncommitted, no PR"
      note superseded — founder committed + opened #58 mid-session.)

- [ ] **Follow-up PR (lane/memory-audit-2026-06-13)** carries this session's 3 memory/
      run-state files + `docs/sam-content-authenticity-audit.md` Appendix A — moved off
      lane/served-gate-multirow-fix to keep PR #58 = Issue-1 fix only. Off ATLAS-ASSESSMENT,
      not stacked. Its audit doc is the FULL file and overlaps #58's base audit doc → merge
      #58 first, then resolve the one-file conflict by keeping the fuller (Appendix A) version.

- [ ] **CONVERSION session — re-author SAM-L1-Q25** ("write a fact family 6,8,2") from a
      collapsed single TEXT_ENTRY answer to the equation-set answer input + set-equality
      grading model (per `docs/answer-model-spec.md` worked 6/8/2 example). This is the one
      gradeability-flagged active G1-3 item. Bank-owned; do not touch in app lanes.

- [ ] **CONVERSION — content-integrity gate (PARKED, bank-owned).** Root cause: `questions`
      has no provenance/rights/"model-reconstructed" column (authenticity only inferable from
      `external_id` + migration comments). ~5 ACTIVE rows need PDF-faithful re-authoring before
      they can be trusted as served items: **SAM-L3-Q15** (mojibake MC, options invented→dropped,
      now TEXT_ENTRY "4/6"); **SAM-L3-Q03** (options were model value-equivalents, replaced with
      page-verbatim — re-confirm); **SAM-L6-Q09/Q11/Q12** (fraction answers vision-recovered from
      symbol-font keys); **SAM-L4-Q15** (answer "1 km 750 m" self-flagged suspect — pending founder
      PDF check). See `docs/sam-content-authenticity-audit.md` ACTIVE-candidates section.

- [ ] **CONVERSION/content — 24 inactive image-essential L1-L3 rows** (L1 6 / L2 8 / L3 10)
      are the bespoke tail; each needs either a curated per-question image OR re-authoring
      against the parametric primitives before activation. The active G1-3 set has ZERO
      bespoke-image items; no blocker on the current active bank.

- [ ] **Picker level-band widening — decided-in-principle: ±3 half-grades, graceful widening**
      (`docs/picker-level-band-proposal.md`, on PR #58). IMPLEMENT AFTER the CONVERSION
      re-authoring above (don't widen the served band while model-reconstructed rows are still
      unverified). Sequencing decision; not yet built.

## 3i. L0/L1/L2 activation wave — PR #78 OPEN 2026-06-16

- [ ] **★ BEFORE MERGING PR #78 — Dimitri: upload manifest images to the private
      `question-images` bucket.** An activated image row whose file is missing will 500 at
      serve time. Required folders: `l0/`, `l1/`, `l2/`. Full upload manifest is in
      `scripts/conversion/l0-l2-activation-notes.md`. Also confirm the 7 already-active L2
      images are present in the bucket. After upload: merge PR #78 + `supabase db reset`.

- [ ] **PARKED — one-image-away (flip once founder provides a single curated image):**
      - SAM-L0A-Q17: needs a group-of-balloons image (only single-balloon crops exist).
      - SAM-L0B-Q07: needs the two sorted-shapes part-crops composited into one image.

- [ ] **PARKED — content decisions (held inactive, non-blocking):**
      - SAM-L0B-Q06: number-line crop has no printed numbers; answer key "Color 7 and 6"
        conflicts with stem "greater than 6". Needs founder/S.A.M. to supply real tiles +
        correct subset.
      - SAM-L0B-Q03: no answer key / reference available.
      - SAM-L0B-Q05: ambiguous given/blank layout.
      - SAM-L1-Q07: no correct option identified.
      - SAM-L1-Q25: verbatim stem only at DB head, not overlay — pull to overlay to flip
        equation-set.
      - SAM-L1-Q08: multi-axis position answer, not clean binary; held.

- [ ] **PARKED — structural blocks (non-activation-path until resolved):**
      - Single-scene no-discrete-tiles: SAM-L1-Q01/Q06/Q26.
      - Missing source image: SAM-L0A-Q12, SAM-L0B-Q08/Q12/Q13, SAM-L0C-Q01/Q06/Q12.

- [x] **INTERNAL-TAXONOMY (ours to finish) — RESOLVED, NOT a Sam/S.A.M. dependency.**
      The `content_id` scheme is an internal Atlas scheme; Code creates the codes from
      each worksheet's Topic column. These rows had NULL `content_id` only because the
      internal node didn't exist yet — they were never externally gated. New internal
      nodes created + rows tagged/activated (PRs #103–#105): l0a-geometry-5 "Same or
      Different", l0a-geometry-6 "Positions", l0c-geometry-4 "Comparing and Ordering",
      l0c-whole_numbers-6 "Odd and Even Numbers"; 0B position → existing l0b-geometry-1.
      (Remaining holds among these are NON-taxonomy: SAM-L0A-Q15/Q16 inadequate-art/
      manual, SAM-L0A-Q12 + SAM-L0B-Q01 missing/unwired — not code-gated.)

- [ ] **NOTE (non-blocking, cosmetic review):** SAM-L1-Q16 crop has baked-in
      question-number/name text — flag if undesirable for parent render.

## 3h. L0 authoring (0A/0B/0C) — PR #74 OPEN 2026-06-15

- [ ] **Dimitri: merge PR #74 after Vercel preview review, then run `supabase db reset`.**
      Applies two migrations: `20260616120000` (enum DDL — adds 0A/0B/0C to `half_grade_level`)
      and `20260616120100` (28 inserts + 21 re-banded updates). No app-code change; no verify
      re-run needed post-merge. Seed.sql mirror is purely additive (+426/-0).

- [x] **INTERNAL-TAXONOMY (ours to finish) — RESOLVED.** Four L0 topic areas had
      NULL `content_id` only because our internal taxonomy lacked a node, NOT because of
      any external dependency. The taxonomy is an internal Atlas scheme; creating codes
      from the worksheet Topic column is our job. Nodes created + rows activated
      (PRs #103–#105): 0A "Same or different" → l0a-geometry-5; 0A position →
      l0a-geometry-6; 0C "Comparing and Ordering" → l0c-geometry-4; 0C "Odd and Even
      Numbers" → l0c-whole_numbers-6. This was never a founder/S.A.M. decision.

- [ ] **PARKED — 0B Task 6 answer-key conflict (SAM-L0B-Q06, held inactive).**
      Stem asks for the number "greater than 6"; answer key says "Colour 7 and 6" — "6" is
      not greater than 6. Row is inactive (held-C). Needs founder/S.A.M. to clarify the
      intended correct subset before this row can be activated.

- [ ] **Activation of held L0 image/format rows** (3 held-A + 31 held-C) — same dependency
      as L1-3: per-tile image minting must be added to `serveQuestion.ts` (NEXT_ACTIONS §3g)
      AND curated per-question images must be placed (crops from docx in
      `input/source/0{a,b,c}/`, not committed). Non-blocking while held.

- [ ] **content_id on the 21 re-banded L0 rows is unchanged** — the overlay UPDATE re-bands
      `level` but does not re-resolve `content_id` (same limitation as L1/L2 appliers).
      Resolve in a future taxonomy-extension pass if/when L0 codes are assigned.

## 3g. Image answer-inputs (3 click-image formats) — PR #71 MERGED 2026-06-15

- [x] **MERGED — PR #71 (lane/image-answer-inputs), merge `e3f60f1` (lane commit `7abdf4d`).**
      Off ATLAS-ASSESSMENT head `dfc9925`, not stacked; trunk head is now `e3f60f1`. Adds
      question_format values CLICK_IMAGE_SINGLE / CLICK_IMAGE_MULTI / IMAGE_ORDERING with full
      client input + server grading, forward-wired. Enum-DDL-only migration `20260615120000`
      (applied on the next `supabase db reset`; no row data, no seed mirror). NO rows touched;
      guardrail intact. Verify GREEN 1074/75, tsc 0, lint 0 errors (2 known warnings), build OK.

- [ ] **★ ACTIVATION DEPENDENCY (CONVERSION-owned, MUST precede activation) — per-tile image
      minting for the 3 image formats.** `serveQuestion.ts` currently mints per-tile signed
      URLs ONLY for VISUAL_MATCHING (`mintMatchingTileImages`, which reads `content.left`/
      `content.right`). The image-input formats carry their tiles at `content.tiles[]` with
      per-tile `image_path`; an analogous minting pass must be added BEFORE any of these held
      rows is flipped `is_active=true`, or they will serve **pictureless** (TileFace falls back
      to the text label). No runtime risk while held (held rows are never served). Activation
      contract (from migration `20260615120000` header): set format to the matching enum value,
      populate `content.tiles`, wire per-tile minting, clear
      `content._authoring.requires_format_swap`, set `is_active=true` — and KEEP
      `content._authoring.answer_model` where `correctness.ts` reads it for these formats.

## 4. G1 LIFTED (2026-06-10) — CONVERSION L1–4 run COMPLETE; merge + radar check remain

**G1 status:** S.A.M. founder granted permission to digitize the entire test library
(session brief 2026-06-10). Stage 4 fully unblocked.

- [x] CONVERSION Stage 4 — DB load script built (PR #23, lane/conversion-stage4-load,
  `40d32b3` + supplement guards `903650a`: 21-code misconception validation fails loudly,
  per-run load report in conversion.log; image_required rows load `is_active=false`;
  staging-prefix uploads to private `question-images` bucket). DONE-pending-merge.
- [x] Content-id backfill built (PR #22, lane/questions-content-id-backfill, commits
  `5b249f5`+`c6e1485`, worktree `atlas-backfill`). Maps all 11 SAM-L2 questions to
  `content_id`. Seed.sql mirror placed AFTER the tax_content seed block (ordering matters;
  new test pins this). DONE-pending-merge.
- [x] **L1–4 conversion run COMPLETE 2026-06-10** (founder provided all 0A–7 PDFs;
  run sequential L1→L4 in worktree `atlas-stage4`, all on PR #23): 100 tagged / 0 failed;
  **79 loaded** (L1 12, L2 22, L3 20, L4 25 — 49 active, 30 inactive image-essential),
  all rows with content_id; 21 skipped (drag-drop answers unmappable to items/order,
  missing answer-key entries, 2 malformed MC). Migration `20260610151306` + seed.sql
  marker block; commits `97bcf49`/`23da354`/`9b2db6c`/`8e71b08`. En-route fixes:
  numbered-list answer-key parser (`5c13070` — L3/L4 keys), stage3 429-retry
  (`506936d`), stage2/3 skip-existing guards (`a1685d6`). Verify GREEN 630 tests /
  45 files; CI verify-bar pass. The 11 hand-seeded SAM-L2 rows win over generated
  duplicates via `on conflict do nothing` (by design).
- [x] **MERGED PR #22 (`016357e`) + PR #23 (`1ebb01e`)** — attended 2026-06-10.
- **SESSION SPLIT (2026-06-10):** all further CONVERSION / question-bank work (image
  curation reruns, QA pass, full-library digitization) runs in a SEPARATE session.
  Other sessions must not touch `scripts/conversion/` or taxonomy migrations;
  coordinate via repo memory only.
- [ ] **Radar acceptance check** (after merges + `supabase db reset`): reset output
  shows the backfill notice (`sam-l2 total=11 mapped=11 unmapped=0`) and the 79-row
  load. Demo report radar will still read "not assessed" (seed has zero responses rows
  by design). Real acceptance: complete one fresh dev assessment, open its report,
  confirm radar populates with strand data. Could not be verified in-session: local
  Supabase stack was down (assistant never starts it).
- [ ] **Image curation** — 30 inactive image-essential questions need curated
  per-question images (full-page renders leak neighboring questions; never ship them).
  Upload manifests sit in each `output/<worksheet>/stage4-upload-manifest.json`;
  re-run `pnpm convert:load` with the local stack up to push staging uploads.
- [ ] Question-bank QA pass — review stage3-review.md sheets (founder gate from the
  original pipeline design): 0A/0B→L1 mapping convention on the L1 worksheet, 21
  skipped questions (recoverable via human-authored equivalents), per-question flags.
- [ ] Comprehensive-test assembly — engine reparameterization (config); needs the bank.
- [ ] Curriculum-recommendation table population.
- [~] Full-library digitization (0A–0C, 5–7; PDFs already in input/). **Phase 1 DONE
  2026-06-11 (lane/full-library-run, worktree atlas-stage4):** tagged+loaded 0A/0B/0C/5/6
  (L7 parked). Tagged 117 (0 failed). Loaded **81 rows** (active 50 / inactive 31; 32
  skipped — mostly Kindergarten DRAG_DROP picture/drawing tasks + L5/L6 symbol-font MC
  caught by the options-divergence guard). Delta migration
  `20260611134158_load_sam_questions.sql` (81 new external_ids only).
  - **L6 key recovery:** the 7 symbol-font L6 keys (Q9–Q13 text/arithmetic, Q15/Q16 area)
    were vision-recovered from the answer-key + worksheet page images and injected into L6
    stage2 before tagging. Q9–Q13 loaded ACTIVE; Q15/Q16 INACTIVE (image-essential, key
    stored — activate at curation). Q17 (draw top/side view) skipped (drawing, no key).
    Mixed/fraction answers (Q9 "8 1/28", Q11 "88 1/2", Q12 "5/18") reclassified
    NUMERIC→TEXT_ENTRY via `20260611140000_reclassify_l6_recovered_text_entry.sql`
    (mirrored in seed after the new-levels INSERT). Q10 "2.17", Q13 "100" stay NUMERIC.
  - **⚠ PENDING RECONCILIATION (founder Option-1 decision 2026-06-11):** to leave the
    L1–4 rows byte-for-byte unchanged, the new-levels rows were added to `seed.sql` as a
    **separate block OUTSIDE the stage4 BEGIN/END markers** (the loader rebuilds the
    marker block from on-disk stage3 outputs, and L1–4's stage3 outputs are stale vs the
    two correction migrations — a cumulative re-run would drop the gated L3 rows). A
    future full cumulative re-load must (a) make the L1–4 stage3 sources guard-clean
    (fold in the `20260610170100`/`20260610180000` fixes) and then (b) fold the new-levels
    block back inside the single stage4 marker block. Until then the stage5/qa audits
    label the new levels "hand-seeded"/"UNKNOWN" (cosmetic artifact of the split).
  - Backups left in place: `supabase/seed.sql.prefulllib.bak` (pre-new-levels seed) and
    `output/Level 6 Placement Worksheet/stage2-questions.json.pre-recovery.bak`.
  - Phase 2 sweep GREEN: mc-index 51 MC (44 match / 1 known L3-Q11 mismatch / 6 no-key);
    stage5 audit checked=161 suspect=37 unverifiable=17; QA refreshed
    `output/QA-audit-L1-4.{md,csv}` (161 rows, 99 active / 62 inactive). Verify bar GREEN
    (864 tests / 52 files, tsc 0, lint 2 known warnings). Phase 3 NOT started (stopped per
    instruction).
- [ ] Remaining digitization: L7 (parked); image curation for the new inactive image-
  essential rows.
  - [x] **L5/L6 banding + missing-row load + image_path wire — DONE (PR #169, 2026-06-25).**
        6 previously-skipped L5/L6 rows loaded; 15 image rows wired (activation-ready);
        all SAM-L5/L6-* re-banded to booklet level (5A/6A) per founder's LOCKED decision.
        SAM-L5-Q27 HELD (image-option per-tile not yet wired — see parked item above).
        The "Level review (founder/picker decision)" follow-up from l5l6-conversion-status-2026-06-23
        is resolved by the founder's booklet-level decision.

## 4b. Assessment mascot (DONE-pending-merge 2026-06-10 — PR #34, lane/assessment-mascot)
- [x] Dachshund mascot integrated into the child flow (3 poses at stable paths:
      `stitch/mascot/mascot1.png` waving / `mascot2.png` thinking / `mascot3.png`
      celebrating; future art swap = file replacement, no code change). Loading screen
      waves; K-4 question footer hosts a small in-flow thinking mascot (cannot overlap
      answer UI); completion celebrates on both tiers (replaces the placeholder icon —
      gate decision #8 asset landed). Motion: K_4 transform-only pop+bounce, G5_8 still,
      reduced-motion still (policy tested in `lib/mascot.test.ts`). No branding added in
      code/copy. Verify GREEN 644 tests / 47 files. G3 cleared 2026-06-10 (counsel
      approved consent flow).
- [x] **MERGED PR #34** (`58e4659`, attended 2026-06-10). On-screen K-4 phone-width
      check (footer mascot vs. answers) still worth a glance during normal dev use.
- [ ] **Dimitri: merge the docs-only micro-PR** from lane/agents-ci-typecheck-learning
      (AGENTS.md learning that missed the #34 merge window), then delete the stale
      `lane/assessment-mascot` remote branch (2 post-merge straggler commits, both
      superseded).
- [ ] Later (founder): swap `stitch/mascot/mascot1-3.png` for the updated untagged art
      (same filenames), then rebuild/redeploy.
- NOTE: "celebrate on correct streaks" is NOT possible client-side — per-question
      correctness deliberately never reaches the child client. Would need an API change;
      product call, not picked up autonomously.

## 5. Deferred (do not build now)
- [ ] 4-beat findings depth + narration voice re-tune (re-opens voice-locked Step 4
      prompt; hold until after the SAM deck).
- [ ] Offline (v2); multi-tenant scale-out (M5); remaining S.A.M. levels + public items.

## Parked-for-Dimitri (rollup)
- **[RESOLVED 2026-06-22] SAM-L0C-Q04 fact-family** (was "EQUATION_SET given/prefill
  lane") — fixed via MULTI_BLANK in migration `20260622130000` (PR #134). The prefill
  framing was over-scoped; MULTI_BLANK shows the operands as text and gives each result
  its own blank. No dedicated lane needed.
- **[NEW 2026-06-22] SAM-L4-Q21 corrected source PNG — PARKED (needs Dimitri).** Current
  `scripts/conversion/source/4/L4-21.png` is a blank blue rectangle; no dimension labels.
  Founder must re-upload the correct cropped worksheet PNG with labels (real values from
  Level 4 worksheet; do NOT fabricate). Then re-run `pnpm convert:upload-activation-images`
  for that key. No DB change.
- **[NEW 2026-06-21] §2.4 draft parent copy in `manualPlacement.ts` — PARKED.** `floorFoundLine`
  and `ceilingLine` are parent-facing outcome claims drafted in PR #122 pending Dimitri
  confirmation. No render until confirmed.
- **[NEW 2026-06-21] Instructor view + parent report render for `manual_placement_needed` —
  PARKED.** Follow-up lane not built; blocked on copy decision above.
- **[NEW 2026-06-18] /coppa page body reconciliation — PARKED.** On-screen `/coppa` page body is still Stitch placeholder copy; does NOT match the counsel PDF. Parent-facing claims language (§2.4). After PR #84 merges, Dimitri to direct the copy pass. No build until directed.
- **[NEW 2026-06-18] PR #84 batched gate items — resolve after merge.** (1) Confirm served PDF rendering acceptable; (2) /coppa copy pass (see item above); (3) confirm committing `docs/legal/Parent_Privacy_Request_Policy.docx` was intended.
- **Placement bar / radar / sub-strand pills on the degraded branch (item 1, report fix
  pass) — PARKED.** See the PARKED entry under section 1 above for the plain-English
  question. Needs on-screen check on a real completed assessment.
- **Parent-report pricing ($49 on the parent report) — PARKED, and CONFLICTS with a hard
  rule.** Requested 2026-05-30; not actioned. Adding a consumer price to the parent report
  violates BUSINESS_RULES "No consumer paywall — families never pay Atlas directly," and
  pricing models are Dimitri-owned/unconfirmed regardless. Needs Dimitri before any build;
  as written it is contrary to the locked B2B2C model.
- **§2.4 marketing page wording — RESOLVED (PR #21 merged `a3d7d46`, 2026-06-10).**
  Scrub complete across PRs #16/#20/#21 (hero pill, rendered "diagnostic" strings,
  98%-accuracy claim removal + "Misconception Mapping" card rename).
- **Codex CLI auth — PARKED (updated 2026-06-05).** Reachability confirmed as a
  credential blocker (not transport). Automated relay + `.mcp.json` unblocked once Dimitri
  runs `codex login` or supplies `OPENAI_API_KEY` on this box (see item 2 above).
- **Attend-merge PR #43 (ops-runbook-gaps) — PARKED awaiting Dimitri.** Docs only; no DB;
  no supabase db reset needed. (PRs #41 and #42 are now on ATLAS via earlier merges;
  migration 20260611090000 applied via supabase db reset 2026-06-12.)
- **Founder actions for conversion run — PARKED (updated, 2026-06-10).** Image curation for
  30 inactive image-essential questions (upload manifests in each worksheet output folder).
  Radar acceptance check: complete one fresh dev assessment, confirm radar populates.
- **COMPREHENSIVE test UI reachability — PARKED (new, 2026-06-12).** See 3e above for the
  plain-English question. Needs product call before any build.
- Franchisor pilot-approval routing — G2 (business gate).
- Pricing model (business gate); G1 license scope specifics (now LIFTED for digitization
  permission; geography/duration/derivative rights remain open).
