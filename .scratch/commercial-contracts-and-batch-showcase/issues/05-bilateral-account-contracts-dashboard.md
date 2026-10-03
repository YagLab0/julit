# 05: Paneles bilaterales de contratos en /account (Comprador y Productor)

**What to build:** Comprehensive contract management in `/account` for both Buyer and Producer. The Buyer can review all outgoing supply agreements and initiate contracts with registered producers. The Producer can review incoming requests from buyers and auditors, with interactive controls to accept (signing with wallet) or reject.

**Blocked by:** 03: API de contratos comerciales con verificación de firma Ed25519, 04: Interfaz de solicitud de contrato comercial en el catálogo y modal de lotes

**Status:** ready-for-agent

- [ ] In `/account` for Buyer:
  - Add "Contratos comerciales" section listing contracts with producers, status, timestamps, and signature hashes.
  - Add modal/select to initiate a contract directly with any registered producer.
- [ ] In `/account` for Producer:
  - Add "Contratos comerciales y de auditoría" section showing buyer requests and auditor agreements.
  - Interactive "Aceptar solicitud" action prompting wallet `signMessage` and submitting response.
  - Interactive "Rechazar solicitud" action.
- [ ] Update `/batches/new` client dropdown to include newly accepted buyers immediately.
