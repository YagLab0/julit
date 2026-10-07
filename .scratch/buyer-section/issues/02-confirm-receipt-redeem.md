# 02: "Confirmar recepción" (redeem_lot) end-to-end

**What to build:** on `funded` and `disputed` lots in the designated-lot inbox, the buyer gets "Confirmar recepción". The confirmation explains that signing releases the escrowed payment to the producer minus the Take Rate and burns the Digital Title — on `disputed` lots, that it is the on-chain resolution in the producer's favor. Signing `redeem_lot` (generated client; `lot`, `mint` derived, `producer`, `treasury` + `usdcMint` from Config; remaining ATAs auto-resolve) then POST `/api/lots/redeem`, refresh, Explorer toast — reusing the sign→index→refresh flow and the action-availability seam from 01.

**Blocked by:** 01 — Designated-lot inbox + "Comprar con escrow" end-to-end

**Status:** ready-for-agent

- [x] "Confirmar recepción" offered on `funded` and `disputed`, nowhere else
- [x] Confirmation states escrow release minus Take Rate + Digital Title burn; disputed lots note it resolves in the producer's favor
- [x] `redeem_lot` signed via generated client → POST `/api/lots/redeem` → refresh + Explorer toast; index-failure branch handled
- [x] Lot moves from pending card to history after refresh
- [x] Action-availability module extended; vitest covers redeem on `funded`/`disputed` and rejection on other states
