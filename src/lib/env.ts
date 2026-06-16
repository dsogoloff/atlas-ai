// Environment variables, validated lazily on first read.
//
// Throwing on access (rather than at module load) keeps the build green
// for routes that don't touch Supabase and surfaces a clear error the
// instant a route that does need credentials runs without them.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] required variable ${name} is missing. ` +
        `Set it in .env.local (see .env.example).`,
    );
  }
  return value;
}

// Public — exposed to browser bundles. Safe to ship.
// Next.js inlines NEXT_PUBLIC_* at build time, so the getter resolves
// to the baked literal in client bundles.
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
};

// Server-only. Bypasses RLS — used by admin / job code (e.g., serving
// questions one-at-a-time per compliance.md §8). Never import or call
// this from a client component.
export function getServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

// Server-only. Used by the misconception classifier (architecture.md #3).
// Called against api.anthropic.com directly via @ai-sdk/anthropic (the Vercel
// AI Gateway routing was removed in ebc47dd). Never import or call this from a
// client component.
export function getAnthropicApiKey(): string {
  return required("ANTHROPIC_API_KEY");
}

/**
 * Feature flag gating real Anthropic API calls for the misconception
 * classifier. When false, the classifier's LLM client returns a deterministic
 * stub. Any value other than the literal string 'true' reads as false.
 *
 * M2 readiness (2026-05-28): cleared to go live behind the minor-safety
 * safeguards — the child never sends free text to the model (only structured
 * response data is classified, server-side), the age gate is satisfied by
 * verifiable parental consent (the /coppa consent gate, not child
 * self-attestation), and the AI-processing disclosure is shown in the consent
 * flow. Live calls stay fail-soft (classifier.ts wraps the call and degrades
 * to method='failed' on error). The flip itself is operational: set
 * MISCONCEPTION_CLASSIFIER_LIVE='true' in the deploy env (with
 * ANTHROPIC_API_KEY).
 */
export function isMisconceptionClassifierLive(): boolean {
  return process.env.MISCONCEPTION_CLASSIFIER_LIVE === "true";
}

/**
 * Feature flag gating real Anthropic API calls for the report narration
 * generator. False (default) means the Sonnet wrapper returns a deterministic
 * stub JSON — wires stay testable while the Anthropic DPA is in flight
 * (compliance.md §13.3, mirrors the misconception classifier's gating). Flip
 * to 'true' in Vercel env once the DPA lands. Only the literal string 'true'
 * enables live calls.
 */
export function isReportNarrationLive(): boolean {
  return process.env.REPORT_NARRATION_LIVE === "true";
}

// =============================================================================
// §12 staged-rollout feature flags.
//
// Strategy §12 + BUSINESS_RULES ("Staged rollout: high-risk features behind
// default-off feature flags; do not globally enable before the relevant
// milestone gate"). ALL default OFF — only the literal string 'true' enables a
// flag. Env-var backed, mirroring the LLM gates above; a single-tenant pilot
// needs no per-tenant or runtime toggling (a DB-backed flag table is a
// multi-tenant v2 concern, see ARCHITECTURE "v2 forward notes").
//
// Several of these gate features that are not built yet (comprehensive test,
// center routing, sharing tiers, multi-tenant, franchisor dashboard). The flag
// is an inert default-off guard until its feature lands — wiring the flag now
// keeps the rollout posture correct and gives each feature a single switch.
// Data-sharing flags (snapshot / full-history) gate behaviour that also
// requires explicit parent opt-in + counsel review (G3) before going live;
// the flag is a guard, NOT an authorisation to share.
// =============================================================================

/** Read one §12 rollout flag. Default-off: only 'true' enables. */
function rolloutFlag(envVar: string): boolean {
  return process.env[envVar] === "true";
}

/**
 * Dev-only gate for the visual-primitive gallery/preview route
 * (/dev/visual-primitives). NOT a §12 strategy flag — it never gates a
 * user/parent/child-facing feature, only an internal eyeball page — so it is
 * deliberately kept OUT of ROLLOUT_FLAGS and its default-off invariant test.
 *
 * Always reachable in non-production (local dev, test). In a production build
 * (which is also what Vercel preview deployments run) it stays hidden unless
 * ENABLE_VISUAL_PRIMITIVES_GALLERY === 'true' — so the founder can flip it ON
 * for a specific preview deployment to review the primitives, and it stays OFF
 * in real production by default. The route calls notFound() when this is false.
 */
export function isVisualPrimitivesGalleryEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_VISUAL_PRIMITIVES_GALLERY === "true"
  );
}

/**
 * Gate for the parent intro / instructions screen shown before the short
 * assessment (age-dependent proctoring instructions + about-this-check).
 * Default-off (only 'true' enables) so it can be surfaced for founder QA on a
 * specific deploy without changing the start flow elsewhere. NOT a §12 strategy
 * flag (it gates a presentational pre-start screen, not a milestone-gated
 * business feature), so it stays OUT of ROLLOUT_FLAGS and the default-off
 * invariant test — mirroring the visual-primitives gallery flag's treatment.
 * When off, the assessment auto-starts exactly as before.
 */
export function isParentIntroEnabled(): boolean {
  return process.env.ENABLE_PARENT_INTRO === "true";
}

export function isShortTestBetaEnabled(): boolean {
  return rolloutFlag("ENABLE_SHORT_TEST_BETA");
}
export function isComprehensivePilotEnabled(): boolean {
  return rolloutFlag("ENABLE_COMPREHENSIVE_PILOT");
}
export function isCenterRoutingEnabled(): boolean {
  return rolloutFlag("ENABLE_CENTER_ROUTING");
}
export function isExternalCentersEnabled(): boolean {
  return rolloutFlag("ENABLE_EXTERNAL_CENTERS");
}
export function isDiagnosticSnapshotSharingEnabled(): boolean {
  return rolloutFlag("ENABLE_DIAGNOSTIC_SNAPSHOT_SHARING");
}
export function isFullHistorySharingEnabled(): boolean {
  return rolloutFlag("ENABLE_FULL_HISTORY_SHARING");
}
export function isMachineGeneratedItemsEnabled(): boolean {
  return rolloutFlag("ENABLE_MACHINE_GENERATED_ITEMS");
}
export function isInstructorAssignedPracticeEnabled(): boolean {
  return rolloutFlag("ENABLE_INSTRUCTOR_ASSIGNED_PRACTICE");
}
export function isSocraticAssistantEnabled(): boolean {
  return rolloutFlag("ENABLE_SOCRATIC_ASSISTANT");
}
export function isMultiTenantEnabled(): boolean {
  return rolloutFlag("ENABLE_MULTI_TENANT");
}
export function isFranchisorDashboardEnabled(): boolean {
  return rolloutFlag("ENABLE_FRANCHISOR_DASHBOARD");
}

/** Registry of the 11 §12 flags: strategy key → (env var, getter). Lets
 *  callers/tests enumerate the set and assert the default-off invariant
 *  without hand-listing every flag. */
export const ROLLOUT_FLAGS = {
  enable_short_test_beta: {
    envVar: "ENABLE_SHORT_TEST_BETA",
    get: isShortTestBetaEnabled,
  },
  enable_comprehensive_pilot: {
    envVar: "ENABLE_COMPREHENSIVE_PILOT",
    get: isComprehensivePilotEnabled,
  },
  enable_center_routing: {
    envVar: "ENABLE_CENTER_ROUTING",
    get: isCenterRoutingEnabled,
  },
  enable_external_centers: {
    envVar: "ENABLE_EXTERNAL_CENTERS",
    get: isExternalCentersEnabled,
  },
  enable_diagnostic_snapshot_sharing: {
    envVar: "ENABLE_DIAGNOSTIC_SNAPSHOT_SHARING",
    get: isDiagnosticSnapshotSharingEnabled,
  },
  enable_full_history_sharing: {
    envVar: "ENABLE_FULL_HISTORY_SHARING",
    get: isFullHistorySharingEnabled,
  },
  enable_machine_generated_items: {
    envVar: "ENABLE_MACHINE_GENERATED_ITEMS",
    get: isMachineGeneratedItemsEnabled,
  },
  enable_instructor_assigned_practice: {
    envVar: "ENABLE_INSTRUCTOR_ASSIGNED_PRACTICE",
    get: isInstructorAssignedPracticeEnabled,
  },
  enable_socratic_assistant: {
    envVar: "ENABLE_SOCRATIC_ASSISTANT",
    get: isSocraticAssistantEnabled,
  },
  enable_multi_tenant: {
    envVar: "ENABLE_MULTI_TENANT",
    get: isMultiTenantEnabled,
  },
  enable_franchisor_dashboard: {
    envVar: "ENABLE_FRANCHISOR_DASHBOARD",
    get: isFranchisorDashboardEnabled,
  },
} as const;
