# JuLit

JuLit is a B2B industrial directory plus a delivery-vs-payment (DvP) settlement protocol for lithium carbonate lots, settling atomically on Solana.

## Language

**Lot**:
An identified quantity of lithium carbonate produced by a producer at a specific origin, listed for a designated buyer with a declared price and delivery window.
_Avoid_: Batch, product, order, shipment

**Producer**:
The mining entity responsible for producing and declaring a lot.
_Avoid_: Seller, user

**Origin**:
The salar or deposit from which a lot's lithium originates.
_Avoid_: Delivery destination

**Buyer**:
The entity purchasing a lot from its producer; every lot is created with a designated buyer.
_Avoid_: Inspector, customer, any registered buyer

**Digital Title**:
The Metaplex NFT minted into the lot's escrow at creation, representing the contractual right over the lot. It never leaves escrow: it is burned when settlement completes or the producer claims by timeout.
_Avoid_: Legal title, transferable receipt, warehouse receipt

**Escrow**:
The token account owned by the Lot PDA that custodies the buyer's USDC deposit between funding and release. No party — including JuLit — holds keys to it; the program alone moves the funds.
_Avoid_: Wallet, treasury, custodial account

**Funding**:
The buyer's act of depositing the lot's full price into escrow via `fund_lot`. It locks the payment but does not release it.
_Avoid_: Settlement, payment received

**Redemption**:
The buyer's signature confirming physical receipt of the lot, executed via `redeem_lot`: it burns the Digital Title and releases the escrowed USDC to the producer minus the Take Rate. Redemption is the settlement trigger — the payment leg of DvP.
_Avoid_: Delivery confirmation only, burn without payment

**Take Rate**:
The protocol fee in basis points deducted from the escrow release on Redemption or Timeout Claim; it is never charged on funding or cancellation.
_Avoid_: Commission on deposit, listing fee

**Claimable After**:
The per-lot timestamp declared at creation after which the producer may claim the escrowed funds if the buyer has neither redeemed nor disputed.
_Avoid_: Expiry, global timeout

**Timeout Claim**:
The producer's unilateral claim of the escrowed USDC via `claim_timeout` once Claimable After has passed; it burns the Digital Title, applies the Take Rate, and marks the lot `claimed`.
_Avoid_: Refund, expiry cancel

**Dispute**:
A flag raised by the buyer via `raise_dispute` on a funded lot, freezing the Timeout Claim. Resolution happens off-chain under the commercial contract; on-chain, the buyer's only path is Redemption (releasing funds to the producer). There is no on-chain refund path in v1.
_Avoid_: Arbitration, chargeback, refund

**Cancellation**:
The producer's unilateral cancellation of a lot in `listed` state via `cancel_lot`, recovering or burning the escrowed Digital Title. Available only before Funding.
_Avoid_: Expiry, dispute

**Lot Status**:
The lifecycle state of a lot: `listed` → `funded` → `redeemed`, with branches `disputed` (from funded), `claimed` (timeout), and `cancelled` (pre-funding).
_Avoid_: Settled, paid, completed

**Plant Certification**:
A PDF certificate plus its SHA-256 digest declared by the producer at plant level; public verification proves the document matches the recorded digest, not the truth of its contents.
_Avoid_: Per-lot audit, lab accreditation proof

**Passport**:
The public record of a lot's lifecycle: mint, funding, redemption or claim, and plant certificate verification.
_Avoid_: QR code, official EU certification

**Company**:
A registered business entity participating in lot production or purchasing.
_Avoid_: Wallet, employee

**Company Account**:
The single Supabase Auth account that owns a company and grants it application access; it does not authorize blockchain operations by itself.
_Avoid_: Membership, employee login

**Verified Wallet**:
The single wallet whose ownership a company has proven by signing a wallet link challenge; it is fixed once verified.
_Avoid_: Connected wallet, login wallet

**Wallet Link Challenge**:
A single-use, domain-bound nonce issued to an authenticated company so its wallet can prove ownership; it expires five minutes after issuance.
_Avoid_: Session, login token

**Lot Price**:
The total price for purchasing an entire lot, expressed in USDC and stored on the Lot PDA so `fund_lot` validates the exact deposit.
_Avoid_: Price per tonne, payment received

**Battery Grade**:
Lithium carbonate with chemical purity of at least 99.50%; only battery-grade lots are admitted to JuLit.
_Avoid_: Self-declared grade

**Chemical Purity**:
The lithium carbonate purity of a lot, expressed as a percentage with two decimal places.
_Avoid_: Grade

**Water Footprint**:
The declared volume of water consumed per metric tonne of lithium carbonate produced, expressed in cubic metres per tonne with two decimal places.
_Avoid_: Total water consumption

**Carbon Footprint**:
The declared greenhouse gas emissions intensity of a lot's production, expressed in kilograms of CO₂-equivalent per metric tonne with two decimal places.
_Avoid_: Total batch emissions

**Company Contract**:
A mutual-consent relationship between a buyer and a producer company, initiated by the buyer and accepted by the producer, scoping which buyers a producer may designate on its lots.
_Avoid_: Partnership, membership, supply agreement

**Client**:
A buyer company holding an accepted company contract with the producer.
_Avoid_: Customer, any registered buyer

**Buyer Portfolio**:
The view of all redeemed lots acquired by a specific buyer company, used for tracking lithium inventory and regulatory reporting.
_Avoid_: Shopping cart, wallet balance, transaction ledger

**Commercial Contract Request**:
An offer or request initiated by a buyer or producer to establish a mutual-consent company contract, enabling the designation and funding of reserved lots.
_Avoid_: Informal inquiry, purchase order

**Cryptographic Contract Signature**:
An Ed25519 message signature produced by a company's verified wallet proving consent to a commercial contract's terms without on-chain transaction overhead.
_Avoid_: On-chain escrow, paper signature
