# 03: `POST /api/batches/[pda]/certificate` — certificate upload

**What to build:** the certificate upload behind the authenticated API
(ADR-0003): session → company must be an auditor with a verified wallet →
the index batch must exist, be `created`, and have `auditor_wallet` equal
to the company wallet → the server recomputes the SHA-256 of the uploaded
bytes and stores the file at `<pda>/<digest>.pdf` in the
`audit-certificates` bucket without upsert. All reject paths return clear
errors.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Unauthenticated → 401; non-auditor or unverified wallet → rejected
- [ ] Batch missing, not `created`, or not designated to this auditor → rejected
- [ ] Non-PDF or >50 MiB → 400
- [ ] Digest recomputed server-side; stored at `<pda>/<lowercase digest>.pdf`, no upsert
- [ ] Existing object for that digest → 409
