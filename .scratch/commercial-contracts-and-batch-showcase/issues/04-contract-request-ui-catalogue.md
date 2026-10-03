# 04: Interfaz de solicitud de contrato comercial en el catálogo y modal de lotes

**What to build:** An interactive action in `OriginModal` and batch detail views in `/batches` enabling buyers to request a commercial supply agreement with the producer. The UI guides unauthenticated users to register, triggers wallet `signMessage` for authenticated buyers, and displays current contract status (No contract / Pending request / Active client).

**Blocked by:** 01: Fixtures de prueba locales y Batch Showcase enriquecido con 3D en el modal de origen, 03: API de contratos comerciales con verificación de firma Ed25519

**Status:** closed

- [x] Add contract status banner and CTA button in `OriginModal` header/detail.
- [x] Connect "Solicitar contrato comercial" to wallet `signMessage` and `POST /api/companies/contracts`.
- [x] Show pending state badge: "Solicitud enviada (Pendiente)".
- [x] Show accepted state badge: "Cliente habilitado", unlocking purchase for reserved batches.
- [x] Display informative toasts using Sonner for contract submission.
