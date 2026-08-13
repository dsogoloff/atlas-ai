# CURRENT STATE — Live Technical State

> Volatile. Update at the end of every lane/run (via the `repo-memory-maintainer` agent).
> Replaces the technical `*_handover.md` files (ATLAS / CONVERSION / AGENTS). State-focused;
> durable rationale goes to `DECISIONS.md`, debt to `TECHNICAL_DEBT.md`.

**As of:** 2026-08-13 (ATLAS: staff alerts, director CTA, dead-link cleanup, COPPA copy, re-clamp script, self-hosted fonts) — **#211–#217 ALL MERGED**; trunk head **07e7bb1**.

Two standing caveats:
- Staff alerts are merged but **DARK** — `LEAD_NOTIFY_LIVE` is not flipped, so nothing sends.
- The re-clamp backfill (#215) is **CLOSED as NOT NEEDED**: the prod DRY RUN on 2026-08-13 found **0 affected of 16 completed sessions** (read-only, zero writes). The apply variant was deliberately never run. See DECISIONS.md 2026-08-13.

The one production incident this session: the deploy of 486b230 failed because `next/font/google` fetched woff2 from fonts.gstatic.com at build time and Google returned 404. Fixed by self-hosting the fonts (#217, head 07e7bb1). Not caused by any of #211–#216.

- **PR #211 — lane/staff-assessment-alerts — MERGED (d0cb632; verify-bar GREEN: 1580 tests, tsc clean, lint 0 errors).**
  "feat(alerts): staff email alerts on account confirm + assessment completion".
  Two operational Resend emails to the pilot center, reusing the follow-up-lead transport
  wholesale — same `RESEND_API_KEY`, same verified `LEAD_NOTIFY_FROM_EMAIL` sender, same
  `LEAD_NOTIFY_LIVE` gate (default OFF: no send, no spend). Recipient is a CODE DEFAULT
  (`parents@samnewyork.com`) with an optional `STAFF_ALERT_TO` override, so it ships with
  NO Vercel env action.
  (1a) ACCOUNT CREATED fires on email-CONFIRM success (`/auth/confirm`, after `verifyOtp`),
  not raw signup. Once per account, guarded on the durable VPC trail — a pre-existing
  `verification_succeeded` row means the account was already announced.
  (1b) ASSESSMENT COMPLETED fires on server-side finalization, from the same two
  fresh-submit terminal paths as the `test_completed` / `placement_created` funnel events;
  a sequential retry 409s before those paths and a concurrent duplicate returns via
  `duplicateResult()`, which emits nothing.
  Both wrapped in `after()` (non-blocking) and fail-soft — neither notifier throws.
  New `src/lib/staffAlerts/notify.ts` + tests; `src/lib/env.ts` gains
  `getStaffAlertToEmail()`; `/api/assess/submit` threads request origin for the record link.

- **PR #212 — lane/director-cta-mailto — MERGED (25c56c4; verify-bar GREEN: 1557 tests).**
  "feat(cta): interim director mailto replaces the dead schedule placeholder".
  `CTA_LINKS.scheduleFreeClass` was `#schedule-a-free-class` (a dead anchor); now a mailto
  to `parents@samnewyork.com` with the director-call subject URL-encoded, no body prefill.
  Button labels unchanged. INTERIM ONLY — the env-gated `SAM_SCHEDULER_URL` swap and its
  relabel remain the HubSpot lane's Contract B and are deliberately NOT implemented.
  `todo.md` records the multi-center follow-on (center-scoped director contact AND alert
  recipient once a second center exists).

- **PR #213 — lane/dead-link-cleanup — MERGED (9774f91; verify-bar GREEN: 1554 tests).**
  "fix(ui): remove dead nav/controls, wire the setup-help link".
  Removed the Add-Child `href="#"` tabs (Students / Reports / Add Child) and its
  Notifications + Help icon buttons (no handlers), plus the parent dashboard's
  Notifications bell placeholder. Dashboard empty-state "Need help setting up your
  account?" now opens the support inbox via new `CTA_LINKS.accountSetupHelp`.
  Zero `href="#"` anchors remain in `src/`.

- **PR #214 — lane/coppa-onscreen-copy — MERGED (9ed3954; verify-bar GREEN: 1625 tests).**
  "fix(coppa): on-screen disclosure now matches the counsel-approved PDF".
  `/coppa` rendered Stitch placeholder copy that said something DIFFERENT from
  `public/legal/coppa-disclosure-v1.pdf` — the asset its own Download button serves. The
  counsel text (sections 1–10 + two opening paragraphs) is now transcribed VERBATIM into
  `src/app/(auth)/coppa/disclosure-copy.ts`; `page.tsx` owns layout only.
  `disclosure-copy.test.ts` extracts the text from the real PDF at test time and asserts
  every rendered string appears in it (71 assertions) — a "typo fix" to counsel wording
  now fails CI. The app-authored AI-processing disclosure (safeguard C2, NOT in the PDF)
  is KEPT and renumbered to section 11 so it never shifts counsel numbering.
  `src/lib/consent/text.ts` untouched; PDF download link intact.

- **PR #215 — lane/reclamp-backfill-script — OPEN, rebased onto the merged trunk (verify-bar GREEN: 1714 tests / 142 files). NOT RUN.**
  "chore(backfill): re-clamp script for pre-#206 railed placements (REVIEW ONLY)".
  Floors pre-#206 sessions' stored `current_estimate.overall_level` to the highest level
  actually served (live example: session a28f0c2a, Pre-K, 0A×10 all-correct, stored 8B).
  `clampPlacementToServedCeiling` extracted from `handler.ts` into
  `src/lib/responseSubmit/clampPlacement.ts` (handler imports `server-only`/`next/server`,
  which break under `tsx`); handler re-exports it, so all import sites and
  `clamp-placement.test.ts` are unchanged and the backfill runs the EXACT live function.
  DRY RUN by default; writing needs `--apply --confirm`; target explicit
  (`--target=local|prod`, prod creds only from gitignored `.env.prod.local`); read-checked
  per session including a fixed-point idempotency check.
  `scripts/backfill/README.md` is the plain-English summary.

  **OUTCOME — 2026-08-13 prod DRY RUN (read-only, zero writes): 0 would-re-clamp,
  16 already-correct, 0 skipped.** A separate read-only enumeration of all 20 prod sessions
  confirmed this is a TRUE negative: every completed session's stored `overall_level`
  equals its served ceiling, and the headline case
  `a28f0c2a-c917-4877-9346-0cf430627f04` (served 0A×10) reads **`0A` on prod, not `8B`** —
  the 8B was local/dev data, since corrected. The apply variant was deliberately NOT run.
  Incidental: three IN_PROGRESS prod sessions hold a provisional `1B` against a `1A`
  ceiling — expected, because the #206 clamp fires at FINALIZATION, and evidence it works.

- **PR #217 — lane/selfhost-fonts — MERGED (07e7bb1; verify-bar GREEN: 1719 tests / 143 files, `pnpm run build` exit 0).**
  "fix(build): self-host webfonts so the build stops depending on Google's CDN".
  Production deploy of 486b230 failed (`pnpm run build` exit 1) on a markdown-only commit:
  `next/font/google` fetches every weight from fonts.gstatic.com AT BUILD TIME and Google
  404'd the Plus Jakarta Sans URLs Next had resolved. Five latin VARIABLE woff2 (185 KB)
  are now committed under `src/app/fonts/` and loaded with `next/font/local`, with all four
  SIL OFL 1.1 licenses alongside. Rendering unchanged; zero `fonts.gstatic.com` references
  in the built output. `src/app/font-hosting.guard.test.ts` blocks any reintroduction.
  The Material Symbols `<link>` stays — it is a RUNTIME stylesheet, not a build-time fetch.

---

**As of:** 2026-08-10 (ATLAS: per-tenant white-label layer, S.A.M New York skin) — PR #209 (lane/tenant-white-label) OPEN, verify-bar GREEN (1554 tests, tsc clean, lint 0 errors), Vercel preview deployed. NOT merged.

- **PR #209 — lane/tenant-white-label — OPEN (verify-bar GREEN, CI green).**
  "feat(branding): per-tenant white-label layer, seeded with S.A.M New York".
  New `src/lib/branding/` owns every customer-facing brand string, asset path and sender
  identity — implements the already-locked ARCHITECTURE.md guardrail #5. Two skins:
  `sam-new-york` (default, live tenant) and `atlas` (Inspirea's own brand, retained).
  Selected per-deployment by `NEXT_PUBLIC_TENANT_BRAND`; `brandingForTenantSlug()` maps
  DB `tenants.slug` (`inspirea_singapore_math`) → skin. Internal chrome — the `(admin)`
  route group and `/dev` — deliberately keeps Atlas branding and does not read the config.

  **Surfaces rebranded (customer-facing only):** landing hero eyebrow (`Atlas Assessment™`
  → `S.A.M New York Math Assessment`, ™ dropped, star icon kept), landing header logo /
  footer / mascot alt, root `<title>` + meta description + OG/Twitter tags + favicon href,
  all six auth pages, signup consent authorization line, child assessment compact header +
  loading splash, beta welcome screen, parent dashboard header + empty-state greeting,
  report topbar + footer (screen AND print/PDF), report answer log, report how-it-works,
  instructor portal chrome, transactional email `from` display name.
  "Powered by Inspirea Labs" is hidden via `poweredBy: null` — gone from all customer chrome.

  **Brand mark:** normalised to the exact two-dot form `S.A.M`. Fixed three rendered
  three-dot `S.A.M.` occurrences (meta description, how-it-works prose, instructor
  recommendation note).

  **Legal:** the operator/data-processor disclosure is NOT deleted — it moved to legal fine
  print on `/coppa`, rendered from `branding.legal.processorDisclosure`. That string is a
  clearly-marked COUNSEL-GATED placeholder. The VERSIONED consent text
  (`src/lib/consent/text.ts`) was deliberately left untouched (editing it changes consent
  semantics = Dimitri/counsel gate, not a branding change).

  **Mascot:** `public/mascot/*.png` byte-unchanged. No regeneration, upscaling or AI image
  tooling. Only `alt` text was rebranded.

  **Guard:** `src/lib/branding/customer-surface.guard.test.ts` scans every customer-facing
  route for rendered `Atlas`/`Inspirea` (outside the fine-print slot) and for three-dot
  `S.A.M.`, and asserts >20 files scanned so it cannot go vacuous. Verified non-vacuous by
  injecting a violation and confirming the failure, then reverting.

  **Isolation:** no attribution/UTM/GA4 code, domain, URL path or query handling touched —
  `src/lib/marketing/**` is absent from the diff. Independent of PR #208.

  **Founder-gated follow-ups (PARKED — see NEXT_ACTIONS.md):** favicon asset; OG share
  image; final S.A.M NY copy strings; counsel wording for the processor disclosure and the
  consent authorization line; Supabase Auth email templates (dashboard, outside this repo).

---

**As of:** 2026-06-29 (CONVERSION: SAM-L1-Q05 label-leak + format defect fix) — PR #202 (lane/fix-l1-q05-group-label-leak) OPEN, verify-bar GREEN (pnpm test full pass, tsc clean, lint 0 errors; seed↔migration activation-parity guard passes). NOT merged. Nothing applied to prod.

- **PR #202 — lane/fix-l1-q05-group-label-leak — OPEN (verify-bar GREEN).**
  "fix(conversion): SAM-L1-Q05 label-leak + NUMERIC_ENTRY→MULTIPLE_CHOICE format fix".
  SAM-L1-Q05: L1 "grouping" item; geometry / level 1A; content_id l1-geometry-1; served as Q8 in the L1 short test.
  Two defects fixed in one PR:

  1. LABEL LEAK — "Group A / Group B" box labels were baked into the stem ("Group A   Group B   In which group does it belong? Answer: Group ___") while the curated image l1/sam-l1-q05.png showed the two animal boxes UNLABELLED. Root cause: migration 20260614120001 stmt 2 put the labels in the stem, and scripts/conversion/l1_crop.py cropped the boxes BELOW the worksheet's label row ("stem already renders Group A / Group B"). Because a single-image item renders one `<img>` with no per-box caption (QuestionImage.tsx), the labels can only live on the image. Fix: l1_crop.py Q05 re-cropped to INCLUDE the label row (faithful re-crop from source page-04; stray "5." whited out); sam-l1-q05.png re-minted.

  2. FORMAT DEFECT — item was NUMERIC_ENTRY with a LETTER answer ("B" / "Group B"), which renders a numeric keypad (inputMode="decimal") and is un-enterable on touch, failing the live serve-and-submit gate. Fix: converted to MULTIPLE_CHOICE, options ["Group A","Group B"], correct_index 1 (= key B), tap-to-answer; stem cleaned to "In which group does it belong?"; correct_answer removed.

  **Files changed:** scripts/conversion/l1_crop.py (M); supabase/seed.sql (M — INSERT row format+content; removed now-redundant Q05 stem-patch block); supabase/migrations/20260629120000_fix_l1_q05_group_label_leak.sql (A, forward, idempotent). Unchanged: short_test_eligible, banding (1A), content_id, level, image_alt/image_required/image_path. Verify bar GREEN (pnpm test, tsc, lint). seed↔migration activation-parity guard passes.

  **Founder-gated prod follow-ups (PARKED — NOT executed):**
  (a) Apply migration 20260629120000 on prod.
  (b) Re-upload corrected l1/sam-l1-q05.png to the prod question-images bucket (`pnpm convert:upload-activation-images:prod`).
  (c) Merge PR #202 after Vercel preview review.

  **Residual observation (context only, not a decision):** NUMERIC_ENTRY items keyed to a letter/word answer are a latent serve-gate hazard on touch. Q05 was the instance found; no claim that others exist.

---

**As of:** 2026-06-29 (L0 overlay short-invariant fix; `supabase db reset` unblocked) — PR #199 (lane/fix-l0-overlay-short-invariant) OPEN, verify-bar GREEN (1440 tests), awaiting Dimitri's attended merge. Nothing applied to prod or any DB.

- **PR #199 — lane/fix-l0-overlay-short-invariant — OPEN (verify-bar GREEN).**
  "fix(seed): clamp L0 overlay held rows to short_test_eligible=false; guard positional VALUES-tuple form".
  `supabase db reset` was failing on the `questions_inactive_not_short_eligible` CHECK (added in PR #191).
  Root cause: the GENERATED L0-overlay INSERT in `supabase/seed.sql` + mirror migration
  `supabase/migrations/20260616120100_l0_overlay_load.sql` inserted 12 HELD L0 rows
  (`is_active=false`) with `short_test_eligible=true` in the same VALUES tuple. The CHECK is
  row-level (fires at insert), so the transient `is_active=false` + `short=true` state violated it.
  The 12 affected rows: SAM-L0A-Q03/Q05/Q06/Q07/Q10/Q13/Q14/Q15, SAM-L0B-Q03/Q04/Q06,
  SAM-L0C-Q04 (first to fail: SAM-L0A-Q03). These are blocker-C held (format-swap pending);
  `short=true` was wrong for a held row.

  **Three fixes shipped:**
  1. DATA — flipped the 12 tuples `false,true` → `false,false` in `seed.sql` AND the mirror
     migration (preserves audited held end-state; activation later sets `is_active=true` +
     `short=true` atomically, per the SAM-L0B-Q14 pattern).
  2. GENERATOR — `scripts/conversion/apply-l0-overlay.ts` now clamps `short_test_eligible` to
     `false` whenever `is_active` is `false` (both insert and update emit paths), so regeneration
     can never re-emit a violating tuple.
  3. GUARD — `scripts/conversion/short-eligible-invariant.ts` gained Form-B detection for the
     positional VALUES-tuple form (`v.is_active, v.short_test_eligible ← …, false, true, …`).
     The old guard only matched the literal `short_test_eligible = true` assignment form and was
     blind to the generated L0-overlay form (same VALUES-tuple blind-spot class as the PR #198
     image-derivation bug). New unit tests: `src/lib/conversion/short-eligible-invariant.test.ts`.

  Verified: new guard flags all 12 against the pre-fix seed; fixed seed PASSes. Verify bar GREEN
  (pnpm test 1440 passed + tsc + lint). Nothing applied to prod or any DB. `supabase db reset`
  now succeeds.

---

**As of:** 2026-06-29 (prod serve/submit 500 root cause + content-completeness verifier) — PR #198 (lane/content-completeness-verifier) OPEN, verify-bar GREEN, awaiting Dimitri's attended merge and the gated prod image upload. Nothing applied to prod.

- **PR #198 — lane/content-completeness-verifier — OPEN (verify-bar GREEN).**
  "fix(conversion): DB-derived required image set + content-completeness verifier".
  Root cause of prod serve/submit 500: active L1 items SAM-L1-Q05/Q10/Q12/Q19 had
  `content.image_path` set but their objects were absent from the prod `question-images`
  bucket. `mintQuestionImage(createSignedUrl)` threw "Object not found" → 500. The
  founder's initial "answer_type NULL" diagnosis was a mislabel — `answer_type` exists
  nowhere in code or data; a prior read-only pass proved the engine grades all active
  items cleanly.

  **Root cause of the missing uploads:** `scripts/conversion/activation-image-set.ts`
  `activeImagePaths()` regex-matched only the inline-JSON `"image_path":"…"` form in
  `seed.sql`. It was blind to the `UPDATE … content || jsonb_build_object('image_path',
  v.image_path)` form (seed.sql lines 2654 and 4156). The 4 L1 paths never entered the
  uploader's required set → never uploaded to prod.

  **Deliverables:**
  1. `activeImagePaths()` replaced with `requiredImagePaths(supabase)` — runtime DB
     query (not seed text). New `scripts/conversion/minted-image-paths.ts`
     (`extractMintedPaths`: top-level + per-tile), in lock-step with
     `src/lib/questionPicker/mintImage.ts`. Uploader + verify-images now derive the
     required set from the target DB; `--check` stays offline (SOURCE_MAP disk pre-flight).
     CI unit test: `src/lib/conversion/minted-image-paths.test.ts`.
  2. New content-completeness verifier:
     `scripts/conversion/prod-bringup/12-verify-content-completeness.ts`
     (`pnpm convert:verify-content`). DB-derived; runs against local or prod (pass `--prod`);
     exits nonzero on any gap. Two sub-dimensions:
     - Images: every minted path resolves to an object in the target bucket.
     - Gradeability: real `toClientQuestion` + content-only `judgeAnswer` probe — no
       false "answer_type NULL" class of misdiagnosis possible from this verifier.
     Verified live against prod: images FAIL(4) — exactly l1/sam-l1-q05/10/12/19.png
     absent — gradeability 0 throws. SAM-L1-Q04 is active but text-only in the live row
     (`image_path` null), so correctly NOT in the required set (the old regex would have
     phantom-required `l1/sam-l1-q04.png`).
  Verify bar GREEN. Nothing applied to prod.

  **Founder-gated follow-up (PARKED — see NEXT_ACTIONS):** after PR #198 merges, run
  `pnpm convert:upload-activation-images:prod` to upload the 4 missing L1 images to prod,
  then `pnpm convert:verify-content --prod` to confirm 4/4 images PASS.

---

**As of:** 2026-06-28 (answer-key audit + SAM-L4-Q17 authored + CI manifest guard) — PR #191 (lane/bank-source-invariant-fix) MERGED. PR #192 (lane/l4-q17-answer-key-audit) OPEN, verify-bar GREEN, awaiting Dimitri's attended merge after Vercel preview review.

- **PR #191 — lane/bank-source-invariant-fix — MERGED.**
  "fix(bank): source-level is_active=false ⟹ short_test_eligible=false invariant + CI guard".
  Fixed local seed half-flagging (is_active=false rows allowed short_test_eligible=true at source);
  added CHECK constraint `questions_inactive_not_short_eligible`; added short-eligible-invariant
  parity test. Now in ATLAS-ASSESSMENT.

- **PR #192 — lane/l4-q17-answer-key-audit — OPEN (verify-bar GREEN).**
  "feat(conversion): full answer-key audit + SAM-L4-Q17 authored + CI key-manifest guard".
  Three deliverables:

  1. FULL ANSWER AUDIT (all 9 booklets L0A/L0B/L0C/L1-L6, 187 active items):
     165 MATCH, 2 documented overrides (founder-confirmed), 10 UNGRADEABLE_FROM_KEY
     (open/observational young-band key cells), 10 NO_KEY_ENTRY (blank key cells).
     ZERO accidental wrong answers. Every active booklet has a covering key.
     Key PDFs for ALL levels (including L0A-L4, previously absent) now present in
     scripts/conversion/source/**. Level 2 has a key but no worksheet docx.
     - Override 1 (founder-confirmed): SAM-L3-Q17 — stored 25 vs printed key 3;
       picture-graph (9-4)x5=25; printed key wrong; bank is correct.
     - Override 2 (founder-confirmed): SAM-L0B-Q06 — stored {7,8} vs key "colour 7
       and 6"; founder reinterpretation of contradictory worksheet.
     - Founder-acknowledged: 7 L6 fraction/decimal items (SAM-L6-Q09/Q10/Q11/Q12/Q13/
       Q15/Q16) are COMPUTED not key-verified (blank key cells). Also 3 L1
       (Q07/Q13/Q15) no-key-entry. All logged in manifest with L6-awareness note.

  2. SAM-L4-Q17 AUTHORED (was absent from local AND prod):
     TEXT_ENTRY "name a pair of perpendicular lines", answer "AF and GC"
     (founder-confirmed from L4 key), order-tolerant accepted set (AF=FA, GC=CG, slot
     order), level 4A, strand geometry, content_id l3-geometry-2, image
     l4/sam-l4-q17.png, is_active=true, short_test_eligible=true.
     Engine extension: TEXT_ENTRY judging now honors content.accepted_answers (mirrors
     NUMERIC_ENTRY any-of; server-side only) in src/lib/responseSubmit/correctness.ts.
     Mirrored in seed.sql + migration 20260628120000; image wired in activation-image-set.ts.

  3. CI GUARD (standing guard against recurrence; key PDFs are licensed/untracked/ABSENT
     in CI so full per-answer CI re-parse is not feasible):
     - scripts/conversion/verify-answer-keys.ts (`pnpm convert:verify-keys`) — local
       key-presence check per active booklet.
     - scripts/conversion/answer-key-manifest.ts + audit/answer-key-manifest.json —
       committed 217-entry per-item key-verification manifest (id-set derived from seed).
     - src/lib/conversion/answer-key-manifest.test.ts — CI: fails if a new/edited
       question has no manifest entry; fails if manifest records a key contradiction
       without an explicit override allowlist entry.
  Verify bar GREEN.

---

**As of:** 2026-06-27 (prod schema reconciliation + bank-flag loader) — PR #186 (prod-bringup batch 1: introspect + 06-gen-catchup + catchup artifacts) MERGED at dfb82a6 (now in ATLAS-ASSESSMENT). PR #188 (batch 2: full-attribute rewrite 07, 09 remediation, compare.ts, accepted-drift allowlist, 06→direct Postgres) OPEN, verify-bar CI GREEN, Vercel preview pass, awaiting Dimitri's attended merge.

- **PR #188 — lane/prod-bringup-inspect-fix — OPEN (CI GREEN, Vercel preview pass).**
  "feat(prod-bringup): full-attribute schema verification + type-remediation tooling".
  Branch `lane/prod-bringup-inspect-fix`, head commit `0184670`, base `ATLAS-ASSESSMENT`.
  New / rewritten tooling in `scripts/conversion/prod-bringup/`:
  - `introspect.ts` — prod now introspected via direct Postgres (`PROD_DATABASE_URL` in
    `.env.prod.local`, gitignored). Legacy PostgREST-OpenAPI path retained as no-DB-password
    fallback; superseded for introspection (only 20/24 tables visible via OpenAPI; no
    policy bodies).
  - `compare.ts` — full attribute comparison per column (`data_type` incl. numeric
    precision/scale + varchar length, `is_nullable`, `column_default`; enum types
    end-to-end) + `classifyTypeChange` (widen/narrow/incompatible) + `ACCEPTED_DRIFTS`
    allowlist (beta sign-off by founder).
  - `06-gen-prod-schema-catchup.ts` — additive/presence catch-up; now reads prod via
    direct Postgres; emits only genuinely-missing tables/columns/enums/policies/RLS
    (guarded/idempotent).
  - `07-verify-prod-schema.ts` — full attribute verifier; table/column-by-column
    MATCH/ACCEPTED/DRIFT/MISSING; exits nonzero on UNEXPECTED drift; accepted-for-beta
    drifts tolerated (not failures).
  - `09-gen-prod-type-remediation.ts` — classifies drift: AUTO-SAFE (widen/lossless cast,
    loosen NOT NULL, add missing default, add enum value → `remediation.generated.sql`,
    idempotent) vs REVIEW (narrow/lossy, tighten NULL→NOT NULL, default change/drop,
    prod-only → `remediation.review.md`); accepted drifts → "accepted, no action".
  pnpm scripts: `convert:prod-catchup:gen` / `:verify` / `:remediate`. Added `pg` +
  `@types/pg` devDeps.
  Verify GREEN (CI). Codex manual/skipped (relay unauth).

  **Prod schema state (read-only introspection this session — NOTHING applied to prod):**
  All 24 tables + 16 enum types + 34 RLS policies present and matching local canonical.
  0 missing; 0 UNEXPECTED attribute drift → `07` exits 0. `catchup.generated.sql` and
  `remediation.generated.sql` are both empty (nothing to apply). 9 founder-accepted-for-beta
  drifts: (a) 4 `responses` columns NOT NULL in local but NULLABLE in prod —
  `expected_time_sec`, `time_ratio`, `time_flag_config_version`, `used_fallback`
  (tightening DEFERRED past beta — requires backfill before `SET NOT NULL`); (b) 5
  prod-only defaults kept additive — `responses.time_flag` and
  `questions.{word_count,operation_type,num_operations,representation}`; (c) 2 prod-only
  columns kept additive — `questions.time_expected_seconds`,
  `report_narrations.misconceptions_lede`. `responses.time_taken_seconds` corrected to
  `numeric(10,3)` in prod Supabase Studio by founder this session → now MATCH.
  Key infra: prod is directly introspectable via `PROD_DATABASE_URL` (direct Postgres);
  PostgREST OpenAPI superseded for introspection purposes.

- **PR #186 — lane/prod-bringup (batch 1) — MERGED (`dfb82a6`, now in ATLAS-ASSESSMENT).**
  Audited prod bank loader `scripts/conversion/prod-bringup/05-load-bank-prod.ts`
  (commit `aa3446f`): replicates audited local bank → prod via PostgREST upserts —
  `tax_*` then `questions`, carrying per-row `is_active` / `short_test_eligible` flags
  and `content_id` (FKs remapped by natural code). Dry-run/count by default; live upsert
  only with `--prod` behind the `.env.prod.local` gate (founder-run).
  OPEN QUESTION: whether the live `--prod` bank upsert has been executed against prod,
  and whether prod's per-level active/short_test_eligible counts match the audited local
  bank. Needs Dimitri to confirm (see NEXT_ACTIONS).

---

**As of:** 2026-06-26 (two report-render defect fixes) — two independent lane PRs opened (#171, #173); both off `ATLAS-ASSESSMENT`, not stacked; both verify-bar GREEN (1346 tests). No migration in either — **no `supabase db reset` needed.** Both PRs are open, awaiting Dimitri's attended merge after Vercel preview review.

- **PR #171 — lane/answer-log-humanize — OPEN.**
  "fix(report): humanize tap/id-set answer formats in the answer log".
  Defect: `src/app/(parent)/report/answers/page.tsx` dumped raw JSON for tap- and
  id-set-keyed answer formats (CLICK_IMAGE_SINGLE, CLICK_IMAGE_MULTI, SELECT_MULTIPLE,
  IMAGE_ORDERING, VISUAL_MATCHING, MULTI_BLANK, EQUATION_SET). New file
  `src/app/(parent)/report/answers/humanize.ts` (+ `humanize.test.ts`) resolves tapped /
  selected ids to the matching option or tile label for those six formats; MC / numeric /
  text / drag-drop are passed through unchanged. Never dumps raw JSON; never throws.
  Instructor / admin `fetchItemReview` confirmed NOT affected (does not select
  `answer_given`). Verify GREEN (1346 tests).

- **PR #173 — lane/l4-narrative-fix — OPEN.**
  "fix(report): self-heal narration when no cached row and strand data is present".
  Defect: an L4 short-test report (session `7a903c1e`, child `fac00000-…-000004`) rendered
  with no strengths/growth narrative. Root cause: `attemptNarration`'s catch-all returned
  without persisting after a transient `callSonnet` failure at session completion — leaving
  no `report_narrations` row; every subsequent page load hit the no-row branch and showed
  the generic-lede report.
  Branch taken: generation-failed / no-row, transient (reproduced once; session / assembly
  / prompt all healthy).
  Fix: `shouldRegenerateNarration` in `src/lib/report/narration/refresh.ts` broadened to
  regenerate when there is no cached row AND the assembled content has strand data (new
  predicate `narrationRowIsSelfHealAttempted`). At-most-once regen-loop guard: on a failed
  no-row regeneration `report/page.tsx` persists a `status:"failed"` marker row
  (`failedNarrationMarker`) so the next view settles into the data-only fallback instead
  of re-entering the regeneration path indefinitely. Never clobbers a useful
  strand-suppressed row. Regression tests added in `refresh.test.ts`. Verify GREEN
  (1346 tests).

---

**As of:** 2026-06-25 (tenant-wide admin view + two young-band report fixes) — origin head entering this session: **`bf792cc`** (after PRs #163/#164/#165 merged). Two new lane PRs opened (#166, #170); both independent off `ATLAS-ASSESSMENT`, not stacked. PR #170 adds a migration — **`supabase db reset` required after merge.**

- **PR #170 — lane/admin-tenant-view — OPEN.**
  "feat(admin): tenant-wide admin view reusing the instructor surface".
  Independent off `ATLAS-ASSESSMENT`; not stacked. Verify GREEN: 1342 tests / 103 files,
  tsc 0, lint 0 errors (2 known warnings). Codex manual/skipped (relay unauth).
  **Post-merge: `supabase db reset`** (adds admins table + admin_status enum +
  app_current_admin_tenant_id function + admin SELECT policies; seeds dev admin
  admin@atlas.local / admin-password).

  **Schema** (migration `20260625120000_admins_tenant_view.sql` + seed mirror): new
  `admins` table (admin_status enum ACTIVE/INACTIVE, tenant FK, unique auth_user_id,
  tenant index, RLS + admins_self_select); SECURITY DEFINER
  `app_current_admin_tenant_id()` (auth.uid()-scoped, ACTIVE-gated; mirrors
  app_current_instructor_id); ADDITIVE SELECT policies on children / assessment_sessions /
  pedagogical_notes (`tenant_id = app_current_admin_tenant_id()`). Existing instructor
  policies UNTOUCHED (Postgres ORs permissive policies → instructors keep center scope,
  admins get tenant scope; non-admin caller gets NULL helper → matches no rows).
  `seed.sql` adds dev admin at the dev tenant.

  **App**: new `resolveStaff(client)` → `{kind:'instructor'|'admin', id?, tenant_id,
  center_id?, name}` in `(instructor)/instructor/lib/instructor.ts` (resolveInstructor
  kept for instructor-only note writes). `fetchRoster` + `RosterRow` gain `centerName`
  (centers join via children.home_center_id), sorted by center then name; RLS does the
  scoping so the same query is tenant-wide for admin / center-only for instructor.
  Shared roster presentation extracted to
  `(instructor)/instructor/_components/roster-view.tsx` (RosterStats + RosterTable with
  optional Center column); instructor page reuses it. New `(admin)/admin/page.tsx` route
  (+ `(admin)/layout.tsx`): resolveStaff → require kind admin else no-access notice;
  RosterStats + roster table WITH Center column; rows link to the SHARED
  `/instructor/student/[childId]`; unauth → /login?next=/admin; instructor shell reused,
  labeled "Admin" via new optional roleLabel/homeHref props (defaults keep instructor
  callers unchanged). Shared student detail (`student/[childId]/page.tsx`) now gates on
  resolveStaff (instructor OR admin); notes-ADD form + usefulness rating +
  report-view tracking render ONLY when kind==='instructor'; admins see notes read-only
  (NotesPanel gained a `readOnlyMessage` prop) + no rating. Report / strand bars /
  misconceptions / item review render for both. Compliance unchanged (no parent PII;
  question content gated).

  `database.types.ts` hand-edited (no live regen): added admins table types, admin_status
  enum (type + Constants), app_current_admin_tenant_id function.

  **Tests**: new `instructor.test.ts` (resolveStaff: instructor/admin/inactive/none) +
  roster.test.ts additions (centerName join + sort by center then name, tenant-wide rows
  all returned/never narrowed; null-center fallback).

---
**As of:** 2026-06-27 (CONVERSION: prod bring-up step 1 — schema inspection + additive catch-up SQL) — trunk head entering this session: **`25b5a7c`** (after PRs up to #174 merged). One new lane PR opened (#181); independent off `ATLAS-ASSESSMENT`, not stacked. Analysis-only session — no prod connection, no writes, no DB commands. Verify bar GREEN: 1371 tests / 105 files, tsc 0, lint 0 errors (2 known warnings), seed↔migration parity PASS (81 migrations). Codex manual/skipped (relay unauth).

- **PR #181 — lane/prod-bringup-schema-analysis — OPEN.**
  "docs(prod-bringup): step 1 — prod schema inspection + additive catch-up SQL (analysis only)".
  Off `ATLAS-ASSESSMENT` head `25b5a7c`; independent, not stacked.

  **Context:** This is STEP 1 of a multi-step PRODUCTION bring-up cross-lane from ATLAS.
  PROD = atlas-assessment (project ref `ntfaqzueppqymfkefadm`) — the LIVE DB. NOT
  atlas-assessment-2 (dead). Prod was hand-applied via Studio (no CI); its schema is behind
  repo migrations and the `supabase_migrations.schema_migrations` log may be stale. All
  artifacts trust `information_schema`/`pg_catalog`, NOT the migration log.

  **Confirmed prod gaps (from ATLAS):** `questions.short_test_eligible` column missing;
  `question-images` storage bucket missing.

  **Key non-additive finding (NOT in catch-up script, flagged for inspection):**
  Migration `20260511000200` recasts the `strand` enum from uppercase
  (NUMBER_SENSE/OPERATIONS/WORD_PROBLEMS/FRACTIONS_DECIMALS/GEOMETRY/MEASUREMENT_DATA) to
  lowercase (number_sense/operations_algorithms/fractions_decimals/measurement/geometry/
  data_statistics). If prod still has the OLD uppercase enum, the bank will NOT load and a
  separate reviewed (destructive) recast migration is required. Inspection step 1 reports
  prod's actual strand values. (Likely already lowercase since the running app depends on
  it.)

  **Deliverables (3 new files, for founder to run MANUALLY in prod Studio):**
  - `scripts/conversion/prod-bringup/01-inspect-prod-schema.sql` — 100% READ-ONLY
    inspection (enum types+values incl. strand, questions columns, serve/report tables,
    assessment_sessions columns, constraints, active question counts by level, taxonomy
    row count, question-images bucket + object count). Founder runs first; results decide
    which catch-up sections apply.
  - `scripts/conversion/prod-bringup/02-catchup-additive-schema.sql` — ADDITIVE-ONLY
    idempotent schema catch-up (CREATE/ADD ... IF NOT EXISTS; guarded ADD CONSTRAINT/
    CREATE POLICY; no DROP, no destructive ALTER, no data). Brings prod schema to what
    the 0A-L4 loader + serve + report expect. Each statement tagged with its source
    migration. Ordered: types→tables→columns/FK→constraints.
  - `scripts/conversion/prod-bringup/README.md` — bring-up order, migration→object
    coverage table, excluded non-additive contingencies.

  **Migrations covered in catch-up script:** 20260507000000 (norm tags+types),
  20260610170000/20260614120000/20260615120000 (8 extra question_format values),
  20260616120000 (0A/0B/0C), 20260616120050 (short_test_eligible — confirmed missing),
  20260525000001 (V2026 taxonomy tables), 20260525000003 (content_id FK),
  20260611090000 (assessment_test_type + test_type), 20260621130000 (short_test_outcome),
  20260510000000 (engine_prior_version), 20260612090000 (responses unique),
  20260613120000 (held-rows CHECK), 20260525000000/20260526000000 (report_narrations +
  key_findings cols), 20260625120400 (admins — likely already live).

  **Also excluded from catch-up:** question-images bucket (bring-up step 2); taxonomy
  reference rows + question-bank rows (data, bring-up step 4 — content_id stays NULL
  until tax_content rows exist). No L5/L6-specific schema (L5/L6 is data-only; 5A/6A
  are base `half_grade_level` values).

  **Files:** scripts/conversion/prod-bringup/01-inspect-prod-schema.sql (A),
  02-catchup-additive-schema.sql (A), README.md (A).

  **Founder actions (all gated on prod service_role creds + explicit go-ahead; manual
  Studio/uploader path; additive+reviewed):**
  See NEXT_ACTIONS prod bring-up sequence.

---

**As of:** 2026-06-26 (fix: migration version collision — PR #174) — trunk head entering this session: **`861bc43`** (after PRs #169–#173 merged, including PR #172 lane/l5l6-geometry-activation now MERGED). One new lane PR opened (#174); independent off `ATLAS-ASSESSMENT`, not stacked. Rename-only fix — **no `supabase db reset` needed mid-lane; founder runs reset post-merge to confirm PK collision is resolved.**

- **PR #174 — lane/fix-migration-version-collision — OPEN.**
  "fix(migrations): resolve duplicate version 20260625120000 (db reset failure)".
  Off `ATLAS-ASSESSMENT` head `861bc43`; independent, not stacked. Verify GREEN: 1359 tests /
  104 files, tsc 0 errors, lint 0 errors (2 known warnings). Seed↔migration parity PASS (81
  migrations; parity guard uses a directory glob so the rename is transparent). Codex
  manual/skipped (relay unauth).

  **Problem:** `supabase db reset` failed — `duplicate key value violates unique constraint
  "schema_migrations_pkey" Key (version)=(20260625120000) already exists`. Two migration files
  were committed with the same version prefix from two same-day lanes that merged independently:
  - `20260625120000_l5l6_booklet_reband.sql` (PR #169, 17:39) — anchors the L5/L6 batch
    120000–120300; referenced by siblings and the seed.sql mirror header.
  - `20260625120000_admins_tenant_view.sql` (PR #170, 18:06) — admins table + tenant-wide
    admin SELECT path (DDL).
  The 120100/120200/120300 batch members are unique; this was the only collision.

  **Fix:** Kept the canonical `20260625120000_l5l6_booklet_reband.sql` unchanged (anchors
  the batch + referenced by siblings and seed mirror). Renamed the later admin migration to
  the next free version slot:
  `20260625120000_admins_tenant_view.sql` → `20260625120400_admins_tenant_view.sql` (git mv;
  rename only; content unchanged). The three existing "20260625120000" references in
  `load_missing_rows` + `q27_activate` comments and the seed.sql mirror header all point to
  the L5/L6 reband file (kept unchanged); no reference updates were needed. The admin migration
  had no seed mirror and no version-keyed references; no later migration depends on the admins
  table. Order safety confirmed: nothing between 120000 and 120400 touches admins; all 0626+
  migrations still run after 120400. Zero duplicate version prefixes remain across all 81
  migration files.

  **Files:** `supabase/migrations/20260625120000_admins_tenant_view.sql` →
  `supabase/migrations/20260625120400_admins_tenant_view.sql` (git mv; rename only).

  **Founder post-merge action (attended):**
  Run `supabase db reset` — the PK collision is resolved; reset should now apply cleanly.

---

**As of:** 2026-06-26 (CONVERSION: L5/L6 geometry activation) — trunk head entering that session: **`db1e9ac`** (after PRs #169 and #170 merged). PR #172 opened and subsequently MERGED (`861bc43`, included in the PRs #169–#173 batch above).

- **PR #172 — lane/l5l6-geometry-activation — MERGED (`861bc43`).**
  "fix(conversion): activate L5/L6 image rows so short test serves geometry".
  Off `ATLAS-ASSESSMENT` head `db1e9ac`; independent, not stacked. Verify GREEN: 1342 tests /
  103 files, tsc 0 errors, lint 0 errors (2 known warnings). Seed↔migration parity PASS (81
  migrations). convert:upload-activation-images --check PASS. Codex manual/skipped (relay unauth).

  **Root cause (cross-lane QA from ATLAS):** L5/L6 short test served no geometry. The
  sub-strand-aware picker (PR #161) filters `is_active` FIRST; the 15 image rows wired by
  PR #169 remained `is_active=false` even though image_path was set, crops are uploaded to
  the private question-images bucket, and `short_test_eligible=true`. Fix: activate 13 of
  those 15 rows.

  **Migration `20260626120000_l5l6_geometry_activation.sql` + seed.sql mirror block
  (`l5l6-geometry-activation`, appended after `l5-q27-activate`). `image_path` already
  persisted from PR #169; UPDATEs flip ONLY the `is_active` bit:**
  - L5: Q14, Q25, Q26
  - L6: Q14, Q15, Q16, Q19, Q25, Q30, Q31, Q32, Q33, Q34

  `content_id` was source-accurate and NON-NULL on every row; NOT changed by this PR.

  Sub-strands resolved: geometry (L5-Q14 → l4-geometry-2 Squares/Rectangles; L5-Q26 →
  l4-geometry-3 Symmetry; L6-Q31/Q32/Q33/Q34 → l6-geometry-1 Angles); area_volume (L5-Q25
  → l4-area_volume-1; L6-Q14/Q15/Q16 → l5-area_volume-1 area; L6-Q19/Q25 → l5-area_volume-4
  volume); percentage (L6-Q30 → l5-percentage-3 pie chart — NOT geometry; activated keeping
  its existing correct percentage tag). Every crop source-verified this session (worksheet
  page + answer key + PNG on disk), including L6-Q30/Q31/Q32/Q33/Q34 (previously API-rejected
  when viewed; confirmed present on disk via image preflight).

  Not changed: SAM-L5-Q27 (already active via PR #169); SAM-L5-Q24 and SAM-L6-Q18
  (text-based, already active). Still inactive (intentionally): SAM-L5-Q08 (line graph,
  data_statistics) and SAM-L6-Q26 (percentage, rectangles shaded) — not in ATLAS's list.
  HELD: SAM-L6-Q17 — manual drawing task (Short=N); L6-17-1/17_2.png crops are the
  answer-key solution illustration, not a clickable stimulus; no gradeable row to activate.

  Files: supabase/migrations/20260626120000_l5l6_geometry_activation.sql (A),
  supabase/seed.sql (M).

  **Founder post-merge actions (attended):**
  (a) `supabase db reset` — applies `20260626120000_l5l6_geometry_activation.sql`; seed
      rebuilds these rows active.
  (b) Confirm the L5/L6 crops are present in the private `question-images` bucket — per the
      QA report they are already uploaded; a now-active row whose bucket file is absent 500s
      at serve time.

- **PR #170 — lane/regen-served-crosswalk-substrand — MERGED (`db1e9ac`).**
  "chore(audit): model PR #161 sub-strand coverage in served-order crosswalk".
  Docs/artifacts only; no migration, no seed change, no `supabase db reset` needed.
  Regenerated `scripts/conversion/audit/served-crosswalk.{md,json}` to reflect the
  sub-strand-aware served order introduced by PR #161. Closes the CROSS-LANE FLAG from
  PR #161.

---

**As of:** 2026-06-25 (CONVERSION: L5/L6 booklet re-band + load 6 missing rows + wire image_path + SAM-L5-Q27 activation) — origin head entering this session: **`f5947d5`** (after PR #168 merged). One new lane PR opened (#169); independent off `ATLAS-ASSESSMENT`, not stacked. Four new migrations — **`supabase db reset` required after merge. CRITICAL: upload l5/sam-l5-q27.png to the private question-images bucket BEFORE or with `supabase db reset` — Q27 is now is_active=true and will 500 at serve time if the image is absent.**

- **PR #169 — lane/l5l6-booklet-reband-load-images — MERGED (`db1e9ac`).**
  "feat(conversion): L5/L6 booklet re-band + load 6 missing rows + wire image_path".
  Off `ATLAS-ASSESSMENT` head `f5947d5`; independent, not stacked. Verify GREEN: 1336 tests /
  102 files, tsc 0, lint 0 errors (2 known warnings). Seed↔migration parity PASS (79 migrations).
  convert:upload-activation-images --check PASS (l5 now 5 keys, all source files present).
  Codex manual/skipped (relay unauth). A follow-up commit on this same open lane activated
  SAM-L5-Q27 (founder supplied the combined 4-shape crop; see below).

  **LOCKED DECISION — L5/L6 band at BOOKLET LEVEL, not difficulty or per-question Level column.**
  Founder-locked: SAM-L5-* → 5A; SAM-L6-* → 6A (booklet floors). Supersedes the
  already-merged `20260623150000_l5l6_releveling` (which had banded by the per-question
  "Level" column: L5 review→4A/4B, L6 review→5A/5B, A/B preserved). Content_id (skill
  node) untouched. Clears the prior "Level review (founder/picker decision)" follow-up from
  the l5l6-conversion-status-2026-06-23 work.

  **Three migrations + seed.sql mirror (3 BEGIN/END blocks appended after the
  l6-q24-table-to-prose block):**
  1. `20260625120000_l5l6_booklet_reband.sql` — re-band ALL SAM-L5-* → 5A and
     SAM-L6-* → 6A.
  2. `20260625120100_l5l6_load_missing_rows.sql` — load 6 gradeable rows previously skipped:
     SAM-L5-Q01 (place-value MC, ans (3)=600); SAM-L5-Q10 (order fractions DRAG_DROP,
     3,10/3,14/4,9/2 increasing); SAM-L5-Q16 (order decimals DRAG_DROP, 3.716,3.671,3.617,3
     decreasing); SAM-L5-Q18 (decimal→fraction MC, ans (3)=8 7/20); SAM-L6-Q22 (0.052 kg→g
     NUMERIC, ans 52); SAM-L6-Q27 (fraction>50% MC, ans (4)=3/5). Banded to booklet level
     (5A/6A); short_test_eligible=true for all six (Short Test column = Y; key-driven; none
     manual). Ordering items authored as DRAG_DROP. SAM-L5-Q26 ALSO corrected: worksheet
     shows only figures A and B (loaded row had fabricated options C/D) → options ["A","B"],
     correct_index 1 (answer key = B).
  3. `20260625120200_l5l6_image_path_wire.sql` — wire single-stimulus image_path for 15
     inactive L5/L6 image rows (L5 Q08/Q14/Q25/Q26; L6 Q14/Q15/Q16/Q19/Q25/Q26/Q30/Q31/
     Q32/Q33/Q34); rows STAY is_active=false (activation-ready). SOURCE_MAP entries added in
     `scripts/conversion/activation-image-set.ts` (new L5_SRC/L6_SRC dirs). Every crop PNG
     + worksheet page source-verified.
  4. `20260625120300_l5_q27_activate.sql` — **SAM-L5-Q27 ACTIVATED** (follow-up commit).
     UPDATE sets content (image_path l5/sam-l5-q27.png + sharpened image_alt) and
     is_active=true. Stem/options/correct_index unchanged and already correct: "Which of the
     shapes has the most lines of symmetry?"; options ["(1)","(2)","(3)","(4)"]; correct_index
     0 (circle has infinitely many lines of symmetry). Banding 5A; short_test_eligible=true;
     content_id l4-geometry-3 (Symmetry node) — all already correct, untouched. Seed.sql
     mirror block `l5-q27-activate` appended after `l5l6-image-path-wire`. SOURCE_MAP entry
     `l5/sam-l5-q27.png` added in `scripts/conversion/activation-image-set.ts`. Source-
     verified against worksheet page-13 + answer-key PDF + new L5-27.png crop supplied by
     founder (single combined crop showing all four shapes with in-image labels (1)-(4):
     circle/hexagon/heart/rectangle — resolves the per-tile problem; Q27 is now a standard
     single-stimulus MC whose options reference the in-image labels).

  **HELD / EXCLUDED (not fabricated):**
  - SAM-L5-Q27 — RESOLVED/ACTIVATED. Was HELD because 4 options were each a separate shape
    image with no single stimulus. Founder supplied a combined 4-shape crop (L5-27.png) with
    in-image labels (1)-(4), making this a standard single-stimulus MC. Now is_active=true.
    **CRITICAL: the founder must upload l5/sam-l5-q27.png to the private question-images
    bucket before or with `supabase db reset` — Q27 is ACTIVE and will 500 if image absent.**
  - SAM-L6-Q18 excluded — text-only (cube volume), already active.

  **Also added:** `scripts/conversion/purge-staging.ts` + `convert:purge-staging` npm script
  (founder-run, dry-run default, --apply to delete) to clear 15 stray full-page renders in
  `question-images/conversion-staging/` bucket prefix.

  **Files changed (initial 3-migration commit):** package.json (M),
  scripts/conversion/activation-image-set.ts (M), scripts/conversion/purge-staging.ts (A),
  supabase/migrations/20260625120000/120100/120200 (A x3), supabase/seed.sql (M).
  **Files changed (Q27 activation follow-up commit):** scripts/conversion/activation-image-set.ts
  (M), supabase/migrations/20260625120300_l5_q27_activate.sql (A), supabase/seed.sql (M).

  **Founder post-merge actions (attended):**
  (a) **CRITICAL FIRST:** Run `pnpm convert:upload-activation-images` to upload
      `l5/sam-l5-q27.png` (the combined 4-shape crop) to the private `question-images` bucket.
      This MUST happen before or with `supabase db reset` — SAM-L5-Q27 is now is_active=true
      and will 500 at serve time if the image is absent in the bucket.
  (b) `supabase db reset` (applies 4 new migrations: 120000, 120100, 120200, 120300).
  (c) `pnpm convert:upload-activation-images` also pushes the 15 activation-ready L5/L6 image
      crops (those rows remain is_active=false; flip them individually once images confirmed).
  (d) `pnpm convert:purge-staging --apply` to clear the conversion-staging/ renders.

  **BATCHED GATE ITEMS for Dimitri (in PR body, non-blocking):**
  (1) Confirm 5A/6A is the intended booklet half-grade (A/B collapse reversible via one UPDATE).
  (2) SAM-L5-Q27 — RESOLVED. Founder supplied the combined 4-shape crop (scripts/conversion/
      source/5/L5-27.png); Q27 activated via migration 20260625120300. No open gate item.

---

**As of:** 2026-06-25 (two young-band report fixes: pre-narration interstitial + railed-placement clamp) — origin head entering that session: **`bf792cc`** (after PRs #163/#164/#165 merged). One new lane PR opened (#166); independent off `ATLAS-ASSESSMENT`, not stacked. No migration — **no `supabase db reset` needed.**

- **PR #166 — lane/young-band-narration-render — MERGED (`1640570`).**
  "fix(report): preparing-report interstitial + clamp railed placement to served floor".
  Off `ATLAS-ASSESSMENT` head `bf792cc`; independent, not stacked. Verify GREEN: 1336 tests /
  102 files, tsc 0, lint 0 errors (2 known font warnings). Codex manual/skipped (relay unauth).

  **Task 1 — pre-narration interstitial.** `report_narrations` is persisted ~8s AFTER session
  completion; a report opened in that gap rendered the pre-narration shell (generic strand lede,
  no Strengths/Areas). This was a TIMING artifact, not a band gate. `src/app/(parent)/report/page.tsx`
  now reads the narration row first; while a freshly-completed session has no row yet
  (`narration-pending.ts` `isNarrationPending`, bounded 30s via `NARRATION_WAIT_BOUND_MS`) it
  renders a brief polling interstitial (`preparing-report.tsx` `PreparingReport`, client
  `router.refresh()`) and reveals the full report once the row lands. A failed/never-arriving
  narration falls through to the existing generic-lede report after the bound — never an
  indefinite spinner. New `nowMs()` helper keeps the impure clock read out of the Server Component
  render scope (react-hooks/react-compiler purity lint). Founder chose Option 1 (interstitial).

  **Task 2 — clamp placement to measured floor.** Root cause CONFIRMED: `engine.ts`
  `placementEstimate` sets `overallLevel = LEVELS[argmax(avg posterior)]` over the full
  0A…8B axis; a floor/sparse all-correct run has no ceiling items to pull the posterior down,
  so the mode rails to the top index (8B) → "S.A.M Level 8" for a 0A child, and that railed
  level also fed the narration prompt. New `clampLevelToServedCeiling(level, ceiling)` in
  `src/lib/report/assemble.ts` bounds the resolved level by the highest level actually served
  (`questions.level`, newly selected). Applied to `placement.sam_level` in `assembleReportContent`
  — the shared choke point feeding both the report label and the narration prompt. NO `engine.ts`
  change. Normal multi-level runs (a ceiling item served) unchanged; the clamp only ever lowers
  a railed estimate. Raw engine level still drives `taxLevelCode` (sub-strand grid/radar), so
  visuals unchanged.

  Files: `src/app/(parent)/report/page.tsx` (M), `src/lib/report/assemble.ts` (M) +
  `assemble.test.ts` (M), new `src/app/(parent)/report/narration-pending.ts` + `.test.ts`,
  new `src/app/(parent)/report/preparing-report.tsx`.

---

**As of:** 2026-06-24 (three new PRs opened: intake grades-7/8 disable + >L6 clamp, low-level strand fix, short-test sub-strand coverage) — confirmed merge state as of session start: PRs #150, #153, #155, #156, #157, #158 all MERGED; origin head was **`e69671b`**. Three new lane PRs opened this session (all independent off `origin/ATLAS-ASSESSMENT`, not stacked); all verify-bar GREEN locally. No migration in any of the three — **no `supabase db reset` needed.**

- **PR #159 — lane/intake-grades78-disable-l6clamp — OPEN, CI GREEN.**
  "feat(intake): grey grades 7/8 '(coming soon)' + clamp >L6 tax-level to l6".
  The grades-7/8-disable + >L6 clamp had NOT previously shipped (dispatched last session,
  no PR returned); recreated this session. Add-child intake now greys grades 7 and 8 with a
  "(coming soon)" label, making them non-selectable. `halfGradeToTaxLevelCode` now clamps
  7A/7B/8A/8B → l6 instead of returning null (null was producing empty `strand_mastery`
  rows). `halfGradeToTaxLevelCode` exported; unit test added. Verify GREEN (CI SUCCESS).

- **PR #160 — lane/report-low-level-strand-fix — OPEN, CI GREEN.**
  "fix(report): low-level reports populate strand section via engine-strand fallback".
  Root cause: `strand_mastery` is keyed by the V2026 sub-strand axis (resolved via
  `questions.content_id` → `tax_content.sub_strand_id`), but `content_id` is sparse/NULL at
  the young band (bridge backfill migration 20260525000003 only tagged l1–l6 + 3 of 6 engine
  strands; L0 is out of range; seeded SAM-L2 items `number_sense`/`operations_algorithms` are
  deliberately unmapped). When no response resolves a sub-strand, `scoredResponses` is empty
  → every `strand_mastery` row is `no_data` → report renders empty radar/no bars/generic lede
  for 0A/0B/L1/L2 while 0C/L3-L6 populate.
  Fix: when `content_id` resolution yields zero sub-strands, fall back to the engine 6-strand
  axis (`questions.strand`, always populated) mapped onto V2026 sub-strands
  (`number_sense` & `operations_algorithms` → `whole_numbers`; `fractions_decimals` →
  `fractions`; `geometry`/`measurement`/`data_statistics` 1:1). Gated strictly on
  `subStrandByQuestion.size === 0` so working levels (0C/L3-L6) are behavior-preserved.
  Added 0A + L1 regression tests (non-empty strand set). Verify GREEN (CI SUCCESS).
  NOTE: the "Great news… ready for Level X" readiness line is gated SEPARATELY on
  `readiness.ready` (overall %) in `readiness.ts` — possibly a deliberate 0A readiness
  suppression; left untouched, for Dimitri to confirm on preview.

- **PR #161 — lane/short-test-strand-coverage — OPEN (verify GREEN locally, 1284 tests; CI pending at time of writing).**
  "fix(short-test): sub-strand coverage governs short-test selection".
  Root cause: the short-test router/picker operated only on the 6-value engine strand (AXIS A);
  the picker never selected `content_id` so was blind to the 12 V2026 sub-strands (AXIS B)
  the report measures. Coverage-first routing spread across engine strands, but within a strand
  the picker chose purely by nearest difficulty, so it re-deepened one sub-strand and skipped
  uncovered siblings (L6 test left Geometry/Ratio/Algebra/Statistics unassessed).
  Fix: short-test picker is now sub-strand-aware — sorts eligible candidates PRIMARY by
  coverage (item whose AXIS-B sub-strand is not yet served this session sorts first),
  SECONDARY by existing nearest-difficulty order; spreads breadth-first across sub-strands
  before deepening, within 10/15 bounds. `short_test_eligible` and the band are untouched;
  AXIS-A router intact; NULL `content_id` treated as already-covered (degrades to prior
  behaviour, never regresses). New file `src/lib/questionPicker/subStrandCoverage.ts`; wired
  through handler → pickForSession → short picker; types updated; new + updated tests.
  Verify GREEN locally (1284 tests); CI verify-bar was pending at time of writing.
  CROSS-LANE FLAG: this change alters short-test served ORDER; after #161 merges the
  CONVERSION lane must regenerate the served-order crosswalk.

---

**As of:** 2026-06-23 (in-question mascot extended to all tiers) — trunk head is **`e93d5cd`**
(PR #146 merged). UI-only change; no migration — **no `supabase db reset` needed.**

- **PR #146 — lane/inquestion-mascot-all-tiers — MERGED (`e93d5cd`).** The in-question footer
  mascot (thinking-pose idle + per-submit celebrate hop) now renders for EVERY tier, not just
  the young band / K_4. The G5_8 `QuestionShell` branch previously had no footer; it now hosts a
  mascot-ONLY footer (right-aligned, no "Read carefully!" text — the measured G5-8 chrome keeps
  the prompt as the focus). New `questionMascotIsLively(reduceMotion)` policy in `lib/mascot.ts`
  drives the in-question mascot (animates for ALL tiers, gated ONLY by reduced motion); the
  bookend `mascotIsLively` (Welcome/Completion, K_4-only) is UNCHANGED. Unchanged by design: the
  hop stays correctness-agnostic (`celebrateTick` bumps on every submit; correctness never
  reaches the child client), in-flow poses stay thinking + celebrating (waving/completion remain
  on the bookend screens), reduced-motion gate kept (static thinking image). Real
  `public/mascot/*.png` reused; no content change. +5 tests (`questionMascotIsLively` unit + a
  `QuestionShell` smoke asserting the footer mascot mounts for both tiers). Verify GREEN 1237/92.

---

**As of:** 2026-06-22 (short-test length cap confirmed) — trunk head is **`cc93799`** (PR #144
merged). Audit + docs/audit-tooling fix; no migration — **no `supabase db reset` needed.**

- **PR #144 — lane/short-test-hardcap-15 — MERGED (`cc93799`).** AUDIT result: the LIVE short
  test ALREADY caps at **soft floor 10 / HARD cap 15**. `responseSubmit.decideTermination` uses
  `shortTestShouldTerminate` for every short session (the `short` context is always present in
  prod — `birth_year` is NOT NULL); `shortTest.test.ts` pins `hardCap === 15`. The generic
  `shouldTerminate` (MAX_QUESTIONS 25) is only the no-anchor fallback (unreachable in prod). The
  "served up to 25" seen earlier was a STALE CROSSWALK-SCRIPT model: `build-served-crosswalk.ts`
  replayed the short test with the generic engine stop+router (25-cap), overstating served
  length once #139/#140 widened the pools past 25. Fixes: (1) the crosswalk now replays the REAL
  short-test stop + coverage router (`shortTestShouldTerminate` + `shortTestNextQuestionRequest`)
  — regenerated `served-crosswalk.{md,json}` show served **10–12** across all cohorts (was up to
  25), with deep pools L1 35 / L2 52 / L3 38 eligible; (2) hardened the unreachable no-anchor
  short fallback to also cap at 15; (3) corrected stale "short uses shouldTerminate unchanged"
  comments. Comprehensive length UNTOUCHED (target 20/30, hardCap 26/36). Progress denominator
  confirmed ≤15 (`computeMaxQuestions` = `min(15, eligible pool)`). No content/bank change.
  Verify GREEN 1232/91.

---

**As of:** 2026-06-22 (short-test sampling band fix) — trunk head is **`96e34f6`** (PRs #139,
#140, #141 merged). Picker fix + crosswalk regen landed after the UI session below; no
migration — **no `supabase db reset` needed.**

- **PR #139 — lane/young-band-sampling-band — MERGED (`17fa2bf`).** Short-test sampling band
  changed from PREVIOUS-booklet-only to **{previous, current}** at every level above the floor,
  and **{0A} only at the 0A floor**: 0B → {0A,0B}, 0C → {0B,0C}, grade 1 → {0C,1A,1B}, grade 5
  → {4A,4B,5A,5B}, … up the ladder. Fixes a 0B child being served an all-0A test identical to a
  0A child's. Renamed `previousBookletHalfGrades` → `shortTestLevelBand` in `levelBand.ts`;
  updated all three short-path call sites (pickForSession pick band, responseSubmit availability
  discovery, sessionStart `max_questions` ceiling) so band / eligible-count / progress
  denominator stay consistent. The floor collapses naturally (previous==current==0 → {0A});
  KA/KB still fold into the 0C booklet ordinal. **SCOPE: changes the served band for EVERY
  non-floor level — the prior behavior was uniformly previous-only, NOT a 0B one-off.**
  Comprehensive picker UNAFFECTED (anchors on measured level via `levelLockHalfGrades` /
  per-pick plan, never this function). No content/bank change. Verify GREEN 1232/91.
  **Supersedes the earlier Task C(c) verdict** — the picker band, not bank content, caused the
  L0A==L0B "identical" symptom.
- **PR #138 — lane/l0ab-content-identity-20260622 — MERGED (`d1dcc31`, CONVERSION lane).**
  Independently confirmed the L0A/L0B bank content is NOT duplicated (audit
  `scripts/conversion/audit/l0ab-content-identity-2026-06-22.md`); the identical-rendering cause
  was the short-test band, fixed in #139.

- **PR #140 — lane/crosswalk-regen-band-20260622 — MERGED (`872f044`, CONVERSION lane).**
  Regenerated the served-order crosswalk artifacts
  `scripts/conversion/audit/served-crosswalk.{md,json}` against the new {previous,current}
  band (re-ran `build-served-crosswalk.ts` over `seed.sql`; also refreshed the generator's
  stale cross-check annotations — `PRIOR_ESTIMATE` → `PRIOR_BAND_ELIGIBLE` + per-child
  "prev-band → now" delta + footer). Docs/artifacts only; no migration, no seed change, no
  supabase db reset. Verify GREEN 1232/91. Closes the #139 crosswalk follow-up.
  - Served-count change per QA-seed child (old previous-only → new {previous,current} band;
    eligible old→new): QA Zero-A {0A}→{0A,0B} 17→30; QA Zero-C {0B}→{0B,0C,KA,KB} 13→21;
    QA Level 1 {0C,KA,KB}→{0C,KA,KB,1A,1B} 8→35; QA Level 2 {1A,1B}→{1A,1B,2A,2B} 27→52;
    QA Level 3 {2A,2B}→{2A,2B,3A,3B} 25→38; QA Level 4 {3A,3B}→{3A,3B,4A,4B} 13→18. Every
    non-floor cohort widens (adds the child's own booklet level); bank unchanged.
- **PR #143 — lane/memory-crosswalk-band-20260622 — OPEN.** This memory record
  (CURRENT_STATE / NEXT_ACTIONS / DECISIONS) for the #140 regeneration + Task C(c) closure.
  Docs/memory only; no DB change.

---

**As of:** 2026-06-22 (ATLAS UI / onboarding session) — trunk head is **`1f0196a`** (PR #136
merged). Three ATLAS-lane PRs landed this session; PR #134 (young-band/L3 QA) also merged
(`bc637ea`). No migration in any of the three — **no `supabase db reset` needed.**

- **PR #133 — lane/landing-page-cleanup — MERGED (`55d5b8d`).** Public marketing (`/`) + auth
  (`/login`, `/signup`) cleanup (Task A): hero badge recolored navy (was red-on-pink); removed
  dead CTAs (View Sample Reports / Explore Dashboard / Book a Demo), public nav
  (Journey|Reports|Students), Number-Sense double-width, Success-Story card, all footer dead
  links; approved CTA by-line ("Join over 30,000 students…"); © 2024→2026 + branding unified to
  "Atlas Assessment Suite by S.A.M New York"; placeholder mascots → real `/mascot/*.png`. Verify
  GREEN 1225/91.
- **PR #135 — lane/assessment-flow-fixes — MERGED (`2e388bd`).** Assessment/onboarding flow
  (Task B): beta-welcome moved out of the per-assessment gate into a once-only onboarding
  interstitial on `/add-child` (localStorage `atlas_beta_welcome_seen`, `useSyncExternalStore`;
  larger font); parent-instructions screen restored (`ENABLE_PARENT_INTRO` flipped default-ON);
  removed the duplicate post-Welcome mascot screen (now spinner-only); short-test progress bar
  now shows a per-session ceiling `max_questions` from /start (short = min(short cap 15,
  eligible-pool size); comprehensive = engine cap) instead of a fixed 25 — plumbed
  handler→types→api→reducer→progress; "Current grade" on add-child now REQUIRED (UI-only; DB
  column still nullable); remaining placeholder mascots (coppa/add-child/dashboard) → real
  assets. Verify GREEN 1230/91 (+5 tests).
- **PR #136 — lane/parent-intro-final-copy — MERGED (`1f0196a`).** Replaced DRAFT parent-intro
  copy (`src/lib/proctoring/copy.ts`) with FINAL founder-approved wording (both age variants +
  shared block) and confirmed `ENABLE_PARENT_INTRO` default-ON. Read-aloud dropped the italic
  note (boxed summary only); no-assistance gained the concept-help point (parent may explain a
  unit conversion, then let the child do the math); button "Start the assessment". The env.ts
  conflict vs trunk (shared flag flip already in #135) was resolved keeping the
  default-off-invariant note + adding the founder-approved copy reference.

**Task C — picker investigations (report-only, NO code change; verdicts):**
- (a) **Short test L1 = 8 is GENUINE bank exhaustion, not a stop-short bug.** L1's
  previous-booklet eligible pool holds exactly 8 active `short_test_eligible` items; the loop
  serves all 8 then closes `bank-exhausted`. Stop policy (softFloor 10 / hardCap 15, per-strand
  floor clamps to availability) cannot stop before the pool empties. (PR #135's progress fix now
  shows "of up to 8" here instead of 25.)
- (b) **Short test: sampling level band is FIXED for the session** (anchored on grade, never
  widened on interim results); **question order is RE-DERIVED adaptively on each pick**
  (difficulty targets the running posterior within the fixed band). Actual == intended.
- (c) **L0A==L0B is NOT a picker bug.** 0A/0B are distinct booklet ordinals with disjoint level
  filters — no L0A→L0B mis-map is possible. If they render identically it is a CONTENT-BANK
  identity issue (same content authored under both external_ids) — **flagged for the CONVERSION
  lane**; the ATLAS lane did not touch bank content.

---

**As of:** 2026-06-22 — trunk head is **`f95920c`** (PR #134 open off this head;
PR #123 merged at `c4a67e8`; PR #119 `lane/picker-short-outcome` merged at `c3ad839`;
advanced from `ce9a676`/#115). Session 2026-06-22: duplicate-migration collision
(version 20260620120000) verified already resolved on trunk — no new work. New open PR
#134 (young-band + L3 founder-QA defect batch).

**PR #134 — lane/young-l3-qa-defects-20260622 — OPEN (CI GREEN, Vercel GREEN).** Young-band
+ L3 founder-QA defect batch, off trunk head `f95920c`. Verify: 1225 tests / 91 files GREEN,
tsc 0, lint 0 errors (2 known warnings), build OK, seed-migration parity PASS (71 migrations).
Codex manual/skipped (relay unauth). Migration `20260622120000_young_qa_image_stem_fixes.sql` +
seed mirror (3 UPDATEs on already-active rows):
- SAM-L0A-Q11 (band-{0A} pattern): wired missing pattern-strip stimulus
  `l0/sam-l0a-q11-stimulus.png` (red,blue,red,blue,red,?).
- SAM-L0B-Q02 (band-{0A} pattern): wired missing pattern-strip stimulus
  `l0/sam-l0b-q02-stimulus.png` (magnet,baseball x3).
- SAM-L0C-Q13 (band-{0B} days-of-week): re-authored stem VERBATIM from worksheet, wired
  torn-calendar stimulus `l0/sam-l0c-q13-stimulus.png`, reduced choices to two
  (Friday/Fryday, reusing q13-t2/q13-t4).
- SAM-L0B-Q03 (band-{0A} cake): NO DB change — SOURCE_MAP key `l0/sam-l0b-q03-stimulus.png`
  re-pointed from 0B-03_1.png (whole cake) to doc-faithful cake-with-wedge crop.
New stimulus crops cut from rendered worksheet pages via committed reproducible generator
`scripts/conversion/gen_young_qa_stimuli.py` (Word→PDF→PNG→crop). Source PNGs gitignored;
founder uploads to private question-images bucket. SOURCE_MAP (`activation-image-set.ts`)
updated: 3 new keys + 1 re-point. Served-order crosswalk (`build-served-crosswalk.ts`)
extended with a band-{0A} child "QA Zero-A" (Pre-K age 5); `served-crosswalk.md/json`
regenerated. `scripts/conversion/_extract_docx.py` now tracked (was untracked). Findings
doc: `scripts/conversion/audit/young-l3-qa-defects-2026-06-22.md`.
ALSO FIXED (2026-06-22 follow-up, same lane):
- SAM-L0C-Q04 (fact-family): was EQUATION_SET → rendered blank (all-blank number sentences;
  operands only in canonical). Re-authored to **MULTI_BLANK** — operands shown as `text`
  tokens (3+6 / 6+3 / 9-3 / 9-6), each result its own `blank`; per-blank numeric grading
  reuses canonical answers (9,9,6,3). Migration `20260622130000` + seed mirror. The earlier
  "EQUATION_SET prefill lane" backlog is RESOLVED (the flag was over-scoped — MULTI_BLANK
  already gives per-blank slots with operands as text). serialize serves stem+tokens only.

ONE ITEM PARKED (founder-supplied art):
- SAM-L4-Q21 (L3-session rectangle area, served Q5): source
  `scripts/conversion/source/4/L4-21.png` is a blank blue rectangle with no dimension
  labels. Founder to re-upload a corrected PNG (dimensions NOT fabricated). No DB change.
Founder actions after merge: (a) `pnpm convert:upload-activation-images` (3 new keys +
re-pointed cake); (b) re-upload corrected `source/4/L4-21.png` then re-run image upload;
(c) `supabase db reset` (applies `20260622120000` + `20260622130000`).

**PR #123 — lane/short-eligible-overset-audit — MERGED (`c4a67e8`)** (docs/helpers only — no
migration, no seed, no flag change; commit `a084d0e`). Verify GREEN pnpm test 1196/89, tsc
clean, lint 2 known warnings, seed↔migration parity PASS. Deliverables:
`short-eligible-overset-audit.md`; `overset-state.mts` (computes FINAL DB state from `seed.sql`
— inserts first-wins + all 213 updates in single-`=`, `IN(...)`, JOIN forms);
`_extract_short_keys.py`; `build-overset-matrix.mjs`; `bank-final-state.json` (ids+flags only;
licensed source tree gitignored). Findings: Task 2 (key parity) ZERO gaps / ZERO over-flags —
every active source-Short=Y row already `short_test_eligible=true` (`l1-l4-short-eligible-backfill`
migration `20260619080000` + young-band L0 authoring honor the key; no UPDATE applied). Task 3
(over-set ceiling) SOURCE-KEY CAPPED, not under-flagged — no strand×booklet cell reaches the
~15–18 target (max booklet-2 number_sense = 13); per-booklet active&STE pools 0A=18 / 0B=13 /
0C=8 / booklet-1=27 / booklet-2=25 / booklet-3=13 / booklet-4=5 (critically under); each
worksheet bands across MULTIPLE booklets (L1→0C+1, L2→1+2, L3→1+2+3, L4→2+3+4). Source Short=Y
docx counts match backfill IN-lists (L1 17/L2 21/L3 20/L4 25). Three Short=Y rows have NO DB row
(converter-skipped): `SAM-L3-Q04`, `SAM-L3-Q23`, `SAM-L4-Q17` — recoverable only by
re-authoring. Two items PARKED for Dimitri (see NEXT_ACTIONS). Independent lane; no change to
young-band exclusions or prior PRs.

**Picker Calibration — 3 stacked PRs (2026-06-21).** All verify-bar GREEN; Codex
manual/skipped (relay unauth). **PR #119 (PR1) MERGED (`c3ad839`).** Remaining stacked and
open, in order: **#121 → #122** (Dimitri merges attended after Vercel preview; stacked-PR
retarget note: when a parent PR merges GitHub may not auto-retarget the child — manually
re-point #121's base to ATLAS-ASSESSMENT if needed, same for #122 after #121).

**OPEN PR #120 — lane/young-band-image-activation-audit** (docs/memory only, off trunk
`ce9a676`). **Finding: the young-band (0A/0B/0C) SHORT-TEST beta has NO remaining content
gate.** The short-test-eligible young-band image set is fully active on trunk (PR #78 + the
2026-06-20 wave: l0a/l0b/l0c-taxonomy-activation, l0b-position, l0a-q15, l0a-q17,
l0b-q03-q06, l0-qa-content-fixes; named defect patterns fixed). Triple-verified against
`seed.sql`: **53 young-band rows = 36 active / 17 inactive**, 26 active IMAGE rows (0A=11,
0B=6, 0C=9). **The 9 inactive image rows (SAM-L0A-Q09/Q12, L0B-Q01/Q08/Q12/Q13,
L0C-Q01/Q06/Q12) are FOUNDER-ADJUDICATED EXCLUDED FROM THE SHORT TEST — not a content gap,
not a beta gate.** Exclusion is durably encoded (`short_test_eligible=false` AND
`is_active=false`) and picker-enforced (`shortTestPicker.ts:50-51` selects only
`is_active=true AND short_test_eligible=true`; test `shortTestPicker.test.ts:88`) — they are
inert to the short test regardless of art. No new flag needed; only the exclusion REASON was
prose (now relabelled in the doc). Any per-row art note is COMPREHENSIVE-only/future, NOT a
short-test blocker. Other 8 inactive: manual/oral/drawing/text-ambiguous or retired L0C-Q11
(replaced by active Q11A–D). Named defect patterns verified clean (L0C-Q05 shuffled
IMAGE_ORDERING + id-keyed grading; L0A-Q08 box-reference is a separate stimulus).
Seed↔migration parity **PASS** (69 migrations). Verify GREEN 1196/89, tsc 0, lint 2 known
warnings. No migration/seed/image change. Findings doc:
`scripts/conversion/audit/young-band-image-activation-status.md`. PR is docs/memory only;
merge at leisure to land the record.

---

**History (pre-#119 trunk).** Trunk reached **`7f2a737`** via six merges since the
2026-06-18 snapshot below: PR #109 (fix-dup-migration-version, `e489312`), #110
(restore-seed-mirrors, `8d3d09c`), #111 (seed↔migration activation **parity guard** +
generated mirror region, `20127b0`), #112 (L0C young-band QA fix batch #2, `3c5dfc0`),
#113 (L1 QA batch — Q1/Q2/Q4/Q8 + L4-Q06 missing-digit, `f5fdbc9`), #114 (short-test
follow-up form, `7f2a737`); then #115 (`ce9a676`), #119 (`c3ad839`), #123 (`c4a67e8`). PRs
#82/#83/#84 below are now superseded/older — verify their GitHub status before acting; the
2026-06-18 block is retained for history.

**Picker Calibration PRs (3 stacked, 2026-06-21) — #119 MERGED (`c3ad839`); #121/#122 open:**

- **PR #119 — lane/picker-short-outcome** (base ATLAS-ASSESSMENT, off `ce9a676`):
  New `src/lib/shortTest/outcome.ts` — `ShortTestOutcome` type with `measured_level`,
  `intake_level`, `pass_band` (clean/mixed/weak/insufficient, 8-graded-item floor;
  clean ≥0.8 / mixed 0.5–0.8 / weak <0.5 / insufficient <8 graded), `clean_pass_ratio`,
  `strand_map{correct,seen,ratio}`, `seen_item_ids`. Persisted to new nullable jsonb column
  `assessment_sessions.short_test_outcome` (migration `20260621130000`, column DDL, NO seed
  mirror) on session close via `persistShortTestOutcome` in `responseSubmit/handler.ts`
  `closeSession` (gated to short). Readiness floor: needs ≥8 graded AND clean ratio;
  0A current level suppressed. New `src/lib/engine/shortTest.ts` — stratified short draw:
  coverage-first router (~2/strand, fewest-served then max-variance fill) + coverage+count
  stop (10–15, no SE gate). In-scope = strands with ≥1 active short_test_eligible item in
  previous-booklet band (new `picker.discoverShortEligibleCounts`); floor clamps to
  availability. Wired into `responseSubmit` decideTermination/buildRouter for short.
  Verify: **1220 tests / 91 files GREEN**, tsc 0, lint 0 err (2 known warnings), build OK.
  Post-merge: `supabase db reset` (adds nullable `short_test_outcome` column).

- **PR #121 — lane/picker-comprehensive** (base lane/picker-short-outcome):
  Comprehensive anchors on MEASURED level (reads child's latest completed short session's
  `ShortTestOutcome` → booklet band; neutral grade when no outcome). Global split by
  `pass_band` (`src/lib/engine/comprehensiveSplit.ts`): clean 30/50/20 over M-1/M/M+1;
  mixed 50/30/20 over M-1/M/M-2; weak below-weighted (floor-find seed); insufficient/none
  neutral 50/30/20. `planNextOffset` steers each pick to the largest-deficit offset.
  Per-strand override `strandAdjustedSplit` redistributes by `strand_map` ratio.
  Per-pick plan (`src/lib/questionPicker/comprehensiveLevelPlan.ts`): chosen offset →
  target±1 booklet band + difficulty centred on planned booklet (thin pool falls through to
  neighbour). `replay.replayStrandOffsetCounts` attributes actual served level back to an
  offset so the split self-corrects. ALWAYS subtracts `seen_item_ids`
  (`PickContext.extraExcludedIds`, merged in both handlers). Length 20–30, cap 30:
  G5_8 `hardCap` 36→30; K_4 stays target 20 / cap 26. `NextQuestionRequest`/`PickerRequest`
  gain optional per-pick `levelBand`; `pickForSession` honours it for comprehensive.
  Verify: **1250 / 94 GREEN**, tsc 0, lint 0 err (2 known), build OK. No new migration.

- **PR #122 — lane/picker-floor-ceiling** (base lane/picker-comprehensive):
  Bank-aware offsets (`picker.discoverAvailableBooklets` → `availableOrdinals`): split only
  targets booklets the active bank serves. CEILING = no reach above highest available.
  FLOOR = walk-down stops at lowest loaded booklet. Floor-find (`weak` pass_band): hands
  level to adaptive engine over `floorFindBand` (at-and-below) so it walks down until solid.
  Wired in `responseSubmit` router + sessionStart first pick. `manual_placement_needed`:
  `evaluateFloorFind` sets it true when engine settled at/below lowest loaded booklet AND
  child still not solid (< `FLOOR_FIND_SOLID_RATIO` 0.5). New nullable column
  `assessment_sessions.manual_placement_needed` (migration `20260621140000`, column DDL,
  NO seed mirror), persisted on comprehensive completion (`persistComprehensivePlacement`,
  no-op for short). Copy `src/lib/report/manualPlacement.ts`: manual line founder-locked
  verbatim; `floorFoundLine` + `ceilingLine` are §2.4 DRAFTS pending Dimitri.
  Verify: **1260 / 94 GREEN**, tsc 0, lint 0 err (2 known), build OK.
  Post-merge: `supabase db reset` (adds nullable `manual_placement_needed` column).
  BATCHED GATE ITEMS for Dimitri (in PR #122 body):
  (1) Confirm §2.4 draft parent copy (`floorFoundLine`, `ceilingLine`) in `manualPlacement.ts`.
  (2) Render floor-found/manual/ceiling copy in parent report + surface `manual_placement_needed`
      to instructor view — HELD pending copy decision (not built).
  (3) Thin-pool structural fix = parametric item generation — out of scope; readiness min-N
      floor (PR #119) + comprehensive confidence already cover under-N.

**Previous session open PR — lane/qa-crosswalk-l1l2** (off trunk `f5fdbc9` / #113 head; #114
is a sibling not in this branch's history — re-pin touches only bank content so no
conflict). Short-test served-order→external_id crosswalk + three QA re-pins:
- **Crosswalk** (`scripts/conversion/audit/build-served-crosswalk.ts` + `served-crosswalk.{md,json}`):
  replays the real adaptive engine over `seed.sql` per QA-seed child. The prior "MISMATCH"
  banner was a **stale hardcoded estimate**, not a served≠eligible gap — reframed as a
  non-blocking cross-check. Per-child served-vs-eligible: 0B 13/13, L1 8/8, L4 13/13 (all
  genuine bank-exhaustion); L2 25/27, L3 25/25 (both the 25-question MAX cap). **No
  picker-stops-short defect.**
- **L2-Q1 = SAM-L1-Q28** (served pos 1; NOT external SAM-L2-Q01) — FIXED. Stem reworded to
  "Arrange the numbers in order, from smallest to largest." (was carrying the original
  NUMERIC_ENTRY stem with the literal 17/20/10 that duplicated the tiles). Stays DRAG_DROP;
  items [17,20,10] (≠ answer order → served shuffled); correct_order [10,17,20]; grading
  unchanged. Migration `20260621120000_l1_q28_stem_rework.sql` + seed mirror (parity guard PASS).
- **L2-Q2 = SAM-L1-Q23** (ribbon word problem; NOT triangle-counting SAM-L2-Q02) — REPORTED,
  no fix. Text-complete (7+3=10), no serve-time image defect; source ribbon figures are
  illustrative/redundant. Decision-queued (add art vs keep text-only).
- **L1-Q3 = SAM-L1-Q01** (same-color) — REPORTED, already source-correct. Reds interleaved at
  tiles 1/3/5 matching the worksheet crops; serializer preserves authored order; id-keyed
  select-all grading (shuffle-safe). No change.
- Findings doc: `scripts/conversion/audit/repin-findings.md`. Verify GREEN **1181 tests /
  87 files**, tsc 0, lint 0 errors (2 known warnings). Codex manual/skipped (relay unauth).
  After merge: `supabase db reset` (applies `20260621120000`). No image upload.

---

**As of:** 2026-06-18 session — trunk advanced to **`ae281dd`** (PR #81, lane/short-test-readiness-report, merged). Three new open PRs (all off trunk `ae281dd`, NOT stacked, Dimitri merges attended after Vercel preview review):

- **PR #82 (lane/lead-notify-test)** — test-only: `src/lib/followUp/notify.test.ts` (flag-gated no-op, live POST shape, fail-soft coverage). Implementation already on trunk (Task 3 was verify-confirmed-done; see below). Verify GREEN 1172 tests / 84 files, tsc 0, lint 0 errors (2 known warnings), build GREEN. Codex manual/skipped (relay unauth).
- **PR #83 (lane/mascot-welcome)** — replaces the auto-advancing loading screen with a STATIC tap-to-start Welcome (`src/app/(child)/assessment/components/Welcome.tsx`; tier-aware). Child tap is the SOLE releaser of `startConfirmed` in `assessment-client.tsx`; parent-intro + dev pilot-chooser gates now only acknowledge/advance (no longer release start). New `Welcome.test.tsx` (renderToString smoke, Mascot stubbed). Reducer unchanged. Verify GREEN 1170 tests / 84 files, tsc 0, lint 0 errors (2 known warnings), build GREEN. Codex manual/skipped.
- **PR #84 (lane/coppa-consent-of-record)** — LEGAL/COPPA. Single consent source (`CONSENT_TEXT` + `CONSENT_TEXT_VERSION` "2026-06-18.v2" in `src/lib/consent/text.ts`; form + action both use same constant). Disclosure asset: `docs/legal/COPPA_Disclosure.docx` committed with two edits vs counsel original (§2 removed "school name" from not-collected list; §10 placeholder → privacy@samnewyork.com); served PDF `public/legal/coppa-disclosure-v1.pdf` generated via `tools/legal/build_coppa_pdf.py`. `/coppa` "Download PDF" button wired → `/legal/coppa-disclosure-v1.pdf`. New `consent_records` columns `disclosure_version` + `disclosure_content_sha256` (migration `supabase/migrations/20260618120000_consent_disclosure_asset.sql` + `database.types.ts` + seed mirror). Add-child action captures `DISCLOSURE_VERSION` ("coppa-disclosure-v1") + PDF sha256 (`a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea`) on every row. `src/lib/consent/text.test.ts` recomputes the PDF hash and asserts equality (drift guard). `LEAD_SCHOOL_FIELD_LIVE` default flipped ON (`!== "false"`) in `src/lib/env.ts`; "school not collected" removed from disclosure + env; `.env.example` updated. `docs/legal/Parent_Privacy_Request_Policy.docx` committed for the record. Verify GREEN 1170 tests / 84 files, tsc 0, lint 0 errors (2 known warnings), build GREEN. Codex manual/skipped. REQUIRES `supabase db reset` after merge (adds 2 nullable `consent_records` columns; seed populates them). BATCHED GATE ITEMS for Dimitri (in the PR): (1) served PDF uses core fonts / ASCII punctuation — excludes the source doc's "Checkbox:"/"Button text:" authoring annotations; (2) the ON-SCREEN `/coppa` page body is still Stitch placeholder copy and does NOT yet match the counsel PDF — recommend a follow-up copy pass (parent-facing claims language, gate to Dimitri); (3) confirm committing `Parent_Privacy_Request_Policy.docx` is intended.

**Tasks verify-confirmed already on trunk (no fabricated changes):**
- **Task 1 ("wire the short picker live")** — verified already done via commits f877285 + a23097c (pre-dating PR #81). Short path already routes through `src/lib/questionPicker/pickForSession.ts:67` (`session.testType === "short"` → `pickShortTestQuestion`, `short_test_eligible` filter + previous-booklet band). Both live handlers call pickForSession: `src/lib/sessionStart/handler.ts:376,581` and `src/lib/responseSubmit/handler.ts:1154`. `test_type` defaults to "short" at `sessionStart/handler.ts:238`. Tests already cover dispatch (`pickForSession.test.ts`) + filter (`shortTestPicker.test.ts`). No PR opened. Confirm-only.
- **Task 3 ("lead-notification email send path")** — verified already done on trunk. `src/lib/followUp/submit.ts` persists the `follow_up_leads` row then calls best-effort `src/lib/followUp/notify.ts` (Resend via fetch), gated by `LEAD_NOTIFY_LIVE`, fail-soft (never throws; persistence never blocked). Not enabled (env stays founder-set). PR #82 is test-only.

**As of:** 2026-06-16 L0/L1/L2 activation wave — **PR #78 OPEN** (lane/l0-l2-activation), off trunk `a98f3e5`. Activates 19 FLIP-READY held rows across L0A/L0B/L0C/L1/L2 (one atomic UPDATE per level: sets real format + full render/answer content + `is_active=true`, guarded on `is_active=false`; activated content carries NO `_authoring.requires_format_swap` so the `questions_held_rows_inactive` CHECK permits it). New migration `20260617120000_l0_l2_activation.sql` + mirrored seed `l0-l2-activation` block (additive +214/-0). New applier `scripts/conversion/apply-activation.ts` (`pnpm convert:apply-activation`), reads per-level overlay `overlay/l{0a,0b,0c,1,2}-activation.json`; asserts only the 19 targeted ids change (non-destruction). `activation-spec.md` documents exact per-format content shapes (from `serialize.ts` + `correctness.ts` + `mintImage.ts`). FLIP-READY rows: L0A Q08/Q11 (CLICK_IMAGE_SINGLE); L0B Q02 (CLICK_IMAGE_SINGLE); L0C Q03 (SELECT_MULTIPLE), Q04 (EQUATION_SET), Q08/Q11/Q16 (MULTI_BLANK), Q14 (NUMERIC_ENTRY); L1 Q02/Q03/Q16 (MC+image), Q11/Q27 (VISUAL_MATCHING text tiles), Q13/Q15 (VISUAL_MATCHING+images), Q14 (MULTI_BLANK+image), Q17 (IMAGE_ORDERING); L2 Q06 (CLICK_IMAGE_SINGLE). Two demoted to one-image-away (image does not yet exist): SAM-L0A-Q17, SAM-L0B-Q07. Verify GREEN: **1091 tests / 76 files**, tsc 0, lint 0 errors (2 known warnings), build OK. Codex manual/skipped (relay unauth). PR #78 OPEN — awaiting image uploads to private `question-images` bucket (l0/, l1/, l2/ folders), then founder merge + `supabase db reset`. ACTIVATION DEPENDENCY (trunk): PRs #74/#75/#76/#77 merged (L0 bank, L0 memory, short-test-eligible picker, per-tile minting); trunk head is now `a98f3e5`.

**As of:** 2026-06-15 L0 authoring session — **PR #74 OPEN** (lane/l0-authoring). Re-authors 21 SAM-L0* rows that were mis-banded KA/KB by the 2026-06-11 full-library pipeline run (migration `20260611134158`); replaces model-reconstructed content verbatim-from-docx; 49 tasks total (28 insert + 21 update across 0A/0B/0C). Three new migrations off ATLAS-ASSESSMENT head `e3f60f1` (trunk head is `b2331fb` after PR #72 merged, which PR #74 does not touch in `.agent/`): `20260616120000_add_prek_grade_levels.sql` (enum DDL only — adds 0A/0B/0C to `half_grade_level` BEFORE KA); `20260616120050_add_short_test_eligible_column.sql` (adds boolean column `questions.short_test_eligible` default false); `20260616120100_l0_overlay_load.sql` (28 inserts + 21 updates; mirrored +447/-0 additive block appended to seed.sql). Three overlay JSON files: `overlay/l0a-authoring.json`, `l0b-authoring.json`, `l0c-authoring.json`; applier `scripts/conversion/apply-l0-overlay.ts` (`pnpm convert:apply-l0-overlay`), supports level re-band in UPDATE, asserts SAM-L0-only (non-destruction). Result breakdown: 8 active (text-answerable arithmetic; bands 0A/0B); 3 held-A (image-essential, inactive); 31 held-C (`requires_format_swap=true`, `is_active=false`, satisfies `questions_held_rows_inactive` CHECK); 7 inactive (drawing/tracing/colouring/oral — no auto-grade path); 3 mis-modeled pipeline actives DEACTIVATED (SAM-L0C-Q03/Q08/Q16). Short-test eligibility in the real boolean column `questions.short_test_eligible` (ATLAS-authoritative name) set per docx Summary (31/49). Spelling Americanized. Verify GREEN: **1074 tests / 75 files**, tsc 0, lint 0 errors (2 known warnings), build OK. Codex manual/skipped (relay unauth). PR #74 OPEN — awaiting Dimitri attended merge + `supabase db reset`.

**As of:** 2026-06-15 image-answer-inputs session — **PR #71 MERGED (`e3f60f1`)**
(lane/image-answer-inputs, branched off ATLAS-ASSESSMENT head `dfc9925` / PR #65, NOT
stacked). Adds the three click-image answer formats — `CLICK_IMAGE_SINGLE` /
`CLICK_IMAGE_MULTI` / `IMAGE_ORDERING` — fully wired through client input + server grading,
**forward-wired ahead of CONVERSION activation**. App + enum only; **no rows touched**
(enum-DDL-only migration `20260615120000`; no `is_active` / `requires_format_swap` flips;
`questions_held_rows_inactive` guardrail stays enforced). Grading reuses `select-all`
(set-equality) for multi; adds `select-one` + `order-equality`; server reads the authored
model from `content._authoring.answer_model`, tiles served render-safe from top-level
`content.tiles`. Verify GREEN **1074 tests / 75 files** (+95/+3 over the 979/72 snapshot),
tsc 0, lint 0 errors (2 known warnings), `pnpm build` OK. **MERGED to ATLAS-ASSESSMENT
2026-06-15 (merge `e3f60f1`, lane commit `7abdf4d`); trunk subsequently advanced to `a98f3e5` after PRs #74/#75/#76/#77 merged (L0 bank, L0 memory, short-test-eligible picker, per-tile minting).**
**ACTIVATION DEPENDENCY (CONVERSION-owned):**
before any of these held rows is flipped active, per-tile image minting must be added to
`serveQuestion.ts` (analogous to `mintMatchingTileImages` for VISUAL_MATCHING) to read
`content.tiles[].image_path` — otherwise activated rows serve **pictureless** (label-only).
No runtime risk while held. See NEXT_ACTIONS §3f. **(This memory PR is docs-only,
lane/memory-image-inputs-2026-06-15, off trunk, not stacked.)**

**As of:** 2026-06-13 visual-primitives session — PR #59 OPEN (lane/visual-primitives-g1-3),
verify-bar SUCCESS + Vercel preview built, awaiting attended merge. G1-3 visual-primitive +
answer-input + grading library shipped as app code; bank untouched. Verify GREEN 979 tests /
72 files, tsc 0, lint 0 errors (2 known warnings), pnpm build GREEN.
**QA-UNBLOCKING PRIORITY:** Issue-1 served-gate multirow fix is on **PR #58 (OPEN, green,
mergeable)** — NOT yet on trunk (trunk head f8c0f30 still has the buggy `.maybeSingle()`).
Merge #58 to unblock first-submit QA. A follow-up PR (lane/memory-audit-2026-06-13) carries
this session's memory + audit Appendix A, kept off #58.
Previously (2026-06-12): all four security lanes MERGED (PRs #50/#52/#53/#55); PR #51 CLOSED
(superseded by #55); PR #54 memory lane merged; `supabase db reset` run (applies
20260612090000 + 20260611090000). QA-prep package delivered. lane/qa-prep-2026-06-12 open,
PR pending.
**Session split:** CONVERSION Stage 4 / question-bank work runs in a SEPARATE session. This
session must NOT touch `scripts/conversion/` or taxonomy migrations; coordinate via repo
memory only.
**Branch:** `ATLAS-ASSESSMENT`. **Repo:** `dsogoloff/atlas-ai` → local
`C:\Users\Acer\PROJECTS\atlas-ai`.
**Origin head:** `ae281dd` (PR #81 lane/short-test-readiness-report merged, 2026-06-18).
ATLAS-ASSESSMENT is protected by the "Branch Protection" GitHub ruleset (scope
`~DEFAULT_BRANCH`; requires PR + the `verify-bar` status check; no direct pushes). All work
goes via `lane/*` branches opened as PRs; Dimitri merges attended after Vercel preview
review. All three M2 lanes (consent, instructor, analytics) are merged; report bugs 1 & 2
fixed; both report analytics events wired; brand-dot scrub applied; 11 §12 rollout flags
added (default-off); ops runbook shipped; parent Sign-Out wired; dev-seed completed report
added; three-section report layout shipped. G1 LIFTED 2026-06-10 (S.A.M. founder granted
permission to digitize entire test library). CONVERSION Stage 4 built (PR #23, worktree
atlas-stage4). Content-id backfill built (PR #22, worktree atlas-backfill).
Comprehensive-test instrumentation + consent regression test (PRs #41/#42) and comprehensive
engine (PR #46) are ALL on ATLAS-ASSESSMENT via PR #49 cherry-pick re-land.
**Verify baseline (ATLAS-ASSESSMENT head 970698e / f8c0f30):** 915 tests / 56 files
(confirmed 2026-06-12); 0 type errors; 2 known lint warnings (no-img-element in
profile-menu.tsx:48, no-page-custom-font in layout.tsx:56); `pnpm build` GREEN.
PR #59 lane snapshot: 979 tests / 72 files (+64/+16 over baseline).
(Earlier snapshots: 900/55 was post-#49; 864/52 was pre-#49; 554 was pre-merge era.)
## Lanes
| Lane | State | Notes |
|------|-------|-------|
| Prod schema reconciliation + remediation tooling (PR #188) | OPEN PR #188 — CI GREEN | lane/prod-bringup-inspect-fix, head `0184670`, base ATLAS-ASSESSMENT. `introspect.ts` (direct Postgres via `PROD_DATABASE_URL`), `compare.ts` (full-attribute + `ACCEPTED_DRIFTS` allowlist), `06` (→direct Postgres), `07-verify-prod-schema.ts` (exits nonzero on UNEXPECTED drift), `09-gen-prod-type-remediation.ts` (AUTO-SAFE / REVIEW split). Prod state: 24 tables + 16 enums + 34 policies all MATCH or ACCEPTED; 0 UNEXPECTED drift; both generated SQL files empty; 9 accepted-for-beta drifts. Verify GREEN (CI). Codex manual/skipped. Awaiting Dimitri merge. |
| Prod bank loader (PR #186) | MERGED (`dfb82a6`) | lane/prod-bringup (batch 1). `05-load-bank-prod.ts` (commit `aa3446f`): local→prod PostgREST upserts, dry-run default, `--prod` flag behind `.env.prod.local` gate. OPEN QUESTION: whether live `--prod` upsert has been run against prod and whether counts match audited local bank. Needs Dimitri to confirm. |
| Answer log humanize (PR #171) | OPEN PR #171 | lane/answer-log-humanize, off ATLAS-ASSESSMENT. No migration. New `src/app/(parent)/report/answers/humanize.ts` + `humanize.test.ts`: resolves tap/id-set answer formats (CLICK_IMAGE_SINGLE/MULTI, SELECT_MULTIPLE, IMAGE_ORDERING, VISUAL_MATCHING, MULTI_BLANK, EQUATION_SET) to readable labels; MC/numeric/text/drag-drop unchanged; never throws. `fetchItemReview` (instructor/admin) unaffected. Verify GREEN 1346 tests. |
| L4 narrative self-heal (PR #173) | OPEN PR #173 | lane/l4-narrative-fix, off ATLAS-ASSESSMENT. No migration. `shouldRegenerateNarration` broadened for no-row + strand-data case; at-most-once guard via `failedNarrationMarker` status row; new predicate `narrationRowIsSelfHealAttempted`. Regression tests in `refresh.test.ts`. Verify GREEN 1346 tests. |
| CONVERSION prod bring-up step 1 — schema inspection + additive catch-up SQL (PR #181) | OPEN PR #181 | lane/prod-bringup-schema-analysis, off ATLAS-ASSESSMENT head `25b5a7c`. Analysis only. 3 new files: scripts/conversion/prod-bringup/{01-inspect-prod-schema.sql,02-catchup-additive-schema.sql,README.md}. Verify GREEN 1371/105, tsc 0, lint 0 errors (2 known warnings), seed↔migration parity PASS (81 migrations). Founder gated on prod creds + explicit go-ahead for each step. |
| CONVERSION L5/L6 booklet re-band + load 6 rows + wire image_path (PR #169) | OPEN PR #169 | lane/l5l6-booklet-reband-load-images, off ATLAS-ASSESSMENT head `f5947d5`. 3 migrations: `20260625120000` (re-band all SAM-L5/L6 to booklet floor 5A/6A) + `20260625120100` (load 6 skipped rows) + `20260625120200` (wire image_path for 15 inactive rows). Seed parity PASS (78). Verify GREEN 1336/102, tsc 0, lint 0 errors (2 known warnings). Requires `supabase db reset` after merge. SAM-L5-Q27 HELD (image-option per-tile not yet wired). |
| Young-band narration render: interstitial + placement clamp (PR #166) | OPEN PR #166 | lane/young-band-narration-render, off ATLAS-ASSESSMENT head `bf792cc`. No migration. Pre-narration polling interstitial (bounded 30s, degrades to generic-lede on timeout); railed-placement clamp in `assembleReportContent` (`clampLevelToServedCeiling`). New files: `narration-pending.ts` + test, `preparing-report.tsx`; modified: `report/page.tsx`, `assemble.ts` + test. Verify GREEN 1336/102, tsc 0, lint 0 errors (2 known warnings). Codex manual/skipped. |
| Intake grades-7/8 disable + >L6 clamp (PR #159) | OPEN PR #159 — CI GREEN | lane/intake-grades78-disable-l6clamp, off origin/ATLAS-ASSESSMENT. No migration. Grades 7/8 greyed "(coming soon)" non-selectable; `halfGradeToTaxLevelCode` clamps 7A/7B/8A/8B → l6 (was returning null → empty strand_mastery). Exported + unit-tested. Verify GREEN. |
| Low-level strand report fix (PR #160) | OPEN PR #160 — CI GREEN | lane/report-low-level-strand-fix, off origin/ATLAS-ASSESSMENT. No migration. Engine-strand fallback when content_id yields zero sub-strands; gated on `subStrandByQuestion.size===0`. 0A + L1 regression tests. Verify GREEN. NOTE: 0A readiness/placement-card behavior (possibly deliberate suppression in readiness.ts) left for Dimitri to confirm on preview. |
| Short-test sub-strand coverage (PR #161) | OPEN PR #161 — CI pending | lane/short-test-strand-coverage, off origin/ATLAS-ASSESSMENT. No migration. New `src/lib/questionPicker/subStrandCoverage.ts`; sub-strand-aware sort (AXIS-B coverage primary, difficulty secondary). NULL content_id degrades gracefully. Verify GREEN locally (1284 tests). CROSS-LANE: after merge, CONVERSION lane must regenerate served-order crosswalk. |
| Crosswalk regen — {prev,current} band (PR #140) | OPEN PR #140 — CI running | lane/crosswalk-regen-band-20260622, off trunk `17fa2bf`. Docs/artifacts only: regenerated `served-crosswalk.md/json` against new {previous,current} sampling band (PR #139). No migration, no seed, no supabase db reset. Verify GREEN 1232/91. CLOSES CONVERSION Task C(c). Dimitri: merge at leisure. |
| Young-band + L3 QA defects (PR #134) | OPEN PR #134 — CI GREEN | lane/young-l3-qa-defects-20260622, off trunk `f95920c`. Migrations `20260622120000` (3 UPDATEs: L0A-Q11/L0B-Q02 pattern stimuli, L0C-Q13 days stem+image) + `20260622130000` (L0C-Q04 fact-family EQUATION_SET→MULTI_BLANK). Cake = SOURCE_MAP re-point (no DB). Seed parity PASS (72). Founder: upload 3 new stimulus images + re-point cake, `supabase db reset`. ONE parked item: L4-Q21 source PNG (rectangle dims). |
| Picker short outcome (PR #119) | MERGED (`c3ad839`) | lane/picker-short-outcome, base ATLAS-ASSESSMENT off `ce9a676`. `ShortTestOutcome` type + persistence + stratified short draw. Migration `20260621130000` (nullable `short_test_outcome`). Verify GREEN 1220/91. `supabase db reset` after. |
| Picker comprehensive split (PR #121) | OPEN PR #121 | lane/picker-comprehensive, stacked on #119. pass_band global split + per-strand override + per-pick plan + seen_item_ids exclusion + G5_8 cap 36→30. No new migration. Verify GREEN 1250/94. Merge next; retarget base to ATLAS-ASSESSMENT now that #119 is merged. |
| Picker floor/ceiling (PR #122) | OPEN PR #122 — FOUNDER GATE ITEMS | lane/picker-floor-ceiling, stacked on #121. Bank-aware offsets, floor-find, `manual_placement_needed` column. Migration `20260621140000`. `manualPlacement.ts` copy with §2.4 drafts PARKED for Dimitri. Verify GREEN 1260/94. Merge third; retarget base after #121 merges; `supabase db reset` after. |
| Short-eligible overset audit (PR #123) | MERGED (`c4a67e8`) | lane/short-eligible-overset-audit, off trunk `a2c0b28`. Docs/helpers only. Commit `a084d0e`. Verify GREEN 1196/89. Two items PARKED for Dimitri (thin booklets; ATLAS comprehensive-picker question). |
| Lead-notify tests (PR #82) | OPEN PR #82 | lane/lead-notify-test, off trunk `ae281dd`. Test-only: `src/lib/followUp/notify.test.ts`. Verify GREEN 1172/84. Awaiting Dimitri merge. |
| Mascot welcome screen (PR #83) | OPEN PR #83 | lane/mascot-welcome, off trunk `ae281dd`. `src/app/(child)/assessment/components/Welcome.tsx` (tap-to-start). `assessment-client.tsx` start gating refactored. Verify GREEN 1170/84. Awaiting Dimitri merge. |
| COPPA consent-of-record (PR #84) | OPEN PR #84 — LEGAL | lane/coppa-consent-of-record, off trunk `ae281dd`. Consent text canonical source, disclosure asset + served PDF, `consent_records` new columns, add-child action wired. Migration `20260618120000`. Verify GREEN 1170/84. Requires `supabase db reset` after merge. Batched gate items in PR for Dimitri. |
| L0/L1/L2 activation wave (19 FLIP-READY rows activated) | OPEN PR #78 | lane/l0-l2-activation, off ATLAS-ASSESSMENT head `a98f3e5` (trunk after PRs #74/#75/#76/#77 merged). Migration `20260617120000` + seed mirror (+214/-0). Applier `apply-activation.ts`. 19 rows flipped: L0A Q08/Q11, L0B Q02, L0C Q03/Q04/Q08/Q11/Q14/Q16, L1 Q02/Q03/Q11/Q13/Q14/Q15/Q16/Q17/Q27, L2 Q06. Two demoted (image missing): L0A-Q17, L0B-Q07. Verify GREEN 1091/76, tsc 0, lint 0 errors (2 known warnings), build OK. Awaiting image uploads to `question-images` bucket (l0/, l1/, l2/ folders) then founder merge + `supabase db reset`. |
| L0 authoring (0A/0B/0C re-band + verbatim re-author) | OPEN PR #74 | lane/l0-authoring, off ATLAS-ASSESSMENT head `e3f60f1`. Overlay re-authors 21 SAM-L0* rows (mis-banded KA/KB by pipeline) + 28 new inserts = 49 tasks. Migrations `20260616120000` (enum DDL, 0A/0B/0C) + `20260616120100` (28 inserts + 21 updates; seed.sql +426/-0). Applier `scripts/conversion/apply-l0-overlay.ts`. 8 active / 3 held-A / 31 held-C / 7 inactive; 3 pipeline mis-actives deactivated. Verify GREEN 1074/75, tsc 0, lint 0 errors (2 known warnings), build OK. Codex manual/skipped. Needs founder merge + `supabase db reset`. |
| Image answer-inputs (3 click-image formats) | MERGED PR #71 (`e3f60f1`) | lane/image-answer-inputs, off ATLAS-ASSESSMENT head `dfc9925` (NOT stacked), commit `7abdf4d`. Adds question_format enum values CLICK_IMAGE_SINGLE / CLICK_IMAGE_MULTI / IMAGE_ORDERING (migration `20260615120000` enum-DDL-only + database.types.ts). New grading rules `select-one` + `order-equality` and `ordered-ids` AnswerValue (`src/lib/grading/`); multi reuses `select-all`. New inputs `src/components/answer-inputs/{ClickImageSingle,ClickImageMulti,ImageOrdering,TileFace}.tsx` dispatched by question.format in QuestionTimer (QuestionShell unchanged). Server judge reads `content._authoring.answer_model` (held rows keep the model in `_authoring`); serializer strips `_authoring` and serves render-safe `content.tiles`. Exhaustive switches updated (serialize, classifier prompt, parent answers page, time norms). Resolves brief's `target_input`→`target_interaction` naming in favor of the actual key. NO rows touched; guardrail intact. Verify GREEN 1074/75, tsc 0, lint 0 errors (2 known warnings), build OK. Codex manual/skipped (relay unauth). **Activation blocker (CONVERSION): add per-tile minting to serveQuestion.ts before activating, else pictureless — see NEXT_ACTIONS §3f.** Merged 2026-06-15 (`e3f60f1`). |
| Visual-primitive + answer-input library (G1-3) | OPEN PR #59 | lane/visual-primitives-g1-3, branched off ATLAS-ASSESSMENT head f8c0f30 (NOT stacked). App code only — no bank/seed/picker changes. Adds: 11 stem SVG primitives (`src/components/visual-primitives/`), 3 answer-input components (`src/components/answer-inputs/`), standalone grading module (`src/lib/grading/` — decoupled from Issue-1 served-question gate), 2 spec docs (`docs/visual-primitives-spec.md`, `docs/answer-model-spec.md`), dev-only gallery at `/dev/visual-primitives` (flag `isVisualPrimitivesGalleryEnabled` in `src/lib/env.ts`: always-on in dev/test, 404 in prod unless `ENABLE_VISUAL_PRIMITIVES_GALLERY=true`). Also establishes first shared UI home `src/components/` (no shared component dir existed before). Verify GREEN 979/72, tsc 0, lint 0 errors (2 known warnings), build GREEN. Vercel preview built; verify-bar running. Awaiting attended merge. |
| Served-gate multirow fix (Issue-1) | OPEN PR #58 — QA-UNBLOCKING PRIORITY | lane/served-gate-multirow-fix, commit `7245826`. `responseSubmit/handler.ts` access-log existence check `.maybeSingle()` → `.limit(1)` (tolerates >1 access-log row on first submit / Strict-Mode resume; `.maybeSingle()` raised PGRST116/500). Verified on origin 2026-06-13: trunk head f8c0f30 STILL has `.maybeSingle()` (handler.ts:385) — fix NOT on trunk. PR #58 MERGEABLE/CLEAN, verify-bar SUCCESS, Vercel SUCCESS — needs attended merge. Also carries 2 read-only docs (base sam-content-authenticity-audit.md + picker-level-band-proposal.md). |
| Session memory + audit Appendix A | follow-up PR (lane/memory-audit-2026-06-13) | The 4 uncommitted files from lane/served-gate-multirow-fix's tree (3 `.agent/` memory files + `docs/sam-content-authenticity-audit.md` Appendix A) moved to their own branch off ATLAS-ASSESSMENT to keep PR #58 = Issue-1 fix only. Docs/memory only; not stacked. NOTE: its audit doc is the FULL file (base + Appendix A) and overlaps PR #58's base audit doc — whichever merges second conflicts on that one file; resolve by keeping the fuller (Appendix A) version (recommend merge #58 first). |
| Report reskin (layout) | MERGED, BUGS OPEN | `204166b`. Editorial format in; bugs 1 & 2 fixed (`a74c613`, `fbe8c5b`); both analytics events wired. Bugs 1 & 3 (placement bar / radar / sub-strand pills on the `unreliable` degraded branch) PARKED — see NEXT_ACTIONS. |
| Consent (per-child + gate + classifier-live) | MERGED | `4dc9dc1`+`0a99f76`. Gate server-side, per `child_id`, fails closed. Classifier live in code; needs Vercel env. |
| Instructor portal | MERGED | `48c7378` (merge `a8a988c`). Roster, diagnostic view, notes, response-derived item review. Raw question content gated. |
| Analytics + satisfaction | MERGED + PUSHED | `a16fd15` (merge `71205e5`). Event store, funnel, parent satisfaction island. 2 report-resident events unwired. |
| Comprehensive-test instrumentation + engine (M2 KPI) | MERGED to ATLAS via PR #49 | Originally PRs #41/#42/#46. #41 (instrumentation) and #46 (engine) had merged into their stacked parent lane branch and were stranded off ATLAS. Re-landed 2026-06-12 via cherry-pick PR #49 (commits 7e7c37e + 2dad26c). Includes: test_type discriminator, 6 analytics enum values, assessment_test_type enum, instructor_usefulness table + RLS, all comprehensive_*/short_*/instructor_* events, per-strand coverage summary. Conflict resolved: instructor student page import union (#47 strand labels + #46 coverage summary coexist). ATLAS head b9b0662. Verify 900/55. Migration 20260611090000 still requires `supabase db reset`. |
| Consent gate regression — comprehensive | MERGED to ATLAS via PR #49 | Originally PR #42. Cherry-picked in PR #49. Asserts dual server-side consent gate fails closed for comprehensive session. |
| Ops runbook gaps | OPEN PR #43 | lane/ops-runbook-gaps. Docs only (docs/ops-runbook.md). §3 rewritten: stuck/abandoned sessions + Option A reset-by-delete / Option B force-close; §4 consent revoke + vpc_audit_log insert + revoke-all-children variant; §7 new scenario. Narration-regen KNOWN GAP documented as optional follow-on. Awaiting attended merge (no supabase db reset needed). |
| Served-question gate (security) | MERGED PR #50 (ea53da5) | lane/served-question-gate. responseSubmit requires question_access_log row for (tenant,session,question) + no existing response before scoring; else 403 question_not_served. Removes silent idempotent-retry; already_answered hard-rejected (409). |
| Duplicate-response constraint (security) | MERGED PR #55 (4b31baa) — PR #51 CLOSED | PR #51 was stacked on lane/served-question-gate and did NOT auto-retarget on #50's merge (third stranded-PR incident). Closed; superseded by PR #55 opened directly against ATLAS-ASSESSMENT. Migration 20260612090000: unique(session_id,question_id) on responses; insert conflict-safe (23505 → idempotent return). |
| AI data minimization (security) | MERGED PR #52 (57e5f93) | lane/ai-data-minimization. TEXT_ENTRY math-safe sanitizer (allowlist, max 40); narration sends firstName only; .env.example MISCONCEPTION_CLASSIFIER_LIVE default → false. Voice-locked Step-4 SYSTEM prompt TEXT unchanged. |
| Next.js upgrade + CI build step (security) | MERGED PR #53 (1997b3d) | lane/next-upgrade-ci. next + eslint-config-next 16.2.4→16.2.9; 'pnpm build' step added to verify.yml. 3 MODERATE transitive advisories (no high/critical). |
| QA-prep | PR OPEN (lane/qa-prep-2026-06-12) | supabase/dev-seed-instructor-roster.sql (dev-only, idempotent, parent-email param at top; qa-instructor@atlas.test / Atlas-Pilot-2026; aligns center). docs/qa-prep-e2e-run.md (env lines for REPORT_NARRATION_LIVE + MISCONCEPTION_CLASSIFIER_LIVE; 4-grade coverage rec Grade 1/3/4/5; QA blockers). Key finding: COMPREHENSIVE not reachable from UI (needs ENABLE_COMPREHENSIVE_PILOT=true + manual POST with comprehensive:true); data_statistics strand 0 active questions; geometry only 4 active bank-wide. |
| Comprehensive-test assembly | NOT STARTED | Config (engine reparameterization — item cap / confidence stop / routing depth); deferred to SEPARATE comprehensive-assembly session by decision 2026-06-11. Gated on question bank. |
| Admin/support tooling | DONE | Ops runbook shipped (`5709c13`); admin UI deferred by decision 2026-05-30. Stuck-session operator gap now closed in PR #43. OPTIONAL follow-on: service-role report-narration regen script (only if pilot needs it; documented in ops-runbook §3). |
| Feature flags | MERGED | 11 §12 rollout flags, all default-off, env-var mechanism; `ROLLOUT_FLAGS` registry; new test pins invariant. Fix `efccf4f`, merge `a9d45ba`. |
| Workflow → lane/PR + CI | MERGED `016e4ea` | PR #7. `.github/workflows/verify.yml` (verify-bar job), `.github/pull_request_template.md`, CLAUDE.md step 6 + RUNBOOK step 8 reconciled. CI GREEN: 554 tests / 41 files, no ANTHROPIC_API_KEY (mocked). verify-bar is the required status check via "Branch Protection" ruleset. Ruleset rescoped `~ALL` → `~DEFAULT_BRANCH` 2026-05-31 (the `~ALL` scope blocked pushing/deleting lane branches and broke the flow; see DECISIONS). Stale `lane/workflow-pr-ci` remote ref deleted. |
| Relay / run loop | MERGED `164a1b2` (manual mode) | PR #9. `tools/relay/manual_codex_review.ps1` + `tools/schemas/codex_review.schema.json` + `tools/relay/README.md`. Automated transport (`.mcp.json`) parked pending Codex CLI auth (credential blocker confirmed — see PR #17). CI GREEN: 554 tests / 41 files. |
| Report three sections | MERGED (PR #13) | lane/report-three-sections. Strengths / Areas to confirm / Placement recommendation, two-tier layout. |
| Dev-seed + parent logout | MERGED (PR #14) | lane/dev-seed-completed-report + lane/parent-logout. Dev demo completed report seeded; instructor login added; Sign Out wired in parent profile menu. |
| Marketing §2.4 line-74 wording | MERGED PR #16 | lane/marketing-assessment-wording. `(marketing)/page.tsx:74` hero pill "Diagnostic Suite" → "Assessment Suite". Merged in origin head `d4743c7`. |
| Codex reachability docs | OPEN PR #17 — not merged | lane/codex-reachability-finding. `tools/relay/README.md` updated with 2026-06-05 reachability check results (NOT reachable — credential blocker). CI GREEN. |
| Memory update | MERGED PR #18 | lane/memory-session-2026-06-05. Run-state memory update for 2026-06-05 session. Merged in origin head `d4743c7`. |
| Marketing §2.4 diagnostic scrub | MERGED PR #20 | lane/marketing-diagnostic-scrub. Remaining rendered "diagnostic" claims → "assessment" (commit `e6d9515`). Merged in origin head `d4743c7`. |
| Marketing §2.4 precision claim | MERGED PR #21 (`a3d7d46`) | lane/marketing-precision-claim. Removes unbacked "98% accuracy" claim; card heading "Diagnostic Precision" → "Misconception Mapping" (commits `e52258c`+`32f35d6`). §2.4 scrub now complete across PRs #16/#20/#21. |
| Content-id backfill | MERGED PR #22 (`016357e`) | lane/questions-content-id-backfill. Worktree `atlas-backfill` (commits `5b249f5`+`c6e1485`). Migration `20260610000000_backfill_question_content_ids.sql` + seed.sql mirror maps all 11 SAM-L2 questions to `content_id`. New drift test. |
| CONVERSION Stage 4 — DB load + L1–4 run | MERGED PR #23 (`1ebb01e`) | lane/conversion-stage4-load. Worktree `atlas-stage4`. Loader built (`40d32b3`+guards `903650a`) AND the full L1–4 run executed: 79 rows loaded (L1 12 / L2 22 / L3 20 / L4 25; 49 active, 30 inactive image-essential), all with content_id, in migration `20260610151306` + seed.sql marker block. Follow-on conversion work continues in a SEPARATE session. |
| Memory session 2026-06-10 | MERGED PR #24 (`cb57a84`) | lane/memory-session-2026-06-10. Run-state snapshot. |
| Assessment mascot | MERGED PR #34 (`58e4659`, 2026-06-10) | lane/assessment-mascot. Dachshund mascot (3 poses, `stitch/mascot/mascot1-3.png`, stable swap paths) wired into loading (waving) / K-4 question footer (thinking, in-flow) / completion (celebrating, both tiers). Motion policy in `lib/mascot.ts` (tested): K_4 lively, G5_8 still, reduced-motion still. No streak celebrations possible (correctness never reaches the child client by design). Verify GREEN 644/47 + CI. NOTE: remote lane branch holds 2 post-merge stragglers (AGENTS.md learning — re-landed via lane/agents-ci-typecheck-learning — and an empty retrigger commit); safe for founder to delete after the follow-up micro-PR merges. |

## Sibling topics (now repo-tracked, not chat handovers)
- **CONVERSION** — 5-stage CLI in `scripts/conversion/`. **L1–4 MVP run COMPLETE
  2026-06-10 (PR #23):** 100 questions tagged (0 failed), **79 loaded** (49 active,
  30 inactive image-essential), all with content_id; 21 skipped (drag-drop answers
  unmappable / missing key entries / malformed MC). Cumulative migration
  `20260610151306_load_sam_questions.sql` + seed.sql marker block. Session fixes en
  route: numbered-list answer-key parser (`5c13070`), stage3 429-retry (`506936d`),
  stage2/3 skip-existing guards (`a1685d6`). Images: 0 uploaded (local storage down
  during runs) — per-worksheet upload manifests in output folders; 30 inactive
  questions need curated per-question images before activation. Founder PDFs for ALL
  levels (0A–7) now live in main-checkout `input/`. Full-library digitization
  (0A–0C, 5–7) is a separate planned follow-up.
- **AGENTS / fleet** — `product-manager` / `verify` / `audit` / `codex-finding-resolver` /
  `repo-memory-maintainer` in `.claude/agents/`. ROI test gates any further growth.
- **Active worktrees** — `atlas-stage4` (PR #23), `atlas-backfill` (PR #22),
  `atlas-memory` (this lane). Remove each after its PR merges.

## Immediate next actions
See `NEXT_ACTIONS.md`.

Founder actions (current):
1. **NEW (2026-06-22) — PR #134 (young-band + L3 QA defects):** After review, merge PR #134
   then: (a) run `pnpm convert:upload-activation-images` to upload the 3 new stimulus images
   (`sam-l0a-q11-stimulus.png`, `sam-l0b-q02-stimulus.png`, `sam-l0c-q13-stimulus.png`) and
   re-pointed cake (`sam-l0b-q03-stimulus.png`); (b) re-upload a corrected
   `scripts/conversion/source/4/L4-21.png` that includes dimension labels (do NOT fabricate
   dimensions — use the real worksheet values), then re-run image upload for that key;
   (c) run `supabase db reset` (applies migrations `20260622120000` + `20260622130000`).
   (L0C-Q04 fact-family is now FIXED via MULTI_BLANK in `20260622130000` — the earlier
   EQUATION_SET prefill backlog item is resolved, no separate lane needed.)
2. **NEW (2026-06-21) — Picker Calibration:** Merge PRs in order #119 → #121 → #122 (each
   stacked on the prior; attended, after Vercel preview review). After #119 merges: run
   `supabase db reset` (adds `short_test_outcome` column). After #122 merges: run
   `supabase db reset` (adds `manual_placement_needed` column). Stacked-PR note: after
   #119 merges, manually re-point #121's base to ATLAS-ASSESSMENT if GitHub did not
   auto-retarget; same for #122 after #121. Then resolve the 3 batched gate items in
   PR #122 (§2.4 copy + render + thin-pool scope).
2. [DONE] Merged PR #50 (served-question-gate, ea53da5).
2. [DONE] Merged PR #55 (duplicate-response-constraint, 4b31baa) — superseded PR #51 (closed).
3. [DONE] Merged PR #52 (ai-data-minimization, 57e5f93).
4. [DONE] Merged PR #53 (next-upgrade-ci, 1997b3d).
5. [DONE] `supabase db reset` run — applies migration 20260612090000 + 20260611090000.
6. [DONE] Verify baseline confirmed: 915 tests / 56 files GREEN; tsc 0 errors; build GREEN.
7. Merge PR #43 (lane/ops-runbook-gaps — docs only; no DB; no supabase db reset needed).
8. Merge PR (lane/qa-prep-2026-06-12) after Vercel preview review — adds dev-seed-instructor-roster.sql + qa-prep-e2e-run.md.
9. Eyeball PR #59 Vercel preview — set `ENABLE_VISUAL_PRIMITIVES_GALLERY=true` on the Preview env + redeploy, open `/dev/visual-primitives`; then merge if satisfied. No supabase db reset needed.
10. For QA run: set ENABLE_COMPREHENSIVE_PILOT=true in .env.local; COMPREHENSIVE test also requires a manual POST to /api/assess/start with `comprehensive:true` — not reachable from the UI via startSession({child_id}) alone.
11. Curate per-question images for the 30+ inactive image-essential questions (upload manifests in each worksheet's output folder); full-page renders must never ship.
12. **NEW (2026-06-18):** Merge PR #82 (lead-notify test) after Vercel preview review. No DB change; no supabase db reset needed.
13. **NEW (2026-06-18):** Merge PR #83 (mascot welcome screen) after Vercel preview review. No DB change; no supabase db reset needed.
14. **NEW (2026-06-18) — LEGAL / CAREFUL REVIEW:** Merge PR #84 (coppa-consent-of-record) after eyeballing: (a) served PDF at `/legal/coppa-disclosure-v1.pdf` renders correctly and matches counsel intent; (b) `/coppa` page "Download PDF" button downloads the PDF; (c) `/add-child` checkbox shows the new consent text and captures on submit. After merge, run `supabase db reset` (adds 2 nullable `consent_records` columns). Then resolve the 3 batched gate items from the PR: (1) confirm PDF rendering is acceptable (core fonts / ASCII punctuation; no source-doc "Checkbox:"/"Button text:" annotations); (2) decide on a follow-up copy pass to reconcile the `/coppa` page body with the counsel PDF text (parent-facing claims language — gate to Dimitri); (3) confirm committing `docs/legal/Parent_Privacy_Request_Policy.docx` is intended.

- **RESOLVED (was parked):** the 5 marketing "diagnostic" occurrences — merged PR #20 scrubbed the remaining rendered "diagnostic" strings; open PR #21 renames the "Diagnostic Precision" card (line 170) and removes the 98% claim.
- **PARKED — needs Dimitri action:** Codex CLI auth (`codex login` or set `OPENAI_API_KEY` on this box) to unblock automated relay + `.mcp.json`.
- **PARKED — needs Dimitri on-screen:** placement-bar / radar / sub-strand pills on the degraded/"unreliable" report branch (visual check against a real completed assessment).
- **OPTIONAL (no gate; only if pilot needs it):** service-role report-narration regen script (`docs/ops-runbook.md` §3 KNOWN GAP — now documented as such in PR #43; the operator stuck-session gap is closed; the narration-regen follow-on remains open).

Housekeeping notes (non-blocking):
- Stale fully-merged lane branches safe to delete on origin: `lane/comprehensive-instructor-analytics`,
  `lane/consent-gate-comprehensive`, `lane/comprehensive-engine` (all content is on ATLAS via PR #49).
  Also: the closed PR #48 reland branch. Dangling memory commit 8efad71 on
  `lane/memory-session-2026-06-11` (PR #44 closed before it merged) is superseded by this session's
  record — that branch can be deleted.
- Main checkout's uncommitted `CLAUDE.md` modification (older garbled copy with `\\_` artifacts) has been moved to a git stash ("premove CLAUDE.md working-copy edit") so lane branches can be switched; recover with `git stash list` / `git stash pop`, or drop the stash to discard. Founder call.
- `stitch/mascot/` assets committed on lane/assessment-mascot (3 pose PNGs + 3 Stitch screen mockups).
- `conversion.log` in PR #23 carries two committed `stage4 | synthetic-smoke.pdf` audit lines from smoke runs (harmless; flagged in PR).
- Orchestration incident logged in `AGENTS.md` §11: background subagent Bash gating caused a Lane A "blocked" report; both lanes re-dispatched foreground; no work lost.

## External gates (business — not build)
G1 S.A.M. license — LIFTED 2026-06-10 (founder granted permission to digitize entire
library; see DECISIONS.md) · G2 franchisor pilot approval (separate; routing unconfirmed) ·
G3 consent legal review — CLEARED 2026-06-10 (counsel approved the consent flow) ·
G4 Anthropic minors (RESOLVED).

## Environment notes
Dimitri runs `pnpm dev` + local Supabase. After checkout into the short path:
`pnpm install`; if local DB needs the latest schema, `pnpm supabase db reset`. Ensure no
stray `package-lock.json` exists in or above the repo.

## Migration housekeeping (this session)
- Repo moved to short path `C:\Users\Acer\PROJECTS\atlas-ai` via fresh checkout.
- `AGENTS.md` reconciled (deduped garbled autonomy stub; promoted full autonomy rules;
  added worktree/verify-bar/taxonomy conventions; aligned project context).
- `CLAUDE.md` is now a DISTINCT orchestration file (not a symlink to AGENTS.md).
  `GEMINI.md` symlink to AGENTS.md is optional (Gemini not in active workflow).
- Old worktrees (`atlas-consent`/`atlas-instructor`/`atlas-analytics`) removed.
