# 01: Auditor workspace `/audit` — gates, demo notice, assigned batch list

**What to build:** the `/audit` route an auditor company lands on. All gates
from the spec (session → company exists → `company_type === 'auditor'` →
wallet verified → connected wallet matches, mirroring the `/batches/new`
pattern), a visible demo notice, and the assigned-batch list in two sections:
pending certification (`created`) and certified history with findings
displayed explicitly — including negative ones (ADR-0004). Backed by a demo
data module acting as a mutable in-memory store (resets on reload); the
auditor's next-step card on `/account` links to `/audit`.

**Blocked by:** None (can start immediately)

**Status:** done — upgraded: the batch list now reads real `batches` rows via
`loadAuditorBatches` (service join for producer name + origin — `companies`
is never browser-readable, ADR-0003); the demo module and notice are gone

- [x] `/audit` server page replicates the `/batches/new` gate chain for auditors
- [x] Client gate: connected wallet must match the verified company wallet (same pattern as new-batch-client)
- [x] Batches read server-side from `batches` filtered by `auditor_wallet`; producer names come from the `companies` join through the service role
- [x] Pending section lists `created` batches with batch id, producer, origin, volume, purity, water/carbon footprints, price
- [x] Certified section shows recorded findings (ESG approval + EU assessment), including negative findings; `completed` batches also list as certified
- [x] Empty state when no batches are assigned
- [x] Auditor card on `/account` links to `/audit` instead of "Próximamente"
- [x] All UI text Spanish; semantic tokens only (`eyebrow`, `btn-primary`, `btn-secondary`, `bg-card`, `border-border`)
