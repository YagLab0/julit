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

Second full reset on 2026-10-03 by explicit user request, after the seed grew to four accounts and the audit flow landed. Pre-wipe data dump at `/tmp/julit-prod-backup-202610031106/data.sql` (`supabase db dump --linked --data-only --schema auth,public,storage`): 5 auth users, 5 companies, 1 batch, 0 contracts, 2 origins, 4 wallet-link challenges; the `audit-certificates` bucket held 0 objects and was deleted through the Storage API before the replay. `supabase db reset --linked --yes` applied `00513` → `020000` and the seed. Post-checks: 4 auth users, 4 companies (Sales de Jujuy → `OLZ`, Minera Exar → `EXAR`, Auditor Demo, Comprador Demo), empty batches and contracts, bucket restored (public, 50 MiB, `application/pdf`); anonymous `origins` read returns both salars, `batches` returns `[]`, `companies` is denied to `anon`; all four demo logins return sessions.

Third full reset on 2026-10-03, applying the fictional demo identities (Salar de Peña Blanca / `pena_blanca` / `PBL` / Sales del Altiplano S.A. and Salar del Cóndor / `condor` / `CNR` / Minera Cóndor S.A., chosen in a reviewed option set). The migration `20261003020000_origins_catalogue.sql` and the seed were edited in place — no compatibility migration — so the linked project only receives the rename through a reset. Pre-wipe dump at `/tmp/julit-prod-backup-202610031116/data.sql`: 4 auth users, 4 companies, 0 batches, 0 contracts, 1 wallet-link challenge; bucket held 0 objects and was deleted through the Storage API. Local `pnpm db:reset`, `supabase test db` (80 tests) and `pnpm test` (32 tests) passed before the production run. Post-checks: 4 auth users, 4 companies bound to `pena_blanca`/`condor`, both catalogue rows with the fictional producer, shareholders, note and `example.com` source, empty batches, bucket restored; anonymous `origins` read returns `pena_blanca`/`PBL` and `condor`/`CNR`; all four demo logins return sessions; the map and origin fiche at `localhost:3000` render the fictional names with no trace of the real ones.
