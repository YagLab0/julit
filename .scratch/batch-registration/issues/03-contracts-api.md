# 03: Contracts API — offer, accept/revoke, counterparty directory

**What to build:** authenticated API routes over `company_contracts`.
Producer offers a contract to an auditor or buyer company (`pending`);
the counterparty accepts (`accepted`) or declines (`revoked`). A directory
endpoint returns `{ wallet, name }[]` of accepted counterparties by type —
`companies` is never browser-readable (ADR-0003), all writes via service_role
with identity derived from the verified session.

**Blocked by:** None (schema already applied — `20261003010000`)

**Status:** partial — respond endpoint landed for the auditor inbox; offer
creation and the counterparty directory remain

- [ ] `POST /api/companies/contracts` — producer creates an offer; rejects duplicate (producer_id, counterparty_id) and non-auditor/buyer counterparties
- [x] Counterparty `POST /api/companies/contracts/:id/respond` — accept → `accepted` + `responded_at`, decline → `revoked`; only the counterparty's own session may respond
- [ ] `GET /api/companies/contracts/counterparties?type=auditor|buyer` — returns `{ wallet, name }[]` of accepted counterparties for the session's company
- [x] No anonymous access; companies table stays non-browser-readable
