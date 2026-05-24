# Atlas Assessment Report — System Specification

**Version:** 0.1 (Draft)
**Status:** Pre-MVP — intended as a working spec for the build pipeline
**Scope:** The full pipeline that turns a completed assessment session into a parent-facing report. See §1.2 for what's in and out of scope.

---

## 1. Overview

### 1.1 Purpose

This document specifies the system that produces the Atlas Assessment Report — the parent-facing artifact a family receives after completing an at-home assessment. The reference output is `atlas-sample-report.html` (the canonical visual spec), and the canonical pipeline output is the `ReportContent` schema defined in §4.6.

### 1.2 Scope

**In scope:**
- The pipeline from `AssessmentSession` (completed) through to delivered `Report` (HTML + PDF)
- Schemas, component contracts, and integration points for every stage of that pipeline
- LLM prompt structures for classification (Haiku) and narrative generation (Sonnet)
- Compliance touchpoints specific to report generation and delivery

**Out of scope:**
- Assessment UI (child experience, parent consent flow) — see `screens.md`
- Adaptive item selection during the live assessment — handled by the placement engine in `adaptive-engine.md` (this spec consumes its output)
- Item authoring and misconception tagging workflows — see `content-pipeline.md`
- The full misconception taxonomy itself — referenced here but specified in `misconception-taxonomy.md`

### 1.3 Related Canonical Docs

- `architecture.md` — overall system architecture
- `compliance.md` — COPPA, FTC email-plus VPC, data minimisation, retention
- `kpis.md` — quality metrics this pipeline is measured against
- `features.md` — feature list this spec is one of
- `atlas-sample-report.html` — canonical visual reference

### 1.4 Locked Decisions Inherited from Canonical Docs

These are not re-litigated in this spec. They are inputs:

- **Frontend:** Next.js + TypeScript
- **Backend:** Supabase (Auth + Postgres)
- **Hosting:** Vercel
- **Transactional email:** Resend
- **LLMs:** Claude Haiku (classification) and Claude Sonnet (narrative), wrapped in `lib/ai/abstraction.ts`
- **Multi-tenancy:** every table carries `tenant_id`; rendering respects tenant brand variables
- **Brand defaults (Atlas tenant):** navy `#1B3A6B`, cyan `#00B8D4`, Playfair Display headers, DM Sans body
- **Compliance posture:** COPPA Model B (per-assignment parental consent), FTC email-plus VPC, audit logging on all PII reads
- **Subject-agnostic schema:** every entity that could differ by subject is parameterised (curriculum, taxonomy, strand list)

---

## 2. Pipeline Architecture

### 2.1 Stages

The pipeline is four sequential stages, each with a defined input contract, output contract, and failure mode. Each stage runs as a discrete server-side job; stages communicate only through their typed contracts (no shared mutable state).

```
[AssessmentSession]
       │
       ▼
┌──────────────────────────┐
│ STAGE 1: Placement       │  Statistical (IRT / Bayesian)
│ Engine                   │  Deterministic given inputs
└──────────────────────────┘
       │
       ▼
[PlacementResult]
       │
       ▼
┌──────────────────────────┐
│ STAGE 2: Misconception   │  LLM (Haiku)
│ Classifier               │  Pattern recognition over response set
└──────────────────────────┘
       │
       ▼
[MisconceptionFinding[]]
       │
       ▼
┌──────────────────────────┐
│ STAGE 3: Narrative       │  LLM (Sonnet)
│ Generator                │  Structured parent-facing prose
└──────────────────────────┘
       │
       ▼
[ReportContent]
       │
       ▼
┌──────────────────────────┐
│ STAGE 4: Report Renderer │  Deterministic templating
│                          │  HTML + PDF outputs
└──────────────────────────┘
       │
       ▼
[Report (HTML + PDF) → delivery]
```

### 2.2 Failure & Degradation

Each stage MUST gracefully degrade rather than fail the whole pipeline. See §10 for stage-specific fallback contracts. In all cases, a report is produced for every completed session; the degradation policy determines what content depth that report contains.

