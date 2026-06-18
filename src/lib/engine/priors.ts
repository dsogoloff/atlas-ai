// Atlas Assessment — cold-start grade-seeded prior config (Item #10).
//
// =============================================================================
// What this module does
// =============================================================================
//
// 1. Validates priors-v1.json against a strict zod schema at module load
//    (fail-at-boot per Q5 lock — malformed JSON throws synchronously rather
//    than producing silent wrong priors at first session start).
// 2. Expands the small spec file into a full per-grade-per-strand
//    EnginePriorConfig (~972 numeric values: 9 grades × 6 strands × 18 levels,
//    normalized to sum=1 per strand) using the algorithmic-gaussian-discrete
//    generator.
// 3. Exposes seedPosteriors(grade, config?) — the helper createEngineState
//    consumes when it has a grade.
//
// =============================================================================
// Active version is engine-coupled (Q6 lock)
// =============================================================================
//
// engine.ts imports PRIORS_V1 by name as the default config for
// createEngineState({ grade }). This is deliberate engine coupling:
// switching v1 → v2 by changing the import line is a BREAKING CHANGE for any
// caller using createEngineState({ grade: ... }) without passing config
// explicitly. Future v2 evolution should pick one of:
//   (a) flip the import deliberately as a single migration moment (every
//       new session uses v2 priors immediately; existing IN_PROGRESS sessions
//       continue under v1 because their engine_prior_version is stamped),
//   (b) feature-flag the rollout (e.g., MISCONCEPTION_CLASSIFIER_LIVE-style
//       env flag selecting between PRIORS_V1 and PRIORS_V2 at runtime),
//   (c) require all callers to pass config explicitly (removes the default,
//       forcing every callsite to opt into a specific version).
//
// Phase 3's replayEngineState path is unaffected by this — it uses
// getPriorConfigByVersion(stamped_version) which always resolves to the
// version recorded on assessment_sessions.engine_prior_version, regardless
// of which config is the current active default.
//
// =============================================================================
// Null / unknown grade behaviour (R3 + Q4 lock)
// =============================================================================
//
// seedPosteriors falls back to all-strand uniform when:
//   * grade is null or undefined (R3 lock — children.grade_level is nullable),
//   * grade is a non-null string outside the 9-key GradeKey set (Q4 lock —
//     silent graceful degradation; matches the null-grade behaviour and
//     produces the same engine output the v1 codebase produced before
//     Item #10 landed).
//
// No warn, no throw on the unknown-grade path — the caller already chose
// to coerce a freeform DB string to GradeKey via `as` and the engine should
// not fail a session start over a UI-layer data hygiene issue. The
// alternative (throwing) would manifest as a user-visible 500 on session
// start when a parent typed an unusual grade_level value.
//
// =============================================================================
// Truncated-Gaussian edge skew is desired (design point d)
// =============================================================================
//
// At grade K (μ ≈ -2.82) and grade 8 (μ ≈ +2.82), the Gaussian's tail spills
// past the [-3, +3] θ range covered by LEVELS. After normalisation across
// the 18 in-range levels, the posterior at grade K concentrates on KA-KB
// with a thin tail to 1A-1B, and grade 8 mirrors at 8A-8B with a tail to
// 7A-7B. This is the desired prior shape — we DO have prior knowledge that
// a K child is below the upper levels and an 8 child is at the upper end.
// The truncation IS the prior. Tests in priors.test.ts lock this:
// peak-at-grade-bands, monotonic decrease in both directions, sum = 1.
//
// =============================================================================
// Cross-references
// =============================================================================
//
//   architecture.md — engine architecture, no v1 decision row for priors yet
//     (added in Item #10's cross-cutting docs pass post-Phase-3).
//   compliance.md §12 — version-on-row pattern. ACTIVE_PRIOR_VERSION is
//     stamped on assessment_sessions.engine_prior_version at session start
//     (Phase 3 wires this); replay reads the column, calls
//     getPriorConfigByVersion to re-seed the engine state under the EXACT
//     prior config active at write time.
//   roadmap/v2-progress-tracking.md feature 16 — empirical recalibration:
//     once ≥200-300 responses per item exist, replace this algorithmic
//     placeholder with empirical priors derived from real student data.

import { z } from "zod";

