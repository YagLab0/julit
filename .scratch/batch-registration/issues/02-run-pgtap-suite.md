# 02: Execute pgTAP suite for origin/contracts migration

**What to build:** the pgTAP test file
`supabase/tests/database/company_contracts.test.sql` was written but never
executed — it must run against a Postgres with the migration applied
(local Supabase via Docker, or pgTAP on the linked project) and pass.

**Blocked by:** None (can start immediately)

**Status:** deferred — not frontend scope

- [ ] pgTAP harness available (local `supabase start` with Docker, or equivalent)
- [ ] `company_contracts.test.sql` runs green: origin check constraint, contract uniqueness, counterparty-type check, trigger rejection of uncontracted auditor/buyer and mismatched origin
- [ ] Documented command in AGENTS.md or README for re-running DB tests
