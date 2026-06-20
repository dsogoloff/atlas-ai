# BUSINESS RULES — Requires Dimitri

Hard constraints. Claude Code must NOT decide or change any of these autonomously. Where
a build task touches one, STOP and gate on Dimitri (park the lane in NEXT\_ACTIONS.md;
keep other lanes moving).

## Decision authority

* **Autonomous (Claude Code):** technical implementation only.
* **Requires Dimitri:** business model, legal/compliance posture, product strategy,
privacy and data-sharing behavior, pricing, S.A.M brand / licensed-content use,
external communications.

## Monetization \& funnel

* **No consumer paywall.** Families never pay Atlas directly. Do not build Stripe
checkout, family subscriptions, paywalls, or consumer pricing pages.
* B2B2C: centers are the commercial customer; franchisor is the approval gate, not
necessarily the buyer. Franchisor approval ≠ network-wide revenue.
* Pricing models are **Dimitri-owned / unconfirmed** (per-assessment, platform fee,
success fee, qualified-introduction fee, hybrid all open). Do not bake a pricing model
into the product without Dimitri.

## Licensed assets

* S.A.M questions, marks, worksheets, brand claims, and center data are **licensed
assets**, tied to current license/pilot status — not permanent or broad. Do not
display, digitize, tag, or generate-from S.A.M. content beyond approved scope.
* Non-parent surfaces (instructor, etc.) must NOT expose raw question content
(stems/options/answers) — response-derived signals only.

### NOT licensed / NOT S.A.M.-controlled — Atlas-internal (do not re-conflate)
* Sam Chia's ONLY role is content **licensing**: he supplied the S.A.M. placement
worksheets and approved their use. The only curriculum signal from Sam is each
worksheet's last-page table ("Concepts and Skills" + "Topic").
* Atlas's **taxonomy, `content_id` codes, level design, and banding are an INTERNAL
Atlas scheme**, created by Code during conversion. Sam does NOT own, define, or
approve them. There is no external "locked S.A.M. taxonomy."
* A NULL `content_id` is an **internal tagging job WE finish** (create the code under
the right existing strand from the worksheet's Topic) — never a "SAM-gated" item.
* The ONLY genuine S.A.M. dependencies are content-licensing (granted) and
franchisor/pilot approval (granted). Nothing about internal curriculum structure.

## Privacy / data-sharing (COPPA)

* Consent is **per-child** (Model B). A child assessment must not start, and responses
must not be accepted, without an unrevoked consent record for that specific `child\_id`.
The gate is server-side and fails closed.
* Do not share child-level diagnostic data with centers before explicit parent opt-in or
enrollment. Default sharing after opt-in is limited (parent contact + child grade /
estimated level / location); diagnostic snapshot, misconception profile, and item-level
history each require separate explicit opt-in.
* Any NEW data-sharing behavior, child-data export, or change to consent semantics
requires Dimitri — and, before real families, counsel review (Gate G3).

## Claims \& language (pre-calibration, pre-M1.5)

* "S.A.M" brand is exactly as written, two dots after "S" and "A" and no dot after "M". 
* The report is an **"Assessment Report," not a "Diagnostic Report"** (strategy §2.4).
Avoid "validated," "clinically validated," "guaranteed/accurate placement," "complete
diagnosis," "certified diagnostic," "official S.A.M diagnostic" until M1.5 is met and
(for S.A.M branding) approved.
* Acceptable: "diagnostic-style," "designed to identify likely skill gaps,"
"placement-support," "early-pilot." No single headline precision number (e.g. a
proficiency %) pre-calibration.
* Parent tone: clear, calm, non-shaming; no fixed-ability labels; no unsupported
precision. Narration must NOT assert specific strand strengths/weaknesses when
strand-level data is absent.

## Scope guards

* **School sales are out of scope.** No district procurement, public-school rosters,
FERPA-heavy integrations, classroom district reporting.
* Generated / machine-authored items require content + pedagogy QA before live use.
* Staged rollout: high-risk features behind default-off feature flags; do not globally
enable before the relevant milestone gate.

## External communications

* No outreach to the S.A.M franchisor, franchisees, investors, or government on Atlas's
behalf without Dimitri. CTA copy and any parent-facing marketing language is Dimitri's
call. (Current report CTA wording is **unconfirmed / pending Dimitri** — see
NEXT\_ACTIONS.md.)

## Relay / unattended operation

* The Code→Codex / Code→subagent relay is local-only. It must never carry secrets, child
data, or licensed S.A.M question text off-box.
* Unattended runs make technical progress only. A business/integrity gate parks the lane;
it is never auto-resolved to keep a run going.

## Canonical strategy

`atlas\_assessment\_strategy.md` is the source of truth for business/product rules.
Read-only for agents. Flag any deviation or any task implying it needs amending.

