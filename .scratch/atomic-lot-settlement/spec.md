# Spec: Atomic lot settlement — escrowed DvP on Solana (pivot)

**Status:** ready-for-agent

## Problem Statement

JuLit's settlement is simulated: batch completion writes a random base58
signature and never moves funds. The pivot turns JuLit into a B2B industrial
directory plus a real delivery-vs-payment protocol: each lot mints a Digital
Title (Metaplex NFT) into escrow, the designated buyer funds an escrowed USDC
payment, and the buyer's receipt confirmation releases the funds. Adversarial
review (`.scratch/business-model-validation/`, ADR-0012) established that
pay-first settlement exposes the buyer worse than a letter of credit and
leaves redemption without incentive — so the USDC is custodied in the Lot
PDA's escrow and `redeem_lot` is the payment trigger. The auditor role is
removed; certification moves to plant level. The current program
(`create_batch` + `certify_batch`), the `audited`-oriented schema, the audit
API, and the `/audit/*` frontend all implement the retired model.

## Solution

Rewrite the program around a six-instruction escrow lifecycle, rewrite the
index schema around lots, gate every index write on RPC-verified
transactions, and rewire the frontend to sign real transactions. No landing
changes.

Lifecycle: `listed → funded → redeemed`, with `disputed` and `claimed`
branches from `funded`, and `cancelled` before funding. The Digital Title is
minted into the Lot PDA's escrow at `create_lot` and never leaves it — it is
burned inside escrow by `redeem_lot` or `claim_timeout`, which makes
transfer-in-transit attacks impossible by construction.

## User Stories

### Program (Anchor)

1. As the protocol, I want an `initialize` instruction that creates a Config
   PDA (admin, `fee_bps`, `usdc_mint`, `treasury`, min/max claim window), so
   that operational parameters live on-chain.
2. As a producer, I want `create_lot` to create the Lot PDA, mint the Digital
   Title into the escrow, create the USDC escrow token account, and record
   the designated buyer, lot price, `claimable_after`, and plant certificate
   digest, so that a lot is born ready to be funded.
3. As the program, I want `create_lot` to reject a `claimable_after` outside
   the Config's min/max window, so that delivery windows stay sane.
4. As the program, I want `create_lot` to reject self-dealing (buyer =
   producer) and empty/oversized identifiers, preserving current input
   hygiene.
5. As a buyer, I want `fund_lot` to move exactly the stored lot price in USDC
   from my token account into the escrow in one transaction, so that the
   producer sees committed funds before shipping.
6. As the program, I want `fund_lot` to require the designated buyer's
   signature and a `listed` lot, so that nobody else can fund and funding
   cannot happen twice.
7. As a buyer, I want `redeem_lot` — from `funded` or `disputed` — to burn
   the Digital Title inside escrow, release the escrowed USDC to the
   producer minus the take rate, pay the treasury its fee, and mark the lot
   `redeemed`, so that my receipt confirmation is what actually settles the
   payment.
8. As a producer, I want `claim_timeout` on a `funded` lot past
   `claimable_after` to release the escrowed funds to me minus the take
   rate, burn the Digital Title, and mark the lot `claimed`, so that a buyer
   who never confirms cannot hold my payment hostage.
9. As the program, I want `claim_timeout` to fail before `claimable_after`
   and on `disputed` lots, so that the timeout cannot preempt an open
   dispute or an active delivery window.
10. As a buyer, I want `raise_dispute` on a `funded` lot to flag it
    `disputed` and freeze the timeout, so that a shipment problem pauses the
    producer's claim while we resolve off-chain.
11. As the program, I want no other way out of `disputed` besides the
    buyer's `redeem_lot`, so that v1 stays free of on-chain arbitration and
    refund paths.
12. As a producer, I want `cancel_lot` on a `listed` lot to burn the escrowed
    Digital Title and mark the lot `cancelled`, so that a reserved buyer who
    never funds cannot brick my lot.
13. As the program, I want `cancel_lot` impossible once funded, so that
    committed funds always have a defined exit (redeem, claim, or freeze).
