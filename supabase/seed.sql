-- Demo-only accounts: the two producers (one per origin) plus a buyer for
-- the demo flow. Applied locally by `supabase db reset` and to the linked
-- project by the reviewed `supabase db push --include-seed` runbook.
-- Idempotent: re-running never duplicates or overwrites. Producer and mine
-- names are fictional; the site coordinates and capacity figures are the
-- reference values the demo uses.
--
-- Credentials are demo-only (password julit-demo-2026):
--   productor.olaroz@julit.dev          -> Sales del Altiplano S.A. (producer, pena_blanca)
--   productor.cauchari-olaroz@julit.dev -> Minera Cóndor S.A.      (producer, condor)
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
    'a1a1a1a1-0000-4000-8000-000000000004',
    'a1a1a1a1-0000-4000-8000-000000000004',
    'a1a1a1a1-0000-4000-8000-000000000004',
    '{"sub":"a1a1a1a1-0000-4000-8000-000000000004","email":"comprador@julit.dev","email_verified":true}'::jsonb,
    'email', now(), now(), now()
  )
on conflict do nothing;

insert into public.companies (
  id, name, company_type, origin_id, wallet_address, wallet_verified_at,
  purity_pct, water_footprint_m3_per_tonne, carbon_footprint_kg_co2e_per_tonne
) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'Sales del Altiplano S.A.', 'producer', 'pena_blanca', null, null, 99.55, 50.80, 8200.00),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'Minera Cóndor S.A.', 'producer', 'condor', null, null, 99.62, 64.25, 9100.00),
  ('a1a1a1a1-0000-4000-8000-000000000004', 'Comprador Demo', 'buyer', null, null, null, null, null, null)
on conflict (id) do update set
  wallet_address = excluded.wallet_address,
  wallet_verified_at = excluded.wallet_verified_at;
