# 05: Registration form consumes real contracted counterparties

**What to build:** `app/batches/new/counterparties.ts` demo data is replaced by
the authenticated counterparty directory. The "Auditores contratados" and
"Mis clientes" dropdowns show only companies with `accepted` contracts, fetched
through the API; the producer profile (origin) also comes from the session.

**Blocked by:** 03-contracts-api (needs the directory endpoint)

**Status:** deferred — blocked by backend work

- [ ] `/batches/new` fetches accepted counterparties from the API, not demo constants
- [ ] Empty state when the producer has no accepted auditor contract, with guidance to contract one
- [ ] Validation context uses the fetched lists (defense-in-depth membership check unchanged)
- [ ] `counterparties.ts` deleted — no stale demo module left behind
