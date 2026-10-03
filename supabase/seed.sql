-- Demo-only accounts: the two producers (one per origin) plus an auditor and
-- a buyer for the demo flow, plus two contract offers to the auditor (one
-- pending, one accepted) so the auditor inbox has real rows. Applied locally
-- by `supabase db reset` and to the linked project by the reviewed
-- `supabase db push --include-seed` runbook.
-- Idempotent: re-running never duplicates or overwrites. Producer and mine
-- names are fictional; the site coordinates and capacity figures are the
-- reference values the demo uses.
--
-- Credentials are demo-only (password julit-demo-2026):
--   productor.olaroz@julit.dev          -> Sales del Altiplano S.A. (producer, pena_blanca)
--   productor.cauchari-olaroz@julit.dev -> Minera Cóndor S.A.      (producer, condor)
--   auditor@julit.dev                   -> Auditor Demo   (auditor)
--   comprador@julit.dev                 -> Comprador Demo (buyer)

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1a1a1a1-0000-4000-8000-000000000001',
    'authenticated', 'authenticated',
    'productor.olaroz@julit.dev',
    extensions.crypt('julit-demo-2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1a1a1a1-0000-4000-8000-000000000002',
    'authenticated', 'authenticated',
    'productor.cauchari-olaroz@julit.dev',
    extensions.crypt('julit-demo-2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1a1a1a1-0000-4000-8000-000000000003',
    'authenticated', 'authenticated',
    'auditor@julit.dev',
    extensions.crypt('julit-demo-2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1a1a1a1-0000-4000-8000-000000000004',
    'authenticated', 'authenticated',
    'comprador@julit.dev',
    extensions.crypt('julit-demo-2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values
  (
    'a1a1a1a1-0000-4000-8000-000000000001',
    'a1a1a1a1-0000-4000-8000-000000000001',
    'a1a1a1a1-0000-4000-8000-000000000001',
    '{"sub":"a1a1a1a1-0000-4000-8000-000000000001","email":"productor.olaroz@julit.dev","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    'a1a1a1a1-0000-4000-8000-000000000002',
    'a1a1a1a1-0000-4000-8000-000000000002',
    'a1a1a1a1-0000-4000-8000-000000000002',
    '{"sub":"a1a1a1a1-0000-4000-8000-000000000002","email":"productor.cauchari-olaroz@julit.dev","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    'a1a1a1a1-0000-4000-8000-000000000003',
    'a1a1a1a1-0000-4000-8000-000000000003',
    'a1a1a1a1-0000-4000-8000-000000000003',
    '{"sub":"a1a1a1a1-0000-4000-8000-000000000003","email":"auditor@julit.dev","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  ),
  (
    'a1a1a1a1-0000-4000-8000-000000000004',
    'a1a1a1a1-0000-4000-8000-000000000004',
    'a1a1a1a1-0000-4000-8000-000000000004',
    '{"sub":"a1a1a1a1-0000-4000-8000-000000000004","email":"comprador@julit.dev","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  )
on conflict do nothing;

insert into public.companies (id, name, company_type, origin_id, wallet_address, wallet_verified_at) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'Sales del Altiplano S.A.', 'producer', 'pena_blanca', 'ProdSalesdelAltiplano111111111111111111111', now()),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'Minera Cóndor S.A.', 'producer', 'condor', 'ProdMineraCondor222222222222222222222222', now()),
  ('a1a1a1a1-0000-4000-8000-000000000003', 'Auditor Demo', 'auditor', null, 'AuditAnd1noLabCert111111111111111111111111', now()),
  ('a1a1a1a1-0000-4000-8000-000000000004', 'Comprador Demo', 'buyer', null, 'C1ienteTesaEnergy3333333333333333333333333', now())
on conflict (id) do update set
  wallet_address = excluded.wallet_address,
  wallet_verified_at = excluded.wallet_verified_at;

insert into public.company_contracts (producer_id, counterparty_id, status, responded_at) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000003', 'accepted', now()),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'a1a1a1a1-0000-4000-8000-000000000003', 'accepted', now()),
  ('a1a1a1a1-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000004', 'accepted', now())
on conflict (producer_id, counterparty_id) do update set
  status = excluded.status,
  responded_at = excluded.responded_at;

insert into public.batches (
  pda_address, batch_id, producer_wallet, auditor_wallet, reserved_buyer_wallet,
  origin_id, volume_tonnes, purity_pct, water_footprint_m3_per_tonne,
  carbon_footprint_kg_co2e_per_tonne, price_usdc, status, audit_sha256,
  esg_approved, eu_regulation_assessment, creation_tx_signature, audit_tx_signature,
  observed_slot
) values
  (
    'BatchPdaPenaBlanca1111111111111111111111',
    'LIT-2026-PBL-01',
    'ProdSalesdelAltiplano111111111111111111111',
    'AuditAnd1noLabCert111111111111111111111111',
    null,
    'pena_blanca',
    420,
    99.55,
    50.80,
    8200.00,
    12000.500000,
    'audited',
    'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    true,
    'conformant',
    '5VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc',
    '3VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc',
    1000
  ),
  (
    'BatchPdaPenaBlanca2222222222222222222222',
    'LIT-2026-PBL-02',
    'ProdSalesdelAltiplano111111111111111111111',
    'AuditAnd1noLabCert111111111111111111111111',
    'C1ienteTesaEnergy3333333333333333333333333',
    'pena_blanca',
    150,
    99.65,
    48.20,
    7950.00,
    15500.000000,
    'audited',
    'b1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    true,
    'conformant',
    '4VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc',
    '2VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc',
    1005
  ),
  (
    'BatchPdaCondor1111111111111111111111111111',
    'LIT-2026-CNR-01',
    'ProdMineraCondor222222222222222222222222',
    'AuditAnd1noLabCert111111111111111111111111',
    null,
    'condor',
    500,
    99.58,
    52.10,
    8400.00,
    13200.000000,
    'audited',
    'c1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    true,
    'conformant',
    '6VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc',
    '1VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUc',
    1010
  )
on conflict (pda_address) do nothing;
