# 06: Roll out migration and seed to the linked project

**What to build:** The Origins catalogue migration and the producer seed reach the linked Supabase project through a reviewed push, so the catalogue and the two demo producer accounts exist in the environment the app targets: dry-run review first, then the push that includes the seed; post-checks confirm both Origins, both accounts and password login.

**Blocked by:** 01 — Origins catalogue in the database; 02 — Provisioned producer accounts seed.

**Status:** ready-for-agent

- [ ] `supabase db push --dry-run` reviewed: exactly the origins migration is pending and nothing else.
- [ ] The push runs only after the user confirms the dry-run diff; it applies the migration and the seed (include-seed), and the flag's re-run semantics are verified by code.
- [ ] Post-checks via REST and SQL: both Origins with values under the new identifier; both auth accounts can log in; two producer companies without wallet.
- [ ] Commands and results are recorded in the database contract runbook.
