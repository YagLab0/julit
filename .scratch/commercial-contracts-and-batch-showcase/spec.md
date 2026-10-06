# Spec: Rich Batch Showcase and Buyer-Producer Commercial Contracts

> **Superseded** by `.scratch/atomic-lot-settlement/spec.md` (ADR-0019): the batch/auditor model was replaced by escrowed lot settlement. This spec is kept for history only — do not implement from it.

**Status:** superseded

## Problem Statement

When exploring the lithium catalogue, buyers cannot inspect the full technical and environmental credentials of each lithium carbonate batch—such as verified chemical purity, water consumption intensity, carbon emissions, laboratory ESG findings, and EU Battery Regulation declarations—alongside procedural 3D model visualization that reflects the visual fidelity previously available in development.

Furthermore, producers and buyers lack a bilateral mechanism to establish mutual-consent commercial agreements. While the system restricts reserved batch acquisition to designated contracted clients, buyers cannot initiate supply contract requests directly from the origin catalogue, individual batch inspections, or their account profile. Producers cannot review, accept, or reject buyer contract requests with non-repudiable cryptographic proof (wallet signatures), leaving commercial relationships disconnected from the procurement experience.

## Solution

1. **Rich Batch Showcase in Origin Inspection**:
   An interactive two-column modal in the catalogue that dynamically loads all database batches for an origin. The left panel showcases the selected batch with a procedural Three.js 3D visualization, detailed chemical metrics ($\ge 99.50\%$ battery grade Li₂CO₃), environmental intensity indicators ($m^3/t$ water, $kg\ CO_2e/t$ carbon), certification badges (ESG approval and EU Battery Regulation assessment), and transparent commercial pricing. The right panel displays categorized batch listings (_Lotes en venta_, _En auditoría_, _Lotes adquiridos_) with sorting controls and public origin geographic references.

2. **Buyer-Initiated Commercial Contracts**:
   Buyers can initiate commercial supply contract requests with any producer from two discovery surfaces: directly within the origin modal / batch view, or from their company account dashboard. Requests are stored in `company_contracts` in `pending` status.

3. **Hybrid Cryptographic Contract Signing**:
   Commercial contracts are backed by Ed25519 cryptographic signatures using the verified wallets of both companies. The initiating buyer signs the contract intent using `signMessage`, and the accepting producer signs the acceptance confirmation, providing an auditable, non-repudiable agreement record without unnecessary on-chain transaction fees.

4. **Bilateral Contract Management & Account Visibility**:
   Both buyer and producer accounts display active, pending, and revoked commercial contracts. Producers have dedicated controls to accept or reject incoming requests. Accepted contracts immediately qualify the buyer as an eligible designated client for future reserved batch purchases.

5. **Local Test Fixtures**:
   Seeded demo database fixtures with realistic audited batches across provisioned origins (Salar de Peña Blanca and Salar del Cóndor) to enable immediate end-to-end local testing.

## User Stories

### Batch Showcase & Technical Due Diligence

1. As a buyer inspecting an origin on the map, I want to see a rich two-column view of all batches produced at that site, so that I can evaluate available supply alongside mine characteristics.
2. As a buyer evaluating a specific batch, I want to view an interactive procedural 3D representation scaled to batch volume, so that I have an immediate visual understanding of the lot size.
3. As a buyer with strict battery manufacturing specifications, I want to verify that the chemical purity of a batch meets or exceeds 99.50% Li₂CO₃, so that it qualifies for battery cell cathode synthesis.
4. As an ESG compliance officer for an automotive OEM, I want to inspect audited water consumption ($m^3/t$) and carbon footprint ($kg\ CO_2e/t$) on the batch card, so that I can calculate Scope 3 emissions.
5. As a compliance auditor, I want to view the designated laboratory's declared findings regarding ESG approval and Regulation (EU) 2023/1542 assessment, so that regulatory conformance is transparent.
6. As a buyer, I want to see both total lot price in USDC and price per metric tonne, so that I can perform unit economics analysis.
7. As a buyer, I want a direct link to the public digital passport for the selected batch, so that I can inspect the full on-chain cryptographic trail and certificate PDF.
8. As a visitor browsing an origin, I want batches neatly grouped into "Lotes en venta", "En auditoría", and "Lotes adquiridos", so that I can easily differentiate between active inventory, pending certifications, and historical sales.
9. As a buyer, I want to sort available batches by volume, purity, price, and newest, so that I can rapidly identify lots meeting procurement criteria.
10. As a visitor on a browser with limited WebGL/Three.js support, I want the batch detail card to degrade gracefully without crashing the modal, so that technical metrics remain accessible.

