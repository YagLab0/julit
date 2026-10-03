# 01: Fixtures de prueba locales y Batch Showcase enriquecido con 3D en el modal de origen

**What to build:** An interactive two-column modal in `/batches` that reads real batches from Supabase for the inspected origin. The left panel showcases the selected batch with a procedural Three.js 3D representation (`BatchModel`), full chemical purity ($\ge 99.50\%$ Li₂CO₃), water footprint, carbon emissions, ESG approval, EU Battery Regulation assessment, pricing breakdown, and a link to the public passport. The right panel displays categorized batches (_Lotes en venta_, _En auditoría_, _Adquiridos_) with sorting and origin reference data. Seed fixtures in `supabase/seed.sql` provide immediate local testability with realistic audited batches for both demo origins.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Add audited demo batches to `supabase/seed.sql` for Salar de Peña Blanca and Salar del Cóndor with realistic volume, purity, water footprint, carbon emissions, price, and ESG declarations.
- [x] Implement procedural 3D batch model component (`BatchModel`) with Three.js showing styled lithium carbonate bags/blocks scaled by volume.
- [x] Restore two-column layout in `OriginModal` (`app/batches/components/origin-modal.tsx`) with `BatchDetail` on the left and sortable batch list on the right.
- [x] Group batches into _Lotes en venta_ (audited), _En auditoría_ (created), and _Lotes adquiridos_ (completed).
- [x] Ensure graceful fallback if WebGL is unavailable without breaking modal navigation.
