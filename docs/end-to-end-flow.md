# End-to-end flow: JuLit lot lifecycle

How a user moves through JuLit, from company onboarding to the public
passport. Actors: a **producer** (lithium producer, bound to a provisioned
origin), a **buyer** (company with an accepted contract), and a **public
visitor** (no account). Systems: the Next.js frontend, the API route
handlers, Supabase (Auth + DB + Storage), and the Julit Anchor program on
Solana Devnet (plus SPL Token/ATA and Metaplex Token Metadata).

Companion diagram: `end-to-end-flow.mmd` (render to PDF with the command in
its header).

## 0. Setup (once, operators only)

- `anchor deploy --provider.cluster devnet` publishes the program at
  `BntbtLZdHcHTai65uyXpKZyHaqX9kV68ZcfyyLBtXtky`.
- `node scripts/seed-devnet.mjs --wallet <w>...` creates the demo dUSDC
  mint, airdrops SOL, funds dUSDC ATAs, and calls `initialize` — creating
  the singleton Config PDA `[b"config"]` with admin, fee_bps, usdc_mint,
  treasury and the claim window (`claim_min_secs`/`claim_max_secs`).

## 1. Company onboarding (per company, once)

`app/account` → `company-onboarding-form.tsx`:

1. User signs in via Supabase Auth (`/sign-in`).
2. `POST /api/companies` inserts a `companies` row with `id = auth.uid`,
   `name`, `company_type` (`producer` | `buyer`), no wallet. Producers are
   bound to a provisioned origin (`origin_id`, ADR-0007).
3. Wallet linking, challenge-based (ADR-0005):
   - `POST /api/companies/wallet/challenge` `{ wallet_address }` — stores a
     nonce in `wallet_link_challenges` (5-minute TTL, bound to email +
     domain + wallet) and returns the canonical message to sign.
   - The user signs it with `signMessage` in their wallet.
   - `POST /api/companies/wallet` `{ nonce, wallet_address, signature }` —
     verifies the Ed25519 signature over the rebuilt message, then the
     `link_company_wallet` DB function atomically consumes the challenge
     and sets `wallet_address` + `wallet_verified_at`.
   - Enforced: one wallet per company, one company per wallet, challenges
     single-use and expiring.

## 2. Commercial contract (before any lot can exist)

Every lot is born with a designated buyer — there are no spot sales
(ADR-0017). A contract between one producer and one buyer is therefore a
prerequisite, enforced twice: the form only lists contracted buyers, and a
DB trigger rejects index rows without an accepted contract.

