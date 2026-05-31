<!--
  Atlas lane PR. Every unit of work is a lane/* branch → PR into ATLAS-ASSESSMENT.
  The agent stops at "PR opened, CI green, Codex reviewed." MERGING IS DIMITRI'S ACTION,
  done attended after reviewing the preview. Fill in every section below.
-->

## VISIBLE CHANGE
<!--
  Plain English: what does a PERSON SEE differ in the product? Name the screen and the
  words/elements that change. If nothing is visible, write exactly:
  "No visible change — internal/technical." and say what kind (e.g. analytics event, CI).
-->


## PREVIEW — how to see it
<!--
  - Vercel preview URL: <appears as the Vercel check on this PR>
  - Exact path to open: e.g. /report/<seeded-child-or-report>
  - What to do to see the change: which seeded child / report, and the steps.
  - Report bugs MUST be checked on a PROPERLY COMPLETED assessment (a real finished
    report), NOT a speed-run or print view. Bug 4 only renders correctly on a real
    completed report. If invisible, write "No preview path — internal/technical."
-->


## Verify bar
<!-- CI runs the verify-bar job on this PR. Restate the local result too. -->
- [ ] `pnpm test`
- [ ] `pnpm typecheck` (`tsc --noEmit`)
- [ ] `pnpm lint`
- Local result:

## Codex review
<!-- Manual harness for now (relay not wired). Verdict, or "skipped — <why>". -->


## Dimitri decides
<!-- Anything that needs a human call before/at merge. "None" if nothing. -->
