# 02: Create lot end-to-end — schema rewrite, verified index, alta form

**What to build:** a producer creates a lot from the app and it lands in the index as `listed`. The Supabase schema is rewritten in place: `batches` → `lots` (audit columns out; `mint_address`, `claimable_after`, per-transition tx signature columns, status enum `listed|funded|disputed|redeemed|claimed|cancelled` in), `company_type` reduced to `producer | buyer`, `company_contracts` restricted to buyer→producer, bucket `audit-certificates` → `plant-certificates`. `POST /api/lots` verifies the `create_lot` transaction by RPC before writing; `POST /api/companies/plant-certificate` stores the PDF content-addressed with server-recomputed hash. The alta form signs a real `create_lot` with mandatory designated buyer and `claimable_after`.

**Blocked by:** 01 — Program Config and create_lot

**Status:** ready-for-agent

- [ ] `lots` table + status enum live; audit columns and auditor company type gone
- [ ] `company_contracts` allows only buyer→producer direction
- [ ] `plant-certificates` bucket with same policies as before
- [ ] `POST /api/lots` rejects txs failing program/account/signer/success verification
- [ ] `POST /api/companies/plant-certificate` stores content-addressed PDF, recomputed digest
- [ ] Alta form signs `create_lot`; lot appears `listed` in index after confirmation
- [ ] vitest route tests + pgTAP schema tests green
