# Merge-wave checklist — seed/migration integrity

Run this after ANY multi-PR merge wave that touches `supabase/migrations/` or
`supabase/seed.sql` (stacked activation/conversion PRs), BEFORE declaring QA-ready.

## Why this exists
The dev DB builds **entirely from `seed.sql`**: every tenant-scoped migration
**no-ops** during `supabase db reset` (migrations run before `seed.sql` creates the
tenant). So an activation whose `seed.sql` mirror was dropped in a merge silently
produces **absent content** — no error, only discovered in QA. The #97–#108 wave
dropped ~12 mirrors this way. These guards make that failure mode loud.

## Checklist
1. **Duplicate migration versions** — two files sharing a version timestamp abort
   reset with `schema_migrations_pkey`. Check:
   ```
   ls supabase/migrations/ | sed -E 's/^([0-9]+)_.*/\1/' | sort | uniq -d
   ```
   (empty = good). Distinct migrations that collided → rename the later to the next
   free sequential slot (keep both); true duplicates → remove the redundant copy.

2. **Seed ↔ migration activation parity** (the key guard — also runs in the verify bar):
   ```
   pnpm seed:check-activation-parity
   ```
   FAIL lists every activation a migration declares but `seed.sql` lacks
   ("…no matching seed mirror — DROPPED"), naming the source migration. Fix by
   regenerating (step 3) or restoring the block.

3. **Regenerate the machine-derived mirror region** (mechanical majority):
   ```
   pnpm seed:regen-activations
   ```
   Rewrites the `BEGIN/END GENERATED activation-mirrors` region of `seed.sql` from the
   migration bodies in `regen-seed-activations.ts` → `MIRROR_LIST`. **Adding a new
   hand-written activation migration?** Add its filename to `MIRROR_LIST` and re-run.
   (Applier-managed blocks — `l0-l2-activation`, the `*-overlay` loads,
   `l1-art-activation`, `stage4`, `l1-q01-q07-activation` — are owned by their own
   tools: `apply-activation.ts`, `apply-l0-overlay.ts`, etc. Not regenerated here.)

4. **Bucket image parity** (after the founder runs `supabase db reset` + the uploader):
   ```
   pnpm convert:upload-activation-images     # upload + post-upload hard gate
   pnpm convert:verify-images                # audit-only verdict (one command)
   pnpm convert:upload-activation-images --check   # offline map/disk pre-flight (no Supabase)
   ```
   `verify-images` lists any active image row with no file in the bucket (500 risk).

5. **Verify bar**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` GREEN
   (the parity guard runs inside `pnpm test`).

## "Keep both" on a seed.sql merge conflict
`seed.sql` activation blocks are bounded by `-- BEGIN <name>` / `-- END <name>` and the
`GENERATED activation-mirrors` region carries a manifest listing every block. On a
conflict in that region: **keep all blocks from both sides**, then run
`pnpm seed:regen-activations` and `pnpm seed:check-activation-parity` to reconcile.
