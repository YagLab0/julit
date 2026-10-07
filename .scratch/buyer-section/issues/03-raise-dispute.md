# 03: "Disputar" (raise_dispute) end-to-end

**What to build:** on `funded` lots in the designated-lot inbox, the buyer gets "Disputar". The confirmation explains that the dispute freezes the producer's Timeout Claim and that the only on-chain exit is the buyer's own Redemption — there is no refund path. Signing `raise_dispute` (generated client; `lot` + buyer signer only) then POST `/api/lots/dispute`, refresh, Explorer toast — reusing the sign→index→refresh flow and the action-availability seam from 01. After refresh the lot shows `disputed` with "Confirmar recepción" still available (from 02, or whatever the seam already provides).

**Blocked by:** 01 — Designated-lot inbox + "Comprar con escrow" end-to-end

**Status:** ready-for-agent

- [x] "Disputar" offered on `funded` only — not on `listed`, `disputed`, or terminal states
- [x] Confirmation explains Timeout Claim freeze + redemption-only exit, no refund path
- [x] `raise_dispute` signed via generated client → POST `/api/lots/dispute` → refresh + Explorer toast; index-failure branch handled
- [x] Lot shows `disputed` after refresh with Timeout Claim no longer live
- [x] Action-availability module extended; vitest covers dispute on `funded` and rejection elsewhere
