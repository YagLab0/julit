# 03: API de contratos comerciales con verificación de firma Ed25519

**What to build:** Server-side API endpoints for creating and responding to commercial contracts with cryptographic verification. When a buyer or producer initiates a contract, their verified wallet signature is cryptographically verified against the canonical agreement message. When the recipient responds, acceptance requires a matching Ed25519 wallet signature.

**Blocked by:** 02: Migración de base de datos para contratos comerciales bilaterales con firmas criptográficas

**Status:** closed

- [x] Implement `POST /api/companies/contracts`:
  - Validates caller authentication, company registration, and linked verified wallet.
  - Verifies canonical contract message and Ed25519 `initiator_signature`.
  - Inserts `company_contracts` row with `status = 'pending'`.
- [x] Extend `POST /api/companies/contracts/[id]/respond`:
  - Authorizes the non-initiating counterparty to accept or revoke.
  - Verifies `counterparty_signature` upon acceptance.
  - Updates status to `accepted` or `revoked`.
- [x] Implement `GET /api/companies/contracts` returning the authenticated company's contracts with joined counterparty names and wallets.
- [x] Write unit tests with Vitest verifying signature validation, role checking, and response consistency.
