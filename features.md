# Atlas Assessment — MVP Feature Spec

> **Product**: Atlas Assessment by Seriously Addictive Mathematics (S.A.M.), powered by Inspirea Labs
> **Audience**: Parents and S.A.M. instructors placing K-8 children (ages ~4–13) into Singapore Math curriculum
> **Competitive baseline**: Free static PDF placement tests from singaporemath.com — untimed, one per half-grade, manually scored, no diagnostic insight beyond right/wrong
>
> **Authority**: On any conflict between this document and `architecture.md`, `architecture.md` wins. This file describes *what* the MVP does; `architecture.md` describes *how* and locks the technical decisions.

---

## Problem Statement

Existing Singapore Math placement tests are static PDFs. A parent must guess which level to start, administer a ~60-minute paper test, manually score it, then decide whether to try the next level up or down. The tests produce a single pass/fail signal with no insight into *how* the child thinks, what specific misconceptions they hold, or what to do beyond "start at level X."

Atlas Assessment replaces this with an AI-adaptive, interactive experience that converges on a precise placement in ~15 minutes and delivers a strand-level diagnostic with actionable curriculum recommendations.

---

## MVP Features (Phase 1)

### 1. Adaptive Question Engine

**What it does**: Dynamically selects the next question based on prior responses. Starts at an estimated mid-point and branches up or down, converging on the child's level efficiently.

**Implementation notes**:
- **Two-layer engine**:
  - **Layer 1 — IRT/Bayesian (deterministic core)**: maintains the posterior over the child's level per strand, decides the next ideal difficulty range, and decides when to terminate. Fast, auditable, improvable via response-data calibration. Never LLM-driven.
  - **Layer 2 — LLM-assisted question selection**: once Layer 1 names the next difficulty range and strand, an LLM call picks among candidate questions in that range based on the misconceptions the child has shown so far. Bounded scope — the LLM never overrides the placement math, it only chooses among items the math has already deemed appropriate.
- Each question has a difficulty rating mapped to Singapore Math curriculum levels (KA through 8B, half-grade granularity — 24 levels total).
- Question bank must cover **6 strands**: Number Sense, Operations (add/sub/mult/div), Word Problems, Fractions/Decimals, Geometry, Measurement & Data.
- Termination criteria: confidence threshold on placement level (e.g., 90% posterior probability) OR max 25 questions, whichever comes first.
- Target session length: **~15 minutes** for a child.
- The engine should track response time per question (useful for Phase 2 fluency analysis).

