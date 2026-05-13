# SAM New York Website Mockup Review

**Mockup URL:** `https://7on5sbrxn5ndq.ok.kimi.link/`
**Reviewed Against:** Website_Plan.md
**Review Date:** April 4, 2026

---

## Overall Assessment

The mockup covers approximately 80% of the homepage plan's section structure. The section sequence, navigation architecture, and core content blocks are faithfully implemented. However, there are several significant gaps — some are launch-blocking, others are Phase 1 items that need attention before the site goes live.

---

## What's Working Well

- **Section sequence follows the plan:** Hero → Stats Counter → Value Proposition → Programs → Comparison Table → Testimonials → Team → Video → Local Context → Blog → Bottom CTA → Footer.
- **Navigation bar matches spec:** Home, Why S.A.M, Programs, Singapore Math, Testimonials, About, Blog, FAQ — with phone number as a clickable `tel:` link and the orange "Book Free Assessment" button on the right side.
- **Comparison table content is accurate:** 5 rows comparing S.A.M vs Others across Teaching Approach, Learning Method, Trainer Style, Learning Plan, and Class Size — matches the plan exactly.
- **Value proposition cards match spec:** Strong Foundation, Confident and Motivated, Independent and Self-Disciplined, Prepared for the Future — all four present with supporting descriptions.
- **Program grade bands are correct:** Pre-K & K (Ages 4–6), Grades 1–2 (Ages 6–8), Grades 3–6 (Ages 8–12), Grades 7–8 (Ages 12–14).
- **Footer has proper three-column structure** with About S.A.M links, Programs links, and Contact Us (address, phone, email, social media icons).
- **Bottom CTA bar is present:** "Give Your Child a Head Start — Book a free assessment today" with prominent button.
- **Blog section shows 3 articles** with correct categories (Singapore Math, Parenting Tips, Education) and proper card format (thumbnail, title, excerpt, date).

---

## Critical Issues (Must Fix Before Launch)

### 1. Statistics Counter Is Broken
The counter bar shows "15+" for Years but **"0+" for Countries, Centers, and Students**. The count-up animation failed on 3 of 4 statistics. Per the plan, these should animate to: 15+ Years, 20+ Countries, 200+ Centers, 30,000+ Students. A visitor seeing "0+ Countries" immediately undercuts the credibility of the global franchise story. This is a first-impression killer.

**Action:** Debug the JavaScript count-up animation. Likely an IntersectionObserver or scroll-trigger issue.

### 2. Zero Schema Markup Implemented
The plan specifically requires four types of structured data on launch day:
- **LocalBusiness** schema on every page
- **FAQPage** schema on the FAQ page
- **Course** schema on the Programs page
- **Event** schema on the Book Assessment page

The mockup has **none**. This is a major SEO gap, especially since the plan notes that zero SAM franchise sites currently implement FAQ schema — this is a competitive differentiation opportunity being left on the table.

**Action:** Implement all four schema types before launch. This is non-negotiable for SEO.

### 3. Logo at the top left corner is incorrect.  

**Action:** Replace the logo with the one from the attached file.

### 4. Google Reviews Integration Is Missing
The plan includes this as Section 8 — a live Google Reviews widget showing reviews from the Google Business Profile, with aggregate star rating and total review count. The mockup **skips this section entirely**.

Since there won't be local Google Reviews at launch, the plan's fallback should be implemented: a static testimonial block with a link to the Google Business Profile.

**Action:** Add the Google Reviews section between Testimonials and Meet Our Team. Implement the static fallback for launch.

### 5. No Google Map Embed
The Local Context section lists neighborhoods served and shows hours/address, but there is **no embedded Google Map** with the center location pinned. The plan specifically requires this.

**Action:** Add a Google Maps embed with the center location. This also supports local SEO.

---

## Important Content & Structural Gaps

### 6. Hero Carousel Slides — Verify Against Plan
The plan specifies 3 slides with specific headlines and CTAs:
- Slide 1: "New York's Premier Singapore Math Enrichment Program" → CTA: "Book a Free Assessment"
- Slide 2: "Give Your Child the #1 Math Advantage in the World" → CTA: "Learn Why Singapore Math"
- Slide 3: "Now Enrolling Ages 4–12 — [Location Name]" → CTA: "View Programs"

The mockup appears to have **5 carousel dots** (more slides than planned). The visible slide content is close but should be verified against the exact plan copy. The placeholder "[Location Name]" has been correctly changed to "Manhattan Location."

