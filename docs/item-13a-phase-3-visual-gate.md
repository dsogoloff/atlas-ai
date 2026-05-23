# Item #13a Phase 3 — Visual Gate Criteria

Published during Phase 1 per founder ask: founder needs to know what's being reviewed at gate time before Phase 3 work begins. Same protocol that worked for Item #12.

This is the acceptance checklist for the Phase 3 visual gate. Code does not call Phase 3 done until every item below is verified by the founder against a working build. If any item changes during build, Code amends this doc in the same commit.

## Scope of Phase 3

Phase 3 builds the rendering surface for question images: a new `<QuestionImage>` component slotted into `QuestionShell.tsx` between the prompt (`<h1>`) and the input children. Pure presentational. No fetch logic in the component — it consumes a signed URL + alt-text minted upstream by the Phase 2 server route.

Phase 3 does NOT include: actual image assets (Phase 5), Phase 2 signed-URL minting (Phase 2), or alt-text authoring (Phase 4). Phase 3 uses placeholder image assets + placeholder alt-text to validate the rendering surface.

## Pre-gate setup (founder runs)

These steps prepare a local dev environment with the placeholder image-bearing question active. Phase 3 ships a dev-only seed row (`PLACEHOLDER-Q-IMG-GRID-001`, dormant via `is_active=false` by default) and a hand-authored placeholder SVG (`placeholder-grid.svg` — a 4×3 labeled grid with a "PLACEHOLDER" diagonal watermark). Phase 5 replaces the placeholder with real S.A.M.-sourced assets.

