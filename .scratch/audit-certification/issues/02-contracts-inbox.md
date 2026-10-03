# 02: Contracts inbox on `/audit`

**What to build:** the contracts section of the auditor workspace, backed by
real `company_contracts` rows: `loadAuditorContracts` reads them server-side
through the service role (producer names live in `companies`, never
browser-readable — ADR-0003), and Aceptar / Rechazar call
`POST /api/companies/contracts/[id]/respond`, which only the counterparty's
session may use. A history lists every contract relationship with its status:
pending, accepted, revoked (ADR-0006).

**Blocked by:** 01 (the workspace page and demo store must exist)

**Status:** done — real Supabase wiring (demo store replaced)

- [x] Pending offers list shows producer name + wallet with Aceptar / Rechazar buttons
- [x] Accepting marks the offer `accepted` via the respond API + toast; declining marks it `revoked` + toast
- [x] History section lists all relationships with their status, not just pending
- [x] Empty state when there are no offers
- [x] Reads join producer `companies` through the service role; writes go through `POST .../respond` (service_role, counterparty-only)
