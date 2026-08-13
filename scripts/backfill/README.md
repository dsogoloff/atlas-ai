# Backfill: re-clamp railed placements

**Status: written for review. It has NOT been run — not against production, not
against a local database.** Running it is a founder-gated step.

## The problem, in plain English

The assessment estimates a child's S.A.M level from the questions they answer.
If a child is only ever shown the very easiest questions and gets them all
right, the estimator has no evidence of where the child's ceiling actually is —
so it guesses the top of the scale.

That is what happened to at least one real session: a Pre-K child was shown ten
Level 0A questions, answered all ten correctly, and was recorded as **Level 8B**
— the highest level in the whole system. A child cannot be placed above the
hardest question they were actually shown.

PR #206 fixed this going forward: every session that finishes now has its level
capped at the hardest level actually served. But sessions that finished *before*
that fix still have the wrong level saved. That saved value is what the parent
report and the admin roster display.

## What this script does

For each completed assessment, it:

1. Looks up the level currently saved for that session.
2. Looks up every question the child actually answered, and finds the hardest one.
3. If the saved level is higher than that hardest question, it lowers the saved
   level to match.

For the Pre-K example: **8B → 0A**.

Nothing else changes. Strand-by-strand levels and the confidence number are
carried through untouched, and no other table, column, or row is written. It
uses the exact same capping function the live app now uses, so the corrected
value is identical to what a session finishing today would produce.

## What it will NOT do

- It will not run by accident. With no flags it only reads and prints a report.
  Writing requires **two** deliberate flags together (`--apply --confirm`).
- It will not touch production unless production is named explicitly
  (`--target=prod`), and it reads production credentials only from the
  gitignored `.env.prod.local`. It refuses to run if the target and the
  credentials disagree.
- It will not change any session it cannot fully verify. Before counting a
  session it checks that the session is complete, that the saved level parses,
  that the child actually answered questions, that every answered question is
  found and has a level, and that the proposed new level is stable (capping the
  new value a second time produces the same answer). Anything that fails a check
  is listed as **SKIPPED** and left alone.
- It will not raise anyone's level. The cap can only lower a level or leave it
  as-is.
- It is safe to run twice. Sessions that are already correct are no-ops.

## How to review it

```
pnpm backfill:reclamp:dry                      # local database, read-only
pnpm backfill:reclamp:dry -- --target=prod     # production, READ-ONLY
pnpm backfill:reclamp:dry -- --session=<uuid>  # one session only
```

The dry run prints, for every session it would change: the session and child,
the level saved now, the level it would become, and exactly which questions were
served (e.g. `0A x10`). It ends with a count of *would change / already correct /
skipped*. Read that table, confirm the numbers look right, and only then decide.

## To actually apply it (after that review)

```
pnpm backfill:reclamp -- --target=prod --apply --confirm
```

## One thing to know afterwards

Report narration text (the written summary a parent reads) that was generated
*before* the correction may still mention the old level in its prose. The script
prints a reminder about this. If any affected report has already been shown to a
parent, its narration should be regenerated.