**Question bank requirements**:
- Minimum 10 items per strand per half-grade level = ~10 × 6 × 24 levels = **~1,440 items** for full K-8 coverage.
- v1 ships with whatever S.A.M. content lands first (per `architecture.md` decision #5 — licensing pending). The architecture supports K-8 from day one; coverage rolls out as S.A.M. content arrives.
- Items should be a mix of: multiple choice, numeric entry, and (where feasible) drag-and-drop visual interactions.
- Word problems should be age-appropriate in reading level.
- All items need difficulty calibration — initially via expert tagging (S.A.M.), later refined with real response data.
- Per `compliance.md` §8, raw question content is never sent to the browser in bulk — questions are served one at a time via authenticated API calls and access is audit-logged.

**Data model**:
```
Question {
  id: string
  strand: enum [NUMBER_SENSE, OPERATIONS, WORD_PROBLEMS, FRACTIONS_DECIMALS, GEOMETRY, MEASUREMENT_DATA]
  level: enum [KA, KB, 1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B, 5A, 5B, 6A, 6B, 7A, 7B, 8A, 8B]
  difficulty: float  // IRT difficulty parameter
  format: enum [MULTIPLE_CHOICE, NUMERIC_ENTRY, DRAG_DROP]
  content: QuestionContent  // text, images, answer options, correct answer
  misconception_tags: string[]  // e.g., ["no_regrouping", "place_value_confusion"]
  time_expected_seconds: int
}

AssessmentSession {
  id: string
  child_id: string
  started_at: timestamp
  responses: Response[]
  current_estimate: PlacementEstimate
  status: enum [IN_PROGRESS, COMPLETED]
}

Response {
  question_id: string
  answer_given: string
  is_correct: boolean
  time_taken_seconds: int
  timestamp: timestamp
}

PlacementEstimate {
  overall_level: enum  // e.g., "2B"
  strand_levels: Map<Strand, Level>  // e.g., {OPERATIONS: "3A", WORD_PROBLEMS: "2A"}
  confidence: float
}
```

### 2. Misconception Detection

**What it does**: When a child answers incorrectly, the system identifies *which* misconception likely caused the error — not just that the answer was wrong.

**Implementation notes**:
- Each question in the item bank has pre-tagged **distractor analysis**: each wrong answer choice maps to a specific misconception.
- Example: For `47 - 19 = ?`, answer `38` maps to misconception `SUBTRACT_SMALLER_FROM_LARGER_DIGIT` (child did 7-9→didn't regroup, instead did 9-7=2 in ones place, 4-1=3 in tens).
- For numeric entry (no distractors), use an LLM call to classify the error pattern from the given answer + question context. Prompt should include the question, correct answer, child's answer, and a taxonomy of common misconceptions for that strand/level.
- Store detected misconceptions on each response for use in the report.

**Misconception taxonomy** (starter set, expand over time):
- Number Sense: counting errors, place value confusion, number magnitude misunderstanding
- Operations: no regrouping/borrowing, subtraction direction error, multiplication as repeated addition failure, division remainder errors
- Word Problems: operation selection error, irrelevant information distraction, multi-step sequencing error
- Fractions: treating numerator/denominator independently, fraction-as-two-numbers misconception, common denominator errors
- Geometry: perimeter/area confusion, shape property errors

### 3. Strand-Level Diagnostic Report (Parent-Facing)

**What it does**: After the assessment, generates a visual report for the parent showing the child's level across each math strand, detected misconceptions, and specific recommendations.

**Report sections**:
1. **Overall Placement**: "Based on this assessment, [Child] is ready for Dimensions Math **2B**."
2. **Strand Map**: Visual chart (radar/spider chart or horizontal bar chart) showing level per strand. E.g., Operations → 3A, Word Problems → 2A, Geometry → 2B.
3. **Misconception Insights**: Plain-language explanations of 2–4 key patterns observed. E.g., "[Child] can add and subtract fluently but hasn't yet internalized regrouping with borrowing in subtraction."
4. **Actionable Recommendations**: Specific curriculum guidance. E.g., "Start with Dimensions Math 2B. Supplement Chapter 5 (subtraction) with Extra Practice from 2A. Consider Challenging Word Problems 2 for additional word problem exposure."

**Implementation notes**:
- Report generation can use an LLM call that takes the assessment data (strand levels, misconceptions, response patterns) and produces the narrative sections.
- The strand map visualization should be a React component (or static SVG) — not LLM-generated text.
- Report should be saveable/shareable as PDF.
- The curriculum recommendation engine needs a mapping of: strand + level → specific Dimensions Math chapters/sections + supplementary material suggestions.

### 4. Child-Facing Assessment UI

**What it does**: An engaging, interactive interface the child actually uses to take the assessment.

**Design requirements**:
- Age-appropriate: large touch targets, clear fonts, minimal text for younger kids (K–2).
- Progress indicator that doesn't reveal "difficulty" but shows progress (e.g., a path/journey visual, not "question 7 of 25").
- Support for multiple input types: tap to select (MC), number pad entry, and drag-and-drop for visual/spatial questions.
- No time pressure UI — no visible countdown. (Backend tracks time silently.)
- Positive micro-feedback: brief animations on submission (not "correct/incorrect" — just acknowledgment that the answer was received). Avoid making the child anxious about wrong answers during the test.
- Works on tablet (iPad) as primary device. Responsive for desktop.

**Tech stack suggestion**: React (Next.js or Vite), Tailwind CSS, Framer Motion for animations. Mobile-first responsive.

### 5. User Accounts & Session Persistence

**What it does**: Parent creates an account, adds child profiles, assessment sessions are saved.

**Data model**:
```
Parent {
  id: string
  email: string
  name: string
  children: Child[]
  created_at: timestamp
}

Child {
  id: string
  name: string
  birth_year: int  // for age-appropriate question selection
  assessments: AssessmentSession[]
}
```

**Implementation notes**:
- Auth: Supabase Auth (per `architecture.md` decision #1). Email + password for v1; social login (Google) deferred.
- Domain tables (`parents`, `children`, etc.) reference `auth_user_id`, never put `auth.users.id` directly into foreign keys (per `architecture.md` guardrail #9).
- Every table has a `tenant_id` column from day one (v1 = `inspirea_singapore_math`); per `architecture.md` guardrail #1.
- Each child can have multiple assessment sessions over time (for growth tracking in Phase 2).
- For MVP, support one assessment per child at a time (can be retaken after completion).
- COPPA "email plus" verifiable parental consent flow per `compliance.md` §2.

### 6. Instructor Portal

**What it does**: Lets a S.A.M. instructor view assessment results for the children assigned to them, surface pedagogical recommendations, and track cohort-level patterns.

**Scope (v1)**:
- **Login** — separate entry point from parent signup; instructor accounts are provisioned by S.A.M. (no self-signup in v1).
- **Student roster** — table of children assigned to the instructor with per-child status (assessment complete / in progress / not started), placement level, and last-assessment date. Empty-state view for new instructors.
- **Individual student report** — same diagnostic report parents see, plus a **Pedagogical Notes** section (suggested first lesson focus, recommended S.A.M. worksheets, instructor-authored notes after first session).
- **Cohort view** — placement distribution chart, top-5 misconceptions across the instructor's students, summary stats (avg placement, avg time to complete, students needing attention).

**Data model (additive on top of §5)**:
```
Instructor {
  id: string                   // domain UUID
  auth_user_id: string         // links to auth.users (Supabase)
  tenant_id: string            // = "inspirea_singapore_math" in v1
  email: string
  name: string
  created_at: timestamp
}

InstructorChildAssignment {
  id: string
  tenant_id: string
  instructor_id: string
  child_id: string
  assigned_at: timestamp
  // RLS: instructor can only read child rows reachable through this table
}

PedagogicalNote {
  id: string
  tenant_id: string
  instructor_id: string
  child_id: string
  body: string
  created_at: timestamp
}
```

**Implementation notes**:
- RLS: an instructor can read a child's assessment data only when an `InstructorChildAssignment` row exists for that pair. The Compliance Agent must produce explicit RLS test cases proving an instructor cannot see unassigned children's data.
- Pedagogical notes are visible only to instructors, never to parents.
- Cohort view aggregates only over the instructor's assigned children (no cross-instructor leakage).

**Open compliance question** (raise to founder before instructor portal build):
- COPPA implication of S.A.M. instructor seeing a parent-consented child's data: does the parent's existing VPC consent cover instructor access, or is a separate "consent to share with instructor" step required when the child is assigned? `compliance.md` §2 doesn't currently address this — needs explicit resolution before launch.

---

## Phase 2 Features (Post-MVP)

These are **not** in scope for the initial build but should be considered in architecture decisions.

| Feature | Description |
|---------|-------------|
| **Growth Tracking** | Compare assessment results over time. Dashboard showing level progression per strand across multiple sessions (e.g., 3-month intervals). |
| **Fluency Analysis** | Use response time data to distinguish "knows it" from "can figure it out slowly." Report fluency vs. accuracy separately. |
| **Curriculum-Agnostic Mode** | Support placement into Primary Mathematics and other Singapore Math series, not just Dimensions Math. |
| **School Customer Tier** | Multi-school / multi-classroom administration, FERPA layer, school-as-data-controller consent model. (The single-instructor view ships in v1 per §6 above; this is the multi-org wrapper around it.) |
| **Embeddable Widget** | Allow homeschool bloggers and curriculum sites to embed Atlas assessment via iframe/SDK. |

---

## Architecture Considerations

- **Question bank is the moat**: Licensed from S.A.M. (per `architecture.md` decision #5). Invest in tooling that lets S.A.M. add/edit calibrated items with expert-tagged misconception distractors over time.
- **LLM calls should be surgical**: Use LLM only for (a) misconception classification on free-response items and (b) report narrative generation. Per `architecture.md` decision #3: Anthropic Claude — Haiku 4.5 for classification, Sonnet for report narrative. The adaptive engine itself is algorithmic (IRT/Bayesian), never LLM-driven.
- **Calibration data loop**: Every assessment session produces response data that can refine item difficulty parameters. Build the pipeline for this from day one even if you don't use it until you have volume.
- **Connection resilience (no offline mode in v1)**: Per `architecture.md` decision #7, v1 implements graceful degradation only — UI freezes politely on connection loss, queues the current response in memory, resumes on reconnect. Service worker / IndexedDB / true offline is deferred to v2.
- **Privacy**: Children's data is sensitive (COPPA applies). Parent must consent via the "email plus" VPC flow per `compliance.md` §2. Store minimal PII. No child email addresses. Assessment data deletable on request per `compliance.md` §4.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Assessment completion rate | > 85% of started sessions |
| Time to completion | Median < 18 minutes |
| Parent report satisfaction | > 4.2/5 on "this was useful" survey |
| Placement accuracy | > 90% agreement with expert human placement (validated via pilot) |
| Repeat usage | > 30% of parents re-assess within 6 months |

---

## Open Questions

1. ~~**Question bank creation**~~ — Resolved (`architecture.md` #5): license from S.A.M.; pending Sam Chia conversation. Engine and schema work proceeds with placeholder content in the meantime.
2. ~~**LLM provider**~~ — Resolved (`architecture.md` #3): Anthropic Claude. Haiku 4.5 for high-volume misconception classification (<2s budget), Sonnet for report narrative (5–10s budget acceptable).
3. ~~**Pricing model**~~ — Resolved (`architecture.md` #8): no paywall in v1, free pilot. Schema includes `subscription_tier` field set to `pilot` so tiers can be introduced later as a data migration.
4. **Pilot plan**: How many families for beta? Suggest 50–100 homeschool families via Singapore Math community forums for initial validation. (S.A.M. parent network as alternative source — see `architecture.md` open question #3.)
5. **Instructor-COPPA consent model**: Does parental VPC consent cover S.A.M. instructor access to that child's report, or is a separate per-assignment consent required? Raised in §6 above; needs founder + counsel resolution before instructor portal launch.
