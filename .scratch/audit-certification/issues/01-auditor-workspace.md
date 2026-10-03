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

**Status:** ready-for-agent

- [ ] `/audit` server page replicates the `/batches/new` gate chain for auditors
- [ ] Client gate: connected wallet must match the verified company wallet (same pattern as new-batch-client)
- [ ] Demo data module exports demo batches (with producer names — `companies` is never browser-readable, ADR-0003) and demo contract offers, with a comment naming issues 06/03 as its replacement
- [ ] Pending section lists `created` batches with batch id, producer, origin, volume, purity, water/carbon footprints, price
- [ ] Certified section shows recorded findings (ESG approval + EU assessment), including negative findings
- [ ] Empty state when no batches are assigned; visible "Datos simulados" demo notice (amber style like the map)
- [ ] Auditor card on `/account` links to `/audit` instead of "Próximamente"
- [ ] All UI text Spanish; semantic tokens only (`eyebrow`, `btn-primary`, `btn-secondary`, `bg-card`, `border-border`)
