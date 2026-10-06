# 05: Timeout claim and dispute

**What to build:** a producer can collect on an unresponsive buyer, and a buyer can freeze that clock. `claim_timeout` on a `funded` lot past `claimable_after` releases the escrowed USDC to the producer minus the take rate, burns the Digital Title, and marks `claimed`. `raise_dispute` — buyer-signed, `funded` only — marks `disputed` and blocks `claim_timeout`. Both get RPC-verified index endpoints (`/claim`, `/dispute`) and UI actions: a claim button appearing to the producer after the deadline, a dispute action for the buyer on funded lots.

**Blocked by:** 04 — Redeem lot end-to-end

**Status:** ready-for-agent

- [x] `claim_timeout` releases funds + burns title + applies fee, producer-signed, only `funded` + past `claimable_after`
- [x] `claim_timeout` rejected before deadline and on `disputed` lots
- [x] `raise_dispute` marks `disputed`, buyer-signed, `funded` only
- [x] `redeem_lot` still works from `disputed` (escrow release = resolution in producer's favor)
- [x] No refund or arbiter path exists on-chain
- [x] `POST /api/lots/claim` and `/dispute` verify by RPC before writing
- [x] Producer claim action + buyer dispute action in UI
- [x] LiteSVM tests cover deadline boundary, disputed block, wrong signers
