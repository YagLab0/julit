# 06: Verificación integral end-to-end y prueba del flujo completo

**What to build:** An end-to-end verification and integration test demonstrating the complete buyer-producer commercial workflow, from batch discovery to contract signing, batch reservation, and simulated purchase settlement.

**Blocked by:** 01: Fixtures de prueba locales y Batch Showcase enriquecido con 3D en el modal de origen, 02: Migración de base de datos para contratos comerciales bilaterales con firmas criptográficas, 03: API de contratos comerciales con verificación de firma Ed25519, 04: Interfaz de solicitud de contrato comercial en el catálogo y modal de lotes, 05: Paneles bilaterales de contratos en /account (Comprador y Productor)

**Status:** closed

- [x] Execute smoke test verifying:
  1. Buyer explores catalogue `/batches`, inspects batch showcase in 3D, and requests contract.
  2. Producer logs into `/account`, reviews pending buyer request, and accepts with wallet signature.
  3. Producer creates a batch reserving it for the contracted buyer at `/batches/new`.
  4. Buyer purchases the reserved batch and verifies it in `/account` portfolio.
- [x] Run full test suite: `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm lint`, and `pnpm build`.
- [x] Create walkthrough documentation summarizing the verified workflow.