import { SUB_KA_LEVELS, uniformPosterior } from "./bayesian";
import { LEVELS, STRANDS, levelIndex, levelTheta } from "./levels";
import priorsV1Spec from "./priors-v1.json";
import type {
  EnginePriorConfig,
  GradeKey,
  HalfGradeLevel,
  Posteriors,
  StrandPosterior,
} from "./types";

// ---------------------------------------------------------------------------
// Spec validation (zod, fail-at-boot)
// ---------------------------------------------------------------------------

/**
 * Schema for the v1 spec shape. `.strict()` rejects extra keys at every
 * level — typo defence for hand-edits to priors-v1.json. v2 may extend
 * to a discriminated union on `generator` if it ships a different
 * algorithm; for v1 the single-generator literal is sufficient.
 */
const PriorsSpecV1Schema = z
  .object({
    version: z.literal("v1"),
    description: z.string(),
    generator: z.literal("algorithmic-gaussian-discrete"),
    params: z
      .object({
        sigma_levels: z.number().positive(),
        mu_strategy: z.literal("grade_band_midpoint"),
      })
      .strict(),
  })
  .strict();

type ValidatedSpecV1 = z.infer<typeof PriorsSpecV1Schema>;

const VALIDATED_SPEC: ValidatedSpecV1 = PriorsSpecV1Schema.parse(priorsV1Spec);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All valid GradeKey values in ascending order. Single source of truth
 *  for grade iteration; types.ts owns the matching type alias. */
export const GRADES = [
  "K",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
] as const satisfies readonly GradeKey[];

/** θ distance between adjacent half-grade levels — derived from levels.ts'
 *  -3 to +3 mapping over 18 levels (17 intervals). 6/17 ≈ 0.3529. */
// θ distance between adjacent half-grade levels on the KA…8B scale (17
// intervals → 6/17 ≈ 0.3529). Anchored on the KA…8B span so it is unchanged by
// the pre-K (0A/0B/0C) extension of LEVELS (migration 20260616120000).
const STEP_THETA = 6 / (levelIndex("8B") - levelIndex("KA"));

// ---------------------------------------------------------------------------
// Algorithmic expansion (spec → EnginePriorConfig)
// ---------------------------------------------------------------------------

/**
 * Mid-of-grade-band μ for the discrete Gaussian: mean of the A-half and
 * B-half level θs.
 *
 * Template-literal type narrowing (per design point c) — `${GradeKey}A`
 * and `${GradeKey}B` are subsets of HalfGradeLevel by construction, so
 * the explicit annotations make the relationship visible and let TS
 * verify it at compile time.
 */
function gradeMidpointTheta(grade: GradeKey): number {
  const aLevel: HalfGradeLevel = `${grade}A`;
  const bLevel: HalfGradeLevel = `${grade}B`;
  return (levelTheta(aLevel) + levelTheta(bLevel)) / 2;
}

/**
 * Discrete Gaussian PDF evaluated at each of the 18 level θs, normalised
 * to sum=1. Truncation past [-3, +3] is desired (see header). Falls back
 * to uniform if total mass is zero — a defensive branch that should not
 * fire in practice (any finite μ over 18 finite-θ levels yields nonzero
 * Gaussian mass on at least one level).
 */
function discreteGaussianPosterior(
  muTheta: number,
  sigmaTheta: number,
): StrandPosterior {
  const masses: StrandPosterior = {} as StrandPosterior;
  let total = 0;
  for (const level of LEVELS) {
    // Pre-K young band (0A/0B/0C) carries zero seeded mass — same KA-floored
    // band as uniformPosterior, so the KA…8B grade-seed masses are identical to
    // before the LEVELS extension (no leak into the renormalization total).
    if (SUB_KA_LEVELS.has(level)) {
      masses[level] = 0;
      continue;
    }
    const z = (levelTheta(level) - muTheta) / sigmaTheta;
    const mass = Math.exp(-0.5 * z * z);
    masses[level] = mass;
    total += mass;
  }

  /* c8 ignore next */
  if (total === 0) return uniformPosterior();

  for (const level of LEVELS) masses[level] /= total;
  return masses;
}

/**
 * Expand the validated spec into a full per-grade-per-strand
 * EnginePriorConfig. Per Item #10 R2 lock, the same algorithmic
 * posterior is applied to all 6 strands within a grade (strand-specific
 * divergence is a v2 concern; cf. roadmap/v2-progress-tracking.md
 * feature 16). Each strand gets its own copy of the posterior object so
 * downstream callers cannot mutate one strand's posterior and affect
 * others through shared references.
 */
