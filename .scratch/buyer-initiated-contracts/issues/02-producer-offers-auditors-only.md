# 02: Producer offers auditors only

**What to build:** on the producer's account page the contract offer
controls lose the auditor/buyer type picker. The remaining flow is a
single company select listing auditor companies from the directory plus
the offer button, and the card's copy describes offering to auditors
only — no buyer-offering promise. Buyer counterparties remain reachable
through the inbox (ticket 03) and accepted contracts.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The type picker is removed from the producer offer row
- [ ] The company select loads only `type=auditor` from the directory; the loaded-directory bookkeeping no longer tracks a selectable type
- [ ] Card copy describes offering contracts to auditors (no mention of offering to buyers)
- [ ] The offer action, pending/accepted/revoked history list, and auditor/buyer pending-incoming rendering keep working unchanged
- [ ] `pnpm lint`, `pnpm build` green