1. Either party initiates: `POST /api/companies/contracts`
   `{ counterparty_id, signature?, is_onchain?, timestamp? }` — creates a
   `pending` `company_contracts` row (`producer_id`/`counterparty_id`
   resolved from both companies' types, ADR-0019).
   - Optional proof: an Ed25519 signature over the canonical agreement
     message, or an SPL Memo transaction signature (`is_onchain: true`).
     _Known gap: the on-chain path validates format only — see
     `docs/blockchain-review-2026-10-06.md`, finding 1._
2. The responder (whichever party did not initiate) answers via
   `PATCH /api/companies/contracts/[id]` `{ action: "accept" | "decline" }`
   → `accepted` | `revoked`.

## 3. Lot registration (producer)

`app/account/lotes/new` — gated by `VerifiedWalletGate`: the connected wallet
must equal the company's verified wallet.

1. The producer uploads the plant certificate PDF →
   `POST /api/companies/plant-certificate`: the server recomputes the
   SHA-256, stores the file content-addressed at
   `<producer_wallet>/<sha256>.pdf` in the public certificates bucket
   (never upserts), and returns the digest the form declares on-chain.
2. `validateLotForm` parses every metric as a decimal string into scaled
   integers — no floats: `purity` ×100 (basis points, 99.50–100.00 only),
   `water`/`carbon` ×100, `price` ×10⁶ (dUSDC base units). It also checks
   `lot_id` ≤ 32 bytes, volume ≥ 1 t, buyer ∈ contracted buyers, and
   `claimable_after` in the future.
3. The frontend builds `create_lot` (generated client) and the producer
   signs. On-chain effects, all in one transaction:
   - Lot PDA `[b"lot", producer, lot_id]` initialized with metrics, price,
     buyer, `claimable_after`, `plant_cert_hash`, status `Listed`.
   - Mint PDA `[b"mint", lot]` initialized (decimals 0, authority = Lot
     PDA) and exactly 1 token minted into `escrow_title`, the Lot PDA's
     ATA — the Digital Title never leaves escrow.
   - `escrow_usdc`, the Lot PDA's ATA for the configured `usdc_mint`.
   - Metaplex metadata + master edition PDAs created by CPI (max supply 0,
     update authority = Lot PDA, immutable).
   - `claimable_after` must sit inside the Config's claim window.
4. `POST /api/lots` `{ tx_signature }` indexes it: fetches the confirmed
   transaction, decodes the `create_lot` args, re-derives the expected PDA
   from the caller's **verified wallet** + `lot_id`, fetches the lot
   account and requires program-owned + `producer == wallet` +
   `status == listed`. All index fields come from the decoded on-chain
   account, never from the request body.

## 4. Funding (buyer)

Origin modal → `handleBuy` (buyer = `lot.buyer`, connected wallet must
match):

1. `createAtaInstruction` (CreateIdempotent) for the buyer's dUSDC ATA +
   `fund_lot` in one transaction, signed by the buyer.
2. On-chain: exactly `price_usdc` moves buyer ATA → `escrow_usdc` (the Lot
   PDA's ATA). `Listed → Funded`. Only the designated buyer may sign, only
   a `Listed` lot accepts funds — double funding is impossible.
3. `POST /api/lots/fund` `{ lot_pda, tx_signature }` — verifies the
   instruction's discriminator, signer at index 2 == caller's verified
   wallet == on-chain buyer, then CAS-updates the index to `funded`.

## 5. Settlement — exactly one terminal path

All lifecycle calls follow the same pattern: sign the instruction, then
`POST /api/lots/{redeem,claim,dispute,cancel}` verifies on-chain facts
(instruction kind, signer position, party role, resulting status, current
index status) and CAS-updates the index row.

- **`redeem_lot`** (buyer, `Funded` or `Disputed`): burns the Digital
  Title inside escrow and releases the escrowed USDC — `price − fee` to
  the producer's ATA, `fee` to the treasury's ATA (both
  `init_if_needed`). `→ Redeemed`.
- **`raise_dispute`** (buyer, `Funded`): freezes the lot.
  `→ Disputed`. Blocks `claim_timeout`; the only exit is the buyer
  signing `redeem_lot` — a dispute with a vanished buyer locks funds
  indefinitely (documented v1 limitation).
- **`claim_timeout`** (producer, `Funded`, `now ≥ claimable_after`):
  same burn + release as redeem, with the clock signing instead of the
  buyer. `→ Claimed`.
- **`cancel_lot`** (producer, `Listed` only): burns the title before any
  funding existed. `→ Cancelled`.

## 6. Public catalogue and passport (visitor, no account)

- `/explorer` reads the public `lots` index (`GET /api/lots`) grouped by
  origin; the origin modal shows the 3D lot stack, metrics and lifecycle
  actions gated by the visitor's wallet.
- `/batch/[pda]` is the public passport — index row only, no session:
  - declared metrics and origin;
  - plant certificate: PDF from the public bucket +
    `CertificateVerification` recomputes the SHA-256 in the browser and
    contrasts it with the `plant_cert_hash` declared on-chain;
  - escrow terms: designated buyer, `claimable_after`, the mint address;
  - the lifecycle timeline — every recorded transition links to its
    confirmed Devnet transaction;
  - `RecordContrast` (ADR-0011): re-derives the PDA, fetches and decodes
    the on-chain account, and compares it field-by-field against the
    indexed row — the passport proves the index still matches the ledger
    rather than asking the reader to trust it.
- The QR on every lot card and passport encodes the passport URL —
  physical counterparties verify a lot without ever signing in.

## Trust boundary summary

| Layer          | Guarantees                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anchor program | Ownership (PDA seeds), party roles (signer constraints), state machine, exact-price escrow, bounded claim window, fee math                                            |
| API routes     | Auth session, verified-wallet match, transaction authenticity (confirmed, correct program + discriminator, signer position), on-chain account re-read before indexing |
| DB             | Origin binding, accepted-contract requirement, unique wallet, single-use challenges, CAS status transitions                                                           |
| Frontend       | Form validation mirroring on-chain rules, verified-wallet gate, cluster pinning to Devnet for lifecycle actions                                                       |
| Passport       | Client-side digest contrast + field-by-field index-vs-chain contrast — no trust in the index alone                                                                    |