function expandSpec(spec: ValidatedSpecV1): EnginePriorConfig {
  const sigmaTheta = spec.params.sigma_levels * STEP_THETA;

  const byGrade = GRADES.reduce(
    (acc, grade) => {
      const posterior = discreteGaussianPosterior(
        gradeMidpointTheta(grade),
        sigmaTheta,
      );
      const perStrand = STRANDS.reduce((strandAcc, strand) => {
        // Defensive copy — independent posterior object per strand even
        // though v1's algorithm produces identical values across strands
        // within a grade. Future v2 strand divergence drops in without
        // changing the consumer contract.
        strandAcc[strand] = { ...posterior };
        return strandAcc;
      }, {} as Posteriors);
      acc[grade] = perStrand;
      return acc;
    },
    {} as Record<GradeKey, Posteriors>,
  );

  return { version: spec.version, byGrade };
}

const EXPANDED_V1: EnginePriorConfig = expandSpec(VALIDATED_SPEC);

// ---------------------------------------------------------------------------
// Public exports — version registry
// ---------------------------------------------------------------------------

/** v1 prior config, by name. Stable identifier; never replaced by future
 *  versions (v2 will live alongside as PRIORS_V2). */
export const PRIORS_V1: EnginePriorConfig = EXPANDED_V1;

/** Active default version — engine.ts stamps this on every new session's
 *  assessment_sessions.engine_prior_version (Phase 3). */
export const ACTIVE_PRIOR_VERSION = "v1" as const;

/** version-string → config registry. Phase 3's replayEngineState resolves
 *  the stamped version against this map. v2 adds a second entry. */
const KNOWN_CONFIGS: Record<string, EnginePriorConfig> = {
  v1: PRIORS_V1,
};

/**
 * Return the prior config for a stamped version. Throws on unknown
 * versions per design point (a) — replaying a session under a config
 * that wasn't the one stamped on the row would silently corrupt the
 * audit trail. Better to surface stale-version sessions loudly so they
 * can be investigated (most likely cause: a config from a never-
 * deployed branch, or a stamping bug).
 */
export function getPriorConfigByVersion(version: string): EnginePriorConfig {
  const config = KNOWN_CONFIGS[version];
  if (!config) {
    throw new Error(
      `[priors] unknown engine_prior_version=${JSON.stringify(version)}; ` +
        `known versions: ${Object.keys(KNOWN_CONFIGS).join(", ")}. ` +
        `Register the version in priors.ts before replaying sessions stamped with it.`,
    );
  }
  return config;
}

// ---------------------------------------------------------------------------
// Public exports — seedPosteriors
// ---------------------------------------------------------------------------

/**
 * All-strand uniform posteriors — the same shape createEngineState
 * produced before Item #10 landed. Used as the silent fall-back for
 * null/undefined/unknown grades.
 */
function uniformAcrossStrands(): Posteriors {
  return STRANDS.reduce((acc, strand) => {
    acc[strand] = uniformPosterior();
    return acc;
  }, {} as Posteriors);
}

/**
 * Produce per-strand starting posteriors for a session.
 *
 *   * null / undefined grade → uniform (R3 lock — DB grade_level is nullable).
 *   * unknown grade string → uniform (Q4 lock — silent fall-back).
 *   * known grade → defensive copy of config.byGrade[grade].
 *
 * The defensive copy means callers can mutate the returned Posteriors
 * (e.g., engine.applyResponse functionally replaces a strand's posterior)
 * without affecting the config's stored data. config defaults to
 * PRIORS_V1; callers in Phase 3 (replayEngineState) pass the version-
 * specific config from getPriorConfigByVersion.
 */
export function seedPosteriors(
  grade: GradeKey | null | undefined,
  config: EnginePriorConfig = PRIORS_V1,
): Posteriors {
  if (grade === null || grade === undefined) {
    return uniformAcrossStrands();
  }
  const gradePriors = config.byGrade[grade];
  if (!gradePriors) {
    // Unknown-grade fall-back — see header Q4 lock. Reachable only if
    // the caller cast a non-GradeKey string via `as GradeKey`, or if a
    // future config covers a subset of GRADES.
    return uniformAcrossStrands();
  }
  return STRANDS.reduce((acc, strand) => {
    acc[strand] = { ...gradePriors[strand] };
    return acc;
  }, {} as Posteriors);
}