**One-time setup (after the first pull of an Item #13a Phase 1+ branch):**

```bash
# Bring up the storage container with the new config.toml setting.
# `supabase db reset` alone will NOT start storage — see AGENTS.md §11.
supabase stop && supabase start

# Apply Phase 1 bucket migration + Phase 3 placeholder seed row.
supabase db reset

# Upload the placeholder SVG to the question-images bucket.
# Idempotent; safe to re-run.
pnpm storage:seed
```

**Activate the placeholder for the gate (then revert after):**

```sql
-- Run via supabase SQL editor or `psql` against the local DB.
-- Step 1: deactivate the SAM-L2 rows so they don't get served instead.
update questions set is_active = false where external_id like 'SAM-L2-%';

-- Step 2: activate the placeholder.
update questions set is_active = true where external_id = 'PLACEHOLDER-Q-IMG-GRID-001';
```

Then start the dev server and walk through the gate:

```bash
pnpm dev            # founder's terminal, not the assistant's
# Sign in as dev@atlas.local / dev-password
# Navigate to /assessment, walk through the 10 sections below
```

**Revert when the gate is complete:** `supabase db reset` restores the seed-defined `is_active` values (SAM-L2 rows back to true, placeholder back to false). No manual cleanup of the UPDATE statements.

**Optional — test the decorative fallback path (section 5b):**

```sql
-- Toggle image_required to false on the placeholder for a section-5b pass.
-- Run, refresh /assessment, observe graceful hide on simulated load failure
-- (break the URL via devtools), then revert.
update questions
   set content = jsonb_set(content, '{image_required}', 'false')
 where external_id = 'PLACEHOLDER-Q-IMG-GRID-001';

-- Revert (or supabase db reset).
update questions
   set content = jsonb_set(content, '{image_required}', 'true')
 where external_id = 'PLACEHOLDER-Q-IMG-GRID-001';
```

## Gate criteria

Each section: **what to check** / **passes if**. Founder runs through these against the running app; Code documents any deviation found.

### 1. Tier rendering — K-4 vs G5-8

**What to check.** Take the same image-bearing question through both tiers. K-4 child profile (age ≤ 10) renders with the K-4 chrome (cream bg, decorative yellow/red blurs, lightbulb footer). G5-8 profile (age ≥ 11) renders with the G5-8 chrome (top app bar with "S.A.M. Assessment" wordmark, cooler-toned decorative blurs, no footer).

**Passes if.** Both tier variants display the image correctly with their respective chromes intact. No K-4-only or G5-8-only chrome leaks into the other tier. Image rendering is the only addition vs the current (no-image) layout.

### 2. Sizing — viewport-relative caps (width AND height)

**What to check.** Image is bounded on BOTH axes so neither a wide source nor a tall source can crowd out the answer input + Submit button:

- K-4 image: width ≈ 60% of viewport width, capped at **600 px**. Height capped at **40 vh** (40% of viewport height).
- G5-8 image: width ≈ 40% of viewport width, capped at **480 px**. Height capped at **30 vh**.
- Aspect ratio preserved via `object-contain` — whichever cap clamps first wins; the other dimension scales proportionally. Image never distorts.

Vertical bound: the full question (prompt + image + answer choices + Submit) must fit within the viewport without scrolling on (a) a standard laptop landscape (~1440 × 900) and (b) iPad portrait (768 × 1024). The 40 vh / 30 vh caps were chosen to leave room for the answer area and Submit on the shortest standard target.

**Reference numbers (placeholder SVG, 600 × 400, aspect 3:2):**

| Viewport | Tier | Width cap | Height cap | Final rendered |
|---|---|---|---|---|
| 1920 × 1080 desktop | K-4 | 600 px | 432 px | 600 × 400 (width caps first) |
| 1440 × 900 laptop | K-4 | 600 px | 360 px | **540 × 360 (height caps first)** |
| 1024 × 768 landscape tablet | K-4 | 600 px | 307 px | **460 × 307 (height caps first)** |
| 768 × 1024 iPad portrait | K-4 | 460 px | 410 px | 460 × 307 (width caps first) |
| 1440 × 900 laptop | G5-8 | 480 px | 270 px | **405 × 270 (height caps first)** |
| 768 × 1024 iPad portrait | G5-8 | 307 px | 307 px | 307 × 205 (width caps first) |

**Passes if.** Sizes match the table above within ±5%. Aspect ratio preserved (no squishing). On 1440 × 900 laptop and 768 × 1024 iPad portrait, the entire question — prompt, image, answers, Submit — is visible without vertical scrolling.

This section was tightened on 2026-05-23 after a gate finding: width-only caps let a 3:2 source image grow tall enough on standard laptop heights to push Submit below the fold. The height cap is now first-class.

### 3. Layout — position relative to prompt and input

**What to check.** Image sits between prompt `<h1>` and the input children, below the yellow underline divider. Vertical spacing: image-to-prompt gap, image-to-input gap. Horizontal: image horizontally centered within the existing `max-w-3xl` container.

**Passes if.** Image is below the underline (not above), above the input (not below), centered. Gaps don't visually crowd either the prompt or the input. Spacing scale matches the existing K-4 / G5-8 chrome rhythm (gap-10 / gap-12 from QuestionShell.tsx).

### 4. Format compatibility

**What to check.** Image renders correctly with each input format:
- MULTIPLE_CHOICE — image above the option buttons
- NUMERIC_ENTRY — image above the numeric input pad
- DRAG_DROP — image above the drag-drop items area

**Passes if.** All three formats render the image in the same slot with the same sizing. No format-specific layout regression.

### 5. Fallback behavior — image-required vs decorative (visual scope only at Phase 3)

**Scope amendment (Phase 3 build, 2026-05-12).** This section originally specified both the visual error UI AND functional input-disable behavior. Phase 3 ships the **visual** half only; the **functional** input-disable on required-image-failure is deferred to **Phase 3.5** (a new phase between current Phase 3 and Phase 4). The split keeps Phase 3 focused on the render surface and lets Phase 3.5 do the reducer / submit-gate integration cleanly. Founder approved the split at Phase 3 kickoff.

**What to check (Phase 3, visual only).** Two scenarios:

**(5a)** Image with `image_required: true` fails to load (signed URL expired, network error, 404). Expected: the image area is replaced with an inline error block — "The picture couldn't load." copy, the alt-text shown as supporting context, and a "Try again" button. Clicking "Try again" cache-busts the URL and re-attempts the load. The input below the image remains visually present and interactive — that is the **Phase 3.5** behavior change. Phase 3 verifies only that the error UI renders correctly.

**(5b)** Image with `image_required: false` fails to load. Expected: the image area is hidden gracefully (the component returns null); prompt + input remain unchanged; the question is answerable normally. No error UI shown to the child.

**Passes if (Phase 3 gate).** Both visual behaviors verified by simulating image-load failure (e.g., breaking the signed URL with `?broken=1` appended, or stopping the local Supabase storage container mid-session). The `image_required` flag from the wire payload drives the divergence: required=true renders the error block, required=false renders nothing.

**Out of scope at Phase 3.** Input-disable when the image fails AND required=true. The submit button stays clickable in Phase 3; Phase 3.5 wires the reducer / submit-gate to refuse submits while the required image is unresolved. Until Phase 3.5 lands, a child could technically submit a guess against a missing required image — acceptable risk for the visual gate window; the placeholder seed row makes this hard to encounter in practice.

### 6. Alt-text — accessibility behavior

**What to check.** Alt-text is present on the `<img>` element (inspect via browser devtools or screen reader). Screen reader announces the alt-text when the image is in focus. Alt-text is NEVER displayed visibly on screen as a text caption — it is for screen readers only and the image-load-failure fallback (5b) does not surface alt-text as visible text (decorative images stay hidden on failure).

**Phase 3 placeholder caveat:** Phase 4 has not run yet at Phase 3 gate time, so the alt-text in the dev seed is a placeholder (e.g., "[Phase 4 placeholder]"). Founder validates the alt-text PATH (the attribute exists, screen reader speaks it), not the content (Phase 4 authoring follows).

**Passes if.** Alt-text attribute present and non-empty on every rendered image. Screen reader announces it. No visible alt-text caption.

### 7. Responsive behavior

**What to check.** Resize the viewport across these breakpoints with an image-bearing question on screen:

- 375px (phone portrait — not the primary device per features.md, but graceful degrade)
- 768px (iPad portrait — K-4 primary device per features.md §5)
- 1024px (iPad landscape)
- 1280-1920px (desktop)

At each breakpoint: image stays within container, does not overflow horizontally, does not push input below fold on iPad portrait, prompt and input remain readable and reachable.

**Passes if.** All four breakpoints render without layout breakage. The 768px (iPad portrait) and 1024px (iPad landscape) breakpoints are the must-pass; 375px and desktop are graceful-degrade.

### 8. Loading state

**What to check.** When the question payload arrives but the image is still fetching (the signed URL needs a separate GET to the Supabase Storage CDN), there must be a non-jarring loading state. Options under consideration:

- Skeleton block at the image's eventual size (preserves layout, prevents content-shift)
- Spinner inside the image area
- Nothing — let the browser render the area progressively

**Passes if.** Founder picks one of the three (or proposes a fourth) and Code's implementation matches.

### 9. Reduced motion

**What to check.** With OS-level `prefers-reduced-motion: reduce` enabled (System Preferences → Accessibility → Display → Reduce Motion on macOS; equivalent on Windows), the image's appearance is not animated (no fade-in, no scale-up). Matches the existing `useReducedMotion` gating pattern in framer-motion 12 usage elsewhere in the codebase.

**Passes if.** With reduce-motion on, image appears immediately on layout pass with no transition. With reduce-motion off, the (minimal) transition runs.

### 10. Compliance smoke check

**What to check.** Open browser devtools Network tab. Load an image-bearing question. Verify:

- The image is served from a Supabase Storage URL (signed-URL format: `https://<project>.supabase.co/storage/v1/object/sign/...` with a `token=` query parameter).
- The signed URL is NOT a plain bucket URL (no `/object/public/`).
- After the signed URL's TTL expires (TTL is short — Phase 2 will tune; expect ≤60s for first impl), refreshing the page or hot-reloading mints a fresh URL.
- Image content type matches the bucket's `allowed_mime_types` from the Phase 1 migration (png / svg+xml / webp / jpeg).

**Passes if.** All four bullets verified at the network layer. This is the visible artifact of compliance.md §8 Constraint 1 holding — no public CDN exposure of licensed content.

## Out of scope at this gate

The following are NOT validated at the Phase 3 visual gate (they have their own phase gates):

- Actual S.A.M. image assets (Phase 5)
- Final alt-text content (Phase 4)
- Audit log integration (Phase 2 — verified at Phase 2 close)
- RLS test (Phase 1 close — verified by founder running `supabase db reset` against the migration in this branch)
- Test suite green (Phase 6 — though typecheck/lint/build must pass at every phase close)

## Updating this doc

If the founder reviews against a working build and requests a change, Code updates this doc in the same commit that lands the change. The doc is the contract; the build matches the contract.
