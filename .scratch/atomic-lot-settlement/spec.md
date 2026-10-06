# Spec: Atomic lot settlement — pivot to B2B directory + RWA DvP protocol

**Status:** draft — pending to-tickets

## Problem Statement

JuLit's current model certifies each batch through a designated per-batch
auditor and "completes" purchases with a fabricated signature posted to the
index (`origin-modal.tsx` generates a random base58 string; no transaction is
sent). Industry feedback established that real lithium operations certify at
plant level, not per lot, and that the missing value is settlement: an atomic
delivery-vs-payment exchange of USDC for a transferable digital title.

## Solution

Pivot the protocol to: producer lists a lot already reserved to a contracted
buyer → `create_lot` mints an SPL NFT (supply 1, Metaplex metadata) into a
program-owned escrow → `settle_lot` executes the atomic DvP (buyer USDC to
producer minus take rate to treasury; escrow NFT to buyer) → `redeem_lot`
burns the NFT when the buyer confirms physical delivery. The Lot PDA carries
the lifecycle; the NFT carries the transferable title.

The auditor role is removed entirely. Plant-level certification replaces
per-batch audit: the producer uploads a plant certificate (PDF) whose SHA-256
is recorded on the lot, and the existing public hash-verification mechanism
moves from batch scope to plant scope.

## Locked decisions

- NFT: real Metaplex Token Standard `NonFungible` (mint + metadata + master
  edition created by the program via CPI). Not a bare SPL mint.
- USDC: project-owned `dUSDC` demo mint on Devnet (6 decimals), minted to
  demo wallets by the seed script. Not Circle's devnet USDC.
- Auditor role: deleted from program, schema, contracts, API, and UI.
- Lots are always reserved: `buyer` is required at `create_lot`; no spot
  purchases exist.

## On-chain design

### Accounts / PDAs

- `Config` PDA `["config"]`: `admin`, `fee_bps` (u16), `usdc_mint`,
  `treasury` (dUSDC token account receiving the take rate), `bump`.
- `Lot` PDA `["lot", producer, lot_id]`: `lot_id`, `origin_id`, `producer`,
  `buyer`, `volume_tonnes`, `purity_basis_points`, `water_m3_per_tonne_scaled`,
  `carbon_kg_co2e_per_tonne_scaled`, `price_usdc_scaled`,
  `plant_cert_hash: [u8; 32]`, `mint`, `status`, `created_slot`,
  `settled_slot`, `redeemed_slot`, `bump`.
- `mint` PDA `["mint", lot]`: SPL mint, decimals 0, mint authority = Lot PDA.
- `escrow`: associated token account of `mint` owned by the Lot PDA.
- Metaplex `metadata` and `master_edition` PDAs on `mpl-token-metadata`.

### Lifecycle

`Listed` (NFT in escrow) → `Settled` (DvP executed) → `Redeemed` (NFT burned
by buyer on delivery). Physical transit and delivery stay off-chain.

### Instructions

1. `initialize(fee_bps, usdc_mint, treasury)` — one-time config.
2. `create_lot(lot_id, origin_id, volume, purity_bp, water, carbon,
   price_usdc, buyer, plant_cert_hash, name, symbol, uri)` — init Lot PDA,
   init mint PDA, CPI `CreateV1` (metadata + master edition, update authority
   = Lot PDA, `seller_fee_basis_points = 0`), init escrow ATA, `mint_to`
   escrow 1 unit. Requires `buyer != producer`, purity still battery grade,
   price > 0. If the combined instruction exceeds tx size, split minting into
   a second `mint_lot` instruction invoked in the same transaction.
3. `settle_lot` — signer = `lot.buyer`; requires `status == Listed`.
   `transfer_checked` splits `price_usdc` from the buyer's dUSDC ATA:
   `price - fee` to the producer's dUSDC ATA, `fee` to `config.treasury`
   (`fee = price * fee_bps / 10_000`); then transfers the NFT from escrow to
   the buyer's ATA (`init_if_needed`, payer = buyer) signed by the Lot PDA.
   Sets `status = Settled`.
4. `redeem_lot` — signer = `lot.buyer`; requires `status == Settled` and the
   buyer's ATA holding the NFT. `burn` 1 unit with the buyer's signature,
   close the empty escrow ATA to the producer, set `status = Redeemed`.

Stretch (post-hackathon): `cancel_lot` (producer recovers NFT before settle),
secondary-transfer handling, treasury withdrawal instruction.

### Program dependencies

