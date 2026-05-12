# Item #13a Phase 3 — Visual Gate Criteria

Published during Phase 1 per founder ask: founder needs to know what's being reviewed at gate time before Phase 3 work begins. Same protocol that worked for Item #12.

This is the acceptance checklist for the Phase 3 visual gate. Code does not call Phase 3 done until every item below is verified by the founder against a working build. If any item changes during build, Code amends this doc in the same commit.

## Scope of Phase 3

Phase 3 builds the rendering surface for question images: a new `<QuestionImage>` component slotted into `QuestionShell.tsx` between the prompt (`<h1>`) and the input children. Pure presentational. No fetch logic in the component — it consumes a signed URL + alt-text minted upstream by the Phase 2 server route.

Phase 3 does NOT include: actual image assets (Phase 5), Phase 2 signed-URL minting (Phase 2), or alt-text authoring (Phase 4). Phase 3 uses placeholder image assets + placeholder alt-text to validate the rendering surface.

## Pre-gate setup (founder runs)

For each fixture below the founder needs a running build with at least one MC question carrying a placeholder image. Phase 3 will ship a dev-only seed row (gated to dev tenant, never to prod seed) so the visual gate has something to render. Phase 5 replaces placeholders with real assets.

## Gate criteria

Each section: **what to check** / **passes if**. Founder runs through these against the running app; Code documents any deviation found.

### 1. Tier rendering — K-4 vs G5-8

**What to check.** Take the same image-bearing question through both tiers. K-4 child profile (age ≤ 10) renders with the K-4 chrome (cream bg, decorative yellow/red blurs, lightbulb footer). G5-8 profile (age ≥ 11) renders with the G5-8 chrome (top app bar with "S.A.M. Assessment" wordmark, cooler-toned decorative blurs, no footer).

**Passes if.** Both tier variants display the image correctly with their respective chromes intact. No K-4-only or G5-8-only chrome leaks into the other tier. Image rendering is the only addition vs the current (no-image) layout.

### 2. Sizing — viewport-relative caps

**What to check.** K-4 image rendered at approximately 60% of the viewport width, capped at ~600px maximum. G5-8 image at approximately 40% of viewport width, capped at ~480px maximum. Image preserves aspect ratio (no squishing). Vertical bound: image must not push the input below the fold on a standard tablet portrait viewport (768×1024).

**Passes if.** Sizes match the intuition above within ±5%, or — if reality dictates different — founder confirms the deviation. Aspect ratio preserved. No vertical overflow on the iPad-portrait reference viewport.

This is the section most likely to change at gate time. Phase 3 ships with the proposed sizing; founder validates and adjusts. Updated sizing lands in the same commit that closes the gate.

### 3. Layout — position relative to prompt and input

**What to check.** Image sits between prompt `<h1>` and the input children, below the yellow underline divider. Vertical spacing: image-to-prompt gap, image-to-input gap. Horizontal: image horizontally centered within the existing `max-w-3xl` container.

**Passes if.** Image is below the underline (not above), above the input (not below), centered. Gaps don't visually crowd either the prompt or the input. Spacing scale matches the existing K-4 / G5-8 chrome rhythm (gap-10 / gap-12 from QuestionShell.tsx).

### 4. Format compatibility

**What to check.** Image renders correctly with each input format:
- MULTIPLE_CHOICE — image above the option buttons
- NUMERIC_ENTRY — image above the numeric input pad
- DRAG_DROP — image above the drag-drop items area

**Passes if.** All three formats render the image in the same slot with the same sizing. No format-specific layout regression.

### 5. Fallback behavior — image-required vs decorative

**What to check.** Two scenarios:

**(5a)** Image with `image_required: true` fails to load (signed URL expired, network error, 404). The question is not solvable without the image (e.g., "count the triangles"). Expected: question component shows an inline error state with a "Retry" affordance; the input is disabled until the image loads or the founder/parent intervenes. The session does NOT auto-advance; the response submit is gated on the image being present.

**(5b)** Image with `image_required: false` fails to load. Question is solvable from text (e.g., "Jo had 7 apples..."). Expected: image area is hidden gracefully; prompt + input remain; the question is answerable normally. No error UI shown to the child.

**Passes if.** Both behaviors verified by simulating image-load failure (e.g., editing the signed URL to be invalid). The image_required flag drives the fallback divergence.

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
