# 01: Program — Config PDA and create_lot

**What to build:** a producer can register a lot on-chain: the instruction creates the Lot PDA (buyer, price, `claimable_after`, plant certificate digest, metrics), mints the Digital Title NFT into the lot's escrow, and creates the escrow USDC token account. `initialize` creates the Config PDA (admin, `fee_bps`, `usdc_mint`, `treasury`, min/max claim window). `create_batch`/`certify_batch`, the Audit PDA, and all auditor fields are deleted. New deps `anchor-spl` and `mpl-token-metadata` are pinned against anchor-lang 0.32.1 and the Codama client is regenerated.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `initialize` creates Config with admin, fee_bps, usdc_mint, treasury, claim window bounds
- [ ] `create_lot` creates Lot PDA + Metaplex NFT (supply 1) into escrow + escrow USDC ATA
- [ ] `create_lot` requires designated buyer, price, plant cert digest, and `claimable_after` inside Config bounds
- [ ] `create_lot` rejects buyer = producer and empty/oversized ids
- [ ] Auditor instructions/accounts/fields fully removed
- [ ] LiteSVM tests green for create + all rejections; mpl-token-metadata pin resolved
- [ ] Codama client regenerated from the new IDL