### 2.3 Idempotency

Every stage MUST be idempotent on its inputs. Re-running the pipeline for a given session MUST produce semantically equivalent output (modulo LLM nondeterminism, which is bounded by temperature settings in §6 and §7).

---

## 3. Triggering & Orchestration

### 3.1 Trigger

The pipeline starts when an `AssessmentSession` transitions to `completed`. This is signalled by a database row update on `assessment_sessions.status` and dispatched via a Supabase function to the report-generation job queue.

### 3.2 Latency Budget

Total wall-clock budget from session completion to in-app report availability: **≤ 25 seconds**. Email delivery (signed URL to the rendered HTML) may complete asynchronously after that.

Per-stage soft budgets (revised once profiling data exists):
- Stage 1 (Placement): < 1s (deterministic compute)
- Stage 2 (Classifier): < 8s (one Haiku call, bounded prompt)
- Stage 3 (Narrative): < 15s (one Sonnet call, longer prompt)
- Stage 4 (Renderer): < 1s (HTML generation only)

If the 25s budget is exceeded, the in-app experience shows a "your report is being prepared" interstitial and notifies the parent by email when ready.

### 3.3 Storage

Each pipeline run persists every intermediate artifact (`PlacementResult`, `MisconceptionFinding[]`, `ReportContent`, rendered HTML, rendered PDF) keyed by `session_id` in Supabase Postgres + Supabase Storage. This enables (a) replay of any stage without rerunning earlier stages, (b) audit trail per regulatory requirement, (c) downstream analytics.

---

## 4. Data Schemas

All schemas are TypeScript. JSON Schema equivalents live in `/schemas/` and are the source of truth for runtime validation.

### 4.1 AssessmentItem

```typescript
interface AssessmentItem {
  id: string;                          // UUID
  tenant_id: string;                   // multi-tenant scoping
  curriculum_id: string;               // e.g. "sam-singapore-math"
  strand_id: string;                   // references Strand
  level_band: { min_grade: number; max_grade: number };

  // IRT parameters (calibrated; defaults until calibration matures)
  difficulty: number;                  // b parameter, typically -3 to +3
  discrimination: number;              // a parameter, default 1.0 (Rasch)
  guessing: number;                    // c parameter, default 0.25 for 4-option MC

  format: 'multiple_choice' | 'numeric_entry' | 'multi_select';
  stem: string;                        // question text (never sent to training)
  options: AssessmentItemOption[];

  source: 'sam_licensed' | 'public_singapore_math' | 'inspirea_authored';
  audit: { created_at: string; created_by: string; version: number };
}

interface AssessmentItemOption {
  id: string;
  text: string;
  is_correct: boolean;
  misconception_tags: string[];        // refs into MisconceptionTaxonomy
  evidence_strength: number;           // 0-1; how diagnostic this distractor is
}
```

### 4.2 Response

```typescript
interface Response {
  id: string;
  session_id: string;
  item_id: string;
  selected_option_id: string;          // chosen option (always present for MC)
  is_correct: boolean;
  time_to_answer_ms: number;
  answer_changed_count: number;        // detects uncertainty patterns
  presented_at: string;                // ISO8601
  answered_at: string;                 // ISO8601
}
```

### 4.3 AssessmentSession

```typescript
interface AssessmentSession {
  id: string;
  tenant_id: string;
  child_profile_id: string;
  curriculum_id: string;

  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at: string | null;

  responses: Response[];
  ability_estimate_path: AbilityEstimate[];  // history; updated after each response
  metadata: {
    device_type: 'tablet' | 'desktop' | 'mobile';
    user_agent: string;
    completion_pct: number;
  };
}

interface AbilityEstimate {
  after_response_n: number;
  theta: number;                       // current ability estimate
  se: number;                          // standard error
  timestamp: string;
}
```

### 4.4 PlacementResult (Stage 1 output)

