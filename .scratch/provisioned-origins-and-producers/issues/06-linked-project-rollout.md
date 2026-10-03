# 06: Roll out migration and seed to the linked project

**What to build:** The Origins catalogue migration and the demo seed reach the linked Supabase project through a reviewed path, so the catalogue and the four demo accounts exist in the environment the app targets; post-checks confirm both Origins, the four accounts and their password logins.

**Blocked by:** 01 — Origins catalogue in the database; 02 — Provisioned producer accounts seed.

**Status:** done

- [x] Dry-run reviewed first (`supabase db push --dry-run --linked`): only `20261003020000_origins_catalogue.sql` was pending.
- [x] On explicit user request the rollout was a full production reset instead of a push: `supabase db reset --linked --yes` (wipes public objects, truncates auth data, reapplies all four migrations and applies the seed automatically).
- [x] Post-checks via REST and auth endpoints: both Origins with catalogue values; exactly the four demo auth users; all four password logins return sessions; producers bound to their origins without wallet; batches and contracts empty.
- [x] Commands, the storage-bucket caveat and results recorded here and in the database contract runbook.

## Comments

Rolled out on 2026-10-03 by explicit user request (full production wipe + seed). Pre-wipe backup of the destroyed data — 5 test companies (two with verified wallets), 8 auth users (personal/test emails), empty batches/contracts — at `/tmp/julit-prod-backup-20261003/`.

First reset attempt failed at the `audit-certificates` bucket insert because a linked reset does not clear the `storage` schema; deleting the empty bucket through the Storage API allowed the replay. The successful reset applied `00513` → `020000` and ran the seed. Verified afterwards: 4 auth users (the seeded four), 4 companies (Sales de Jujuy → `olaroz`, Minera Exar → `cauchari_olaroz`, Auditor Demo, Comprador Demo), both origins with catalogue values, empty batches and contracts, bucket present and empty.