### Commercial Contract Request & Initiation

11. As an authenticated buyer with a verified wallet, I want to click "Solicitar contrato comercial" from the batch detail view or origin modal, so that I can propose a business relationship to the producer of that lithium.
12. As an authenticated buyer in my account profile, I want to search or select a registered producer and request a commercial agreement, so that I can establish supply relationships without searching the map.
13. As a buyer requesting a contract, I want my verified Solana wallet to prompt a signature of the contract terms, so that my request is cryptographically authenticated and tied to my company.
14. As an unauthenticated visitor clicking "Solicitar contrato", I want a prompt to sign in and register as a buyer, so that only verified companies submit contracts.
15. As a buyer without a verified wallet attempting to request a contract, I want clear guidance to link my wallet first, so that the contract cannot be submitted without an identity proof.
16. As a buyer who has already submitted a contract request to a producer, I want the UI button to reflect "Solicitud pendiente", so that I do not submit duplicate requests.
17. As a buyer holding an active contract with a producer, I want the UI to reflect "Contrato activo", so that I know I am already an approved client.

### Producer Contract Management & Approval

18. As a producer company signed into my account, I want a dedicated "Contratos comerciales" section showing all incoming contract requests from buyers and auditors, so that I can manage my counterparty network in one place.
19. As a producer inspecting a pending buyer request, I want to view the buyer's company name, verified wallet address, and request timestamp, so that I can perform counterparty due diligence.
20. As a producer accepting a buyer contract, I want my verified wallet to prompt an Ed25519 signature confirming acceptance, so that the mutual consent is cryptographically recorded.
21. As a producer, I want the option to reject or revoke a contract request, so that I can decline relationships that do not align with our commercial strategy.
22. As a producer, once I accept a buyer contract, I want that buyer to appear in my client list when registering a new batch (`/batches/new`), so that I can reserve batches exclusively for them.

### Bilateral Contract Visibility & Transparency

23. As a buyer viewing my account dashboard, I want to see a list of all my commercial contracts, including producer name, origin name, status (Pending, Accepted, Revoked), and signature hashes, so that I can track all active agreements.
24. As a buyer viewing a reserved batch in the catalogue, if I hold an accepted contract with that producer and the batch is reserved for my wallet, I want the purchase button to be active ("Comprar lote (Reservado)"), so that I can purchase my exclusive allocation.
25. As a buyer viewing a reserved batch allocated to another company, I want to see an explanatory disabled indicator ("Reservado para otra empresa") while retaining full visibility into the batch showcase and technical metrics, so that public market transparency is maintained without compromising access control.

### Local Development & Seed Fixtures

26. As a developer running the stack locally, I want seed fixtures to contain pre-populated audited batches with rich metrics and a sample commercial contract, so that I can verify the showcase and purchase workflows immediately without manual multi-party staging.

## Implementation Decisions

### Schema & Data Model

- **`company_contracts` Table Enhancement**:
  - Add an `initiator_id` uuid column referencing `companies(id)` indicating which party originated the contract (buyer or producer).
  - Add `initiator_signature` and `counterparty_signature` text columns to record base58/hex Ed25519 wallet signatures.
  - Add `initiator_signed_at` and `counterparty_signed_at` timestamptz columns.
  - Maintain the unique pair constraint on `(producer_id, counterparty_id)` to prevent duplicate contracts between the same entities.
- **Canonical Contract Agreement Message**:
  - Both parties sign a deterministic, human-readable ASCII string formatted as:
    `JuLit Commercial Agreement\nProducer: <producer_wallet>\nCounterparty: <counterparty_wallet>\nInitiator: <initiator_wallet>\nTimestamp: <iso_timestamp>`
  - Signatures are produced off-chain using the standard Solana wallet adapter (`wallet.signMessage`) and verified on the server using `@solana/web3.js` / `@noble/ed25519`.

