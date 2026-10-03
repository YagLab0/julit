# Lithium Passport

Lithium Passport describes lithium carbonate production batches, their audited sustainability evidence, and their commercial settlement.

## Language

**Batch**:
An identified quantity of lithium carbonate produced by a producer at a specific origin, with declared production and sustainability metrics.
_Avoid_: Product, order, shipment

**Producer**:
The mining entity responsible for producing and declaring a batch.
_Avoid_: Seller, user

**Origin**:
The salar or deposit from which a batch's lithium originates.
_Avoid_: Delivery destination

**Auditor**:
The laboratory or auditing entity that certifies a batch using chemical analysis or environmental evidence.
_Avoid_: Inspector, producer

**Audit Certificate**:
A PDF report containing chemical analysis or environmental evidence used to certify a batch.
_Avoid_: Passport

**Passport**:
The public record of a batch's origin, production metrics, sustainability metrics, and certification evidence.
_Avoid_: Audit certificate, QR code

**Certificate Verification**:
The public check that a certificate PDF's bytes hash to the digest recorded for its batch. It proves the document matches the recorded digest, not the truth of the auditor's findings.
_Avoid_: EU compliance check, audit validation

**Buyer**:
The entity purchasing a batch from its producer.
_Avoid_: Inspector, auditor

**Chemical Purity**:
The lithium carbonate purity of a batch, expressed as a percentage with two decimal places.
_Avoid_: Grade

**Water Footprint**:
The audited volume of water consumed per metric tonne of lithium carbonate produced, expressed in cubic metres per tonne with two decimal places.
_Avoid_: Total water consumption

**Spot Batch**:
A batch offered for purchase without an exclusive buyer assignment.
_Avoid_: Reserved batch

**Reserved Batch**:
A batch assigned exclusively to a designated buyer for purchase.
_Avoid_: Spot batch, supply agreement

**Designated Auditor**:
The auditor selected by the producer to certify a specific batch.
_Avoid_: Any auditor, inspector

**Simulated Settlement**:
The recorded completion of a batch purchase without an actual transfer of funds.
_Avoid_: Payment received, USDC transfer

**Company**:
A registered business entity participating in batch production, auditing, or purchasing.
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

**Batch Price**:
The total quoted price for purchasing an entire batch, expressed in USDC.
_Avoid_: Price per tonne, payment received

**Battery Grade**:
Lithium carbonate with chemical purity of at least 99.50%; only battery-grade batches are admitted to JuLit.
_Avoid_: Self-declared grade

**Carbon Footprint**:
The greenhouse gas emissions intensity of a batch's production, expressed in kilograms of CO₂-equivalent per metric tonne with two decimal places.
_Avoid_: Total batch emissions

**ESG Certification**:
The designated auditor's approval of a batch's environmental, social, and governance evidence, supported by its audit certificate.
_Avoid_: File integrity verification

**EU Battery Regulation Evaluation**:
The designated auditor's declared assessment of a batch's evidence against identified requirements of Regulation (EU) 2023/1542.
_Avoid_: Automatic legal compliance, official EU certification

**Audited Batch**:
A batch whose designated auditor has completed its evaluation, with positive or negative findings.
_Avoid_: Automatically approved batch, legally compliant batch

**Company Contract**:
A mutual-consent relationship between a producer and an auditor or buyer company, initiated by a fixed party per pair — the producer offers to auditors, the buyer offers to the producer (ADR-0008) — and accepted by the responder, scoping which counterparties a producer may designate on its batches.
_Avoid_: Partnership, membership, supply agreement

**Contract Initiator**:
The company that creates a contract offer: the producer for auditor contracts, the buyer for producer contracts. Never a submitted field — derived from the pair's company types.
_Avoid_: Offer sender, contract owner

**Contract Responder**:
The company that accepts or declines a pending offer: the counterparty for producer→auditor offers, the producer for buyer→producer offers.
_Avoid_: Recipient, invitee

**Contracted Auditor**:
An auditor company holding an accepted company contract with the producer.
_Avoid_: Any registered auditor, inspector

**Client**:
A buyer company holding an accepted company contract with the producer.
_Avoid_: Customer, any registered buyer
