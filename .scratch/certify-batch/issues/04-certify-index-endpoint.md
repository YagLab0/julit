# 04: `POST /api/batches/[pda]/certify` — index write + verification seam

**What to build:** the index update after a confirmed `certify_batch`
transaction, mirroring `POST /api/batches`: session auditor with verified
wallet → tx exists, confirmed, no error → contains a JuLit instruction
decodable as `certify_batch` → its batch account equals the path PDA and
its auditor equals the company wallet → reads the on-chain `Audit` account
for digest + findings → one update to `audited` with `audit_sha256`,
`esg_approved`, `eu_regulation_assessment`, `audit_tx_signature`,
`observed_slot`. The accept/reject decision lives in a pure verification
module (input → payload | reason) with vitest coverage — the spec's single
seam.

**Blocked by:** 02 (needs the generated decoder, PDA finder, and `Audit` decoder)

**Status:** ready-for-agent

- [ ] Missing/failed/unconfirmed tx → rejected; no JuLit ix or wrong discriminator → rejected
- [ ] Batch account ≠ path PDA or auditor ≠ verified wallet → rejected
- [ ] Digest and findings read from the on-chain `Audit` account, never the request body
- [ ] Already-`audited` index row → 409; happy path writes all fields in one update
- [ ] Vitest cases: every reject path + happy path payload `{ auditSha256, esgApproved, euAssessment, auditTxSignature, observedSlot }`
- [ ] `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm format:check` green