14. As the program, I want every release to apply integer fee math on the
    stored price — producer receives `amount − fee`, treasury receives
    `fee` — so that settlement accounting is exact and reproducible.
15. As the program, I want the audit instructions, Audit PDA, auditor field,
    and `esg`/`eu_assessment` states deleted — not deprecated — so that the
    retired model leaves no dead surface.

### Supabase index

16. As the indexer, I want `batches` rewritten to `lots` — audit columns out;
    `mint_address`, `claimable_after`, per-transition tx signatures
    (`fund`, `redeem`, `claim`, `cancel`, `dispute`), and the new status
    enum in — so that the index mirrors the on-chain lifecycle.
17. As the platform, I want `company_type` reduced to `producer | buyer`, so
    that the auditor role disappears everywhere at once.
18. As the platform, I want `company_contracts` restricted to the
    buyer→producer direction, so that lot designation is only between
    commercial counterparties.
19. As the platform, I want the storage bucket renamed
    `audit-certificates` → `plant-certificates` under the same policies, so
    that plant-level certification replaces per-lot audit evidence.

### API (index verified by RPC)

20. As the API, I want `POST /api/lots`, `/fund`, `/redeem`, `/claim`,
    `/cancel`, and `/dispute` to each fetch the submitted transaction by RPC
    and validate program id, accounts, signer, and success before writing
    the index, so that the database can never record a settlement that did
    not happen on-chain.
21. As the API, I want `POST /api/companies/plant-certificate` to store the
    PDF content-addressed with a server-recomputed SHA-256, so that the
    digest in the index is real.
22. As the platform, I want `/certify`, `/certificate`, and `/complete`
    deleted, so that no endpoint writes states the program no longer has.

### Frontend

23. As a producer, I want the lot creation flow to sign `create_lot` with the
    designated buyer and `claimable_after` mandatory, so that every lot is
    born fundable by exactly one counterparty.
24. As a designated buyer, I want the purchase modal to sign `fund_lot`, so
    that buying means locking real payment — visible only to me.
25. As a buyer, I want a "Confirmar recepción" action that signs
    `redeem_lot`, so that confirming delivery releases my escrowed payment.
26. As a buyer, I want a dispute action on funded lots that signs
    `raise_dispute`, so that a shipment problem freezes the timeout.
27. As a producer, I want a claim action appearing once `claimable_after`
    passes on a `funded` lot, signing `claim_timeout`, so that I can collect
    on an unconfirmed delivery.
28. As a producer, I want a cancel action on `listed` lots signing
    `cancel_lot`, so that dead reservations do not accumulate.
29. As any visitor, I want the public passport to show the lot timeline —
    mint, funding, redemption or claim, disputes, plant certificate
    verification — so that the lifecycle is transparent end to end.
30. As the frontend, I want `/audit/*` deleted entirely and every signature
    a real transaction, so that no fake base58 signatures remain.

## Implementation Decisions

- **Program**: single small Anchor program (0.32.1). Instructions:
  `initialize`, `create_lot`, `fund_lot`, `redeem_lot`, `cancel_lot`,
  `claim_timeout`, `raise_dispute`. Lot PDA seeds follow the current
  `["lot", producer, lot_id]` pattern; escrow accounts derive from the Lot
  PDA.
- **Digital Title**: Metaplex Token Standard `NonFungible`, mint + metadata
  + master edition via CPI, update authority = Lot PDA, supply 1 minted to
  the escrow. Standard token program — the title never leaves escrow, so no
  Token-2022 extension is needed.
- **Escrow**: USDC token account owned by the Lot PDA; releases use PDA
  signer seeds. Fee split is computed and applied inside `redeem_lot` /
  `claim_timeout`.
- **Settlement currency**: own `dUSDC` mint on Devnet, 6 decimals, airdropped
  to demo wallets from the seed script; `usdc_mint` is a Config parameter so
  mainnet USDC is a configuration change, not an architecture change.