```typescript
interface PlacementResult {
  session_id: string;
  tenant_id: string;

  // Overall placement
  overall_ability: number;             // final theta
  overall_se: number;                  // final standard error
  curriculum_level: string;            // e.g. "S.A.M. Level 3"
  confidence: 'high' | 'medium' | 'low';

  // Per-strand
  strand_estimates: StrandEstimate[];

  // Session metadata for downstream stages
  questions_answered: number;
  completion_time_ms: number;
  generated_at: string;
}

interface StrandEstimate {
  strand_id: string;
  strand_name: string;                 // e.g. "Fractions"
  ability: number;                     // theta for this strand
  se: number;
  percentile_display: number;          // 0-100, what shows in the report ("78%")
  level: 'solid' | 'approaching' | 'developing';
  questions_in_strand: number;         // for confidence calibration
}
```

**Level thresholds (provisional, tune with pilot data):**
- `solid`: percentile_display ≥ 70
- `approaching`: 50 ≤ percentile_display < 70
- `developing`: percentile_display < 50

### 4.5 MisconceptionFinding (Stage 2 output)

```typescript
interface MisconceptionFinding {
  id: string;
  session_id: string;
  tenant_id: string;

  misconception_id: string;            // refs MisconceptionTaxonomy
  misconception_label: string;         // technical label
  parent_facing_phrasing: string;      // pre-written, parent-readable description

  confidence: number;                  // 0-1
  evidence: MisconceptionEvidence[];   // ≥ 2 evidence items required for medium+

  affected_strands: string[];          // strand_ids
  remediation_unit_id: string | null;  // curriculum unit that addresses this
  priority_rank: number;               // 1 = highest priority for this report
}

interface MisconceptionEvidence {
  item_id: string;
  selected_option_id: string;
  was_correct: boolean;
  pattern_match_strength: number;      // 0-1, classifier-assessed
}
```

### 4.6 ReportContent (Stage 3 output / Stage 4 input)

This is the canonical intermediate that the renderer consumes. It MUST be fully parent-readable; nothing here is opaque to a non-technical reader.

```typescript
interface ReportContent {
  session_id: string;
  tenant_id: string;
  generated_at: string;

  // Header
  child: {
    display_name: string;              // child's display name in the report header — full name for demo; live treatment TBD
    grade_label: string;               // e.g. "Grade 3"
  };
  metadata: {
    assessed_date_display: string;     // e.g. "May 19, 2026"
    duration_display: string;          // e.g. "14 minutes"
    report_id: string;                 // e.g. "A-2026-051901"
  };

  // Placement block
  placement: {
    level_display: string;             // e.g. "S.A.M. Level 3"
  };

  // Strand performance
  strand_performance: {
    lede: string;                      // 1-2 sentence intro
    radar_data: RadarVisualizationData;
    detail_rows: StrandRow[];          // ordered for display
  };

  // Findings — 2-3 items, max 3
  findings_section: {
    heading: string;                   // default "What We Noticed"
    lede: string;
    findings: ReportFinding[];
  };

  // Recommendation — numbered action plan (3-5 items); design.md §5 "What To Do Next"
  recommendation: {
    lede: string;
    actions: RecommendationAction[];   // 3-5 numbered action items, ordered for display
  };

  // Next steps
  next_steps: {
    paragraph: string;
    cta_text: string;
    cta_target: string;                // URL or app deep link
  };
}

interface RadarVisualizationData {
  axes: {
    strand_id: string;
    short_label: string;               // e.g. "Number Sense" (truncated for radial layout)
    value: number;                     // 0-100
    level: 'solid' | 'approaching' | 'developing';
  }[];
}

interface StrandRow {
  strand_name: string;                 // full name
  percentile_display: number;
  level: 'solid' | 'approaching' | 'developing';
  level_label: string;                 // display string (e.g. "Solid", "Developing")
}

interface ReportFinding {
  number: number;                      // 1, 2, 3 (display order)
  title: string;                       // headline sentence, declarative
  observed: string;                    // "What we observed" — specific, evidence-grounded
  suggests: string;                    // "What it suggests" — interpretation
  matters: string;                     // "Why it matters" — connection to learning
  focus: string;                       // "What we'd focus on" — remediation, S.A.M.-aware
}

interface RecommendationAction {
  number: number;                      // 1, 2, 3... — display order
  action: string;                      // the bold action sentence
  context: string;                     // one-line supporting context
  unit_id?: string;                    // optional — curriculum unit this action starts, when applicable
  addresses_finding_number?: number;   // optional — finding this action responds to, when applicable
}
```

