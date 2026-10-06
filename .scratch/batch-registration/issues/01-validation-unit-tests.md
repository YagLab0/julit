# 01: Unit tests for `validateBatchForm` with vitest

**What to build:** a vitest setup (new pinned devDep) plus a test suite covering every
field rule of the batch registration form. This pins the DB contract
(`docs/database.md`) at the seam where it can still be wrong: decimal-string
parsing into scaled integers.

**Blocked by:** None (can start immediately)

**Status:** superseded

- [ ] `vitest` added as devDependency (pinned) + `pnpm test` script
- [ ] Rejections from the spec pinned: purity 99.49 and 99.505 rejected; 99.50/100.00 accepted; 1.5 tonnes rejected; negative/zero values rejected; >6-decimal price rejected; >32-byte batch_id rejected
- [ ] Auditor must be in `contractedAuditors`; buyer in `contractedBuyers`; empty buyer = `null` (spot)
- [ ] Buyer equal to producer or auditor wallet rejected
- [ ] Happy path produces the exact `CreateBatchPayload` with scaled integer strings (BigInt math, no Number)