- **Timeout**: `claimable_after` is a per-lot unix timestamp set at
  `create_lot`, bounded by Config min/max. `raise_dispute` moves the lot to
  `disputed`, which `claim_timeout` rejects — the dispute freezes the clock
  rather than extending it.
- **Dispute exit**: none on-chain besides buyer `redeem_lot`. A `disputed`
  lot without resolution stays frozen — accepted risk, documented in
  ADR-0012. No refund path in v1.
- **Cancellation**: producer-signed, `listed` only.
- **Dependencies**: `anchor-spl` (token + ATA CPI) and `mpl-token-metadata`
  pinned against `anchor-lang` 0.32.1 — resolve the pin first, it is the
  riskiest item. Regenerate the Codama client after the IDL changes.
- **Transaction size**: `create_lot` (PDA + mint + metadata + edition +
  escrow ATA + mint_to) is the size risk; fallback is splitting metadata
  creation into a second instruction or a v1 transaction with LUT.
- **API verification pattern**: same shape as the existing certify/verify
  route — fetch confirmed tx, decode against the IDL, check program,
  accounts, signer, and success before the index write.
- **Schema**: rewrite in place (no compatibility layer): `batches` → `lots`,
  audit columns removed, new status enum
  `listed|funded|disputed|redeemed|claimed|cancelled`, new tx signature
  columns, `claimable_after`, `mint_address`. Pushing to the linked Supabase
  project discards current demo data — accepted.
- **Frontend**: `@solana-program/token` added for ATA derivation in the
  browser; purchase modal and passport reworked; `/audit/*` removed.
- **Vocabulary**: `GLOSSARY.md` and ADR-0012 are canonical — Lot, Digital
  Title, Escrow, Funding, Redemption, Take Rate, Claimable After, Timeout
  Claim, Dispute, Cancellation, Plant Certification. Do not reintroduce
  Batch/Auditor/settled language.

## Testing Decisions

- Good tests assert external behavior: state transitions, signer rules,
  token movements, and error paths — not account layouts or internal math.
- **Program** (new seam, highest value): Rust `cargo test` under `anchor/`
  with LiteSVM, covering the full lifecycle plus every invalid transition:
  wrong signer on each instruction, funding twice, redeem before funding,
  early `claim_timeout`, `claim_timeout` on disputed, `cancel_lot` after
  funding, `claimable_after` outside Config bounds, exact fee math. The pin
  against `mpl-token-metadata` must be proven green here first.
- **API** (existing seam): vitest next to routes, matching the existing
  `verify.test.ts`/`validation.test.ts` pattern — RPC verification rejects
  wrong program, wrong signer, failed tx; validation of payloads.
- **Supabase** (existing seam): `supabase/tests/database/*.test.sql` for the
  rewritten schema, enum, and bucket policies.
- **Features**: rewrite `docs/features/*.feature` for the new lifecycle;
  mark prior feature specs superseded.

## Out of Scope

- Landing page and marketing copy changes.
- On-chain dispute resolution, refunds, splits, or arbitration (v2).
- Mainnet: real USDC, multisig/upgrade-authority hardening, legal opinion,
  security audit, real producer–buyer pilot.
- Token-2022 non-transferable or transfer hooks (unnecessary: the Digital
  Title never leaves escrow).
- Buyer portfolio and passport features beyond the lifecycle timeline.

## Further Notes

- Business validation artifacts (bull/bear debate + signed consensus) live
  in `.scratch/business-model-validation/`; the escrow redesign rationale is
  ADR-0012.
- Extracted text of the pivot plan: `.scratch/pivot-changes-extracted.txt`.
- Known risks, in order: `mpl-token-metadata` pin vs anchor 0.32.1 (resolve
  first), `create_lot` transaction size (split/LUT fallback), seed script
  dependency for dUSDC + demo wallet ATAs, Supabase push discards demo data.
- Work order per the pivot plan: program + LiteSVM tests → DB + API →
  frontend → docs/copy. DB, API, and frontend are mechanical once the IDL
  is fixed.
