# Blockchain implementation review — 2026-10-06

Point-in-time review of the Solana integration: the Anchor program
(`anchor/programs/julit/src/lib.rs`), the generated Codama client usage, the
lot lifecycle UI handlers, and the API indexing/verification routes. Triggered
after fixing two live bugs (uninitialized devnet deployment, malformed Metaplex
PDA derivation).

**Overall verdict:** the on-chain program is sound. The findings below are
concentrated in the API verification layer and cluster handling, plus two
documented design limitations.

## On-chain program — correct

- **Consistent PDAs**: `[b"config"]`, `[b"lot", producer, lot_id]`,
  `[b"mint", lot]`; bumps stored and re-derived identically in every
  instruction.
- **Escrow design**: the Digital Title is minted directly into the Lot PDA's
  ATA and only ever leaves it via `burn` — no transfer-in-transit window.
  Mint `decimals=0` + MasterEdition `max_supply(0)` make it a real NFT.
- **Closed state machine**: `Listed → Funded → {Disputed, Redeemed, Claimed}`,
  `Listed → Cancelled`. Only the designated buyer funds/disputes/confirms;
  only the producer claims/cancels.
- **Correct constraints**: `usdc_mint == config.usdc_mint`, escrow ATAs
  verified by canonical `associated_token::*` derivation, `mint == lot.mint`
  on every burn path, fee computed with checked u128 arithmetic.
- The signer account indices in `app/api/lots/*/route.ts` match the generated
  client account order (`fund`/`redeem`/`claim` → index 2, `dispute`/`cancel`
  → index 1).

## Findings, by severity

### 1. `is_onchain` contracts are never verified against the ledger — medium

`POST /api/companies/contracts` (`app/api/companies/contracts/route.ts`):
when `is_onchain: true`, the route only checks the signature's base58 format
(`CONTRACT_SIGNATURE_PATTERN`). It never calls `getTransaction`, so it cannot
know whether the transaction exists, succeeded, was signed by
`initiator_wallet`, or contains a Memo instruction with the canonical
agreement message. The `is_onchain=false` branch does full Ed25519
verification via `verifyContractSignature` — the on-chain path has none.

Worse, when the caller's company has no wallet yet, the route stores
`initiator_wallet` (from the request body) as `wallet_address` with
`wallet_verified_at` set — bypassing the `wallet_link_challenges` ownership
proof entirely. It does not let an attacker move funds (on-chain actions
still require that wallet's signature), but it pollutes verified state and
records "on-chain notarized" agreements that were never verified.

**Fix**: in the `is_onchain` branch, fetch the transaction on devnet,
require `meta.err == null`, require the initiator wallet among the signers,
and require a Memo program instruction whose data equals the canonical
message rebuilt from the stored timestamp. Only then bind the wallet or
store the signature.

### 2. Cluster inconsistency in the registration form — medium

`register-lot-form.tsx` hardcodes `createSolanaClient("devnet")` for
`fetchConfig` while `send()` targets the cluster selected in the UI. The
origin modal guards with `cluster !== "devnet"` before every lifecycle
action; the registration form does not. With the selector on localnet, the
config fetch succeeds on devnet but the transaction is submitted to the
wrong cluster. Fix by using `cluster` consistently in both places, or by
adding the same devnet guard.

### 3. `POST /api/lots` decodes without checking the discriminator — low

`app/api/lots/route.ts` finds the first instruction targeting the Julit
program and decodes it as `create_lot` unconditionally. A short payload
makes the decoder throw, producing an unhandled 500 instead of a clean
rejection. The transition routes already use `identifyJulitInstruction` to
check the discriminator first — do the same here.

### 4. Rent is never reclaimed — low (design improvement)

`cancel_lot`, `redeem_lot` and `claim_timeout` burn the Digital Title but
close nothing: the lot PDA, both escrow ATAs, the mint, the Metaplex
metadata and the edition stay rent-exempt forever (~0.01–0.02 SOL locked
per lot). Add `close = producer` on the lot and `token::close_account` on
the token accounts and mint once the lifecycle ends.

### 5. `Disputed` is a permanent freeze — documented limitation

`raise_dispute` (`Funded → Disputed`) has no exit except the buyer signing
`redeem_lot`. If the buyer disappears or loses its keys, the escrowed funds
are locked forever — v1 ships no refund or arbiter path. The code documents
this deliberately; make sure end users understand it too.

## Stack notes (not bugs)

- The app pins `@solana/kit ^6.3` / `@solana/kit-client-rpc ^0.7`. That
  client exposes no `transactionConfig.version`, so transactions go out as
  v0/legacy — consistent with `maxSupportedTransactionVersion: 0` in the
  indexing routes. If the stack later moves to transaction v1 (SIMD-0385),
  bump `maxSupportedTransactionVersion` to `1` in `app/api/lots/route.ts`
  and `app/api/lots/transition.ts` or indexing will stop seeing the
  transactions.
- `solana:localnet` is not a Wallet Standard chain id — wallets only know
  `devnet`/`testnet`/`mainnet-beta`. Lifecycle actions already force devnet,
  so this only matters if localnet support becomes real.
- `useSendTransaction` uses `TransactionModifyingSigner` and returns the
  full wallet-signed transaction — correct: it survives wallets that mutate
  the message before signing.

## Fixes already applied during this session

- Deployed the program to devnet (`BntbtLZdHcHTai65uyXpKZyHaqX9kV68ZcfyyLBtXtky`)
  and initialized the Config PDA
  (`DQtJtMFzjAS9SCSjNd5LNhuU4SNT8huvgEG75gqMv446`) via
  `scripts/seed-devnet.mjs`; state saved in `.devnet-seed.json`.
- Fixed `findMetadataPda` / `findMasterEditionPda` in
  `app/lib/solana/metaplex.ts`: both derivations were missing the Metaplex
  program id as second seed (`["metadata", mpl_id, mint(, "edition")]`),
  which caused on-chain error `0x57` from the Token Metadata program.

## Follow-ups still open

- Fund demo wallets with SOL + dUSDC:
  `node scripts/seed-devnet.mjs --wallet <producer> --wallet <buyer>`
  (safe to re-run; mint and Config are reused from `.devnet-seed.json`).
- Implement finding 1 (on-chain memo verification) and finding 2 (cluster
  consistency) before widening the demo.
