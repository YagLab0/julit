# 02: Migración de base de datos para contratos comerciales bilaterales con firmas criptográficas

**What to build:** An enhanced database schema for `company_contracts` that supports bilateral initiation (by buyers or producers) and records cryptographic Ed25519 wallet signatures proving mutual consent. Updated RLS policies allow both parties to inspect and manage their shared contracts.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Create Supabase migration adding `initiator_id uuid references public.companies(id)`, `initiator_signature text`, `counterparty_signature text`, `initiator_signed_at timestamptz`, and `counterparty_signed_at timestamptz` to `company_contracts`.
- [ ] Add check constraints ensuring `initiator_id` is either `producer_id` or `counterparty_id`.
- [ ] Update RLS policies so authenticated users can read contracts where their company is either `producer_id` or `counterparty_id`.
- [ ] Add pgTAP test suite in `supabase/tests/database/company_contracts.test.sql` validating foreign keys, triggers, constraints, and bilateral RLS access.
