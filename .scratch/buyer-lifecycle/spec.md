# Spec: Buyer Lifecycle — Public Passport, Zero-Trust Verification, Simulated Settlement, and Portfolio

> **Superseded** by `.scratch/atomic-lot-settlement/spec.md` (ADR-0019): the batch/auditor model was replaced by escrowed lot settlement. This spec is kept for history only — do not implement from it.

**Status:** superseded

## Problem Statement

In JuLit (Lithium Passport), commercial buyers (such as automotive OEMs and battery cell manufacturers) need to:

1. Discover certified lithium carbonate batches originating from the Argentine Puna.
2. Independently verify the cryptographic integrity of chemical and ESG laboratory audit certificates without trusting an intermediary (zero-trust architecture).
3. Execute simulated settlement on Solana Devnet (ADR-0002) for available Spot batches or exclusively Reserved batches.
4. Manage their acquired lithium portfolio in `/account` and `/batches` to support Scope 3 emission accounting and EU Battery Regulation (Regulation EU 2023/1542) compliance.

## Solution

A complete end-to-end Buyer lifecycle:

1. **Public Passport Route (`/batch/[pda]`)**:
   A lightweight, accessible public page (< 1s load, no 3D rendering) presenting batch metrics, origin, producer, and transaction links.
2. **Independent Cryptographic Verification**:
   Browser-based Web Crypto SHA-256 computation of the laboratory PDF from Supabase Storage compared directly against the on-chain digest, displaying verification badges.
3. **Simulated Settlement Endpoint (`POST /api/batches/complete`)**:
   Server-side route verifying caller authentication, buyer company role, linked wallet, batch audit status, and enforcing designated buyer restrictions for reserved batches.
4. **Dual-Placement Buyer Portfolio**:
   - In `/account`: dedicated "Lotes adquiridos" portfolio showing aggregate volume and links to passports.
   - In `/batches`: catalogue filter toggle ("En venta" vs "Mis compras") allowing buyers to view their completed batches.

## User Stories

### Discovery & Public Passport

1. As an unauthenticated buyer or public inspector, I can visit `/batch/<pda>` to inspect batch purity, water footprint, carbon emissions, and compliance declarations.
2. As a visitor on mobile, I can scan the dynamic QR code on the passport page to view and share the passport.
3. As a buyer, I can click "Verificar Certificado" on `/batch/<pda>` to have my browser calculate the PDF's SHA-256 hash locally and verify it against Solana Devnet.

### Purchase & Settlement

4. As an authenticated buyer with a verified wallet, I can purchase an audited spot batch from `/batches`, triggering a simulated settlement transaction.
5. As an unassigned buyer inspecting a reserved batch, I can view all technical and ESG details, but the purchase control is disabled ("Reservado para otra empresa").
6. As the designated buyer for a reserved batch, I can complete the purchase using my verified wallet.

### Post-Purchase Inventory

7. As an authenticated buyer, I can view all my acquired batches in `/account` with total volume in tonnes.
8. As an authenticated buyer, I can toggle "Mis compras" in `/batches` to view my acquired inventory directly within the catalogue.