---

## 5. Stage 1: Placement Engine

### 5.1 Responsibilities

- Compute final ability estimate (theta) from response history
- Compute per-strand ability estimates
- Map theta to curriculum-level label (e.g. "S.A.M. Level 3")
- Map per-strand theta to display percentile and level band

### 5.2 Model

**Locked:** 3-parameter logistic (3PL) IRT model. Defaults at MVP:
- `a` (discrimination) = 1.0 for all items (Rasch-equivalent)
- `c` (guessing) = 0.25 for 4-option MC, 0 for numeric entry
- `b` (difficulty) — calibrated where possible; otherwise curriculum-level priors

**Bayesian updating** during the live assessment maintains the running theta estimate. The Stage 1 job re-runs the full posterior on the completed response set to produce the final `PlacementResult`. Use a normal prior on theta with mean = grade-band centre, SD = 1.

### 5.3 Per-Strand Estimation

Per-strand theta is estimated using only items in that strand. If a strand has fewer than 4 items in the response set, the strand estimate is flagged `confidence: low` and the display percentile falls back to the overall ability projected onto that strand's prior.

### 5.4 Curriculum-Level Mapping

The mapping `theta → S.A.M. Level N` is a tenant-configurable lookup table stored in the database (`curriculum_level_mappings`). MVP table for S.A.M.:

| theta range | S.A.M. Level |
|---|---|
| < -1.5 | Level 1 |
| -1.5 to -0.5 | Level 2 |
| -0.5 to +0.5 | Level 3 |
| +0.5 to +1.5 | Level 4 |
| > +1.5 | Level 5+ |

### 5.5 Confidence Banding

```
confidence = high   if overall_se < 0.35 AND questions_answered ≥ 25
confidence = medium if overall_se < 0.50 AND questions_answered ≥ 15
confidence = low    otherwise
```

Low-confidence placements MUST display a note in the report (TBD wording with product) acknowledging the placement is provisional.

### 5.6 Calibration Strategy

At MVP, item difficulties come from one of three sources, in priority order:
1. Published norming data for matching Singapore Math items (research pass required)
2. Expert-assigned priors based on grade-level alignment
3. Default difficulty matching the strand's average

Post-pilot, item difficulties refine using the pilot session data via maximum likelihood estimation.

---

## 6. Stage 2: Misconception Classifier

### 6.1 Responsibilities

Identify the 0–3 most likely misconceptions affecting this child, with evidence and confidence.

### 6.2 Model

**Locked:** Claude Haiku (current generation). Accessed via `lib/ai/abstraction.ts` to allow model swaps without touching this code path.

### 6.3 Inputs

The classifier receives:
- The session's responses with item metadata (stem hash, NOT raw stem; option texts; misconception tags on chosen options; correctness)
- The PlacementResult from Stage 1
- The MisconceptionTaxonomy (full taxonomy in scope for this assessment)
- The child profile metadata (grade, age band)

The classifier MUST NOT receive: child name, parent identifying information, or any PII beyond grade band.

### 6.4 Prompt Structure

The classifier prompt is structured as:

1. **System message:** role definition ("You are a misconception analyst..."), output schema, evidence threshold rules, banned outputs (no diagnosing the child as a person, no medical/learning-disability claims)
2. **Taxonomy:** full taxonomy with technical labels and parent-facing phrasing
3. **Response data:** structured response set with distractor tags
4. **Output request:** JSON matching `MisconceptionFinding[]` schema, 0–3 items, ranked by priority

Full prompt template lives in `prompts/misconception-classifier.md` (to be authored).

### 6.5 Output Validation

