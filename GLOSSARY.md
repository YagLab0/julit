# JuLit

JuLit is a B2B directory and delivery-vs-payment (DvP) settlement protocol for lithium carbonate lots on Solana.

## Language

**Lot**:
An identified quantity of lithium carbonate offered by a producer at a specific origin, tokenized as a digital title and settled atomically. Replaces "batch".
_Avoid_: Batch, product, order, shipment

**Producer**:
The mining entity responsible for producing and declaring a lot.
_Avoid_: Seller, user

**Origin**:
The salar or deposit from which a lot's lithium originates.
_Avoid_: Delivery destination

**Buyer**:
The entity acquiring a lot from its producer.
_Avoid_: Customer, inspector

**Designated Buyer**:
The buyer company a lot is created for; the only one entitled to fund and settle it. Every lot has one.
_Avoid_: Spot buyer, winning bidder

**Production Specification**:
The chemical purity, water footprint and carbon footprint of a producer's operation at its bound origin; recorded on the producer's company record and declared on every lot it registers.
_Avoid_: Per-lot spec input, buyer-contracted spec

**Digital Title**:
The Metaplex NFT (supply 1) minted into the lot's escrow at creation, representing the contractual right over the lot. It is a digital representation of that right, not automatic legal title — and it never leaves escrow: it is burned at Redemption, Timeout Claim or Cancellation.
_Avoid_: Legal title, transferable receipt, warehouse receipt

**Escrow**:
The token accounts owned by the Lot PDA that hold the Digital Title and custody the buyer's USDC deposit between Funding and release. No party — including JuLit — holds keys to them; the program alone moves the funds.
_Avoid_: Custodian, third-party escrow, wallet

**Atomic Settlement**:
The single transaction that releases the escrowed USDC and burns the Digital Title — both legs execute or neither does. Also called delivery-vs-payment (DvP).
_Avoid_: Payment then delivery, simulated settlement

**Funding**:
The buyer's act of depositing the lot's full price into escrow via `fund_lot`. It locks the payment but does not release it.
_Avoid_: Settlement, payment received

**Redemption**:
The buyer's on-chain confirmation of physical receipt, executed via `redeem_lot`: it burns the Digital Title and releases the escrowed USDC to the producer minus the Take Rate. Callable on `funded` and `disputed` lots — the buyer's release is the on-chain shape of an off-chain resolution.
_Avoid_: Delivery confirmation only, burn without payment

**Physical Delivery**:
The off-chain transport and reception of a lot's cargo, confirmed on-chain by Redemption. Outside the protocol.
_Avoid_: On-chain delivery

**Take Rate**:
The protocol fee in basis points deducted from the escrow release on Redemption or Timeout Claim and routed to treasury; it is never charged on Funding or Cancellation.
_Avoid_: Commission on deposit, listing fee

**Claimable After**:
The per-lot timestamp declared at creation, bounded by the Config's claim window, after which the producer may claim the escrowed funds if the buyer has not redeemed.
_Avoid_: Expiry, global timeout

**Timeout Claim**:
The producer's unilateral claim of the escrowed USDC via `claim_timeout` once Claimable After has passed; it burns the Digital Title, applies the Take Rate, and marks the lot `claimed`. Blocked while the lot is `disputed`.
_Avoid_: Refund, expiry cancel

**Dispute**:
A flag a buyer could once raise on a funded lot via `raise_dispute`, freezing the Timeout Claim. The instruction is removed — no new disputes can open — but lots already `disputed` keep their freeze and resolve only through Redemption (release to the producer). Resolution of those happens off-chain under the commercial contract; there is no on-chain refund path.
_Avoid_: Arbitration, chargeback, refund

**Cancellation**:
The producer's unilateral cancellation of a lot in `listed` state via `cancel_lot`, burning the escrowed Digital Title. Available only before Funding.
_Avoid_: Expiry, dispute

**Lot Status**:
The lifecycle state of a lot: `listed` → `funded` → `redeemed`, with branches `disputed` (legacy, no longer reachable), `claimed` (timeout), and `cancelled` (pre-funding).
_Avoid_: Settled, paid, completed

**Lot Spec Sheet**:
The producer-declared technical document (PDF) for a lot, whose SHA-256 is recorded on the lot at creation. Anyone can hash the public file and compare it with the declared digest.
_Avoid_: Plant certificate, audit certificate

**Passport**:
The public record of a lot's lifecycle: its digital title, funding, redemption or claim transactions, declared metrics, and spec sheet reference. It is not an official EU battery passport or a guarantee of regulatory compliance.
_Avoid_: Audit certificate, QR code, official EU certification

**Lot Price**:
The total quoted price for acquiring an entire lot, expressed in USDC and stored on the Lot PDA so `fund_lot` validates the exact deposit.
_Avoid_: Price per tonne, payment received

**Chemical Purity**:
The lithium carbonate purity of a lot, expressed as a percentage with two decimal places.
_Avoid_: Grade

**Battery Grade**:
Lithium carbonate with chemical purity of at least 99.50%; only battery-grade lots are admitted to JuLit.
_Avoid_: Self-declared grade

**Water Footprint**:
The declared volume of water consumed per metric tonne of lithium carbonate produced, expressed in cubic metres per tonne with two decimal places.
_Avoid_: Total water consumption

**Carbon Footprint**:
The declared greenhouse gas emissions intensity of a lot's production, expressed in kilograms of CO₂-equivalent per metric tonne with two decimal places.
_Avoid_: Total lot emissions

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

**Company Contract**:
A mutual-consent relationship between a buyer and a producer company, initiated by either party and accepted by the other, scoping which buyers a producer may designate on its lots.
_Avoid_: Partnership, membership, supply agreement

**Contract Initiator**:
The company that creates a contract offer; either party may initiate (ADR-0008).
_Avoid_: Offer sender, contract owner

**Contract Responder**:
The company that accepts or declines a pending offer.
_Avoid_: Recipient, invitee

**Client**:
A buyer company holding an accepted company contract with the producer.
_Avoid_: Customer, any registered buyer

**Commercial Contract Request**:
An offer initiated by a buyer or producer to establish a mutual-consent company contract, enabling the designation and funding of reserved lots.
_Avoid_: Informal inquiry, purchase order

**Cryptographic Contract Signature**:
An Ed25519 message signature produced by a company's verified wallet proving consent to a commercial contract's terms without on-chain transaction overhead.
_Avoid_: On-chain escrow, paper signature

**Buyer Portfolio**:
The view of all lots acquired by a specific buyer company, used for tracking lithium inventory and regulatory reporting.
_Avoid_: Shopping cart, wallet balance, transaction ledger

**dUSDC**:
The project-owned demo USDC mint on Devnet (6 decimals) used for settlement in the demo; it carries no real value.
_Avoid_: Real USDC, testnet money

**Explorer**:
The public demo surface where visitors browse origins and lots.
_Avoid_: Catalogue, marketplace
