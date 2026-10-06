# Lithium Passport

JuLit is a B2B directory and delivery-vs-payment settlement protocol for lithium carbonate lots on Solana.

## Language

**Lot**:
An identified quantity of lithium carbonate offered by a producer at a specific origin, tokenized as a digital title and settled atomically. Replaces "batch".
_Avoid_: Batch, product, order, shipment

**Digital Title**:
The transferable NFT (supply 1) representing the contractual right over a lot, minted into escrow at listing and burned at redemption. It is a digital representation of that right, not automatic legal title.
_Avoid_: Legal title, certificate

**Escrow**:
The program-owned token account that holds a lot's digital title between listing and settlement.
_Avoid_: Custodian, third-party escrow

**Atomic Settlement**:
The single transaction in which the buyer's USDC payment and the lot's digital title change hands — both legs execute or neither does. Also called delivery-vs-payment (DvP).
_Avoid_: Payment then delivery, simulated settlement

**Take Rate**:
The protocol fee deducted from each settlement and routed to treasury, expressed in basis points.
_Avoid_: Commission, platform fee

**Redemption**:
The buyer's on-chain confirmation of physical delivery, which burns the digital title and closes the lot lifecycle.
_Avoid_: Delivery completion

**Physical Delivery**:
The off-chain transport and reception of a lot's cargo, confirmed on-chain by redemption. Outside the protocol.
_Avoid_: On-chain delivery

**Designated Buyer**:
The buyer company a lot is created for; the only one entitled to settle it. Every lot has one.
_Avoid_: Spot buyer, winning bidder

**Plant Certificate**:
The producer-declared certification document (PDF) for a production plant, whose SHA-256 is recorded on each lot from that plant.
_Avoid_: Audit certificate, per-lot certificate

**Plant Certificate Verification**:
The public check that a plant certificate PDF's bytes hash to the digest recorded on the lot. It proves the document matches the recorded digest, not the truth of its contents.
_Avoid_: Certification validation, compliance check

**Passport**:
The public record of a lot's lifecycle: its digital title, settlement and redemption transactions, declared metrics, and plant certificate reference. It is not an official EU battery passport or a guarantee of regulatory compliance.
_Avoid_: Audit certificate, QR code, official EU certification

**Lot Price**:
The total quoted price for acquiring an entire lot, expressed in USDC.
_Avoid_: Price per tonne, payment received

**Producer**:
The mining entity responsible for producing and declaring a lot.
_Avoid_: Seller, user

**Buyer**:
The entity acquiring a lot from its producer.
_Avoid_: Customer, inspector

**Origin**:
The salar or deposit from which a lot's lithium originates.
_Avoid_: Delivery destination

**Chemical Purity**:
The lithium carbonate purity of a lot, expressed as a percentage with two decimal places.
_Avoid_: Grade

**Battery Grade**:
Lithium carbonate with chemical purity of at least 99.50%; only battery-grade lots are admitted to JuLit.
_Avoid_: Self-declared grade

**Water Footprint**:
The volume of water consumed per metric tonne of lithium carbonate produced, expressed in cubic metres per tonne with two decimal places.
_Avoid_: Total water consumption

**Carbon Footprint**:
The greenhouse gas emissions intensity of a lot's production, expressed in kilograms of CO₂-equivalent per metric tonne with two decimal places.
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
A mutual-consent relationship between a buyer and a producer company, initiated by the buyer (ADR-0008) and accepted by the producer, scoping which buyers a producer may designate on its lots.
_Avoid_: Partnership, membership, supply agreement

**Contract Initiator**:
The company that creates a contract offer: always the buyer.
_Avoid_: Offer sender, contract owner

**Contract Responder**:
The company that accepts or declines a pending offer: always the producer.
_Avoid_: Recipient, invitee

**Client**:
A buyer company holding an accepted company contract with the producer.
_Avoid_: Customer, any registered buyer

**Commercial Contract Request**:
An offer initiated by a buyer to establish a mutual-consent company contract, enabling designation on reserved lots.
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
