# 01: Designated-lot inbox + "Comprar con escrow" end-to-end

**What to build:** the buyer's `/account` gains a "Lotes designados" card listing every lot whose `buyer_wallet` is the company's verified wallet and whose status is `listed`, `funded`, or `disputed` — each with producer identity (company name resolved by wallet, ellipsified fallback), origin, volume, purity, price, and `claimable_after` (flagged when the Timeout Claim window is already live on `funded` lots). On `listed` lots a "Comprar con escrow" action runs the full path: verified-wallet gate → dUSDC balance check (disabled + hint when short) → confirmation summary (lot, producer, price, `claimable_after`) → sign `fund_lot` via the generated client (`usdcMint` from the Config PDA; ATAs auto-resolve) → POST `/api/lots/fund` with `{lot_pda, tx_signature}` → `router.refresh()` + toast with Explorer link, including the on-chain-ok/index-failed branch. The portfolio card becomes terminal history only (`redeemed`, `claimed`); `cancelled` lots are never shown. This ticket establishes the shared pieces the other two reuse: the widened server query split into pending vs history, the pure action-availability module, and the sign→index→refresh flow.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Pending card lists `listed`/`funded`/`disputed` designated lots with producer, origin, metrics, price, `claimable_after`; honest empty state
- [x] `claimable_after` flagged as live Timeout Claim when past on `funded` lots
- [x] Portfolio shows only `redeemed`/`claimed`; no `cancelled` anywhere; no duplicates across cards
- [x] "Comprar con escrow" on `listed`: gated to verified wallet = `buyer_wallet`, disabled with hint when dUSDC balance < price (missing ATA = 0), confirmation summary before signing
- [x] `fund_lot` signed via generated client → POST `/api/lots/fund` → refresh + Explorer toast; index-failure branch handled like lot creation
- [x] Action-availability pure module created; vitest covers status→action mapping, wallet mismatch, insufficient balance, no actions on terminal states
- [x] No "claim"/"reclamar" wording for buyer actions; all UI copy in Spanish