### Origin Modal & Batch Showcase Component Hierarchy

- The modal layout is split into two panels:
  - **Showcase Panel**:
    - Procedural 3D canvas rendering the batch diorama scaled by volume.
    - Laboratory chemical composition card (purity %, water intensity, carbon emissions).
    - ESG declaration badge and EU Regulation 2023/1542 assessment indicator.
    - Commercial pricing summary and digital passport action link.
  - **Batch Selection & Origin Reference Panel**:
    - Tabbed/filtered list: Available for sale (`audited`), In audit (`created`), and Purchased (`completed`).
    - Origin reference card citing capacity and source credentials.
    - Contract status banner with actionable CTA: _"Solicitar contrato comercial"_ (if no contract), _"Solicitud enviada (Pendiente)"_ (if pending), or _"Cliente habilitado"_ (if accepted).

### API Contract & Endpoint Design

- **Contract Creation Endpoint (`POST /api/companies/contracts`)**:
  - Authenticated route for buyers or producers.
  - Validates caller company profile and verified wallet.
  - Validates target company exists and forms a valid `producer <-> buyer` or `producer <-> auditor` pair.
  - Verifies `initiator_signature` matches the canonical agreement message using the caller's verified public key.
  - Inserts `company_contracts` row with status `'pending'`.
- **Contract Response Endpoint (`POST /api/companies/contracts/[id]/respond`)**:
  - Extended to allow the non-initiating party (producer when buyer initiated; counterparty when producer initiated) to accept or revoke.
  - On acceptance, requires and verifies `counterparty_signature`.
  - Updates status to `'accepted'` or `'revoked'` and records response timestamp.
- **Contract Query Endpoints**:
  - Supports querying contracts by authenticated company to populate the bilateral account views.

### RLS Policies

- Authenticated users may read contracts where their `company.id` matches either `producer_id` or `counterparty_id`.
- Mutating contracts (inserting, accepting, revoking) remains restricted to service role operations called by verified API endpoints.

## Testing Decisions

A high-quality test validates observable external behavior and security constraints rather than internal component implementation.

### Testing Seams

1. **Seam 1: API Route & Signature Validation (`/api/companies/contracts`)**:
   - Unit and integration tests using Vitest verifying:
     - Rejection of unauthenticated requests (401).
     - Rejection of requests with invalid or tampered Ed25519 signatures (400).
     - Rejection of self-contracts (`producer_id === counterparty_id`) (400).
     - Enforcement that only registered buyers/producers can initiate (403).
     - Correct state transitions (`pending` -> `accepted` / `revoked`) and rejection of duplicate responses (409).
2. **Seam 2: Database Constraints & Triggers (pgTAP)**:
   - Automated Postgres test suite in `supabase/tests/database/company_contracts.test.sql` ensuring:
     - Enforcing `producer_id` is a producer and `counterparty_id` is a buyer/auditor.
     - Validating response consistency constraint (`status = 'pending' <==> responded_at is null`).
     - Verifying RLS policies isolate contracts between unrelated companies.
3. **Seam 3: Batch Showcase & Contract UI Logic**:
   - Validation unit tests covering batch metric scaling, price computation, and reservation access checks.
   - Component rendering tests verifying graceful degradation when WebGL is unavailable.

## Out of Scope

- Real token transfers, escrow smart contracts, or live fiat/USDC settlement (simulated settlement per ADR-0002 remains strictly enforced).
- Negotiation of custom per-clause legal text (agreements follow the standardized JuLit mutual-consent supply framework).
- Multi-signature governance approval workflows within a single enterprise.

## Further Notes

- Once accepted, commercial contracts immediately synchronize with batch registration: when a producer creates a batch at `/batches/new`, the accepted buyers populate the counterparty dropdown, and the database trigger `check_batch_participants` permits reservation.
- Seed fixtures added to `supabase/seed.sql` ensure local environments run out-of-the-box with visible audited batches and pre-linked contract states.
