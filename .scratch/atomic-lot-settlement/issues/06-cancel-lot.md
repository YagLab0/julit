# 06: Cancel lot

**What to build:** a producer can cancel a reserved lot whose buyer never funded: `cancel_lot` — producer-signed, `listed` only — burns the escrowed Digital Title and marks the lot `cancelled`. Once `funded`, cancellation is impossible; committed funds only exit via redeem, claim, or freeze. `POST /api/lots/cancel` verifies by RPC; the producer UI gets a cancel action on listed lots.

**Blocked by:** 02 — Create lot end-to-end

**Status:** ready-for-agent

- [x] `cancel_lot` burns escrowed NFT + marks `cancelled`, producer-signed, `listed` only
- [x] Rejected on `funded` and every later state
- [x] `POST /api/lots/cancel` verifies by RPC before writing
- [x] Producer cancel action on listed lots
- [x] LiteSVM tests cover success + wrong signer + post-funding rejection
