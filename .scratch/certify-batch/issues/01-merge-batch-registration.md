# 01: Merge `batch-registration-feature` into `audit-features` + consolidate respond endpoints

**What to build:** the merged base all certify work needs — program source,
generated Codama client, `POST /api/batches` index pattern, contracts API —
with the duplicate contract-respond endpoints collapsed to the merged
`PATCH /api/companies/contracts/[id]` (`{action: "accept"|"decline"}`); the
auditor inbox rewires to it and the `POST .../respond` route is deleted.
Branch builds green.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `origin/batch-registration-feature` merges into `audit-features` with conflicts resolved
- [ ] One respond endpoint remains: the merged `PATCH /api/companies/contracts/[id]`; inbox calls it; `POST .../respond` is gone
- [ ] `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm format:check` green