- `anchor-spl` (token + associated-token CPI).
- `mpl-token-metadata` with `cpi` feature — pin a version compatible with
  `anchor-lang 0.32.1` (solana-program ~2.x). Fallback if the dependency
  fight is too costly: create metadata in a second client transaction with
  the producer as update authority, and record the mint on the Lot PDA.
- Regenerate Codama client (`pnpm setup`).

## Database

Rewrite migrations in place — the project is pre-release and the linked
Devnet database holds only disposable demo data; a clean schema beats a
compat migration.

- `company_type` enum: `('producer', 'buyer')`.
- `companies`: producers carry `plant_cert_sha256` + certificate storage path
  (content-addressed PDF in a `plant-certificates` bucket, same restrictive
  write policies as today).
- `batches` → `lots`: `pda_address` PK, `lot_id`, `producer_wallet`,
  `buyer_wallet` (required FK to a buyer company), `origin_id`, metrics,
  `price_usdc`, `status ('listed','settled','redeemed')`, `mint_address`,
  `plant_cert_sha256`, `creation/settle/redeem_tx_signature`, `observed_slot`.
  Lifecycle check constraints mirror the current audit/completion checks.
- `company_contracts`: buyer→producer direction only; drop the
  producer→auditor direction and the auditor counterparty rules.
- Storage: rename/replace `audit-certificates` bucket with
  `plant-certificates`.

## API

Delete: `/api/batches/[pda]/certify`, `/api/batches/[pda]/certificate`,
`/api/batches/complete` (+ tests).

Add (all verify the real transaction via RPC before writing the index —
`getTransaction` on the posted signature must be confirmed, target the julit
program, contain the lot PDA, and carry the session company's verified wallet
as signer):

- `POST /api/lots` — index after `create_lot`.
- `POST /api/lots/[pda]/settle` — verify `settle_lot` tx, mark `settled`.
- `POST /api/lots/[pda]/redeem` — verify `redeem_lot` tx, mark `redeemed`.
- `POST /api/companies/plant-certificate` — authenticated producer uploads
  the plant certificate PDF; server recomputes SHA-256 and stores
  content-addressed (reuses today's upload pattern).

Contracts API: remove auditor counterparties.

## Frontend

- Delete `/audit/*` entirely (dashboard, certify flow, contracts inbox,
  assigned batches).
- `/batches/new` → lot listing form: no auditor field; buyer required and
  restricted to contracted buyers; plant cert hash read from the producer's
  profile; sends a real `create_lot` transaction.
- Origin modal: the purchase action is visible only to the lot's designated
  buyer company and sends a real `settle_lot` transaction (derives dUSDC
  ATAs, `init_if_needed` handles the buyer NFT ATA). No more fabricated
  signatures.
- Buyer portfolio/account: "Confirmar recepción" sends `redeem_lot`.
- Passport (`/lot/[pda]`): lifecycle timeline (listed → settled → redeemed),
  mint address, settlement and burn transaction links, plant-certificate hash
  verification section.
- New client dependency: `@solana-program/token` for ATA derivation and
  token account handling in the browser.
- Update landing + `public/pitch.html` copy: Discover → Tokenize → Settle →
  Deliver → Redeem; claim "eliminates settlement risk", never "counterparty
  risk"; the NFT is the digital representation of a contractual right, not
  legal title by itself.

## Docs

- `GLOSSARY.md`: remove Auditor / Audit Certificate / Designated Auditor /
  ESG Certification / EU assessment terms; add Lot, Digital Title (NFT),
  Escrow, Atomic Settlement (DvP), Take Rate, Redemption, Plant
  Certification.
- Supersede ADR-0002 (simulated settlement). New ADRs: atomic DvP design;
  Metaplex title + PDA lifecycle separation; plant-level certification;
  reserved-only lots; demo USDC mint.
- Rewrite `docs/features/*.feature` and mark the superseded `.scratch` specs.
- Update `README.md`, `docs/landing.md`, `docs/database.md`.

## Out of scope

Secondary-market transfer UX, real Circle USDC, Token-2022 permanent
delegates, logistics-delegate burns, on-chain IN_TRANSIT state, ERP
integration, subscriptions/mint-fee charging (take rate only).

## Risks

- `mpl-token-metadata` version pinning against anchor 0.32 — resolve during
  program scaffolding before building features on top.
- `create_lot` transaction size (mint + metadata + edition + ATA + mint_to);
  v0 transaction or the documented instruction split covers it.
- Every demo wallet needs a funded dUSDC ATA before settle — seed script must
  create the mint and airdrop to the buyer company wallet.
- The remote linked Supabase project holds the old schema; pushing the
  rewrite is a manual reviewed step and drops existing demo data.
