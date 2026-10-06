# 05: Timeout claim and dispute

**What to build:** a producer can collect on an unresponsive buyer, and a buyer can freeze that clock. `claim_timeout` on a `funded` lot past `claimable_after` releases the escrowed USDC to the producer minus the take rate, burns the Digital Title, and marks `claimed`. `raise_dispute` — buyer-signed, `funded` only — marks `disputed` and blocks `claim_timeout`. Both get RPC-verified index endpoints (`/claim`, `/dispute`) and UI actions: a claim button appearing to the producer after the deadline, a dispute action for the buyer on funded lots.

**Blocked by:** 04 — Redeem lot end-to-end

**Status:** ready-for-agent

- [ ] `claim_timeout` releases funds + burns title + applies fee, producer-signed, only `funded` + past `claimable_after`
- [ ] `claim_timeout` rejected before deadline and on `disputed` lots
- [ ] `raise_dispute` marks `disputed`, buyer-signed, `funded` only
- [ ] `redeem_lot` still works from `disputed` (escrow release = resolution in producer's favor)
- [ ] No refund or arbiter path exists on-chain
- [ ] `POST /api/lots/claim` and `/dispute` verify by RPC before writing
- [ ] Producer claim action + buyer dispute action in UI
- [ ] LiteSVM tests cover deadline boundary, disputed block, wrong signers
