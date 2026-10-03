# 06: `create_batch` on-chain + index write

**What to build:** the full Devnet path. An Anchor `create_batch` instruction,
the client submitting the validated payload as a signed transaction, and an
indexing API that verifies program ownership/discriminator/PDA derivation/tx
confirmation before writing `batches` with status `created`. The index rejects
batches whose auditor or reserved buyer lacks an accepted contract, and batches
whose origin differs from the producer's bound origin (user stories 16–18).

**Blocked by:** 05-real-counterparties (form must carry real data first)

**Status:** deferred — on-chain + indexer scope

- [ ] Anchor program: `create_batch` PDA, args mirror `CreateBatchPayload` scaled integers
- [ ] Client: replace the toast with a real signed transaction on Devnet
- [ ] Index API: verify tx + account data, then insert into `batches` (service_role)
- [ ] Reject uncontracted auditor/buyer and mismatched origin at index level