Every output MUST pass these rules before the pipeline accepts it:
- JSON parses to `MisconceptionFinding[]` schema
- Each finding has `evidence.length ≥ 2`
- Each finding's `misconception_id` exists in the taxonomy
- Each evidence's `item_id` exists in this session's responses
- `confidence` values are calibrated (see §6.6)
- No more than 3 findings returned

Failures trigger one retry with a stricter prompt; second failure falls back to "no findings surfaced" mode (see §10.2).

### 6.6 Confidence Calibration

```
confidence = high   if evidence.length ≥ 3 AND mean(pattern_match_strength) ≥ 0.75
confidence = medium if evidence.length ≥ 2 AND mean(pattern_match_strength) ≥ 0.55
confidence = low    otherwise (and is NOT included in the report)
```

Only `medium` and `high` confidence findings reach the report.

### 6.7 Temperature

`temperature = 0.2` (low; we want consistent classification of the same response pattern).

---

## 7. Stage 3: Narrative Generator

### 7.1 Responsibilities

Convert structured findings + placement data into the `ReportContent` schema — specifically, the parent-readable text fields (ledes, finding bodies, recommendation actions, next-steps paragraph).

### 7.2 Model

**Locked:** Claude Sonnet (current generation). Higher capability than Haiku is needed for voice control and the four-beat structural constraint.

### 7.3 Inputs

- `PlacementResult` from Stage 1
- `MisconceptionFinding[]` from Stage 2 (medium+ confidence only)
- Child profile (grade, display name)
- Tenant brand voice spec (Atlas default in `brand-voice.md`)
- Curriculum reference data (which units address which misconceptions)

### 7.4 Voice & Style Constraints

The generator MUST produce text that:
- Reads at Flesch-Kincaid grade level ≤ 8 (parent-readable)
- Uses second-person sparingly; refers to the child by name
- Does NOT diagnose, label, or pathologise the child
- Frames findings as patterns observed in *this assessment*, not traits of the child
- Names specific items only by category, never by quoting the stem verbatim
- Uses the four-beat structure for findings exactly: observed / suggests / matters / focus
- Connects every finding's "focus" beat to a specific S.A.M. curriculum unit when available

Voice reference: editorial, analytical, warm but not chummy. Reference exemplar: the existing `atlas-sample-report.html` finding text. Tone exemplars in `brand-voice.md`.

### 7.5 Prompt Structure

1. **System message:** voice/style spec, banned moves (no diagnosis, no quoting items), output schema enforcement
2. **Brand voice reference:** key exemplars
3. **Inputs:** placement, findings, curriculum reference
4. **Output:** JSON matching the writable subset of `ReportContent`

Full prompt template lives in `prompts/narrative-generator.md` (to be authored).

### 7.6 Output Validation

Beyond JSON schema validation:
- Flesch-Kincaid grade check (reject if > 8.5)
- Banned phrase check (no diagnostic language: "Aiden has", "Aiden is", "Aiden struggles with" → reframe required)
- Four-beat completeness (every finding has all four beats; none empty; none < 25 words)
- Finding count matches input finding count

Failures trigger one retry; second failure → fallback paragraph generation (§10.3).

### 7.7 Temperature

`temperature = 0.4` (moderate; we want narrative variation but consistent voice).

---

## 8. Stage 4: Report Renderer & Delivery

### 8.1 Responsibilities

- Render `ReportContent` to HTML using the canonical template
- Persist the rendered HTML to Supabase Storage
- Generate a signed access URL with embedded expiration tied to the family's enrolment status
- Emit a delivery event for the email job
- Serve the report at the signed URL, gated on signature + expiration validation
- Serve a re-engagement page when an expired URL is accessed

**No PDF generation.** Reports are HTML-only by design — this preserves access control, enables expiration, and turns lapsing reports into a re-engagement mechanism.

### 8.2 HTML Template

The HTML template is `templates/report/atlas-report.html.njk` (Nunjucks). Its structure mirrors `atlas-sample-report.html` exactly. Brand variables (colour tokens, font families, wordmarks) come from the tenant's brand record at render time.

