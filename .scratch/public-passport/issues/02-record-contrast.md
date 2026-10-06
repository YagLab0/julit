# 02: On-chain record contrast

**What to build:** the passport reads the Batch's Devnet account and contrasts
it with the indexed record (ADR-0011). A pure verification module exposes the
contrast verdict — verified / account missing / mismatch naming the differing
fields — comparing PDA derivation, programme address, batch id, producer,
origin, volume, purity, water, carbon and status, with exact decimal parsing
(index decimal strings and on-chain scaled integers both become scaled
`BigInt`; never `Number`). Price, reservation and buyer stay out of the
contrast along with the display (ADR-0013). A small client island loads the
contrast after first paint using the generated Codama client
(`findBatchPda` for the derivation check, `fetchMaybeBatch` for the account)
and renders the states: checking, verified in Solana, mismatch with the field
list, account absent, and RPC unavailable with retry — a failure never
renders as verified, and the initial HTML never waits on the RPC.

**Blocked by:** 01 (the page the island mounts on)

**Status:** superseded

- [ ] The pure module's unit tests pin: all-match → verified; single-field mismatches (batch id, producer, origin, volume, purity, water, carbon, status, derived PDA, programme address); absent account → missing; unknown on-chain status value → mismatch
- [ ] Decimal exactness pinned: `"99.5"` ≡ `"99.50"` vs 9950 basis points, `"1.000000"` vs 1 000 000, values at the `u64` boundary, no precision loss and no `Number` math
- [ ] The island reads the Devnet account after first paint; the page HTML arrives before the RPC read
- [ ] States render explicitly: checking, "Registro verificado en Solana", mismatch naming the differing fields, account absent, unavailable with a retry action — never a silent pass
- [ ] The two production batches read as verified; mismatch, absent and unavailable states exercised with disposable local fixtures or a blocked RPC
- [ ] `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm format:check` pass
