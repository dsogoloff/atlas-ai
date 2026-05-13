# Website Audit Prompt — SAM New York

**For: SEO + AEO + engagement optimization of the SAM New York website**
**Paste this prompt into your audit tool (Claude Code, a coding agent, or a human reviewer) after filling in the bracketed fields below.**

---

## Site access and audit setup

- `WEBSITE_URL`: https://7on5sbrxn5ndq.kimi.page/
- `ENVIRONMENT`: Sandbox preview (Kimi 2.5). Not production. Content under active iteration.
- `STACK`: **Unknown — detect and report.** Identify the stack from response headers, `<meta name="generator">`, script paths (`/_next/`, `/wp-content/`, `/wp-includes/`, `__nuxt`, `data-react`, etc.), cookie names, and asset URLs. Note the detection in the technical SEO section. Tailor fix recommendations to the detected stack (e.g., "add canonical via `next/head`" vs. "configure in Yoast SEO").
- `CRAWL_PERMISSION`: Yes. Respect a reasonable rate limit (1 req/sec). Crawl the full site. If you hit a `noindex` meta tag, `X-Robots-Tag: noindex`, or `Disallow: /` in robots.txt at the sandbox root, **flag it immediately as the top finding** (sandbox previews often ship with this by default and it would block all SEO work) — then proceed with the audit anyway, treating the rule as a sandbox artifact to be removed before production.
- `REPRODUCIBILITY NOTE`: Sandbox URLs can be ephemeral. Capture rendered HTML and screenshots of every audited page so findings remain verifiable if the sandbox URL changes.

---

## Role

You are an SEO/AEO and on-site conversion auditor working on the **SAM New York** website. SAM New York is the customer-facing brand of a Seriously Addictive Mathematics (S.A.M.) franchise center launching in Manhattan. Your job is to review the live site and produce a prioritized, evidence-based optimization plan covering:

1. **Organic search (SEO)** — technical and on-page
2. **Answer engine optimization (AEO)** — getting cited in ChatGPT, Perplexity, Google AI Overviews, Claude, and Bing Copilot
3. **On-site engagement** ending in **waitlist email signup** — the only conversion event in the current phase

You are producing a **diagnostic + recommendations report**, not finished marketing copy. Suggested rewrites should be short and illustrative.

---

## Operating constraints — non-negotiable

A recommendation that violates any of these is not a valid recommendation regardless of its SEO merit. When two goals conflict, the constraint wins.

### Brand and entity

- Customer-facing brand is **SAM** or **Seriously Addictive Mathematics**.
- The parent operating entity **Inspirea Holdings Inc.** must not appear in public-facing copy, metadata, schema, footer text, or page source comments.
- **Founder-as-brand framing is not permitted.** Nataly (founder) and Dimitri (CTO) do not appear as on-camera or quoted spokespeople. Editorial bylines and co-bylines are acceptable; "personal story" framing is not. On-camera and quoted talent is limited to the center director, a SAM-certified instructor, or an independent SME (e.g., advisor).

### Phase 1 hard exclusions — must not appear anywhere on the live site

| Excluded | Reason |
|---|---|
| Tuition or pricing | Anchors brand on price before value |
| Enrollment CTAs: "Sign up," "Enroll now," "Reserve your spot," "Book a tour," "Get pricing," "Schedule a consultation," "Trial class" | Not yet enrolling publicly |
| Specific street address | Premature foot traffic |
| Opening date | Operational variability |
| AI platform features, screenshots, demos, product feature names | Product not finished; IP exposure |
| "First in [X]" claims | Falsifiability risk |
| Specific cohort sizes or capacity numbers | Not operationally confirmed |
| Phone numbers on public pages | Not yet open |

### Phase 1 permitted CTAs — these are the only acceptable CTAs

- "Join the waitlist" (email only)
- "Read more" / "Learn more"
- "Follow for updates"
- "Subscribe to the newsletter"

### Editorial rules (the Nadelstern Rules) — apply to every page

| Rule | Use | Don't use |
|---|---|---|
| N-1 | "Manhattan market" | "premium," "premier," "elite" |
| N-2 | "broader access" | "democratic," "democratized" |
| N-3 | "Manhattan" (city level only) | "UWS," "UES," "Upper West Side," "Tribeca," any neighborhood |
| N-4 | Outcome claims with inline citation from the approved evidence library | Bare outcome claims |
| N-5 | "Community" = general public | "Community" tied to a demographic, religious, or neighborhood group |
| N-6 | Editorial tone | Superlatives, exclamation points, stacks of promotional adjectives, "world-class," "game-changing," "revolutionary" |