The template MUST include print stylesheet rules (`@media print`) so that parents who choose to print the page from their browser get a clean printable layout. This is acknowledged-but-not-prevented behaviour.

### 8.3 Asset Loading

Fonts are self-hosted (not Google Fonts) for privacy and rendering reliability. Static font files live at `/public/fonts/` and are referenced by `@font-face` rules.

### 8.4 Storage

- Rendered HTML: `storage://reports/{tenant_id}/{session_id}/report.html`
- `ReportContent` (the structured intermediate) persists in Postgres for re-rendering if the template versions
- All artifacts retained for the regulatory retention window (24 months minimum)

### 8.5 Access Control & Expiration

#### 8.5.1 Access Model

Reports are accessed via a signed URL emailed to the verified parent address. The URL pattern:

```
https://{tenant_domain}/r/{report_id}?sig={hmac}&exp={unix_timestamp}
```

The endpoint validates:
1. HMAC signature against the report secret (tenant-scoped)
2. Expiration timestamp ≥ current time
3. Report exists and belongs to the claiming tenant

Validation failures route to the expiration / error page (§8.5.3).

#### 8.5.2 Expiration Policy

Expiration duration is determined at the time the URL is signed, based on the family's status:

| Family status | URL validity |
|---|---|
| Enrolled in S.A.M. curriculum | 5 years (effectively persistent) |
| Assessment-only (not enrolled) | 6 months from assessment date |

The status check happens on every URL generation, not just at first delivery. If an assessment-only family enrols later, subsequent URL regenerations issue long-validity URLs.

Both durations are tenant-configurable in the database (`tenant_settings.report_expiration_policy`). The 6-month default for assessment-only families is a starting point; pilot data may tune it.

#### 8.5.3 Expired Report Handling

When an expired URL is accessed, the endpoint serves a dedicated re-engagement page rather than the report. The page MUST:

- Acknowledge by name that this is the family's previous assessment ("Aiden's assessment from May 2026")
- Not display any diagnostic content (the report is gone, not paywalled)
- Offer a clear path forward: "Schedule a consultation with a S.A.M. centre director to discuss your child's results" (with CTA)
- Offer a secondary path: "Take a new assessment" — the existing report is gone but a fresh one can be created

The expiration page is a brand-consistent surface, not a 404. Parents who arrive here MUST feel routed forward, not blocked.

#### 8.5.4 Re-issuing Access

A parent who wants to view their report after expiration can:
1. Schedule the consultation (preferred path) — center director surfaces the report in-session
2. Re-engage with the assessment funnel — new assessment generates new report
3. Contact support (out-of-band) — operational override that issues a fresh 30-day URL

Path 3 is intentionally manual; the design intent is to route lapsed families through center contact, not through self-serve link refresh.

### 8.6 Email Delivery

Delivery via Resend. The email payload includes:
- Parent salutation
- Child name + assessment date
- Recommended placement (text snippet, NOT the full diagnostic)
- The signed URL with one-click access
- Validity statement appropriate to family status ("Your report will be available until [date]" for assessment-only; no validity note for enrolled)

Email template lives at `templates/email/report-ready.{en}.njk`.

---

## 9. Misconception Taxonomy

### 9.1 Purpose

The taxonomy is the controlled vocabulary that bridges item authoring (where distractors are tagged), classification (where Haiku reasons over the tag space), and narrative generation (where parent-facing phrasing is pulled).

### 9.2 Structure

```typescript
interface Misconception {
  id: string;                          // stable identifier, e.g. "frac.denominator_additive"
  technical_label: string;             // for classifier
  parent_facing_phrasing: string;      // for narrative — short, plain-English
  description: string;                 // for content authors
  strand_ids: string[];                // strands this can affect
  typical_grade_bands: { min: number; max: number };
  remediation_unit_ids: string[];      // S.A.M. units that address this
  example_distractor_patterns: string[];
  status: 'active' | 'proposed' | 'deprecated';
}
```

### 9.3 MVP Scope

For the MVP (working demo), the taxonomy MUST cover at minimum 8–12 misconceptions spanning grades 2–6 Singapore Math. Priority misconceptions for MVP coverage:

