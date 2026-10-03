# Buyer-producer commercial contracts, cryptographic signing, and rich origin batch showcase

## Context

In JuLit, lithium buyers (e.g. battery manufacturers and EV OEMs) need comprehensive transparency when evaluating lithium carbonate (`Li₂CO₃`) batches originating from Puna salares. In addition, exclusive commercial relationships (reserved batches) require mutual consent between a producer and a buyer under ADR-0006.

Previously, `company_contracts` assumed the producer was the sole initiator of contract offers (designed for auditor onboarding). Furthermore, when mock batches were removed in ADR-0007, the visual 3D batch showcase in `OriginModal` was temporarily simplified to basic metadata.

Buyers discovering batches in the catalogue need to inspect full chemical and ESG metrics with 3D model visualization, and must be able to initiate commercial supply agreements with producers directly from the catalogue or their account.

## Decisions

### 1. Rich Origin Batch Showcase & Real Database Integration

The origin inspection modal (`app/batches/components/origin-modal.tsx`) adopts a two-column interactive layout:

- **Left Column (`BatchDetail`)**:
  - Procedural Three.js 3D batch model (`BatchModel`) rendering a stylized lithium carbonate presentation scaled to volume.
  - Comprehensive laboratory and ESG metrics: chemical purity percentage ($\ge 99.50\%$), water consumption ($m^3/t$), carbon footprint ($kg\ CO_2e/t$), ESG certification status, EU Battery Regulation assessment, and price breakdown (total USDC and USDC/t).
  - Direct link to the public passport (`/batch/[pda]`).
- **Right Column**:
  - Filterable/sortable list of batches for the origin, categorized by status: _Lotes en venta_ (audited), _En auditoría_ (pending), and _Lotes adquiridos_ (completed).
  - Public origin reference card (`OriginReference`).
- **Data Source**: Fetched dynamically from the Supabase `batches` table for the selected `origin_id`.

### 2. Buyer-Initiated Contract Requests

Buyers can initiate commercial contract requests with a producer from two touchpoints:

1. **Catalogue Modal & Batch Details (`/batches`)**: When inspecting an origin or a batch produced by a specific mining company, the buyer can click _"Solicitar contrato comercial"_.
2. **Buyer Account (`/account`)**: Under a dedicated _"Contratos comerciales"_ section, searching or selecting a registered producer.

The contract is recorded in `company_contracts` with status `'pending'`. The producer reviews pending requests in `/account` and can accept or reject them.

### 3. Cryptographic Wallet Signatures (Hybrid Model)

Commercial contracts are authenticated off-chain and secured against repudiation using Ed25519 wallet signatures:

- The initiator signs a canonical contract message (`JuLit Commercial Contract: <producer_id> <counterparty_id> <timestamp>`) using `wallet.signMessage`.
- The responder signs upon acceptance.
- Signatures and timestamps are stored in `company_contracts` (`initiator_signature`, `counterparty_signature`), establishing non-repudiable mutual consent without on-chain Anchor state bloat.

### 4. Bilateral Contract Visibility

Both parties inspect active and pending contracts in their respective `/account` views:

- **Buyer**: Sees contract status with producers (Pending, Accepted, Revoked) enabling eligibility for reserved batch purchases.
- **Producer**: Manages counterparties (buyers and auditors), scoping who can be assigned as a reserved buyer during batch registration (`/batches/new`).

### 5. Local Demo Fixtures

`supabase/seed.sql` is augmented with audited demo batches for the provisioned demo origins (_Salar de Peña Blanca_ and _Salar del Cóndor_), providing immediate local testability with full chemical and ESG metrics.