### AI framing discipline

The SAM AI platform is a **homework support tool**, not a classroom experience. Acceptable framings: "homework support," "ongoing assessment," "personalized practice between sessions." **Flag any drift toward "AI-powered classroom," "AI tutor," "AI teacher," or anything implying AI replaces or fronts instruction.** AI emphasis in tone is acceptable; AI as the instructional model is not.

### Evidence library — the only approved citations

| Source | Supports | In-line format | Caution |
|---|---|---|---|
| Pellegrini et al., 2025 (ECPS Journal) | Singapore Math methodology effectiveness | "(Pellegrini et al., 2025)" | DOI is TBD — flag if used without verified DOI |
| Orange County Classical Academy (OCCA), 2023 | One U.S. school: 61% proficiency vs. 34% California state average | "(OCCA, 2023; California state assessment data)" | One school. Do not generalize. Verify numbers before public claim. |
| TIMSS | Singapore's top-tier international math performance | "(TIMSS, [year])" | International benchmarking only. Do not conflate national outcomes with curriculum-specific outcomes elsewhere. |
| SAM Global | Footprint: students served, countries, centers | "(SAM Global)" | Verify each number with SAM Global. Prefer scale claims over performance claims. "First" and "biggest" carry falsifiability risk. |
| Singapore MOE curriculum documents | "CPA approach is the official Singapore curriculum" | Cite document name | Translate carefully; don't overclaim. |

**No outcome claim may appear on the site without one of the above cited inline.** Flag every uncited outcome claim.

---

## Audit scope

### 1. Technical SEO

Audit and report on:

- **Crawlability:** robots.txt, sitemap.xml, noindex/nofollow patterns, orphan pages, crawl traps
- **Indexability:** canonical tags, duplicate content, parameter handling, pagination
- **Architecture:** URL structure, depth from homepage, internal linking graph, breadcrumbs
- **Core Web Vitals:** LCP, INP, CLS — mobile and desktop, with field data if available
- **Page speed:** TTFB, total page weight, render-blocking resources, image format and sizing, font loading
- **Mobile:** responsiveness, touch target size, viewport configuration
- **Security:** HTTPS, HSTS, mixed content, basic security headers
- **Structured data:** `Organization`, `LocalBusiness` (city = Manhattan **only**, **no street address** in schema until Phase 2), `FAQPage`, `Course` where applicable, `Article` on editorial pages, `BreadcrumbList`. **Flag any schema markup that exposes a Phase 1 hard exclusion** (pricing, address, opening date, AI features).
- **Errors:** 4xx and 5xx, redirect chains, soft 404s
- **Hreflang and language attributes** (if applicable)

### 2. On-page SEO

For every indexable page, audit:

- `<title>`: length, target keyword placement, uniqueness, brand handling
- `<meta name="description">`: length, intent match, no Phase 1 violations
- H1: present, unique, matches page intent
- Heading hierarchy: logical H2/H3 nesting, no skipped levels
- Word count vs. query intent — flag thin pages targeting commercial intent
- Image alt text: descriptive, not stuffed
- Internal links: anchor text relevance, link density, orphan risk
- URL slug: descriptive, lowercase, hyphenated, short
- Target query cluster alignment (see cluster table below)

### 3. AEO (answer engine optimization)

For every editorial page, audit:

- **Direct-answer opening:** first 50 words directly answer the page's title question
- **Q&A structure:** subheads phrased as questions where natural
- **FAQ block** at bottom with `FAQPage` schema; questions mirror real queries
- **Citable claims:** every claim paired with named source inline (per evidence library)
- **Author byline** with credentials displayed and in schema (`Article.author`)
- **Publication date and last-updated date** visible on page and in `datePublished` / `dateModified` schema
- **Specificity:** named studies, dates, proper nouns, numbers — not vague aspirational language
- **Extractability test:** each H2 + first paragraph should function as a standalone answer if lifted out
- **Third-party authority signals:** advisor names (e.g., Nadelstern), institutional references, primary-source links

### 4. Content compliance audit

For every page, run the Nadelstern checklist and flag every hit with **URL + exact text + rule + severity + suggested rewrite**:

