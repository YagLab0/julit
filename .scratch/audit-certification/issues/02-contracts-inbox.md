# 02: Contracts inbox on `/audit`

**What to build:** the contracts section of the auditor workspace. Pending
offers from producer companies render with Aceptar / Rechazar actions that
mutate the local demo state and toast (the contracts API is issue 03 of
batch-registration — this is demo only). A history lists every contract
relationship with its status: pending, accepted, revoked (ADR-0006).

**Blocked by:** 01 (the workspace page and demo store must exist)

**Status:** ready-for-agent

- [ ] Pending offers list shows producer name + wallet with Aceptar / Rechazar buttons
- [ ] Accepting marks the offer `accepted` in local state + toast; declining marks it `revoked` + toast
- [ ] History section lists all relationships with their status, not just pending
- [ ] Empty state when there are no offers
- [ ] Actions stay on the demo boundary — no API calls, no persistence beyond the session
