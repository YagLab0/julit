# 06: Roll out migration and seed to the linked project

**What to build:** The Origins catalogue migration and the producer seed reach the linked Supabase project through a reviewed push, so the catalogue and the two demo producer accounts exist in the environment the app targets: dry-run review first, then the push that includes the seed; post-checks confirm both Origins, both accounts and password login.

**Blocked by:** 01 — Origins catalogue in the database; 02 — Provisioned producer accounts seed.

**Status:** ready-for-human

- [x] `supabase db push --dry-run --linked` reviewed: exactly `20261003020000_origins_catalogue.sql` is pending and nothing else; the remote already carries up to `20261003010000`, and its `batches` table is empty.
- [ ] The push runs only after the user confirms the dry-run diff; it applies the migration and the seed (include-seed).
- [ ] Post-checks via REST and SQL: both Origins with values; both auth accounts can log in; two producer companies bound to their origins without wallet.
- [ ] Commands and results are recorded in the database contract runbook.

## Comments

Dry-run executed on 2026-10-03: only `20261003020000_origins_catalogue.sql` would be pushed. The actual `db push --include-seed` is on hold pending the user's explicit confirmation, as the database contract requires. Note the remote has real producer companies referencing `cauchari_olaroz`; the enrichment migration does not rename identifiers, so no `companies.origin_id` rewiring is needed.