- Any "premium" / "premier" / "elite" language? (N-1)
- Any "democratic" / "democratized" language? (N-2)
- Any neighborhood names in public copy? (N-3)
- Any outcome claim without an approved citation? (N-4)
- Any "community" tied to a specific demographic, religious, or neighborhood group? (N-5)
- Any superlatives, exclamation points, or promotional adjective stacks? (N-6)
- Any Phase 1 hard exclusion present (pricing, address, opening date, enrollment CTA, AI screenshots/features, "first" claims, phone numbers)?
- Any AI language drifting toward "AI classroom" or "AI tutor" instead of "homework support"?
- Any founder-centric framing (Nataly or Dimitri as quoted spokesperson rather than editorial byline)?
- Any reference to **Inspirea Holdings** or **Inspirea Labs** in public copy, metadata, or footer?

### 5. Engagement and waitlist conversion UX

The only conversion event in Phase 1 is **waitlist email signup**. Audit:

- **Form:** placement (above the fold and recurring throughout long pages), field count (target = email-only; flag every extra field), labeling, error states, mobile usability, accessibility (label association, focus states, ARIA)
- **Friction:** required vs. optional fields, confirmation language, post-submit experience, double opt-in handling
- **CTAs:** present on every meaningful page; language compliant with permitted CTAs only
- **Trust signals near the CTA:** advisor names, cited evidence callouts, SAM Global scale
- **Scannability:** mobile-first skim structure, pull quotes from advisors, evidence boxes
- **Time-to-value:** how quickly does a cold-arriving parent understand (a) what Singapore Math is, (b) why it matters, (c) why SAM, (d) how to stay informed
- **Navigation:** clarity, depth, mobile menu behavior, footer information architecture
- **Instrumentation gaps:** scroll depth, exit intent, time on page, form abandonment

### 6. Accessibility (WCAG 2.2 AA)

- Pass/fail summary
- Color contrast (body text, CTAs, form fields, focus states)
- Keyboard navigability and focus order
- Screen reader: landmark structure, heading order, form labels, alt text quality
- Modal and form focus management
- Reduced motion respect
- Form error announcement

### 7. Analytics and measurement

Audit what is currently instrumented against the **Phase 1 expected baseline** below. For each item, report INSTALLED / MISSING / MISCONFIGURED, with severity.

**Phase 1 expected analytics baseline (all free):**

| Tool | Purpose | Severity if missing |
|---|---|---|
| GA4, with waitlist signup configured as a conversion event | The only Phase 1 conversion. Without the event, the campaign cannot be measured. | CRITICAL |
| Google Search Console, verified, sitemap submitted | Source of truth for branded query share, non-branded rankings, indexability, real CWV from Chrome users | CRITICAL |
| Bing Webmaster Tools, sitemap submitted | Bing's index powers Copilot and ChatGPT search — more important for AEO than commonly recognized | MAJOR |
| Microsoft Clarity | Free heatmaps and session recordings — primary input to the engagement/waitlist UX section | MAJOR |
| GA4 custom channel grouping for AI referrers | `chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`, `gemini.google.com` — the only way to see AEO traffic in owned analytics | MAJOR |
| Manual monthly AEO citation log | Spreadsheet of ~50 target queries run across ChatGPT, Perplexity, Google AI Overviews, Claude, Copilot — record when SAM is named. Already required by `SEO-AEO-STRATEGY.md` quarterly KPIs. | MAJOR (process, not tool) |

**Explicitly out of scope for Phase 1** (do not recommend installing): paid rank trackers (Ahrefs, SEMrush, Moz), Hotjar / FullStory (Clarity covers it for free), Heap / Mixpanel (overkill at current volume), A/B testing platforms (insufficient traffic).

**KPI alignment with project quarterly KPIs:**

- Branded query share of voice (baseline + QoQ growth)
- Non-branded rankings in top 10 across 50 method/comparison terms
- AEO citation rate (monthly manual sample)
- Organic traffic to editorial pages, MoM
- Editorial pages indexed, by cluster
- Third-party mentions per quarter
- Waitlist subscriptions

For each KPI, report whether the data source needed to measure it is currently in place.

---

## Target query clusters

Coverage and ranking should be optimized against these clusters. For each cluster, report existing coverage, gaps, and proposed new editorial pages.

| Cluster | Example queries | Intent |
|---|---|---|
| Method | "what is Singapore Math," "CPA approach math," "mastery vs. pace math" | Informational |
| Comparison | "Singapore Math vs. Common Core," "Singapore Math vs. Kumon," "Singapore Math vs. Russian Math" | Comparative |
| Local | "Singapore Math Manhattan," "Singapore Math NYC," "math tutoring Manhattan" | Local commercial |
| Outcomes | "does Singapore Math work," "Singapore Math results U.S.," "is Singapore Math effective" | Evaluative |
| Method + AI | "AI math tutor homework," "Singapore Math online practice" | Product-adjacent |
| Parent concerns | "why is my child behind in math," "math anxiety help," "math curriculum NYC schools" | Problem-aware |