1. Denominator-as-additive (fractions)
2. Keyword-driven word problem parsing
3. Place-value confusion in regrouping
4. Multiplication as repeated addition (failure mode in unit conversion)
5. Misapplied commutativity / associativity in subtraction or division
6. Whole-number reasoning applied to decimals
7. Part-whole confusion in bar model problems
8. Operator overgeneralisation ("of" always means multiply, etc.)

Full taxonomy spec, including parent-facing phrasings and example distractors, lives in `misconception-taxonomy.md`.

### 9.4 Authoring Discipline

Adding a new misconception requires:
- ≥ 5 items in the bank tagged with this misconception across at least 2 strands
- A parent-facing phrasing reviewed against the voice spec
- A remediation unit mapping (or explicit acknowledgement that none exists yet)

---

## 10. Degradation & Fallbacks

### 10.1 Stage 1 (Placement) Failure

Not a graceful-degradation scenario — if placement can't compute, the assessment was malformed and the report cannot proceed. Surface an operational error to the parent: "We're having trouble producing your report — a team member will be in touch within 24 hours." Page the on-call engineer.

### 10.2 Stage 2 (Classifier) Failure or "No Findings Surfaced"

If the classifier returns 0 confident findings, or fails validation twice, the report drops the "What We Noticed" section. The Stage 3 narrative MUST then produce a single "Overall Observations" finding-shaped block drawn from the strand performance data instead of from misconceptions. The four-beat structure is preserved; the content is strand-derived rather than misconception-derived.

### 10.3 Stage 3 (Narrative) Failure

If narrative generation fails validation twice, fall back to a templated narrative built from the placement and findings data using a deterministic template (defined in `templates/narrative/fallback-templates.md`). The report is still produced, with slightly less voice quality.

### 10.4 Stage 4 (Renderer) Failure

If HTML rendering fails (template error, missing brand asset, etc.), the pipeline retries up to 3 times with 5s backoff. If all retries fail, the parent receives an email apologising for the delay and notifying that a team member will reach out within 24 hours. On-call engineer is paged.

Access-control failures (invalid signature, malformed URL) route to a generic error page that's distinct from the expiration page (§8.5.3). The error page does not offer the re-engagement CTA; it offers a "contact support" path instead.

---

## 11. Compliance Hooks

### 11.1 PII Handling

