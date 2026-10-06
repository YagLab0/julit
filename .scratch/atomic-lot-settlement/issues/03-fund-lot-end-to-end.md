# 03: Fund lot end-to-end — escrow deposit

**What to build:** the designated buyer funds a lot from the purchase modal: `fund_lot` moves the exact stored lot price in dUSDC from the buyer's token account into the Lot PDA's escrow, marking the lot `funded`. Only the designated buyer can sign, only a `listed` lot can be funded. The seed script creates the `dUSDC` mint (6 decimals) and airdrops to demo wallets with their ATAs. `POST /api/lots/fund` verifies the transaction by RPC before moving the index. The purchase modal is visible only to the designated buyer and signs the real transaction.

**Blocked by:** 02 — Create lot end-to-end

**Status:** ready-for-agent

- [x] `fund_lot` transfers exactly `lot.price` buyer→escrow, requires designated buyer + `listed` status
- [x] Double funding impossible; non-designated buyer rejected
- [x] Seed script mints dUSDC and airdrops to demo wallet ATAs
- [x] `POST /api/lots/fund` writes `funded` + tx signature only after RPC verification
- [x] Purchase modal signs `fund_lot`, hidden from non-designated users
- [x] LiteSVM tests cover success + wrong-signer + wrong-state + wrong-amount paths