**Local pages:** Manhattan only — **no neighborhood pages** (N-3).

---

## Deliverable format

Produce a single structured report with these sections, in order. Use tables in every findings section; narrative prose only in the executive summary and roadmap framing.

| # | Section | Format |
|---|---|---|
| 1 | Executive summary | Top 10 findings ranked by impact, with severity tag (CRITICAL / MAJOR / MINOR) |
| 2 | Compliance violations | Table: URL · Exact text · Rule · Severity · Suggested rewrite |
| 3 | Technical SEO findings | Table: Issue · URL(s) · Severity · Evidence · Recommendation |
| 4 | On-page SEO findings | Table: URL · Title · Meta · H1 · Word count · Target cluster · Issues · Recommendations |
| 5 | AEO findings | Table: URL · Direct-answer? · Q&A structure? · Citations? · FAQ schema? · Date stamps? · Byline? · Recommendations |
| 6 | Query cluster gap analysis | By cluster: existing coverage · gaps · proposed new pages (with H1 + target queries + internal links) |
| 7 | Engagement / waitlist UX findings | Table: Element · Location · Issue · Severity · Recommendation |
| 8 | Accessibility findings | Table: Issue · WCAG criterion · Severity · Recommendation |
| 9 | Analytics and measurement findings | What's instrumented · what's missing · what to add |
| 10 | Prioritized roadmap | Week 1 (compliance + critical technical) · Weeks 2–4 (on-page + AEO retrofits) · Months 2–3 (new editorial for cluster gaps) · Ongoing (measurement, third-party authority, refresh cycle) |

For each recommendation in the roadmap, include: **scope (page or site-wide) · expected impact (H/M/L) · effort (S/M/L) · dependencies**.

---

## Severity definitions

| Tag | Definition |
|---|---|
| CRITICAL | Phase 1 hard exclusion violation, Nadelstern rule violation, uncited outcome claim, broken indexability, accessibility failure blocking core flow, founder-as-spokesperson, Inspirea exposure |
| MAJOR | Significant SEO/AEO gap, missing schema on editorial page, weak waitlist UX, missing direct-answer opening, missing citation on borderline claim |
| MINOR | Stylistic improvement, small technical optimization, secondary KPI instrumentation |

---

## Decision rules when uncertain

1. **If a recommendation would require violating any operating constraint, do not make it.** Flag the underlying tension and request guidance.
2. **If existing content sits in a gray zone** (mild promotional drift, borderline neighborhood reference, soft uncited claim), flag it as a MAJOR violation under the conservative interpretation.
3. **If you cannot verify a fact** (OCCA percentages, SAM Global numbers, study DOIs), flag for human verification rather than restating it.
4. **If a proposed new page requires a claim not supported by the approved evidence library**, do not draft the claim. Propose the page with a "sourcing required" note or omit the claim.
5. **If uncertain whether content belongs in Phase 1**, default to Phase 2 (exclude it) and note for later.
6. **Do not invent advisor names, study titles, DOIs, percentages, or scale numbers.** If a needed citation is not in the approved library, say so explicitly.

---

## What you do NOT need to do

- Do not produce finished marketing copy. Suggested rewrites are short and illustrative.
- Do not opine on pricing, enrollment timing, or operational readiness.
- Do not propose paid media strategy.
- Do not draft social media content (separate workstream).
- Do not draft email nurture sequences (Phase 2 scope).
- Do not propose anything that depends on AI platform feature disclosure.

---

## Reference documents available to you (project files)

If you have access to the SAM Marketing project files, treat these as authoritative and supersede anything in this prompt that conflicts:

- `START-HERE.md` — scope, principles, narrative arc, content pillars
- `BRAND-VOICE.md` — voice attributes, preferred and avoided vocabulary
- `EDITORIAL-RULES.md` — full Nadelstern rules with use/don't-use tables
- `PHASE-1-RULES.md` — pre-launch hard exclusions and permitted content
- `SEO-AEO-STRATEGY.md` — query clusters, on-page conventions, KPIs
- `EVIDENCE-LIBRARY.md` — approved citable sources and claim → source map

If anything in this prompt conflicts with those files, **the project files win**. Flag the conflict.