The classifier (Stage 2) and narrative generator (Stage 3) are the two stages where data leaves the Atlas system boundary (calls to Anthropic's API). The following rules apply:

- Child name passes only to Stage 3, never Stage 2
- No parent identifying information passes to any LLM stage
- Question stems are never sent to LLMs (only hashed item references plus distractor metadata)
- Tenant-licensed content (e.g. S.A.M. question stems) NEVER leaves the system boundary — see `content-pipeline.md` for tenant content isolation

### 11.2 Audit Logging

Every pipeline run logs (to `audit_log` table):
- Session ID, tenant ID, generated_at
- Hash of each LLM call's input (no full payload)
- LLM model used, token counts
- Final report content hash
- Delivery channel and timestamp

Retention: 24 months minimum (regulatory floor; see `compliance.md`).

### 11.3 Parent-Initiated Deletion

A parent-initiated deletion request MUST cascade to:
- AssessmentSession + Response data
- PlacementResult, MisconceptionFinding[], ReportContent
- Rendered HTML and PDF artifacts in Storage
- Audit log entries (anonymised, not deleted — retain operational record per regulatory advice)

Cascade is handled by a dedicated job; see `compliance.md` §4.

---

## 12. Implementation Phases

### Phase 1 — MVP for Working Demo
**Goal:** End-to-end pipeline producing a credible report for curated test sessions.

- 8 misconceptions in the taxonomy (the MVP set listed in §9.3)
- ~50 items tagged with misconceptions, drawn from the 300-item Singapore Math seed set
- Default difficulty priors (no calibration yet)
- Classifier prompt v1, narrative prompt v1
- HTML rendering with signed-URL access control (§8.5) — including the expiration page surface
- 3–5 curated golden test sessions used for validation
- Manual review gate on every report before display

**Exit criteria:** 5/5 golden test cases produce reports that pass internal review against the canonical `atlas-sample-report.html` quality bar.

### Phase 2 — Pilot Ready
**Goal:** Reliable pipeline across the UWS pilot's expected volume.

- Full MVP taxonomy expanded to ~20 misconceptions
- All 300 seed-set items tagged
- Tenant-configurable expiration durations live (per §8.5.2)
- Calibration v0 from any norming data available + expert priors
- Automated validation gates replace manual review
- Parent satisfaction score collected per report (slider, 1–5)
- Re-engagement page CTAs instrumented for conversion tracking

**Exit criteria:** 50 consecutive reports pass automated validation, parent satisfaction ≥ 4.0/5.0 average.

### Phase 3 — Scale
**Goal:** Production-grade across multiple tenants, taxonomies, and curricula.

- Taxonomy expansion beyond Singapore Math
- Item difficulty calibration refines continuously from pilot data
- Multi-tenant brand variants live
- Continuous quality monitoring + classifier retraining cadence

---

## 13. Testing & Validation

### 13.1 Golden Test Cases

A `golden/` directory contains curated `AssessmentSession` records with hand-reviewed expected `ReportContent`. Every pipeline change runs against this set; regressions block merge.

Initial golden set (Phase 1):
1. Aiden — Grade 3, the canonical example matching `atlas-sample-report.html`
2. High performer — Grade 4, ceiling effect handling
3. Low performer — Grade 2, no clear misconceptions surfaced (tests §10.2 fallback)
4. Mid performer with one strong misconception — Grade 3, single-finding report
5. Borderline-confidence session — short session, low_confidence placement

### 13.2 Quality Metrics

| Metric | Stage | Target (Phase 2) |
|---|---|---|
| Placement classification accuracy vs. tutor-assigned level | 1 | ≥ 80% within ±1 level |
| Misconception precision (findings parents and tutors agree are real) | 2 | ≥ 75% |
| Narrative voice consistency (rubric-scored) | 3 | ≥ 4.0/5 |
| Reading level (Flesch-Kincaid grade) | 3 | ≤ 8.0 mean |
| End-to-end completion within latency budget | All | ≥ 95% |
| Parent satisfaction with report | E2E | ≥ 4.0/5 |

---

## 14. Open Decisions

These are decisions deliberately deferred to product + engineering input during build:

1. **Email subject lines** for report delivery — A/B candidates not yet drafted
2. **Expiration duration for assessment-only families** — defaulted to 6 months in §8.5.2; pilot conversion data should tune this. Worth A/B testing 3 / 6 / 9 month windows once volume permits.
3. **Multilingual support** — out of scope for MVP; structural placeholders only
4. **Parent re-share / forward mechanics** — does a unique parent-shareable URL persist beyond 24h? Open
5. **Assessor (centre director) view** of the same data — separate report variant or a different surface entirely? Open
6. **Continuous learning** — when (if ever) do we feed real session data back into prompt iteration? Open, requires a privacy review

---

## 15. Build Sequence Recommendation

For the Claude Code multi-agent pipeline, recommended cycle order:

1. **Cycle 1:** Schemas (§4) + golden test cases (§13.1) — locks data contracts
2. **Cycle 2:** Stage 1 (Placement Engine) — pure logic, easiest to validate
3. **Cycle 3:** Misconception taxonomy data + ~50 tagged items
4. **Cycle 4:** Stage 2 (Classifier) prompt + validation
5. **Cycle 5:** Stage 3 (Narrative) prompt + validation
6. **Cycle 6:** Stage 4 (Renderer) HTML template
7. **Cycle 7:** End-to-end integration + email delivery
8. **Cycle 8:** Access control + expiration logic + re-engagement page
9. **Cycle 9:** Quality metrics instrumentation
10. **Cycle 10:** Compliance hooks + audit logging

Each cycle hits its own EXIT criteria before the pipeline advances. Founder review gate at every EXIT.