**Action:** Confirm exactly 3 slides with the specified headlines and CTAs. Remove extra slides if present.


### 7. Local Partners Section Is Missing
The plan specifically calls out: *"Our local partners (kids stores, other kids programs, doctors etc) with links (for local SEO)."* The mockup's Local Context section lists neighborhoods but has **zero partner links**. This is a meaningful local SEO gap — outbound links to relevant local businesses signal geographic relevance to Google.

**Action:** Add a "Our Local Partners" subsection within the Local Context area. Populate as partnerships are established. Can launch with placeholder structure.

### 8. Sticky Nav Behavior Unconfirmed
The plan requires the navigation to be sticky on scroll with a slight background blur effect. The nav bar is present and styled, but sticky + blur behavior could not be fully confirmed during review due to rendering issues below the fold.

**Action:** Verify sticky behavior on scroll. Confirm background blur effect is implemented. Test on mobile (hamburger menu with Book Assessment button always visible).

### 9. Potential Rendering / Contrast Issue
When scrolling past the hero section, **every section below rendered as nearly invisible** — extremely faint content on an `rgb(248, 250, 252)` background. While the DOM shows correct colors (dark blue headings at `rgb(26, 82, 118)`, dark gray body text at `rgb(51, 51, 51)`), the visual output was near-white across the entire page below the fold.

This could be a CSS rendering bug, a browser-specific issue, or interference from the Kimi Agent overlay (which has a fixed-position div at z-index 2147483646 covering the full viewport).

**Action:** Test in a clean browser (Chrome, Safari, Firefox) without the Kimi overlay. If end users see the same blank white below the fold, the site is non-functional. This is potentially the most urgent issue.

---

## Messaging Discipline Issues 

### 10. "Premier" Language in Hero
One slide reads: *"New York's Premier Singapore Math Enrichment Program."* You should avoid "premium market" language — "premier" falls into the same category. This framing positions SAM as exclusive rather than accessible.

**Action:** Change to "The World’s #1 Singapore Math Program – Now in New York" 

### 11. Neighborhood List Includes UES and Overpromises Coverage
The Local Context section lists 8 neighborhoods: Upper West Side, Upper East Side, Midtown, Chelsea, Greenwich Village, Tribeca, SoHo, Financial District. Two issues:
1. Remove specific neighborhood references like "UES."**
2. Listing 8 neighborhoods before opening a single center overpromises the service area and could create a credibility gap with parents who investigate.

**Action:** Narrow to neighborhoods around the actual UWS center location. Expand the list as enrollment and geographic reach grow.

---

## Items Present But Needing Refinement

### 12. Assessment Link Opens in Same Tab
The "Book Free Assessment" link goes to `/book-assessment` but opens in the **same tab**. The plan specifies it should link to a new tab with the assessment process (to be built separately).

**Action:** Add `target="_blank"` to the assessment link, or implement as a modal/overlay depending on final UX decision.

### 13. Blog Dates Are Static / Pre-Launch
The blog section shows articles dated March 5, 10, and 15, 2025 — over a year old relative to current date. If these are placeholder dates, they should be updated to reflect actual publish dates at launch.

**Action:** Update blog post dates to align with actual launch timeline.


## Summary Prioritization

| Priority | Issue | Effort |
|----------|-------|--------|
| **P0 — Blocking** | #9 Rendering/contrast issue (page may be invisible) | Debug |
| **P0 – Blocking** | #3 Logo replace | Content |
| **P0 — Blocking** | #1 Broken stats counter (shows 0+) | JS fix |
| **P1 — Pre-Launch** | #2 Schema markup (all four types) | Dev |
| **P1 — Pre-Launch** | #12 "Premier" language | Copy edit |
| **P1 — Pre-Launch** | #13 Neighborhood list | Copy edit |
| **P1 — Pre-Launch** | #5 Google Reviews section (add fallback) | Dev |
| **P1 — Pre-Launch** | #6 Google Map embed | Dev |
| **P2 — Soon After** | #8 Video section (real embed or hide) | Content/Dev |
| **P2 — Soon After** | #9 Local partners section | Content |
| **P2 — Soon After** | #7 Hero carousel slide count/copy | Copy review |
| **P2 — Soon After** | #14 Assessment link target behavior | Dev |
| **P2 — Soon After** | #15 Blog dates | Content |
| **P2 — Soon After** | #10 Sticky nav + blur verification | QA |

