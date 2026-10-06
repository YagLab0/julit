# 04: Redeem lot end-to-end — escrowed DvP release

**What to build:** the buyer confirms physical receipt: `redeem_lot` burns the Digital Title inside escrow, releases the escrowed USDC to the producer minus the take rate, pays the treasury its fee, and marks the lot `redeemed`. Callable from `funded` and `disputed` — the buyer's release is the on-chain shape of an off-chain resolution in the producer's favor. `POST /api/lots/redeem` verifies the tx by RPC. The buyer gets a "Confirmar recepción" action signing the real transaction. The happy path listed→funded→redeemed works end to end with real token movement.

**Blocked by:** 03 — Fund lot end-to-end

**Status:** ready-for-agent

- [x] `redeem_lot` burns NFT in escrow + releases USDC to producer minus fee + fee to treasury, atomically
- [x] Callable from `funded` and `disputed`; rejected from any other state; buyer-signed only
- [x] Exact fee math verified (producer = amount − fee, treasury = fee)
- [x] `POST /api/lots/redeem` writes `redeemed` + signature only after RPC verification
- [x] "Confirmar recepción" signs `redeem_lot` for the buyer
- [x] LiteSVM tests cover success, fee split, wrong signer, wrong state, double redeem
